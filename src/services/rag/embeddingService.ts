// 向量服务
import { db } from '../../db/config'
import log from 'electron-log'
// import { Knex } from 'knex/types'
import { SimilarityService } from './calculateSimilarity'
import path from 'path'
import { app } from 'electron'
import { getKeywordExtractor } from './keywordExtractor'
import { Keyword, NoteEmbedding } from '@shared/types'
import fs from 'fs'

let embeddings: any = null

// 缓存相关配置
const userDataPath = app.getPath('userData')
const cacheDirPath = path.join(userDataPath, 'UserData', 'cache')
const cachePath = path.join(cacheDirPath, 'embeddings.cache.json')

// 确保缓存目录存在
function ensureCacheDirectory() {
  try {
    if (!fs.existsSync(cacheDirPath)) {
      fs.mkdirSync(cacheDirPath, { recursive: true })
      log.info('创建缓存目录成功:', cacheDirPath)
    }

    // 如果缓存文件不存在，创建一个空的缓存文件
    if (!fs.existsSync(cachePath)) {
      fs.writeFileSync(cachePath, '{}', 'utf-8')
      log.info('创建缓存文件成功:', cachePath)
    }
  } catch (error) {
    log.error('创建缓存目录或文件失败:', error)
    throw error
  }
}

// 初始化 embeddings
// 初始化向量模型
export async function initEmbeddings() {
  if (!embeddings) {
    try {
      // 确保缓存目录存在
      ensureCacheDirectory()
      // 直接使用默认导出
      const embeddingsModule = (await import('@themaximalist/embeddings.js')).default

      // 测试初始化并配置缓存
      await embeddingsModule('测试文本', {
        cache_file: cachePath,
        fallbackOnError: true
      })

      // 保存配置好的函数
      embeddings = (text: string) =>
        embeddingsModule(text, {
          cache_file: cachePath,
          fallbackOnError: true
        })

      log.info('向量模型初始化成功')
    } catch (error) {
      log.error('向量模型初始化失败:', error)
      // 返回一个降级的向量化函数
      embeddings = (text: string) => {
        log.warn('使用降级向量化方法:', { text: text.substring(0, 100) })
        return new Float32Array(384).fill(0) // 返回零向量作为降级方案
      }
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
    const keywordExtractor = await getKeywordExtractor()
    const textContent = await keywordExtractor['extractTextContent'](note.content)
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

    // console.log('关键词提取结果:', {
    //   笔记ID: noteId,
    //   原始关键词数: keywordObjects.length,
    //   筛选后关键词数: keywords.length,
    //   关键词列表: keywords
    // })
    // log.info('关键词提取结果:', {
    //   笔记ID: noteId,
    //   原始关键词数: keywordObjects.length,
    //   筛选后关键词数: keywords.length,
    //   关键词列表: keywords
    // })

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
// export async function updateNoteEmbedding(
//   noteId: string,
//   content: any,
//   trx?: Knex.Transaction
// ): Promise<void> {
//   try {
//     log.info('开始更新笔记向量和关键词:', { noteId })

//     const embedder = await initEmbeddings()
//     const textContent = extractTextContent(content)

//     if (!textContent) {
//       log.warn('笔记内容为空，跳过处理:', noteId)
//       return
//     }

//     // 并行处理向量生成和关键词提取
//     const keywordExtractor = await getKeywordExtractor()
//     const [vector, keywords] = await Promise.all([
//       // 生成向量
//       embedder(textContent),
//       // 提取关键词
//       await keywordExtractor.extract(content)
//     ])

//     log.debug('处理结果:', {
//       noteId,
//       vectorLength: vector.length,
//       keywordsCount: keywords.length,
//       keywords
//     })

//     const embedding = Buffer.from(new Float32Array(vector).buffer)
//     const now = Math.floor(Date.now() / 1000)

//     const query = {
//       note_id: noteId,
//       embedding: embedding,
//       keywords: JSON.stringify(keywords.map((k) => k.word)), // 只存储关键词文本
//       created_at: now,
//       updated_at: now,
//       model_version: 'minilm-l6-v2'
//     }

//     // 使用传入的事务对象或默认数据库连接
//     const dbConnection = trx || db
//     await dbConnection('note_embeddings')
//       .insert(query)
//       .onConflict('note_id')
//       .merge(['embedding', 'keywords', 'updated_at'])

//     log.info('更新笔记向量和关键词成功:', {
//       noteId,
//       keywordsCount: keywords.length,
//       keywordsList: keywords.map((k) => k.word)
//     })
//   } catch (error) {
//     log.error('更新笔记向量和关键词失败:', {
//       noteId,
//       error,
//       errorMessage: (error as Error).message,
//       stack: (error as Error).stack
//     })
//     throw error
//   }
// }

// export async function updateNoteEmbedding(
//   noteId: string,
//   content: any,
//   trx?: Knex.Transaction
// ): Promise<void> {
//   try {
//     log.info('开始更新笔记向量和关键词:', { noteId })

//     const embedder = await initEmbeddings()
//     const textContent = extractTextContent(content)

//     if (!textContent) {
//       log.warn('笔记内容为空，跳过处理:', noteId)
//       return
//     }

//     // 初始化默认值
//     const defaultVector = new Float32Array(384).fill(0)
//     let currentVector: Float32Array = defaultVector
//     let currentKeywords: Array<{ word: string; weight: number }> = []

//     try {
//       // 并行处理向量生成和关键词提取
//       const keywordExtractor = await getKeywordExtractor()

//       log.debug('开始生成向量...', { textLength: textContent.length })
//       const vectorResult = await embedder(textContent)

//       // 检查向量结果的类型和结构
//       log.debug('向量生成结果:', {
//         type: typeof vectorResult,
//         isArray: Array.isArray(vectorResult),
//         length: vectorResult?.length
//       })

//       // 确保向量结果是 Float32Array
//       currentVector =
//         vectorResult instanceof Float32Array
//           ? vectorResult
//           : new Float32Array(Array.isArray(vectorResult) ? vectorResult : defaultVector)

//       const keywordsResult = await keywordExtractor.extract(content)
//       currentKeywords = keywordsResult || []

//       log.debug('处理结果:', {
//         noteId,
//         vectorLength: currentVector.length,
//         hasBuffer: !!currentVector.buffer,
//         bufferSize: currentVector.buffer?.byteLength,
//         sampleValues: Array.from(currentVector.slice(0, 5))
//       })
//     } catch (processError: unknown) {
//       log.error('内容处理失败，使用降级方案:', {
//         noteId,
//         error: processError,
//         textLength: textContent.length
//       })
//       currentVector = defaultVector
//     }

//     // 确保我们有有效的 Float32Array
//     if (!(currentVector instanceof Float32Array)) {
//       log.warn('向量不是 Float32Array，使用默认向量')
//       currentVector = defaultVector
//     }

//     // 创建 Buffer 前进行检查
//     if (!currentVector.buffer) {
//       log.warn('向量 buffer 无效，使用默认向量')
//       currentVector = defaultVector
//     }

//     const embedding = Buffer.from(currentVector.buffer)
//     const now = Math.floor(Date.now() / 1000)

//     const query = {
//       note_id: noteId,
//       embedding: embedding,
//       keywords: JSON.stringify(currentKeywords.map((k) => k.word)).slice(0, 1000),
//       created_at: now,
//       updated_at: now,
//       model_version: 'minilm-l6-v2'
//     }

//     // 使用传入的事务对象或默认数据库连接
//     const dbConnection = trx || db
//     await dbConnection('note_embeddings')
//       .insert(query)
//       .onConflict('note_id')
//       .merge(['embedding', 'keywords', 'updated_at'])

//     log.info('更新笔记向量和关键词成功:', {
//       noteId,
//       keywordsCount: currentKeywords.length,
//       vectorLength: currentVector.length,
//       embeddingSize: embedding.length
//     })
//   } catch (error: unknown) {
//     log.error('更新笔记向量和关键词失败:', {
//       noteId,
//       error: error instanceof Error ? error.message : String(error),
//       errorMessage: error instanceof Error ? error.message : String(error),
//       stack: error instanceof Error ? error.stack : undefined
//     })
//     if (trx) {
//       throw error
//     }
//     log.warn('非事务操作失败，允许应用继续运行')
//   }
// }
export async function updateNoteEmbedding(noteId: string, content: any): Promise<void> {
  try {
    log.info('开始异步更新笔记向量和关键词:', { noteId })

    const embedder = await initEmbeddings()
    const textContent = extractTextContent(content)

    if (!textContent) {
      log.warn('笔记内容为空，跳过处理:', noteId)
      return
    }

    // 初始化默认值
    const defaultVector = new Float32Array(384).fill(0)
    let currentVector: Float32Array = defaultVector
    let currentKeywords: Array<{ word: string; weight: number }> = []

    try {
      // 并行处理向量生成和关键词提取
      const keywordExtractor = await getKeywordExtractor()

      log.debug('开始生成向量...', { textLength: textContent.length })
      const vectorResult = await embedder(textContent)

      // 检查向量结果的类型和结构
      log.debug('向量生成结果:', {
        type: typeof vectorResult,
        isArray: Array.isArray(vectorResult),
        length: vectorResult?.length
      })

      // 确保向量结果是 Float32Array
      currentVector =
        vectorResult instanceof Float32Array
          ? vectorResult
          : new Float32Array(Array.isArray(vectorResult) ? vectorResult : defaultVector)

      const keywordsResult = await keywordExtractor.extract(content)
      currentKeywords = keywordsResult || []

      log.debug('处理结果:', {
        noteId,
        vectorLength: currentVector.length,
        hasBuffer: !!currentVector.buffer,
        bufferSize: currentVector.buffer?.byteLength,
        sampleValues: Array.from(currentVector.slice(0, 5))
      })
    } catch (processError: unknown) {
      log.error('内容处理失败，使用降级方案:', {
        noteId,
        error: processError,
        textLength: textContent.length
      })
      currentVector = defaultVector
    }

    // 确保我们有有效的 Float32Array
    if (!(currentVector instanceof Float32Array)) {
      log.warn('向量不是 Float32Array，使用默认向量')
      currentVector = defaultVector
    }

    // 创建 Buffer 前进行检查
    if (!currentVector.buffer) {
      log.warn('向量 buffer 无效，使用默认向量')
      currentVector = defaultVector
    }

    const embedding = Buffer.from(currentVector.buffer)
    const now = Math.floor(Date.now() / 1000)

    const query = {
      note_id: noteId,
      embedding: embedding,
      keywords: JSON.stringify(currentKeywords.map((k) => k.word)).slice(0, 1000),
      created_at: now,
      updated_at: now,
      model_version: 'minilm-l6-v2'
    }

    // 直接使用 db 连接
    await db('note_embeddings')
      .insert(query)
      .onConflict('note_id')
      .merge(['embedding', 'keywords', 'updated_at'])

    log.info('异步更新笔记向量和关键词成功:', {
      noteId,
      keywordsCount: currentKeywords.length,
      vectorLength: currentVector.length,
      embeddingSize: embedding.length
    })
  } catch (error: unknown) {
    // 由于是异步操作，错误不会影响主流程，只需要记录日志
    log.error('异步更新笔记向量和关键词失败:', {
      noteId,
      error: error instanceof Error ? error.message : String(error),
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
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
    // 1. 获取源笔记的向量和关键词
    const sourceNote = await db('notes')
      .join('note_embeddings', 'notes.id', 'note_embeddings.note_id')
      .where('notes.id', noteId)
      .select('note_embeddings.embedding', 'note_embeddings.keywords')
      .first()

    if (!sourceNote) {
      throw new Error('笔记不存在')
    }

    const sourceVector = SimilarityService.blobToFloat32Array(sourceNote.embedding)
    const sourceKeywords = JSON.parse(sourceNote.keywords || '[]')

    // 2. 获取其他笔记
    const otherNotes = await db('note_embeddings')
      .whereNot('note_id', noteId)
      .select('note_id', 'embedding', 'keywords')

    // 3. 计算相似度并排序
    const results = otherNotes
      .map((note) => {
        const targetVector = SimilarityService.blobToFloat32Array(note.embedding)
        const targetKeywords = JSON.parse(note.keywords || '[]')

        // 使用增强版相似度计算
        const similarity = SimilarityService.calculateEnhancedSimilarity(
          sourceVector,
          targetVector,
          {
            sourceKeywords,
            targetKeywords
          }
        )

        return {
          noteId: note.note_id,
          similarity
        }
      })
      .filter((result) => result.similarity > 0.3) // 只保留相似度较高的结果
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    log.debug('相似笔记查找结果:', {
      sourceNoteId: noteId,
      resultsCount: results.length,
      similarityRange: results.length
        ? {
            highest: results[0].similarity,
            lowest: results[results.length - 1].similarity
          }
        : null
    })

    return results
  } catch (error) {
    log.error('获取相似笔记失败:', { noteId, error })
    throw error
  }
}
