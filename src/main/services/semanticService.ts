import path from 'path'
import fs from 'fs/promises'
import faiss from 'faiss-node'
import log from 'electron-log'
import { extractTextFromContent, extractKeywords } from '../../renderer/src/utils/keywordExtractor'
// import { calculateSimilarity as calculateKeywordSimilarity } from '../../renderer/src/utils/noteSililarity'
import {
  SearchOptions,
  EnhancedSearchResult,
  SearchResult,
  ChunkMetadata
} from '../../renderer/src/types/semantic'
import { getNoteById } from '../../db/notesService'
import { getCachePaths } from './constants'

export class SemanticService {
  private static instance: SemanticService
  public isInitialized: boolean = false
  private embeddings: any = null
  private faissIndex: faiss.IndexFlatL2 | null = null
  public dimension: number = 384
  private vectorToIdMap: Map<string, number> = new Map()
  private vectorCache: Map<string, string> = new Map()
  private noteVectors: Map<string, number[]> = new Map()
  private cachePath: string
  private faissPath: string
  private faissIndexPath: string
  private isFaissInitialized: boolean = false

  private constructor() {
    const paths = getCachePaths()

    // 使用获取到的路径
    this.cachePath = paths.embeddings
    this.faissPath = paths.faiss
    this.faissIndexPath = paths.faissIndex

    // 初始化其他属性
    this.vectorToIdMap = new Map()
    this.vectorCache = new Map()
    this.noteVectors = new Map()
    this.dimension = 384

    log.info('SemanticService: 初始化路径配置:', {
      cachePath: this.cachePath,
      faissPath: this.faissPath,
      faissIndexPath: this.faissIndexPath
    })
  }

  public static getInstance(): SemanticService {
    if (!SemanticService.instance) {
      SemanticService.instance = new SemanticService()
    }
    return SemanticService.instance
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      log.info('SemanticService: 已经初始化，跳过')
      return
    }

    try {
      log.info('SemanticService: 开始初始化...')

      // 1. 确保目录存在
      const indexDir = path.dirname(this.faissIndexPath)
      const cacheDir = path.dirname(this.cachePath)

      await Promise.all([
        fs.mkdir(indexDir, { recursive: true }),
        fs.mkdir(cacheDir, { recursive: true })
      ])

      // 2. 初始化嵌入模型
      const embeddings = (await import('@themaximalist/embeddings.js')).default
      await embeddings('测试文本')
      this.embeddings = embeddings
      log.info('SemanticService: 嵌入模型初始化完成')

      // 3. 加载向量缓存
      await this.loadCache()
      log.info('SemanticService: 向量缓存加载完成:', {
        cacheSize: this.vectorCache.size
      })

      // 4. 加载或创建 FAISS 索引
      await this.loadFaissIndex()
      this.isFaissInitialized = true

      // 5. 设置初始化标志
      this.isInitialized = true

      log.info('SemanticService: 初始化完成:', {
        isInitialized: this.isInitialized,
        isFaissInitialized: this.isFaissInitialized,
        vectorCount: this.faissIndex?.ntotal() || 0,
        mappingCount: this.vectorToIdMap.size,
        cacheSize: this.vectorCache.size
      })
    } catch (error) {
      this.isInitialized = false
      this.isFaissInitialized = false
      log.error('SemanticService: 初始化失败:', error)
      throw error
    }
  }

  public isFaissReady(): boolean {
    return this.isFaissInitialized && this.faissIndex !== null
  }

  // 添加获取笔记关键词的方法
  // 修改获取笔记关键词的方法
  private async getNoteKeywords(noteId: string): Promise<string[]> {
    try {
      const note = await getNoteById(noteId)
      if (!note) {
        log.warn('SemanticService: 笔记不存在:', noteId)
        return []
      }

      // 确保 keywords 是字符串
      const keywordsStr = typeof note.keywords === 'string' ? note.keywords : '[]'

      try {
        const keywords = JSON.parse(keywordsStr) as string[]
        if (!Array.isArray(keywords)) {
          log.warn('SemanticService: 关键词格式不正确:', {
            noteId,
            keywords: keywordsStr
          })
          return []
        }

        log.debug('SemanticService: 获取笔记关键词:', {
          noteId,
          keywordCount: keywords.length,
          keywords: keywords.join(', ')
        })

        return keywords
      } catch (e) {
        log.error('SemanticService: 关键词解析失败:', {
          noteId,
          keywords: keywordsStr,
          error: e instanceof Error ? e.message : String(e)
        })
        return []
      }
    } catch (error) {
      log.error('SemanticService: 获取笔记关键词失败:', {
        noteId,
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }
  /**
   * 增强的语义搜索
   */
  public async enhancedSearch(
    query: string,
    options: SearchOptions = {}
  ): Promise<EnhancedSearchResult> {
    try {
      const startTime = Date.now()

      // 1. 查询预处理
      const processedQuery = await this.preprocessQuery(query)

      // 2. 多路检索
      const [semanticResults, keywordResults] = await Promise.all([
        this.semanticSearch(processedQuery), // 使用现有的语义搜索
        this.keywordSearch(processedQuery) // 新增关键词搜索
      ])

      // 3. 结果融合
      const mergedResults = this.mergeResults(semanticResults, keywordResults)

      // 4. 重排序
      const rerankedResults = await this.rerank(mergedResults, processedQuery)

      // 5. 结果后处理
      const timeTaken = Date.now() - startTime

      return {
        results: rerankedResults,
        totalFound: rerankedResults.length,
        timeTaken,
        metadata: {
          query: processedQuery,
          strategy: 'hybrid',
          filters: options
        }
      }
    } catch (error) {
      log.error('SemanticService: 增强搜索失败:', error)
      throw error
    }
  }

  /**
   * 查询预处理
   */
  private async preprocessQuery(query: string): Promise<string> {
    try {
      // 1. 基础清理
      let processed = query.trim()

      // 2. 移除特殊字符
      processed = processed.replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')

      // 3. 规范化空白字符
      processed = processed.replace(/\s+/g, ' ')

      log.debug('SemanticService: 查询预处理:', {
        original: query,
        processed
      })

      return processed
    } catch (error) {
      log.error('SemanticService: 查询预处理失败:', error)
      return query
    }
  }

  /**
   * 关键词搜索
   */
  private async keywordSearch(query: string): Promise<SearchResult[]> {
    try {
      // 1. 从查询中提取关键词
      const queryKeywords = await extractKeywords({ text: query })
      log.debug('SemanticService: 查询关键词:', {
        query,
        keywords: queryKeywords
      })

      // 2. 获取所有笔记的向量
      const noteVectors = Array.from(this.noteVectors.entries())
      const results: SearchResult[] = []

      // 3. 对每个笔记进行关键词匹配
      for (const [noteId] of noteVectors) {
        // 从数据库中获取笔记的已存储关键词
        const note = await getNoteById(noteId)
        if (!note) continue

        // 使用已存储的关键词，而不是重新提取
        const noteKeywords = await this.getNoteKeywords(noteId)

        // 计算关键词相似度
        const similarity = this.calculateKeywordSimilarity(queryKeywords, noteKeywords)

        if (similarity > 0) {
          results.push({
            noteId,
            text: extractTextFromContent(note.content),
            similarity,
            similarityLevel: this.getSimilarityLevel(similarity),
            metadata: {
              highlights: [],
              startPos: 0,
              endPos: 0
            }
          })
        }
      }

      return results.filter((r) => r.similarity >= 0.3).sort((a, b) => b.similarity - a.similarity)
    } catch (error) {
      log.error('SemanticService: 关键词搜索失败:', error)
      return []
    }
  }

  /**
   * 结果融合
   */
  private mergeResults(
    semanticResults: SearchResult[],
    keywordResults: SearchResult[]
  ): SearchResult[] {
    try {
      const merged = new Map<string, SearchResult>()

      // 1. 处理语义搜索结果
      for (const result of semanticResults) {
        merged.set(result.noteId, {
          ...result,
          similarity: result.similarity * 0.7 // 语义权重
        })
      }

      // 2. 合并关键词搜索结果
      for (const result of keywordResults) {
        if (merged.has(result.noteId)) {
          const existing = merged.get(result.noteId)!
          merged.set(result.noteId, {
            ...existing,
            similarity: existing.similarity + result.similarity * 0.3 // 关键词权重
          })
        } else {
          merged.set(result.noteId, {
            ...result,
            similarity: result.similarity * 0.3
          })
        }
      }

      return Array.from(merged.values())
    } catch (error) {
      log.error('SemanticService: 结果融合失败:', error)
      return []
    }
  }

  /**
   * 重排序实现
   */
  private async rerank(results: SearchResult[], query: string): Promise<SearchResult[]> {
    try {
      if (results.length <= 1) return results

      // 1. 准备重排序数据
      const pairs = results.map((result) => ({
        query,
        text: result.text,
        initialScore: result.similarity
      }))

      // 2. 计算新的相似度分数
      const newScores = await Promise.all(
        pairs.map((pair) => this.calculateCrossEncoderScore(pair))
      )

      // 3. 合并分数
      const rerankedResults = results.map((result, index) => ({
        ...result,
        similarity: this.combineScores(result.similarity, newScores[index])
      }))

      // 4. 重新排序
      return rerankedResults.sort((a, b) => b.similarity - a.similarity)
    } catch (error) {
      log.error('SemanticService: 重排序失败:', error)
      return results
    }
  }

  /**
   * 计算交叉编码器分数
   */
  private async calculateCrossEncoderScore(pair: {
    query: string
    text: string
    initialScore: number
  }): Promise<number> {
    try {
      // 使用初始分数作为基准
      const baseScore = pair.initialScore

      // 计算查询和文本的重叠度
      const queryTerms = new Set(pair.query.toLowerCase().split(/\s+/))
      const textTerms = new Set(pair.text.toLowerCase().split(/\s+/))
      const overlap = [...queryTerms].filter((term) => textTerms.has(term)).length

      // 计算额外分数
      const overlapScore = (overlap / queryTerms.size) * 0.2

      return Math.min(baseScore + overlapScore, 1)
    } catch (error) {
      log.error('SemanticService: 计算交叉编码器分数失败:', error)
      return pair.initialScore
    }
  }

  /**
   * 合并分数
   */
  private combineScores(biEncoderScore: number, crossEncoderScore: number): number {
    return biEncoderScore * 0.7 + crossEncoderScore * 0.3
  }

  /**
   * 加载向量缓存
   */
  private async loadCache(): Promise<void> {
    try {
      log.info('SemanticService: 准备读取缓存:', {
        cachePath: this.cachePath,
        exists: await fs
          .access(this.cachePath)
          .then(() => true)
          .catch(() => false)
      })

      const data = await fs.readFile(this.cachePath, 'utf8')
      const cacheData = JSON.parse(data)
      this.vectorCache = new Map(Object.entries(cacheData))

      log.info('SemanticService: 向量缓存加载完成:', {
        cacheSize: this.vectorCache.size
      })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        log.info('SemanticService: 缓存文件不存在，创建新缓存')
        this.vectorCache = new Map()
        await this.saveCache()
      } else {
        log.error('SemanticService: 读取缓存失败:', error)
        throw error
      }
    }
  }

  /**
   * 保存向量缓存
   */
  private async saveCache(): Promise<void> {
    try {
      const cacheData = Object.fromEntries(this.vectorCache)
      const cacheDir = path.dirname(this.cachePath)

      // 确保缓存目录存在
      await fs.mkdir(cacheDir, { recursive: true })

      // 使用临时文件保存
      const tempPath = `${this.cachePath}.tmp`
      await fs.writeFile(tempPath, JSON.stringify(cacheData), 'utf8')
      await fs.rename(tempPath, this.cachePath)

      log.info('缓存保存成功:', {
        path: this.cachePath,
        size: this.vectorCache.size
      })
    } catch (error) {
      log.error('保存缓存失败:', error)
      throw error
    }
  }

  /**
   * 维护缓存大小
   */
  private async maintainCache(): Promise<void> {
    if (this.vectorCache.size > 1000) {
      const keys = Array.from(this.vectorCache.keys())
      for (let i = 0; i < 200; i++) {
        this.vectorCache.delete(keys[i])
      }
      await this.saveCache()
      log.info('SemanticService: 向量缓存已清理，当前大小:', this.vectorCache.size)
    }
  }

  /**
   * 清理缓存
   */
  public async clearCache(): Promise<void> {
    this.vectorCache.clear()
    await this.saveCache()
    log.info('SemanticService: 向量缓存已完全清理')
  }

  /**
   * 计算文本的哈希值
   */
  private hashText(text: string): string {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return hash.toString(36)
  }

  /**
   * 加载 FAISS 索引
   */
  private async loadFaissIndex(): Promise<void> {
    try {
      const indexPath = this.faissIndexPath
      const mappingPath = `${this.faissIndexPath}.mapping`

      log.info('SemanticService: 检查 FAISS 索引文件:', {
        indexPath,
        mappingPath
      })

      // 1. 检查文件是否存在
      const [indexExists, mappingExists] = await Promise.all([
        fs
          .access(indexPath)
          .then(() => true)
          .catch(() => false),
        fs
          .access(mappingPath)
          .then(() => true)
          .catch(() => false)
      ])

      // 2. 如果文件不存在，创建新索引
      if (!indexExists || !mappingExists) {
        log.info('SemanticService: 创建新的 FAISS 索引')
        this.faissIndex = new faiss.IndexFlatL2(this.dimension)
        this.vectorToIdMap = new Map()
        this.noteVectors = new Map()

        // 立即保存新创建的索引
        await this.saveFaissIndex()

        log.info('SemanticService: 新索引创建并保存完成:', {
          vectorCount: 0,
          mappingCount: 0
        })
        return
      }

      // 3. 加载现有索引
      this.faissIndex = faiss.IndexFlatL2.read(indexPath)
      const mappingData = await fs.readFile(mappingPath, 'utf8')
      const mapping = JSON.parse(mappingData)

      // 验证版本和维度
      if (mapping.dimension !== this.dimension) {
        throw new Error(`维度不匹配: 期望 ${this.dimension}, 实际 ${mapping.dimension}`)
      }

      this.vectorToIdMap = new Map(mapping.vectorToIdMap)
      this.noteVectors = new Map(Object.entries(mapping.noteVectors))

      log.info('SemanticService: 现有索引加载完成:', {
        vectorCount: this.faissIndex.ntotal(),
        mappingCount: this.vectorToIdMap.size,
        noteVectorsCount: this.noteVectors.size
      })
    } catch (error) {
      log.error('SemanticService: FAISS 索引操作失败:', error)
      throw error
    }
  }

  /**
   * 保存 FAISS 索引
   */
  public async saveFaissIndex(): Promise<void> {
    if (!this.faissIndex || !this.isFaissInitialized) return

    try {
      const directory = path.dirname(this.faissIndexPath)
      await fs.mkdir(directory, { recursive: true })

      // 1. 保存 FAISS 索引
      this.faissIndex.write(this.faissIndexPath)

      // 2. 保存元数据映射
      const mappingPath = `${this.faissIndexPath}.mapping`
      const mapping = {
        vectorToIdMap: Array.from(this.vectorToIdMap.entries()),
        noteVectors: Object.fromEntries(this.noteVectors),
        dimension: this.dimension,
        version: '1.0.0' // 添加版本信息
      }
      await fs.writeFile(mappingPath, JSON.stringify(mapping), 'utf8')

      log.info('SemanticService: 索引保存成功:', {
        indexPath: this.faissIndexPath,
        mappingPath,
        vectorCount: this.faissIndex.ntotal()
      })
    } catch (error) {
      log.error('SemanticService: 保存索引失败:', error)
      throw error
    }
  }

  /**
   * 添加向量到索引
   */
  public async addToIndex(noteId: string, vector: number[]): Promise<void> {
    if (!this.faissIndex) {
      throw new Error('FAISS 索引未初始化')
    }

    try {
      const existingIndex = this.vectorToIdMap.get(noteId)

      if (existingIndex !== undefined) {
        // 获取旧向量
        const oldVector = this.noteVectors.get(noteId)
        let similarity = 0

        if (oldVector) {
          // 计算新旧向量的余弦相似度
          const dotProduct = oldVector.reduce((sum, val, i) => sum + val * vector[i], 0)
          const oldNorm = Math.sqrt(oldVector.reduce((sum, val) => sum + val * val, 0))
          const newNorm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
          similarity = dotProduct / (oldNorm * newNorm)

          if (!this.isSignificantChange(similarity)) {
            log.info('SemanticService: 向量变化不显著，跳过更新:', {
              similarityLevel: this.getSimilarityLevel(similarity)
            })
            return
          }
        }

        // 创建新的 FAISS 索引
        const newIndex = new faiss.IndexFlatL2(this.dimension)
        const newMap = new Map<string, number>()
        let newIdx = 0

        // 重建索引，跳过要更新的向量
        for (const [id, oldVector] of this.noteVectors.entries()) {
          if (id !== noteId) {
            newIndex.add(oldVector)
            newMap.set(id, newIdx++)
          }
        }

        // 添加新向量
        newIndex.add(vector)
        newMap.set(noteId, newIdx)

        // 更新状态
        this.faissIndex = newIndex
        this.vectorToIdMap = newMap
        this.noteVectors.set(noteId, vector)

        log.info('SemanticService: 向量更新完成:', {
          noteId,
          newIndex: newIdx,
          totalVectors: this.faissIndex.ntotal(),
          vectorSimilarity: similarity,
          similarityLevel: this.getSimilarityLevel(similarity)
        })
      } else {
        // 新向量的处理
        const currentIndex = this.faissIndex.ntotal()
        this.faissIndex.add(vector)
        this.vectorToIdMap.set(noteId, currentIndex)
        this.noteVectors.set(noteId, vector)

        log.info('SemanticService: 新向量添加成功:', {
          noteId,
          vectorIndex: currentIndex,
          totalVectors: this.faissIndex.ntotal()
        })
      }

      // 保存更新后的索引
      await this.saveFaissIndex()
    } catch (error) {
      log.error('SemanticService: 添加/更新向量失败:', error)
      throw error
    }
  }

  /**
   * 判断向量变化是否显著
   */
  private isSignificantChange(similarity: number): boolean {
    return similarity < 0.85 // 可以根据需要调整阈值
  }

  /**
   * 获取文本的向量表示
   */
  public async getVector(text: string, noteId?: string): Promise<number[]> {
    if (!this.embeddings) {
      throw new Error('嵌入模型未初始化')
    }

    try {
      // 计算文本哈希
      const textHash = this.hashText(text)

      // 检查缓存
      const cachedVector = this.vectorCache.get(textHash)
      if (cachedVector) {
        const vector = JSON.parse(cachedVector)
        log.info('SemanticService: 使用缓存的向量:', {
          textHash,
          textLength: text.length,
          noteId,
          vectorLength: vector.length
        })
        return vector
      }

      // 生成新向量
      log.info('SemanticService: 开始生成新向量:', {
        textHash,
        textLength: text.length,
        noteId,
        isUpdate: noteId !== undefined
      })

      const vector = await this.embeddings(text)

      // 标准化向量
      const normalizedVector = this.normalizeVector(vector)

      // 更新缓存
      this.vectorCache.set(textHash, JSON.stringify(normalizedVector))
      await this.maintainCache()

      log.info('SemanticService: 新向量已生成:', {
        textHash,
        vectorLength: normalizedVector.length,
        textLength: text.length,
        noteId
      })

      return normalizedVector
    } catch (error) {
      log.error('SemanticService: 生成向量失败:', {
        error,
        textLength: text.length,
        noteId
      })
      throw error
    }
  }

  /**
   * 向量标准化
   */
  private normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    if (norm === 0) {
      log.warn('SemanticService: 向量标准化失败: 零向量')
      return vector
    }

    const normalized = vector.map((val) => val / norm)

    log.debug('SemanticService: 向量标准化:', {
      originalNorm: norm,
      normalizedNorm: Math.sqrt(normalized.reduce((sum, val) => sum + val * val, 0))
    })

    return normalized
  }

  private getIndexMapping(): Map<number, string> {
    try {
      // 创建反向映射：索引 -> 笔记ID
      const indexToNoteId = new Map<number, string>()

      // 从现有的 vectorToIdMap 创建反向映射
      for (const [noteId, index] of this.vectorToIdMap.entries()) {
        indexToNoteId.set(index, noteId)
      }

      log.debug('SemanticService: 索引映射获取成功:', {
        mappingSize: indexToNoteId.size,
        vectorMapSize: this.vectorToIdMap.size
      })

      return indexToNoteId
    } catch (error) {
      log.error('SemanticService: 获取索引映射失败:', error)
      return new Map()
    }
  }

  /**
   * 语义搜索
   */
  public async semanticSearch(query: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      if (!this.faissIndex) {
        log.warn('SemanticService: FAISS 索引未初始化')
        return []
      }

      const totalVectors = this.faissIndex.ntotal()
      if (totalVectors === 0) {
        log.info('SemanticService: 索引为空，无法搜索')
        return []
      }

      // 1. 查询向量生成
      const queryVector = await this.getVector(query)

      // 2. FAISS 搜索
      const searchK = Math.min(limit * 2, totalVectors)
      const results = this.faissIndex.search(queryVector, searchK)

      const searchResults: SearchResult[] = []
      const indexToNoteId = this.getIndexMapping()
      const MIN_SIMILARITY = 0.4

      // 3. 处理搜索结果
      for (let i = 0; i < results.labels.length; i++) {
        const index = results.labels[i]
        if (index === -1) continue

        const noteId = indexToNoteId.get(index)
        if (!noteId) continue

        // 获取笔记内容
        const note = await getNoteById(noteId)
        if (!note) continue

        // 计算相似度
        const l2Distance = results.distances[i]
        const similarity = 1 / (1 + Math.sqrt(l2Distance))

        if (similarity < MIN_SIMILARITY) {
          log.debug('SemanticService: 相似度低于阈值，跳过:', {
            noteId,
            similarity,
            threshold: MIN_SIMILARITY
          })
          continue
        }

        // 构建搜索结果
        const metadata: ChunkMetadata = {
          startPos: 0,
          endPos: 0,
          source: {
            noteId,
            section: 'content'
          },
          highlights: [] // 可以后续实现高亮
        }

        searchResults.push({
          noteId,
          text: extractTextFromContent(note.content),
          similarity,
          similarityLevel: this.getSimilarityLevel(similarity),
          metadata
        })
      }

      // 4. 按相似度降序排序
      const finalResults = searchResults.sort((a, b) => b.similarity - a.similarity).slice(0, limit)

      log.info('SemanticService: 语义搜索完成:', {
        query,
        resultCount: finalResults.length,
        candidateCount: searchResults.length,
        topSimilarity: finalResults[0]?.similarity,
        totalVectors
      })

      return finalResults
    } catch (error) {
      log.error('SemanticService: 语义搜索失败:', error)
      return []
    }
  }

  /**
   * 获取相似度等级描述
   */
  private getSimilarityLevel(similarity: number): string {
    if (similarity >= 0.8) return '几乎相同'
    if (similarity >= 0.6) return '高度相关'
    if (similarity >= 0.4) return '相关'
    if (similarity >= 0.3) return '部分相关'
    return '不相关'
  }

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i]
      norm1 += vec1[i] * vec1[i]
      norm2 += vec2[i] * vec2[i]
    }

    norm1 = Math.sqrt(norm1)
    norm2 = Math.sqrt(norm2)

    if (norm1 === 0 || norm2 === 0) return 0
    return dotProduct / (norm1 * norm2)
  }

  /**
   * 计算两段文本的语义相似度
   */
  public async calculateSimilarity(text1: string, text2: string): Promise<number> {
    try {
      const [vector1, vector2] = await Promise.all([this.getVector(text1), this.getVector(text2)])

      return this.cosineSimilarity(vector1, vector2)
    } catch (error) {
      log.error('SemanticService: 计算相似度失败:', error)
      throw error
    }
  }

  /**
   * 计算混合相似度
   */
  public async calculateHybridSimilarity(
    content1: any,
    content2: any,
    keywords1: string[],
    keywords2: string[]
  ): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      // 1. 计算语义相似度
      const text1 = extractTextFromContent(content1)
      const text2 = extractTextFromContent(content2)
      const semanticSimilarity = await this.calculateSimilarity(text1, text2)

      // 2. 计算关键词相似度
      const keywordSimilarity = this.calculateKeywordSimilarity(keywords1, keywords2)

      // 3. 权重配置
      const SEMANTIC_WEIGHT = 0.7 // 增加语义相似度的权重
      const KEYWORD_WEIGHT = 0.3 // 降低关键词相似度的权重

      // 4. 计算混合相似度
      const hybridSimilarity =
        semanticSimilarity * SEMANTIC_WEIGHT + keywordSimilarity * KEYWORD_WEIGHT

      log.info('SemanticService: 混合相似度计算结果:', {
        语义相似度: semanticSimilarity.toFixed(3),
        关键词相似度: keywordSimilarity.toFixed(3),
        最终相似度: hybridSimilarity.toFixed(3)
      })

      return hybridSimilarity
    } catch (error) {
      log.error('SemanticService: 计算混合相似度失败:', error)
      return 0
    }
  }

  // 更新关键词相似度计算方法
  private calculateKeywordSimilarity(keywords1: string[], keywords2: string[]): number {
    if (!keywords1.length || !keywords2.length) return 0

    // 计算交集大小
    const intersection = keywords1.filter((k) => keywords2.includes(k))

    // 使用 Jaccard 相似度
    const union = new Set([...keywords1, ...keywords2])
    const similarity = intersection.length / union.size

    log.debug('SemanticService: 关键词相似度详情:', {
      关键词1: keywords1.join(', '),
      关键词2: keywords2.join(', '),
      交集数量: intersection.length,
      并集数量: union.size,
      相似度: similarity.toFixed(3)
    })

    return similarity
  }

  /**
   * 查找相似笔记
   */
  public async findSimilarNotes(
    content: any,
    limit: number = 5
  ): Promise<Array<{ id: string; similarity: number }>> {
    try {
      const text = extractTextFromContent(content)
      const vector = await this.getVector(text)

      if (!this.faissIndex) {
        throw new Error('FAISS 索引未初始化')
      }

      // 执行搜索
      const searchResults = this.faissIndex.search(vector, limit)

      // 创建索引到ID的映射
      const indexToNoteId = this.getIndexMapping()

      // 处理结果
      const results = searchResults.labels
        .map((index: number, i: number) => {
          const noteId = indexToNoteId.get(index)
          if (!noteId) return null

          const l2Distance = searchResults.distances[i]
          const similarity = 1 / (1 + Math.sqrt(l2Distance))

          return {
            id: noteId,
            similarity
          }
        })
        .filter((result): result is { id: string; similarity: number } => result !== null)

      log.info('SemanticService: 相似笔记搜索完成:', {
        queryLength: text.length,
        resultsCount: results.length,
        topSimilarity: results[0]?.similarity
      })

      return results
    } catch (error) {
      log.error('SemanticService: 查找相似笔记失败:', error)
      return []
    }
  }

  /**
   * 搜索相似向量
   */
  private async searchSimilar(
    vector: number[],
    k: number = 5
  ): Promise<Array<{ id: string; similarity: number }>> {
    if (!this.faissIndex) {
      throw new Error('FAISS 索引未初始化')
    }

    try {
      const result = this.faissIndex.search(vector, k)

      // 创建索引到ID的反向映射
      const indexToId = new Map<number, string>()
      for (const [noteId, index] of this.vectorToIdMap.entries()) {
        indexToId.set(index, noteId)
      }

      return result.labels
        .map((index: number, i: number) => {
          const noteId = indexToId.get(index)
          return {
            id: noteId || '',
            similarity: 1 - result.distances[i]
          }
        })
        .filter((item) => item.id !== '')
    } catch (error) {
      log.error('SemanticService: FAISS 搜索失败:', error)
      throw error
    }
  }

  /**
   * 清理笔记的向量数据
   */
  public async clearNoteVectorData(noteId: string): Promise<void> {
    try {
      this.noteVectors.delete(noteId)
      this.vectorToIdMap.delete(noteId)
      log.info('SemanticService: 向量数据已清理:', { noteId })
    } catch (error) {
      log.error('SemanticService: 清理向量数据失败:', error)
      throw error
    }
  }

  /**
   * 测试语义搜索
   */
  public async testSemanticSearch(): Promise<void> {
    try {
      log.info('SemanticService: 开始测试语义搜索')

      const queries = ['测试笔记', '语义向量', '今天天气', 'AI 和机器学习']

      for (const query of queries) {
        log.info(`SemanticService: 测试查询: "${query}"`)
        const results = await this.semanticSearch(query, 5)
        log.info('SemanticService: 搜索结果:', {
          query,
          resultsCount: results.length,
          results: results.map((r) => ({
            noteId: r.noteId,
            similarity: r.similarity.toFixed(4),
            level: r.similarityLevel
          }))
        })
      }

      log.info('SemanticService: 语义搜索测试完成')
    } catch (error) {
      log.error('SemanticService: 语义搜索测试失败:', error)
    }
  }

  /**
   * 批量重建索引
   */
  public async rebuildIndex(notes: { id: string; content: any }[]): Promise<void> {
    if (!this.faissIndex) {
      throw new Error('FAISS 索引未初始化')
    }

    try {
      log.info('SemanticService: 开始重建向量索引...')

      // 清空现有索引
      this.faissIndex = new faiss.IndexFlatL2(this.dimension)
      this.vectorToIdMap.clear()
      this.noteVectors.clear()

      // 批量添加笔记
      for (const note of notes) {
        const text = extractTextFromContent(note.content)
        const vector = await this.getVector(text, note.id)
        await this.addToIndex(note.id, vector)
      }

      await this.saveFaissIndex()
      log.info('SemanticService: 向量索引重建完成，总数:', this.faissIndex.ntotal())
    } catch (error) {
      log.error('SemanticService: 重建向量索引失败:', error)
      throw error
    }
  }
}
