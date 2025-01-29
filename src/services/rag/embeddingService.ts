// 向量服务
import { db } from '../../db/config'
import log from 'electron-log'
import path from 'path'
import { app } from 'electron'
import { getKeywordExtractor } from './keywordExtractor'
import { Keyword, NoteEmbedding } from '@shared/types'
import fs from 'fs'

let embeddings: any = null

/**
 * 向量服务模块
 * 该模块负责处理笔记的向量化、存储和相似度搜索等功能
 * 使用 embeddings.js 进行文本向量化
 * 使用 SQLite 存储向量数据
 */

/**
 * 缓存相关配置
 * userDataPath: Electron 应用数据目录
 * cacheDirPath: 向量缓存目录
 * cachePath: 向量缓存文件路径
 */
const userDataPath = app.getPath('userData')
const cacheDirPath = path.join(userDataPath, 'UserData', 'cache')
const cachePath = path.join(cacheDirPath, 'embeddings.cache.json')

/**
 * 确保缓存目录和文件存在
 * 如果目录或文件不存在，则创建它们
 */
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

/**
 * 初始化向量模型
 * 加载并配置 embeddings.js 模型
 * 如果初始化失败，将使用降级方案（零向量）
 * @returns 向量化函数
 */
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

      // log.info('向量模型初始化成功')
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
 * 将数据库查询结果转换为 NoteEmbedding 类型
 * @param result 数据库查询结果
 * @returns NoteEmbedding 对象
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

/**
 * 从笔记内容中提取纯文本
 * 递归处理笔记内容的节点结构，提取所有文本内容
 * @param content 笔记内容（可能包含富文本结构）
 * @returns 提取的纯文本内容
 */
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

// 配置常量
const KEYWORDS_LIMIT = 15
const MIN_KEYWORD_WEIGHT = 0.05

/**
 * 为指定笔记生成向量表示
 * 1. 提取笔记文本内容
 * 2. 生成文本向量
 * 3. 提取关键词
 * 4. 将结果保存到数据库
 * @param noteId 笔记ID
 * @returns 生成的向量表示
 */
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

/**
 * 获取指定笔记的向量表示
 * @param noteId 笔记ID
 * @returns 笔记的向量表示，如果不存在则返回 null
 */
export async function getNoteEmbedding(noteId: string): Promise<NoteEmbedding | null> {
  try {
    const record = await db('note_embeddings').where({ note_id: noteId }).first()

    return record ? convertToEmbedding(record) : null
  } catch (error) {
    console.error('获取向量失败:', { noteId, error })
    throw error
  }
}

/**
 * 删除指定笔记的向量表示
 * @param noteId 笔记ID
 */
export async function deleteEmbedding(noteId: string): Promise<void> {
  try {
    await db('note_embeddings').where({ note_id: noteId }).delete()
  } catch (error) {
    console.error('删除向量失败:', { noteId, error })
    throw error
  }
}

/**
 * 获取所有未生成向量的笔记ID列表
 * @returns 笔记ID数组
 */
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

/**
 * 批量为多个笔记生成向量表示
 * 如果某个笔记处理失败，将继续处理其他笔记
 * @param noteIds 笔记ID数组
 */
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

/**
 * 异步更新笔记的向量表示和关键词
 * 当笔记内容更新时调用此函数
 * 包含错误处理和降级方案
 * @param noteId 笔记ID
 * @param content 笔记新内容
 */
export async function updateNoteEmbedding(noteId: string, content: any): Promise<void> {
  try {
    // log.info('开始异步更新笔记向量和关键词:', { noteId })

    const embedder = await initEmbeddings()
    const textContent = extractTextContent(content)

    if (!textContent) {
      // log.warn('笔记内容为空，跳过处理:', noteId)
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

/**
 * 检查并初始化所有未向量化的笔记
 * 批量处理未向量化的笔记
 * @returns 处理统计信息：总数和已处理数量
 */
export async function checkAndInitializeEmbeddings(): Promise<{
  total: number
  processed: number
}> {
  try {
    // 获取所有未向量化的笔记ID
    const noteIds = await getNotesWithoutEmbeddings()
    const total = noteIds.length

    if (total === 0) {
      return { total: 0, processed: 0 }
    }

    log.info(`发现 ${total} 条笔记需要向量化`)

    // 批量处理笔记，每批 10 条
    const batchSize = 10
    let processed = 0

    for (let i = 0; i < noteIds.length; i += batchSize) {
      const batch = noteIds.slice(i, i + batchSize)
      await Promise.all(batch.map((noteId) => generateEmbedding(noteId)))
      processed += batch.length
      log.info(`向量化进度: ${processed}/${total}`)
    }

    return { total, processed }
  } catch (error) {
    log.error('初始化向量化过程失败:', error)
    throw error
  }
}
