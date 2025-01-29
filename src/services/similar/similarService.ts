import { db } from '../../db/config'
import log from 'electron-log'
import { SimilarityService } from './calculateSimilarity'
import { initEmbeddings } from '@services/rag/embeddingService'

// 计算余弦相似度的 SQL 辅助函数
const cosineSimilarityQuery = `
  (CAST((embedding * :queryEmbedding) AS REAL)) / 
  (
    SQRT(CAST((embedding * embedding) AS REAL)) * 
    SQRT(CAST((:queryEmbedding * :queryEmbedding) AS REAL))
  ) as similarity
`

/**
 * 基于文本查询搜索相似笔记
 * 使用余弦相似度计算文本相似度
 * @param query 查询文本
 * @param limit 返回结果数量限制
 * @returns 相似笔记列表，包含相似度分数
 */
export async function searchSimilarNotes(
  query: string,
  limit: number = 10
): Promise<Array<{ noteId: string; similarity: number }>> {
  try {
    // 1. 生成查询向量
    const embedder = await initEmbeddings()
    const vector = await embedder(query)
    const queryEmbedding = Buffer.from(new Float32Array(vector).buffer)

    // 2. 执行相似度搜索
    const results = await db('note_embeddings')
      .join('notes', 'note_embeddings.note_id', 'notes.id')
      .whereNull('notes.deletedAt') // 排除已删除的笔记
      .select('notes.id as noteId', db.raw(cosineSimilarityQuery, { queryEmbedding }))
      .having('similarity', '>', 0.4) // 设置相似度阈值
      .orderBy('similarity', 'desc')
      .limit(limit)

    return results.map((row) => ({
      noteId: row.noteId,
      similarity: row.similarity
    }))
  } catch (error) {
    log.error('搜索相似笔记失败:', error)
    throw error
  }
}

/**
 * 获取与指定笔记相似的其他笔记
 * 使用增强版相似度计算（考虑向量和关键词）
 * @param noteId 源笔记ID
 * @param limit 返回结果数量限制
 * @returns 相似笔记列表，包含相似度分数
 */
export async function getSimilarNotesForNote(
  noteId: string,
  limit: number = 10
): Promise<Array<{ noteId: string; similarity: number }>> {
  try {
    // 1. 优化源笔记查询 - 使用 metadata 替代 title
    const sourceNote = await db('notes')
      .join('note_embeddings', 'notes.id', 'note_embeddings.note_id')
      .where({
        'notes.id': noteId,
        'notes.isDeleted': false
      })
      .select([
        'note_embeddings.embedding',
        'note_embeddings.keywords',
        'notes.metadata',
        'notes.content'
      ])
      .first()

    if (!sourceNote) {
      log.warn('笔记不存在，返回空结果:', noteId)
      return []
    }

    const sourceVector = SimilarityService.blobToFloat32Array(sourceNote.embedding)
    const sourceKeywords = new Set<string>(JSON.parse(sourceNote.keywords || '[]') as string[])

    // 2. 优化其他笔记查询 - 同样使用 metadata
    const otherNotes = await db('note_embeddings')
      .join('notes', 'note_embeddings.note_id', 'notes.id')
      .where('notes.isDeleted', false)
      .whereNot('note_embeddings.note_id', noteId)
      .select([
        'note_embeddings.note_id',
        'note_embeddings.embedding',
        'note_embeddings.keywords',
        'notes.metadata',
        'notes.content'
      ])
      .orderBy('notes.updatedAt', 'desc')
      .limit(50)

    // 3. 使用 calculateFullSimilarity 计算相似度
    const results = otherNotes
      .map((note) => {
        try {
          const targetVector = SimilarityService.blobToFloat32Array(note.embedding)
          const targetKeywords = new Set<string>(JSON.parse(note.keywords || '[]') as string[])

          interface NoteMetadata {
            title?: string
            summary?: string
            references?: string[]
            attachments?: string[]
          }

          let metadata: NoteMetadata = {}
          try {
            metadata = note.metadata ? JSON.parse(note.metadata) : {}
          } catch (e) {
            log.error('解析目标笔记元数据失败:', {
              noteId: note.note_id,
              rawMetadata: note.metadata,
              error: e
            })
          }

          const similarity = SimilarityService.calculateFullSimilarity(sourceVector, targetVector, {
            sourceKeywords,
            targetKeywords,
            title: metadata.title || '',
            content: note.content,
            weights: {
              vector: 0.35,
              keyword: 0.35,
              title: 0.2,
              content: 0.1
            }
          })

          return {
            noteId: note.note_id,
            similarity
          }
        } catch (noteError) {
          // 单个笔记处理失败，跳过这个笔记
          log.error('处理单个笔记相似度失败:', {
            noteId: note.note_id,
            error: noteError
          })
          return null
        }
      })
      .filter((result): result is { noteId: string; similarity: number } => {
        return result !== null && result.similarity > 0.3
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    return results
  } catch (error) {
    log.error('获取相似笔记失败:', { noteId, error })
    // 发生错误时返回空数组而不是抛出错误
    return []
  }
}
