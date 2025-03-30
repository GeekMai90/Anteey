import * as lancedb from '@lancedb/lancedb' // 使用新版本的 SDK
import * as arrow from 'apache-arrow' // 导入 Apache Arrow，用于处理列式数据和定义数据模式
import path from 'path' // Node.js 的路径处理模块
import { app } from 'electron' // Electron 应用程序对象
import log from 'electron-log' // 日志工具
import fs from 'fs' // 文件系统模块

/**
 * 向量数据库服务类
 * 用于管理笔记的向量存储和相似度搜索
 */
export class LanceService {
  private db: any // 数据库连接实例
  private table: any = null // 向量表实例
  private static instance: LanceService | null = null // 单例模式实例
  private autoIndexEnabled = true

  /**
   * 私有构造函数，实现单例模式
   * 初始化数据库路径并创建必要的目录
   */
  private constructor() {
    // 判断是否为开发环境
    const isDev = process.env.NODE_ENV === 'development'
    let vectorDbPath: string

    if (isDev) {
      // 开发环境：在项目根目录的 devDb/vectors 文件夹中存储数据
      const projectRoot = path.resolve(__dirname, '..', '..')
      const devDbDir = path.join(projectRoot, 'devDb', 'vectors')
      if (!fs.existsSync(devDbDir)) {
        fs.mkdirSync(devDbDir, { recursive: true })
      }
      vectorDbPath = devDbDir
    } else {
      // 生产环境：在用户数据目录的 UserData/vectors 文件夹中存储数据
      const antinetPath = app.getPath('userData')
      const userDataPath = path.join(antinetPath, 'UserData', 'vectors')
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true })
      }
      vectorDbPath = userDataPath
    }

    // 异步初始化数据库连接
    this.db = null
    this.initDB(vectorDbPath)
  }

  /**
   * 初始化数据库连接
   * @param dbPath 数据库文件路径
   */
  private async initDB(dbPath: string) {
    this.db = await lancedb.connect(dbPath)
  }

  /**
   * 获取 LanceService 的单例实例
   * 确保整个应用只有一个数据库连接
   */
  static async getInstance(): Promise<LanceService> {
    if (!LanceService.instance) {
      LanceService.instance = new LanceService()
      await LanceService.instance.init()
    }
    return LanceService.instance
  }

  /**
   * 初始化向量表
   * 创建或打开存储向量的数据表，并设置必要的索引
   */
  private async init() {
    try {
      while (!this.db) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      // 简化表结构，只保留必要字段
      const schema = new arrow.Schema([
        new arrow.Field('id', new arrow.Utf8()),
        new arrow.Field(
          'vector',
          new arrow.FixedSizeList(384, new arrow.Field('item', new arrow.Float32()))
        ),
        new arrow.Field('metadata', new arrow.Utf8())
      ])

      try {
        // 尝试删除现有表
        try {
          await this.db.dropTable('note_vectors')
          log.info('旧向量表删除成功')
        } catch (error) {
          // 忽略错误，表可能不存在
        }

        // 创建新表
        this.table = await this.db.createEmptyTable('note_vectors', schema)
        log.info('向量数据库表创建成功')
      } catch (error) {
        log.error('向量数据库表创建失败:', error)
        throw error
      }
    } catch (error) {
      log.error('向量数据库初始化失败:', error)
      throw error
    }
  }

  /**
   * 检查是否存在向量索引
   */
  async hasVectorIndex(): Promise<boolean> {
    try {
      // 尝试执行一个简单的向量搜索
      await this.table.vectorSearch([0]).limit(1).toArray()
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * 创建基础的 FLAT 索引
   */
  async createFlatIndex(): Promise<void> {
    try {
      await this.table.createIndex('vector', {
        metricType: 'cosine',
        indexType: 'FLAT',
        config: { indexType: 'FLAT' } // 明确指定 FLAT 类型
      })
      log.info('创建 FLAT 索引成功')
    } catch (error) {
      log.error('创建 FLAT 索引失败:', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * 添加向量到数据库
   */
  async addVector(noteId: string, vector: Float32Array, metadata: any = {}) {
    try {
      if (!this.table) throw new Error('Table not initialized')

      const data = {
        id: noteId,
        vector: Array.from(vector),
        metadata: JSON.stringify(metadata)
      }

      await this.table.add([data])
      log.debug('向量数据添加成功:', { noteId })

      // 只在启用自动索引时检查
      if (this.autoIndexEnabled) {
        try {
          // 检查是否已有索引
          const hasIndex = await this.hasVectorIndex()
          if (!hasIndex) {
            // 获取当前记录数
            const results = await this.table.query().select(['id']).toArray()
            const count = results.length

            log.debug('检查索引状态:', {
              hasIndex,
              currentCount: count
            })

            // 如果记录数足够，创建 FLAT 索引
            if (count >= 10) {
              try {
                log.info('创建基础 FLAT 索引')
                // 直接使用 FLAT 索引，不让 LanceDB 自动选择
                await this.table.createIndex('vector', {
                  metricType: 'cosine',
                  indexType: 'FLAT',
                  config: { indexType: 'FLAT' }
                })
                log.info('创建 FLAT 索引成功')
              } catch (error) {
                // 如果创建失败，不影响数据使用
                log.debug('创建索引失败，将使用暴力搜索:', {
                  error: error instanceof Error ? error.message : String(error)
                })
              }
            }
          }
        } catch (error) {
          // 索引相关的错误不应该影响数据添加
          log.debug('索引检查/创建失败，将使用暴力搜索:', {
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }

      log.info('异步更新笔记向量成功:', {
        noteId,
        totalVectors: await this.getAllNoteIds().then((ids) => ids.length)
      })
    } catch (error) {
      log.error('向量添加失败:', { noteId, error })
      throw error
    }
  }

  /**
   * 搜索相似向量
   */
  async searchSimilar(vector: Float32Array, limit: number = 10) {
    try {
      if (!this.table) throw new Error('Table not initialized')

      // 执行向量相似度搜索
      const results = await this.table
        .vectorSearch(Array.from(vector))
        .metricType('cosine') // 使用余弦相似度
        .limit(limit)
        .execute()

      // 处理结果
      return results.map((result) => ({
        id: result.id,
        score: result._distance ? 1 - result._distance : 0, // 转换距离为相似度
        vector: result.vector,
        keywords: result.keywords || []
      }))
    } catch (error) {
      log.error('相似向量搜索失败:', error)
      throw error
    }
  }

  /**
   * 删除指定笔记的向量
   * @param noteId 要删除的笔记ID
   */
  async deleteVector(noteId: string) {
    try {
      if (!this.table) throw new Error('Table not initialized')
      await this.table.delete(`id = '${noteId}'`)
    } catch (error) {
      log.error('向量删除失败:', { noteId, error })
      throw error
    }
  }

  /**
   * 混合搜索：结合向量相似度和关键词
   */
  async searchNotes(vector: Float32Array, limit: number = 10) {
    try {
      if (!this.table) throw new Error('Table not initialized')

      // 获取总记录数
      const allVectors = await this.getAllNoteIds()
      const totalVectors = allVectors.length

      log.debug('开始向量搜索:', {
        vectorLength: vector.length,
        limit,
        totalVectors
      })

      // 执行向量搜索
      const query = this.table.vectorSearch(Array.from(vector), {
        probeCount: Math.max(Math.floor(totalVectors * 0.9), 20),
        refineFactor: 40,
        nlist: Math.max(Math.floor(Math.sqrt(totalVectors)), 20),
        metric: 'cosine'
      })

      const results = await query.select(['id', 'metadata']).limit(limit).toArray()

      // 处理结果
      const processedResults = results.map((result: any) => {
        const cosineSimilarity =
          result._distance !== undefined ? Math.max(0, 1 - result._distance) : 0

        // 优化相似度分数分布
        let similarity = 0
        if (cosineSimilarity > 0.8) {
          similarity = 0.8 + (cosineSimilarity - 0.8) * 2.5
        } else if (cosineSimilarity > 0.5) {
          similarity = 0.5 + (cosineSimilarity - 0.5) * 1.5
        } else if (cosineSimilarity > 0.2) {
          similarity = 0.2 + (cosineSimilarity - 0.2) * 1.2
        } else {
          similarity = cosineSimilarity
        }

        return {
          ...result,
          score: similarity,
          _distance: result._distance
        }
      })

      return processedResults
        .filter((r: any) => r.score > 0.1)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, limit)
    } catch (error) {
      log.error('向量搜索失败:', error)
      throw error
    }
  }

  // 添加这个方法来检查表结构
  async checkTableSchema() {
    try {
      if (!this.table) throw new Error('Table not initialized')

      const schema = await this.table.schema()
      log.info('当前表结构:', {
        fields: schema.fields.map((f: any) => ({
          name: f.name,
          type: f.type.toString()
        }))
      })
    } catch (error) {
      log.error('检查表结构失败:', error)
    }
  }

  /**
   * 获取所有已向量化的笔记ID
   * @returns 笔记ID数组
   */
  async getAllNoteIds(): Promise<string[]> {
    try {
      if (!this.table) throw new Error('Table not initialized')

      // 使用新版本的 API
      const results = await this.table.query().select(['id']).toArray()
      return results.map((result: any) => result.id)
    } catch (error) {
      log.error('获取向量化笔记ID失败:', error)
      throw error
    }
  }

  async disableAutoIndex() {
    this.autoIndexEnabled = false
  }

  async enableAutoIndex() {
    this.autoIndexEnabled = true
  }

  /**
   * 重建索引
   */
  async rebuildIndex() {
    try {
      // 获取当前记录数
      const results = await this.table.query().select(['id']).toArray()
      const count = results.length

      log.info('开始重建索引:', { totalRecords: count })

      // 先删除现有索引（如果有的话）
      try {
        await this.table.dropIndex('vector')
        log.debug('已删除旧索引')
      } catch (error) {
        log.debug('删除旧索引失败（可能不存在）')
      }

      // 根据数据量选择索引类型
      if (count < 5000) {
        // 数据量小于5000时，使用 FLAT 索引
        log.info('数据量小于5000，使用 FLAT 索引')
        await this.table.createIndex('vector', {
          metricType: 'cosine',
          indexType: 'FLAT',
          config: { indexType: 'FLAT' }
        })
      } else {
        try {
          // 大数据量，使用 IVF_PQ
          const numPartitions = Math.max(Math.floor(count / 2000), 10)
          const numSubVectors = Math.floor(384 / 16) // 384是向量维度
          const numBits = 8

          log.info('数据量大于5000，使用 IVF_PQ 索引', {
            numPartitions,
            numSubVectors,
            numBits
          })

          await this.table.createIndex('vector', {
            metricType: 'cosine',
            indexType: 'IVF_PQ',
            config: {
              indexType: 'IVF_PQ',
              numPartitions,
              numSubVectors,
              numBits
            }
          })
        } catch (error) {
          log.warn('创建 IVF_PQ 索引失败，回退到 FLAT 索引:', {
            error: error instanceof Error ? error.message : String(error)
          })
          await this.table.createIndex('vector', {
            metricType: 'cosine',
            indexType: 'FLAT',
            config: { indexType: 'FLAT' }
          })
        }
      }

      log.info('索引重建完成')
    } catch (error) {
      log.error('重建索引失败:', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * 根据笔记ID获取向量数据
   */
  async getVectorById(id: string) {
    try {
      if (!this.table) {
        throw new Error('Table not initialized')
      }

      log.info('正在从 LanceDB 获取向量:', { id })

      // 修改查询格式 - 使用字符串条件而不是对象
      const result = await this.table.query().filter(`id = '${id}'`).toArray()

      log.info('LanceDB 查询结果:', {
        hasResults: result && result.length > 0,
        resultType: result ? typeof result : 'undefined',
        isArray: Array.isArray(result),
        firstResult: result?.[0]
          ? {
              id: result[0].id,
              hasVector: !!result[0].vector,
              vectorType: result[0].vector ? typeof result[0].vector : 'undefined'
            }
          : null
      })

      if (!result || !Array.isArray(result) || result.length === 0) {
        log.warn('未找到向量:', { id })
        return null
      }

      // 确保返回的数据格式正确
      const vector = result[0].vector
      if (!Array.isArray(vector)) {
        log.error('向量格式无效:', {
          id,
          vectorType: typeof vector,
          vector: vector
        })
        return null
      }

      return {
        id: result[0].id,
        vector: vector,
        keywords: result[0].keywords || [],
        metadata: result[0].metadata
      }
    } catch (error) {
      log.error('从 LanceDB 获取向量失败:', {
        id,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * 通过笔记ID直接搜索相似笔记
   * @param noteId 源笔记ID
   * @param limit 限制结果数量
   * @returns 相似笔记列表
   */
  async searchSimilarById(noteId: string, limit: number = 10): Promise<any[]> {
    try {
      if (!this.table) throw new Error('Table not initialized')

      // 构建查询 - 获取ID对应的向量
      const sourceResult = await this.table.query().filter(`id = '${noteId}'`).toArray()

      if (!sourceResult || sourceResult.length === 0) {
        throw new Error(`没有找到ID为 ${noteId} 的向量`)
      }

      const sourceVector = sourceResult[0].vector
      if (!Array.isArray(sourceVector) || sourceVector.length === 0) {
        throw new Error(`ID为 ${noteId} 的笔记没有有效的向量`)
      }

      // 使用向量进行相似度搜索
      const results = await this.table
        .vectorSearch(sourceVector)
        .metricType('cosine')
        .filter(`id != '${noteId}'`) // 排除源笔记自身
        .limit(limit)
        .execute()

      // 添加详细日志
      log.info('通过ID搜索相似笔记成功:', {
        sourceId: noteId,
        resultsCount: results.length,
        topScore: results.length > 0 ? 1 - results[0]._distance : 0
      })

      return results.map((result: any) => ({
        id: result.id,
        score: result._distance !== undefined ? 1 - result._distance : 0,
        vector: result.vector,
        keywords: result.keywords || [],
        metadata: result.metadata || '{}'
      }))
    } catch (error) {
      log.error('通过ID搜索相似向量失败:', {
        noteId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }
}
