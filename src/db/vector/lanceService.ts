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
      // 等待数据库连接完成
      while (!this.db) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      // 定义表结构
      const schema = new arrow.Schema([
        new arrow.Field('id', new arrow.Utf8()),
        new arrow.Field(
          'vector',
          new arrow.FixedSizeList(384, new arrow.Field('item', new arrow.Float32()))
        ),
        new arrow.Field('keywords', new arrow.List(new arrow.Field('item', new arrow.Utf8()))),
        new arrow.Field('metadata', new arrow.Utf8())
      ])

      try {
        // 尝试打开已存在的表
        this.table = await this.db.openTable('note_vectors')
        log.info('向量数据库表已就绪')

        // 检查表的结构和方法
        log.debug('表结构:', {
          hasExecute: typeof this.table.execute === 'function',
          hasScan: typeof this.table.scan === 'function',
          methods: Object.keys(this.table)
        })
      } catch (error) {
        // 如果表不存在，创建新表
        this.table = await this.db.createEmptyTable('note_vectors', schema)
        log.info('向量数据库表创建成功')
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
   * @param noteId 笔记ID
   * @param vector 笔记的向量表示
   * @param keywords 关键词数组
   * @param metadata 其他元数据
   */
  async addVector(
    noteId: string,
    vector: Float32Array,
    keywords: string[] = [],
    metadata: any = {}
  ) {
    try {
      if (!this.table) throw new Error('Table not initialized')

      const data = {
        id: noteId,
        vector: Array.from(vector),
        keywords: keywords,
        metadata: JSON.stringify(metadata)
      }

      // 先添加数据
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

      log.info('异步更新笔记向量和关键词成功:', {
        noteId,
        keywordsCount: keywords.length,
        totalVectors: await this.getAllNoteIds().then((ids) => ids.length),
        keywords: keywords.slice(0, 5)
      })
    } catch (error) {
      log.error('向量添加失败:', { noteId, error })
      throw error
    }
  }

  /**
   * 根据关键词搜索笔记
   * @param keyword 要搜索的关键词
   * @returns 包含该关键词的笔记列表
   */
  async searchByKeyword(keyword: string) {
    try {
      if (!this.table) throw new Error('Table not initialized')

      const results = await this.table
        .filter(`array_contains(keywords, '${keyword}')`)
        .select(['id', 'keywords', 'metadata'])
        .execute()

      return results
    } catch (error) {
      log.error('关键词搜索失败:', error)
      throw error
    }
  }

  /**
   * 搜索相似向量
   * @param vector 查询向量
   * @param limit 返回结果的最大数量
   * @returns 相似度排序后的结果列表
   */
  async searchSimilar(vector: Float32Array, limit: number = 10) {
    try {
      if (!this.table) throw new Error('Table not initialized')

      const results = await this.table
        .vectorSearch(Array.from(vector)) // 使用 vectorSearch 而不是 search
        .select(['id', 'keywords', 'metadata'])
        .limit(limit)
        .toArray() // 使用 toArray 而不是 execute

      return results
    } catch (error) {
      log.error('相似向量查询失败:', error)
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
  async searchNotes(vector: Float32Array, keywords: string[] = [], limit: number = 10) {
    try {
      if (!this.table) throw new Error('Table not initialized')

      // 获取总记录数
      const allVectors = await this.getAllNoteIds()
      const totalVectors = allVectors.length

      log.debug('开始混合搜索:', {
        vectorLength: vector.length,
        keywords,
        limit,
        totalVectors
      })

      // 修改搜索参数
      let query = this.table.vectorSearch(Array.from(vector), {
        probeCount: Math.max(Math.floor(totalVectors * 0.1), 10),
        refineFactor: 10,
        nlist: Math.max(Math.floor(Math.sqrt(totalVectors)), 10)
      })

      // 如果有关键词，添加关键词过滤条件
      if (keywords && keywords.length > 0) {
        const keywordFilters = keywords.map((k) => `array_contains(keywords, '${k}')`).join(' OR ')
        query = query.where(`(${keywordFilters})`)
      }

      const results = await query.select(['id', 'keywords', 'metadata']).limit(limit).toArray()

      // 转换结果格式，处理相似度分数
      const processedResults = results.map((result: any) => {
        // 将距离转换为相似度分数，并调整分数分布
        const rawSimilarity = result._distance !== undefined ? 1 - result._distance : 0
        let similarity = 0

        // 分段函数调整相似度分布
        if (rawSimilarity > 0.95) {
          similarity = 1.0 // 完全匹配
        } else if (rawSimilarity > 0.8) {
          similarity = 0.8 + (rawSimilarity - 0.8) * 1.5 // 高相似度区间
        } else if (rawSimilarity > 0.5) {
          similarity = 0.4 + (rawSimilarity - 0.5) * 1.0 // 中等相似度区间
        } else {
          similarity = rawSimilarity * 0.6 // 低相似度区间
        }

        // 处理 Arrow 格式的 keywords
        const processedKeywords: string[] = []
        try {
          if (result.keywords?.data?.[0]) {
            for (let i = 0; i < result.keywords.length; i++) {
              const keyword = result.keywords.get(i)
              if (keyword) {
                processedKeywords.push(keyword)
              }
            }
          }
          log.debug('处理关键词:', {
            noteId: result.id,
            processedKeywords,
            keywordsLength: result.keywords?.length,
            distance: result._distance,
            rawSimilarity,
            adjustedSimilarity: similarity
          })
        } catch (error) {
          log.warn('处理关键词失败:', {
            noteId: result.id,
            error: error instanceof Error ? error.message : String(error)
          })
        }

        return {
          ...result,
          keywords: processedKeywords,
          score: similarity
        }
      })

      // 根据相似度和关键词匹配度重新排序
      const rerankedResults = processedResults
        .map((result: any) => {
          // 计算关键词匹配度
          const keywordMatchScore =
            keywords.length > 0
              ? result.keywords.filter((k: string) => keywords.includes(k)).length / keywords.length
              : 0

          // 综合分数 = 向量相似度 * 0.7 + 关键词匹配度 * 0.3
          const finalScore =
            keywords.length > 0 ? result.score * 0.7 + keywordMatchScore * 0.3 : result.score

          return {
            ...result,
            score: finalScore,
            vectorScore: result.score,
            keywordScore: keywordMatchScore,
            distance: result._distance
          }
        })
        .sort((a: any, b: any) => b.score - a.score)
        .filter((r: any) => r.score > 0.3) // 提高相似度阈值

      log.debug('混合搜索完成:', {
        resultCount: results.length,
        hasKeywords: keywords?.length > 0,
        sampleScores: rerankedResults.slice(0, 2).map((r: any) => ({
          id: r.id,
          score: r.score,
          vectorScore: r.vectorScore,
          keywordScore: r.keywordScore,
          keywords: r.keywords,
          distance: r.distance
        }))
      })

      return rerankedResults
    } catch (error) {
      log.error('混合搜索失败:', error)
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
  async getVectorById(noteId: string) {
    try {
      if (!this.table) throw new Error('Table not initialized')

      const result = await this.table
        .query()
        .filter(`id = '${noteId}'`)
        .select(['id', 'vector', 'keywords'])
        .toArray()

      if (result.length === 0) return null

      // 处理关键词
      const rawResult = result[0]
      const processedKeywords: string[] = []
      if (rawResult.keywords?.data?.[0]) {
        for (let i = 0; i < rawResult.keywords.length; i++) {
          const keyword = rawResult.keywords.get(i)
          if (keyword) {
            processedKeywords.push(keyword)
          }
        }
      }

      return {
        ...rawResult,
        keywords: processedKeywords
      }
    } catch (error) {
      log.error('获取向量数据失败:', { noteId, error })
      throw error
    }
  }
}
