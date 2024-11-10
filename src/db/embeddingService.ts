// 向量服务
import { db } from './config'
import { NoteEmbedding } from '../renderer/src/types/Note'
import log from 'electron-log'
import { Knex } from 'knex/types'
import { extractKeywordsAndLearn, calculateKeywordSimilarity } from './similarityService'

let embeddings: any = null

// 初始化 embeddings
// 初始化向量模型
export async function initEmbeddings() {
  if (!embeddings) {
    try {
      // 直接使用默认导出
      embeddings = (await import('@themaximalist/embeddings.js')).default
      log.info('向量模型初始化成功')
    } catch (error) {
      log.error('向量模型初始化失败:', error)
      throw error
    }
  }
  return embeddings
}

// 转换函数
function convertToEmbedding(record: any): NoteEmbedding {
  return {
    note_id: record.note_id,
    embedding: record.embedding,
    created_at: record.created_at,
    updated_at: record.updated_at,
    model_version: record.model_version
  }
}

// 提取笔记的纯文本内容
function extractTextContent(content: any): string {
  const processNode = (node: any): string => {
    if (typeof node === 'string') return node
    if (!node) return ''

    if (Array.isArray(node)) {
      return node.map(processNode).join(' ')
    }

    if (node.type === 'text') {
      return node.text || ''
    }

    if (node.content) {
      return processNode(node.content)
    }

    return ''
  }

  return processNode(content).trim()
}

// 生成并保存笔记的向量
export async function generateEmbedding(noteId: string): Promise<NoteEmbedding> {
  try {
    // 1. 获取笔记内容
    const note = await db('notes').where({ id: noteId }).first()

    if (!note) {
      throw new Error(`笔记不存在: ${noteId}`)
    }

    // 2. 提取文本内容
    const textContent = extractTextContent(note.content)

    // 3. 生成向量
    const vector = await embeddings.embed(textContent)
    const embedding = Buffer.from(new Float32Array(vector).buffer)

    // 4. 准备数据
    const now = Math.floor(Date.now() / 1000)
    const embeddingData = {
      note_id: noteId,
      embedding: embedding,
      created_at: now,
      updated_at: now,
      model_version: 'minilm-l6-v2'
    }

    // 5. 保存或更新向量
    const [result] = await db('note_embeddings')
      .insert(embeddingData)
      .onConflict('note_id')
      .merge(['embedding', 'updated_at'])
      .returning('*')

    return convertToEmbedding(result)
  } catch (error) {
    console.error('生成向量失败:', { noteId, error })
    throw error
  }
}

// 获取笔记的向量
export async function getNoteEmbedding(noteId: string): Promise<NoteEmbedding | null> {
  try {
    const record = await db('note_embeddings').where({ note_id: noteId }).first()

    return record ? convertToEmbedding(record) : null
  } catch (error) {
    console.error('获取向量失败:', { noteId, error })
    throw error
  }
}

// 删除笔记的向量
export async function deleteEmbedding(noteId: string): Promise<void> {
  try {
    await db('note_embeddings').where({ note_id: noteId }).delete()
  } catch (error) {
    console.error('删除向量失败:', { noteId, error })
    throw error
  }
}

// 获取所有没有向量的笔记ID
export async function getNotesWithoutEmbeddings(): Promise<string[]> {
  try {
    const results = await db('notes')
      .leftJoin('note_embeddings', 'notes.id', 'note_embeddings.note_id')
      .whereNull('note_embeddings.note_id')
      .select('notes.id')

    return results.map((r) => r.id)
  } catch (error) {
    console.error('获取无向量笔记失败:', error)
    throw error
  }
}

// 批量生成向量
export async function generateEmbeddingsBatch(noteIds: string[]): Promise<void> {
  try {
    for (const noteId of noteIds) {
      try {
        await generateEmbedding(noteId)
        console.log(`生成向量成功: ${noteId}`)
      } catch (error) {
        console.error(`生成向量失败: ${noteId}`, error)
        // 继续处理下一个
        continue
      }
    }
  } catch (error) {
    console.error('批量生成向量失败:', error)
    throw error
  }
}

// 添加事务参数
export async function updateNoteEmbedding(
  noteId: string,
  content: any,
  trx?: Knex.Transaction
): Promise<void> {
  try {
    const embedder = await initEmbeddings()

    const textContent = extractTextContent(content)
    if (!textContent) {
      log.warn('笔记内容为空，跳过向量生成:', noteId)
      return
    }

    // 并行处理向量生成和关键词提取
    const [vector, keywords] = await Promise.all([
      embedder(textContent),
      extractKeywordsAndLearn(content)
    ])

    const embedding = Buffer.from(new Float32Array(vector).buffer)
    const now = Math.floor(Date.now() / 1000)

    const query = {
      note_id: noteId,
      embedding: embedding,
      keywords: JSON.stringify(keywords), // 添加关键词
      created_at: now,
      updated_at: now,
      model_version: 'minilm-l6-v2'
    }

    // 使用传入的事务对象或默认数据库连接
    const dbConnection = trx || db
    await dbConnection('note_embeddings')
      .insert(query)
      .onConflict('note_id')
      .merge(['embedding', 'keywords', 'updated_at']) // 更新时也包含关键词

    log.info('更新笔记向量和关键词成功:', {
      noteId,
      keywordCount: keywords.length
    })
  } catch (error) {
    log.error('更新笔记向量和关键词失败:', { noteId, error })
    throw error
  }
}

// 计算余弦相似度的 SQL 辅助函数
const cosineSimilarityQuery = `
  (CAST((embedding * :queryEmbedding) AS REAL)) / 
  (
    SQRT(CAST((embedding * embedding) AS REAL)) * 
    SQRT(CAST((:queryEmbedding * :queryEmbedding) AS REAL))
  ) as similarity
`

// 搜索相似笔记
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
      .having('similarity', '>', 0.7) // 设置相似度阈值
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

// 将二进制向量转换为数字数组
function blobToFloat32Array(blob: Buffer): Float32Array {
  return new Float32Array(blob.buffer)
}

// 计算两个向量的余弦相似度
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// 获取特定笔记的相似笔记
// 获取特定笔记的相似笔记

function calculateFinalSimilarity(vectorSimilarity: number, keywordSimilarity: number): number {
  // 关键词相似度的阈值区间
  const KEYWORD_THRESHOLDS = {
    VERY_LOW: 0.1, // 几乎没有共同关键词
    LOW: 0.3, // 较少共同关键词
    MEDIUM: 0.5 // 中等程度共同关键词
  }

  // 根据关键词相似度的不同区间，调整向量相似度的权重
  if (keywordSimilarity < KEYWORD_THRESHOLDS.VERY_LOW) {
    // 几乎没有共同关键词，大幅降低相似度
    return vectorSimilarity * 0.4
  } else if (keywordSimilarity < KEYWORD_THRESHOLDS.LOW) {
    // 较少共同关键词，适度降低相似度
    return vectorSimilarity * 0.6 + keywordSimilarity * 0.2
  } else if (keywordSimilarity < KEYWORD_THRESHOLDS.MEDIUM) {
    // 一定程度的共同关键词，正常权重
    return vectorSimilarity * 0.7 + keywordSimilarity * 0.3
  } else {
    // 较多共同关键词，给予更高权重
    return vectorSimilarity * 0.8 + keywordSimilarity * 0.2
  }
}

export async function getSimilarNotesForNote(
  noteId: string,
  limit: number = 10
): Promise<Array<{ noteId: string; similarity: number }>> {
  try {
    // 1. 获取源笔记的向量和关键词
    const sourceNote = await db('note_embeddings').where('note_id', noteId).first()

    if (!sourceNote) {
      throw new Error('笔记向量不存在')
    }

    const sourceKeywords = JSON.parse(sourceNote.keywords || '[]')
    const sourceVector = blobToFloat32Array(sourceNote.embedding)

    // 2. 获取所有其他笔记的向量和关键词
    const otherNotes = await db('note_embeddings')
      .whereNot('note_id', noteId)
      .select('note_id', 'embedding', 'keywords')

    // 3. 计算综合相似度
    const results = otherNotes
      .map((other) => {
        // 计算向量相似度 (70%)
        const vectorSimilarity = cosineSimilarity(sourceVector, blobToFloat32Array(other.embedding))

        // 计算关键词相似度 (30%)
        const otherKeywords = JSON.parse(other.keywords || '[]')
        const keywordSimilarity = calculateKeywordSimilarity(sourceKeywords, otherKeywords)

        // 计算加权总相似度
        // 如果关键词相似度太低，大幅降低最终相似度
        const finalSimilarity = calculateFinalSimilarity(vectorSimilarity, keywordSimilarity)

        return {
          noteId: other.note_id,
          similarity: finalSimilarity,
          // 调试信息
          debug: {
            vectorSimilarity,
            keywordSimilarity,
            keywords: otherKeywords
          }
        }
      })
      .filter((result) => result.similarity > 0.3) // 提高阈值
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    log.info('相似度计算结果:', {
      sourceNoteId: noteId,
      sourceKeywords,
      results: results.map((r) => ({
        noteId: r.noteId,
        similarity: r.similarity,
        debug: r.debug
      }))
    })

    // 返回结果时移除调试信息
    return results.map(({ noteId, similarity }) => ({
      noteId,
      similarity
    }))
  } catch (error) {
    log.error('获取相似笔记失败:', { noteId, error })
    throw error
  }
}
