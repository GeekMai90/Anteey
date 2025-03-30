// 向量服务
import { db } from '../../db/config'
import { LanceService } from '../../db/vector/lanceService'
import log from 'electron-log'
import path from 'path'
import { app } from 'electron'
import { NoteEmbedding } from '@shared/types'
import fs from 'fs'

let embeddingsInstance: any = null

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
  if (!embeddingsInstance) {
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
      embeddingsInstance = (text: string) =>
        embeddingsModule(text, {
          cache_file: cachePath,
          fallbackOnError: true
        })

      log.info('向量模型初始化成功')
    } catch (error) {
      log.error('向量模型初始化失败:', error)
      // 返回一个降级的向量化函数
      embeddingsInstance = (text: string) => {
        log.warn('使用降级向量化方法:', { text: text.substring(0, 100) })
        return new Float32Array(384).fill(0) // 返回零向量作为降级方案
      }
    }
  }
  return embeddingsInstance
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

/**
 * 为指定笔记生成向量表示
 */
export async function generateEmbedding(noteId: string): Promise<NoteEmbedding> {
  try {
    // 1. 获取笔记内容
    const note = await db('notes').where({ id: noteId }).first()
    if (!note) {
      throw new Error(`笔记不存在: ${noteId}`)
    }

    // 2. 提取文本内容
    const textContent = extractTextContent(note.content)
    if (!textContent.trim()) {
      throw new Error(`笔记内容为空: ${noteId}`)
    }

    // 3. 生成向量
    const embedder = await initEmbeddings()
    const vector = await embedder(textContent)

    // 确保 vector 是有效的
    if (!vector || !(vector instanceof Float32Array || Array.isArray(vector))) {
      throw new Error(`向量生成失败: ${noteId}`)
    }

    // 4. 保存到 LanceDB
    const vectorArray = vector instanceof Float32Array ? vector : new Float32Array(vector)
    const lanceService = await LanceService.getInstance()
    await lanceService.addVector(noteId, vectorArray)

    // 5. 返回结果
    return {
      note_id: noteId,
      embedding: Buffer.from(vectorArray.buffer),
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
      model_version: 'minilm-l6-v2'
    }
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
    const lanceService = await LanceService.getInstance()
    // 使用公共方法获取向量数据
    const result = await lanceService.getVectorById(noteId)

    if (!result) return null

    return {
      note_id: result.id,
      embedding: Buffer.from(new Float32Array(result.vector).buffer),
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
      model_version: 'minilm-l6-v2'
    }
  } catch (error) {
    log.error('获取向量失败:', { noteId, error })
    throw error
  }
}

/**
 * 删除指定笔记的向量表示
 * @param noteId 笔记ID
 */
export async function deleteEmbedding(noteId: string): Promise<void> {
  try {
    const lanceService = await LanceService.getInstance()
    await lanceService.deleteVector(noteId)
  } catch (error) {
    log.error('删除向量失败:', { noteId, error })
    throw error
  }
}

/**
 * 异步更新笔记的向量表示
 */
export async function updateNoteEmbedding(noteId: string, content: any): Promise<void> {
  try {
    const embedder = await initEmbeddings()
    const textContent = extractTextContent(content)

    if (!textContent) {
      return
    }

    // 生成向量
    const vector = await embedder(textContent)
    const vectorArray = vector instanceof Float32Array ? vector : new Float32Array(vector)

    // 获取 LanceDB 实例并暂时禁用自动索引
    const lanceService = await LanceService.getInstance()
    await lanceService.disableAutoIndex()

    try {
      // 先删除旧的向量（如果存在）
      try {
        await lanceService.deleteVector(noteId)
        log.debug('已删除旧向量:', { noteId })
      } catch (error) {
        log.debug('删除旧向量失败（可能不存在）:', { noteId })
      }

      // 添加新向量
      await lanceService.addVector(noteId, vectorArray)

      // 获取当前向量总数
      const allVectors = await lanceService.getAllNoteIds()
      const totalVectors = allVectors.length

      // 检查是否需要重建索引
      if (
        totalVectors === 256 ||
        (totalVectors > 256 && totalVectors < 1000 && totalVectors % 50 === 0) ||
        (totalVectors >= 1000 && totalVectors % 100 === 0)
      ) {
        log.info('达到索引重建检查点，开始重建索引...', { totalVectors })
        try {
          await lanceService.rebuildIndex()
          log.info('索引重建完成')
        } catch (error) {
          log.warn('索引重建失败，但不影响向量数据使用:', {
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }

      log.info('异步更新笔记向量成功:', {
        noteId,
        totalVectors
      })
    } finally {
      // 恢复自动索引
      await lanceService.enableAutoIndex()
    }
  } catch (error) {
    log.error('异步更新笔记向量失败:', {
      noteId,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * 获取所有未生成向量的笔记ID列表
 * @returns 笔记ID数组
 */
export async function getNotesWithoutEmbeddings(): Promise<string[]> {
  try {
    // 1. 获取所有笔记ID
    const allNotes = await db('notes').where('isDeleted', false).select('id')

    // 2. 获取已有向量的笔记ID
    const lanceService = await LanceService.getInstance()
    const vectorizedNotes = await lanceService.getAllNoteIds()
    const vectorizedNoteIds = new Set(vectorizedNotes)

    // 3. 找出未生成向量的笔记
    const notesWithoutEmbeddings = allNotes.filter((note) => !vectorizedNoteIds.has(note.id))

    return notesWithoutEmbeddings.map((note) => note.id)
  } catch (error) {
    log.error('获取无向量笔记失败:', error)
    throw error
  }
}

/**
 * 批量为多个笔记生成向量表示
 */
export async function generateEmbeddingsBatch(
  noteIds: string[]
): Promise<{ successCount: number }> {
  try {
    const batchSize = 10
    const total = noteIds.length
    const lanceService = await LanceService.getInstance()
    let successCount = 0

    // 禁用自动索引创建
    await lanceService.disableAutoIndex()

    try {
      // 批量添加向量
      for (let i = 0; i < noteIds.length; i += batchSize) {
        const batch = noteIds.slice(i, i + batchSize)

        // 并行处理每一批
        const results = await Promise.all(
          batch.map(async (noteId, batchIndex) => {
            try {
              await generateEmbedding(noteId)
              log.info(`向量化进度: ${i + batchIndex + 1}/${total} - 成功: ${noteId}`)
              return true
            } catch (error) {
              log.error(`向量化失败: ${noteId}`, error)
              return false
            }
          })
        )

        successCount += results.filter(Boolean).length
      }

      // 所有向量添加完成后，尝试重建索引
      log.info('所有向量添加完成，开始重建索引...')
      try {
        await lanceService.rebuildIndex()
        log.info('索引重建完成')
      } catch (error) {
        // 索引重建失败不应该影响整个批处理的结果
        log.warn('索引重建失败，但向量数据已成功添加:', {
          error: error instanceof Error ? error.message : String(error)
        })
      }

      return { successCount }
    } finally {
      // 恢复自动索引
      await lanceService.enableAutoIndex()
    }
  } catch (error) {
    log.error('批量生成向量失败:', error)
    throw error
  }
}

/**
 * 检查并初始化所有未向量化的笔记
 * @returns 处理统计信息：总数和已处理数量
 */
export async function checkAndInitializeEmbeddings(): Promise<{
  total: number
  processed: number
}> {
  try {
    const noteIds = await getNotesWithoutEmbeddings()
    const total = noteIds.length

    if (total === 0) {
      log.info('所有笔记都已向量化')
      return { total: 0, processed: 0 }
    }

    log.info(`发现 ${total} 条笔记需要向量化`)

    // 使用实际成功数量
    const { successCount } = await generateEmbeddingsBatch(noteIds)

    return { total, processed: successCount }
  } catch (error) {
    log.error('初始化向量化过程失败:', error)
    throw error
  }
}

/**
 * 直接对文本内容进行向量化处理
 * @param noteId 笔记ID
 * @param content 文本内容
 */
export async function generateEmbeddingFromContent(
  noteId: string,
  content: any
): Promise<NoteEmbedding> {
  try {
    // 1. 提取文本内容
    const textContent = extractTextContent(content)
    if (!textContent.trim()) {
      throw new Error(`文本内容为空: ${noteId}`)
    }

    // 2. 生成向量
    const embedder = await initEmbeddings()
    const vector = await embedder(textContent)

    // 确保 vector 是有效的
    if (!vector || !(vector instanceof Float32Array || Array.isArray(vector))) {
      throw new Error(`向量生成失败: ${noteId}`)
    }

    // 3. 保存到 LanceDB
    const vectorArray = vector instanceof Float32Array ? vector : new Float32Array(vector)
    const lanceService = await LanceService.getInstance()

    // 暂时禁用自动索引
    await lanceService.disableAutoIndex()

    try {
      // 先删除旧的向量（如果存在）
      try {
        await lanceService.deleteVector(noteId)
        log.debug('已删除旧向量:', { noteId })
      } catch (error) {
        log.debug('删除旧向量失败（可能不存在）:', { noteId })
      }

      // 添加新向量
      await lanceService.addVector(noteId, vectorArray)

      // 获取当前向量总数
      const allVectors = await lanceService.getAllNoteIds()
      const totalVectors = allVectors.length

      // 检查是否需要重建索引
      if (
        totalVectors === 256 ||
        (totalVectors > 256 && totalVectors < 1000 && totalVectors % 50 === 0) ||
        (totalVectors >= 1000 && totalVectors % 100 === 0)
      ) {
        log.info('达到索引重建检查点，开始重建索引...', { totalVectors })
        try {
          await lanceService.rebuildIndex()
          log.info('索引重建完成')
        } catch (error) {
          log.warn('索引重建失败，但不影响向量数据使用:', {
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }
    } finally {
      // 恢复自动索引
      await lanceService.enableAutoIndex()
    }

    // 4. 返回结果
    return {
      note_id: noteId,
      embedding: Buffer.from(vectorArray.buffer),
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
      model_version: 'minilm-l6-v2'
    }
  } catch (error) {
    log.error('直接向量化内容失败:', {
      noteId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}
