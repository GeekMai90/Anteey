import { Keyword } from '../types/Note'
import log from 'electron-log'
import { calculateSimilarity as calculateKeywordSimilarity } from './noteSililarity'
import { extractTextFromContent } from './keywordExtractor'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

export class SemanticVectorizer {
  private static instance: SemanticVectorizer
  private isInitialized: boolean = false
  private embeddings: any = null
  private vectorCache: Map<string, string> = new Map()
  private cachePath: string

  private constructor() {
    const userDataPath = app.getPath('userData')
    this.cachePath = path.join(userDataPath, 'cache', 'embeddings.cache.json')
    log.info('初始化 SemanticVectorizer，缓存路径:', this.cachePath)
  }

  public static getInstance(): SemanticVectorizer {
    if (!SemanticVectorizer.instance) {
      SemanticVectorizer.instance = new SemanticVectorizer()
    }
    return SemanticVectorizer.instance
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      log.info('初始化语义向量模型...')
      await this.loadCache()

      // 动态导入并直接使用默认导出的函数
      const embeddings = (await import('@themaximalist/embeddings.js')).default

      // 测试初始化
      await embeddings('测试文本', {
        cache_file: this.cachePath
      })

      this.embeddings = embeddings
      this.isInitialized = true
      log.info('语义向量模型初始化成功')
    } catch (error) {
      log.error('语义向量模型初始化失败:', error)
      throw error
    }
  }

  private compressVector(vector: number[]): string {
    const compressed = vector.map((v) => Math.round(v * 10000))
    return compressed.join(',')
  }

  private decompressVector(compressed: string): number[] {
    return compressed.split(',').map((v) => parseInt(v) / 10000)
  }

  private hashText(text: string): string {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return hash.toString()
  }

  public async getVector(text: string): Promise<number[]> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      if (!text?.trim()) {
        log.warn('文本为空，返回零向量')
        return new Array(384).fill(0)
      }

      const cacheKey = this.hashText(text)
      if (this.vectorCache.has(cacheKey)) {
        const compressed = this.vectorCache.get(cacheKey)!
        return this.decompressVector(compressed)
      }

      // 使用正确的调用方式
      const vector = await this.embeddings(text, {
        cache_file: this.cachePath
      })

      this.vectorCache.set(cacheKey, this.compressVector(vector))
      await this.maintainCache()
      await this.saveCache()

      return vector
    } catch (error) {
      log.error('获取语义向量失败:', error)
      return new Array(384).fill(0)
    }
  }

  // ... [cosineSimilarity 和 calculateSemanticSimilarity 方法保持不变] ...

  public async calculateHybridSimilarity(
    content1: any,
    content2: any,
    keywords1: Keyword[],
    keywords2: Keyword[]
  ): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      const text1 = extractTextFromContent(content1)
      const text2 = extractTextFromContent(content2)

      const semanticSimilarity = await this.calculateSemanticSimilarity(text1, text2)
      const keywordSimilarity = calculateKeywordSimilarity(keywords1, keywords2)

      const SEMANTIC_WEIGHT = 0.6
      const KEYWORD_WEIGHT = 0.4

      const hybridSimilarity =
        semanticSimilarity * SEMANTIC_WEIGHT + (keywordSimilarity / 100) * KEYWORD_WEIGHT

      log.info('混合相似度计算结果:', {
        语义相似度: semanticSimilarity,
        关键词相似度: keywordSimilarity / 100,
        最终相似度: hybridSimilarity
      })

      return hybridSimilarity * 100
    } catch (error) {
      log.error('计算混合相似度失败:', error)
      return 0
    }
  }

  private async maintainCache(): Promise<void> {
    if (this.vectorCache.size > 1000) {
      const keys = Array.from(this.vectorCache.keys())
      for (let i = 0; i < 200; i++) {
        this.vectorCache.delete(keys[i])
      }
      await this.saveCache()
      log.info('向量缓存已清理，当前大小:', this.vectorCache.size)
    }
  }

  public async clearCache(): Promise<void> {
    this.vectorCache.clear()
    await this.saveCache()
    log.info('向量缓存已完全清理')
  }

  private async loadCache(): Promise<void> {
    try {
      log.info('准备读取缓存，路径是:', {
        cachePath: this.cachePath,
        exists: fs.existsSync(this.cachePath)
      })
      if (fs.existsSync(this.cachePath)) {
        const data = fs.readFileSync(this.cachePath, 'utf8')
        const cacheData = JSON.parse(data)
        this.vectorCache = new Map(Object.entries(cacheData))
        log.info('向量缓存加载成功')
      }
    } catch (error) {
      log.error('读取缓存失败:', {
        error: error as Error,
        cachePath: this.cachePath,
        errorMessage: (error as Error).message
      })
    }
  }

  private async saveCache(): Promise<void> {
    try {
      const cacheData = Object.fromEntries(this.vectorCache)
      const cacheDir = path.dirname(this.cachePath)

      // 确保缓存目录存在
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true, mode: 0o777 })
      }

      const tempPath = `${this.cachePath}.tmp`

      // 写入临时文件
      fs.writeFileSync(tempPath, JSON.stringify(cacheData), {
        encoding: 'utf8',
        mode: 0o666
      })

      // 重命名为正式文件
      fs.renameSync(tempPath, this.cachePath)

      log.info('缓存保存成功:', {
        路径: this.cachePath,
        大小: this.vectorCache.size
      })
    } catch (error) {
      log.error('保存缓存失败:', error)
    }
  }

  public async calculateSemanticSimilarity(text1: string, text2: string): Promise<number> {
    try {
      const [vector1, vector2] = await Promise.all([this.getVector(text1), this.getVector(text2)])

      return this.cosineSimilarity(vector1, vector2)
    } catch (error) {
      log.error('计算语义相似度失败:', error)
      return 0
    }
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    let norm1 = 0
    let norm2 = 0
    let dotProduct = 0

    for (let i = 0; i < vec1.length; i++) {
      norm1 += vec1[i] * vec1[i]
      norm2 += vec2[i] * vec2[i]
      dotProduct += vec1[i] * vec2[i]
    }

    norm1 = Math.sqrt(norm1)
    norm2 = Math.sqrt(norm2)

    if (norm1 === 0 || norm2 === 0) return 0
    return dotProduct / (norm1 * norm2)
  }
}
