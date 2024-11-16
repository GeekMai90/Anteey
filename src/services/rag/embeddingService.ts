// 向量服务
import { db } from '../../db/config'
import log from 'electron-log'
import { Knex } from 'knex/types'
import { SimilarityService } from './calculateSimilarity'
import path from 'path'
import { app } from 'electron'
import { keywordExtractor } from './keywordExtractor'
import { Keyword, NoteEmbedding } from '../../renderer/src/types/Embedding'

let embeddings: any = null

const cachePath = path.join(app.getPath('userData'), 'UserData', 'cache', 'embeddings.cache.json')

// 初始化 embeddings
// 初始化向量模型
export async function initEmbeddings() {
  if (!embeddings) {
    try {
      // 直接使用默认导出
      const embeddingsModule = (await import('@themaximalist/embeddings.js')).default

      // 测试初始化并配置缓存
      await embeddingsModule('测试文本', {
        cache_file: cachePath
      })

      // 保存配置好的函数
      embeddings = (text: string) =>
        embeddingsModule(text, {
          cache_file: cachePath
        })

      log.info('向量模型初始化成功')
    } catch (error) {
      log.error('向量模型初始化失败:', error)
      throw error
    }
  }
  return embeddings
}

/**
 * 转换数据库结果为 NoteEmbedding 类型
 */
function convertToEmbedding(result: any): NoteEmbedding {
  try {
    return {
      note_id: result.note_id,
      embedding: result.embedding,
      keywords: JSON.parse(result.keywords),
      created_at: result.created_at,
      updated_at: result.updated_at,
      model_version: result.model_version
    }
  } catch (error) {
    log.error('转换 embedding 结果失败:', error)
    return {
      note_id: result.note_id,
      embedding: result.embedding,
      keywords: [],
      created_at: result.created_at,
      updated_at: result.updated_at,
      model_version: result.model_version
    }
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
// export async function generateEmbedding(noteId: string): Promise<NoteEmbedding> {
//   try {
//     // 1. 获取笔记内容
//     const note = await db('notes').where({ id: noteId }).first()

//     if (!note) {
//       throw new Error(`笔记不存在: ${noteId}`)
//     }

//     // 2. 提取文本内容
//     const textContent = extractTextContent(note.content)

//     // 3. 生成向量
//     const embedder = await initEmbeddings()
//     const vector = await embedder(textContent)
//     const embedding = Buffer.from(new Float32Array(vector).buffer)

//     // 4. 准备数据
//     const now = Math.floor(Date.now() / 1000)
//     const embeddingData = {
//       note_id: noteId,
//       embedding: embedding,
//       created_at: now,
//       updated_at: now,
//       model_version: 'minilm-l6-v2'
//     }

//     // 5. 保存或更新向量
//     const [result] = await db('note_embeddings')
//       .insert(embeddingData)
//       .onConflict('note_id')
//       .merge(['embedding', 'updated_at'])
//       .returning('*')

//     return convertToEmbedding(result)
//   } catch (error) {
//     console.error('生成向量失败:', { noteId, error })
//     throw error
//   }
// }

// 配置常量
const KEYWORDS_LIMIT = 10
const MIN_KEYWORD_WEIGHT = 0.05

// 生成并保存笔记的向量
export async function generateEmbedding(noteId: string): Promise<NoteEmbedding> {
  try {
    // 1. 获取笔记内容
    const note = await db('notes').where({ id: noteId }).first()
    if (!note) {
      throw new Error(`笔记不存在: ${noteId}`)
    }

    // 2. 提取文本内容 - 使用 KeywordExtractor 中的方法
    const textContent = keywordExtractor['extractTextContent'](note.content)
    if (!textContent.trim()) {
      throw new Error(`笔记内容为空: ${noteId}`)
    }

    // 3. 同时进行向量生成和关键词提取
    const [vector, keywordObjects] = await Promise.all([
      // 生成向量
      (async () => {
        const embedder = await initEmbeddings()
        const vector = await embedder(textContent)
        return Buffer.from(new Float32Array(vector).buffer)
      })(),
      // 提取关键词
      keywordExtractor.extract(note.content) // 直接传入原始内容，让 KeywordExtractor 处理
    ])

    // 4. 筛选关键词
    const keywords = keywordObjects
      .filter((k: Keyword) => k.weight >= MIN_KEYWORD_WEIGHT)
      .sort((a: Keyword, b: Keyword) => b.weight - a.weight)
      .slice(0, KEYWORDS_LIMIT)
      .map((k: Keyword) => k.word)

    console.log('关键词提取结果:', {
      笔记ID: noteId,
      原始关键词数: keywordObjects.length,
      筛选后关键词数: keywords.length,
      关键词列表: keywords
    })
    log.info('关键词提取结果:', {
      笔记ID: noteId,
      原始关键词数: keywordObjects.length,
      筛选后关键词数: keywords.length,
      关键词列表: keywords
    })

    // 5. 准备数据
    const now = Math.floor(Date.now() / 1000)
    const embeddingData = {
      note_id: noteId,
      embedding: vector,
      keywords: JSON.stringify(keywords),
      created_at: now,
      updated_at: now,
      model_version: 'minilm-l6-v2'
    }

    // 6. 保存或更新向量
    const [result] = await db('note_embeddings')
      .insert(embeddingData)
      .onConflict('note_id')
      .merge(['embedding', 'keywords', 'updated_at'])
      .returning('*')

    return convertToEmbedding(result)
  } catch (error) {
    log.error('生成向量失败:', {
      noteId,
      error: error as Error,
      errorMessage: (error as Error).message,
      stack: (error as Error).stack
    })
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
// export async function updateNoteEmbedding(
//   noteId: string,
//   content: any,
//   trx?: Knex.Transaction
// ): Promise<void> {
//   try {
//     const embedder = await initEmbeddings()

//     const textContent = extractTextContent(content)
//     if (!textContent) {
//       log.warn('笔记内容为空，跳过向量生成:', noteId)
//       return
//     }

//     // 使用传入的事务对象进行关键词提取
//     const vector = await embedder(textContent)

//     const embedding = Buffer.from(new Float32Array(vector).buffer)
//     const now = Math.floor(Date.now() / 1000)

//     const query = {
//       note_id: noteId,
//       embedding: embedding,
//       created_at: now,
//       updated_at: now,
//       model_version: 'minilm-l6-v2'
//     }

//     // 使用传入的事务对象或默认数据库连接
//     const dbConnection = trx || db
//     await dbConnection('note_embeddings')
//       .insert(query)
//       .onConflict('note_id')
//       .merge(['embedding', 'updated_at'])

//     log.info('更新笔记向量成功:', { noteId })
//   } catch (error) {
//     log.error('更新笔记向量失败:', { noteId, error })
//     throw error
//   }
// }
export async function updateNoteEmbedding(
  noteId: string,
  content: any,
  trx?: Knex.Transaction
): Promise<void> {
  try {
    log.info('开始更新笔记向量和关键词:', { noteId })

    const embedder = await initEmbeddings()
    const textContent = extractTextContent(content)

    if (!textContent) {
      log.warn('笔记内容为空，跳过处理:', noteId)
      return
    }

    // 并行处理向量生成和关键词提取
    const [vector, keywords] = await Promise.all([
      // 生成向量
      embedder(textContent),
      // 提取关键词
      keywordExtractor.extract(content)
    ])

    log.debug('处理结果:', {
      noteId,
      vectorLength: vector.length,
      keywordsCount: keywords.length,
      keywords
    })

    const embedding = Buffer.from(new Float32Array(vector).buffer)
    const now = Math.floor(Date.now() / 1000)

    const query = {
      note_id: noteId,
      embedding: embedding,
      keywords: JSON.stringify(keywords.map((k) => k.word)), // 只存储关键词文本
      created_at: now,
      updated_at: now,
      model_version: 'minilm-l6-v2'
    }

    // 使用传入的事务对象或默认数据库连接
    const dbConnection = trx || db
    await dbConnection('note_embeddings')
      .insert(query)
      .onConflict('note_id')
      .merge(['embedding', 'keywords', 'updated_at'])

    log.info('更新笔记向量和关键词成功:', {
      noteId,
      keywordsCount: keywords.length,
      keywordsList: keywords.map((k) => k.word)
    })
  } catch (error) {
    log.error('更新笔记向量和关键词失败:', {
      noteId,
      error,
      errorMessage: (error as Error).message,
      stack: (error as Error).stack
    })
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

// 获取特定笔记的相似笔记
export async function getSimilarNotesForNote(
  noteId: string,
  limit: number = 10
): Promise<Array<{ noteId: string; similarity: number }>> {
  try {
    // 1. 获取源笔记的向量
    const sourceNote = await db('note_embeddings').where('note_id', noteId).first()

    if (!sourceNote) {
      throw new Error('笔记向量不存在')
    }

    const sourceVector = SimilarityService.blobToFloat32Array(sourceNote.embedding)

    // 2. 获取所有其他笔记的向量
    const otherNotes = await db('note_embeddings')
      .whereNot('note_id', noteId)
      .select('note_id', 'embedding')

    // 3. 计算相似度
    const results = otherNotes
      .map((other) => {
        const similarity = SimilarityService.calculateSimilarity(
          sourceVector,
          SimilarityService.blobToFloat32Array(other.embedding)
        )

        return {
          noteId: other.note_id,
          similarity
        }
      })
      .filter((result) => result.similarity > 0.7) // 设置相似度阈值
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    return results
  } catch (error) {
    log.error('获取相似笔记失败:', { noteId, error })
    throw error
  }
}
