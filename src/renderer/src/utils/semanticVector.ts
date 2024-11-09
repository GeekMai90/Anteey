import { Keyword } from '../types/Note'
import log from 'electron-log'
import { calculateSimilarity as calculateKeywordSimilarity } from './noteSililarity'
import { extractTextFromContent } from './keywordExtractor'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import faiss from 'faiss-node'

// 添加新的类型定义
// interface VectorData {
//   vector: number[]
//   index: number
// }

export class SemanticVectorizer {
  private static instance: SemanticVectorizer
  private isInitialized: boolean = false
  private embeddings: any = null
  private cachePath: string
  private faissIndexPath: string
  private faissIndex: faiss.IndexFlatL2 | null = null // 添加 FAISS 索引
  private dimension: number = 384 // MiniLM 模型输出维度
  private vectorToIdMap: Map<string, number> = new Map() // 笔记 ID 到向量索引的映射
  private vectorCache: Map<string, string> = new Map() // 文本哈希到压缩向量的映射
  private noteVectors: Map<string, number[]> = new Map() // 笔记 ID 到向量的映射
  // 添加新的初始化状态标志
  private isFaissInitialized: boolean = false

  private constructor() {
    const userDataPath = app.getPath('userData')
    this.cachePath = path.join(userDataPath, 'cache', 'embeddings.cache.json')
    this.faissIndexPath = path.join(userDataPath, 'cache', 'faiss.index') // 添加 FAISS 索引文件路径
    log.info('初始化 SemanticVectorizer，缓存路径:', this.cachePath)
  }
  // private constructor() {
  //   // 判断是否在测试环境
  //   if (process.env.NODE_ENV === 'test') {
  //     // 使用临时目录作为测试缓存路径
  //     const tmpDir = path.join(process.cwd(), 'tmp', 'test-cache')
  //     if (!fs.existsSync(tmpDir)) {
  //       fs.mkdirSync(tmpDir, { recursive: true })
  //     }
  //     this.cachePath = path.join(tmpDir, 'embeddings.cache.json')
  //   } else {
  //     // 正常环境使用 electron 的 app.getPath
  //     const userDataPath = app.getPath('userData')
  //     this.cachePath = path.join(userDataPath, 'cache', 'embeddings.cache.json')
  //   }

  //   log.info('初始化 SemanticVectorizer，缓存路径:', this.cachePath)
  // }

  public static getInstance(): SemanticVectorizer {
    if (!SemanticVectorizer.instance) {
      SemanticVectorizer.instance = new SemanticVectorizer()
    }
    return SemanticVectorizer.instance
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      log.info('初始化语义向量模型和 FAISS 索引...')

      // 先加载向量缓存
      await this.loadCache()

      // 加载或创建 FAISS 索引
      await this.loadFaissIndex()

      // 如果加载失败，确保有一个可用的索引
      if (!this.faissIndex) {
        this.faissIndex = new faiss.IndexFlatL2(this.dimension)
        this.noteVectors = new Map()
        this.vectorToIdMap = new Map()
        log.info('创建新的 FAISS 索引')
      }

      // 初始化嵌入模型
      const embeddings = (await import('@themaximalist/embeddings.js')).default
      await embeddings('测试文本', { cache_file: this.cachePath })
      this.embeddings = embeddings

      this.isInitialized = true
      log.info('初始化完成:', {
        hasCache: this.vectorCache.size > 0,
        vectorCount: this.faissIndex.ntotal(),
        mappingCount: this.vectorToIdMap.size
      })
    } catch (error) {
      log.error('初始化失败:', error)
      throw error
    }
  }

  // 新增 FAISS 初始化方法
  public async initializeFaiss(): Promise<void> {
    if (this.isFaissInitialized) return

    try {
      log.info('初始化 FAISS 索引...')

      // 加载或创建 FAISS 索引
      await this.loadFaissIndex()

      // 确保有可用的索引
      if (!this.faissIndex) {
        this.faissIndex = new faiss.IndexFlatL2(this.dimension)
        this.noteVectors = new Map()
        this.vectorToIdMap = new Map()
        log.info('创建新的 FAISS 索引')
      }

      this.isFaissInitialized = true
      log.info('FAISS 初始化完成:', {
        vectorCount: this.faissIndex?.ntotal() || 0,
        mappingCount: this.vectorToIdMap.size
      })
    } catch (error) {
      log.error('FAISS 初始化失败:', error)
      throw error
    }
  }

  // 添加检查方法
  public isFaissReady(): boolean {
    return this.isFaissInitialized && this.faissIndex !== null
  }

  // 添加向量到 FAISS 索引
  private async loadFaissIndex(): Promise<void> {
    try {
      log.info('准备读取 FAISS 索引，路径是:', {
        indexPath: this.faissIndexPath,
        exists: fs.existsSync(this.faissIndexPath)
      })

      if (fs.existsSync(this.faissIndexPath)) {
        // 读取索引数据
        const indexData = fs.readFileSync(this.faissIndexPath).toString('base64')
        this.faissIndex = faiss.IndexFlatL2.read(indexData)

        // 读取映射数据
        const mappingPath = `${this.faissIndexPath}.mapping`
        if (fs.existsSync(mappingPath)) {
          const mappingData = fs.readFileSync(mappingPath, 'utf8')
          const mapping = JSON.parse(mappingData)
          this.vectorToIdMap = new Map(mapping.vectorToIdMap)
          this.noteVectors = new Map(
            Object.entries(mapping.noteVectors).map(([key, value]) => [key, value as number[]])
          )
        }

        log.info('FAISS 索引加载成功:', {
          vectorCount: this.faissIndex.ntotal(),
          mappingCount: this.vectorToIdMap.size
        })
      } else {
        this.faissIndex = new faiss.IndexFlatL2(this.dimension)
        log.info('创建新的 FAISS 索引')
      }
    } catch (error) {
      log.error('读取 FAISS 索引失败:', {
        error: error as Error,
        indexPath: this.faissIndexPath,
        errorMessage: (error as Error).message
      })
      // 如果读取失败，创建新的索引
      this.faissIndex = new faiss.IndexFlatL2(this.dimension)
    }
  }

  private async saveFaissIndex(): Promise<void> {
    try {
      if (!this.faissIndex) return

      const indexDir = path.dirname(this.faissIndexPath)

      // 确保目录存在
      if (!fs.existsSync(indexDir)) {
        fs.mkdirSync(indexDir, { recursive: true, mode: 0o777 })
      }

      // 保存索引数据到临时文件
      const tempIndexPath = `${this.faissIndexPath}.tmp`
      this.faissIndex.write(tempIndexPath) // 直接写入文件，不需要中间变量

      // 保存映射数据到临时文件
      const tempMappingPath = `${this.faissIndexPath}.mapping.tmp`
      const mapping = {
        vectorToIdMap: Array.from(this.vectorToIdMap.entries()),
        noteVectors: Object.fromEntries(this.noteVectors)
      }
      fs.writeFileSync(tempMappingPath, JSON.stringify(mapping), {
        encoding: 'utf8',
        mode: 0o666
      })

      // 重命名临时文件为正式文件
      fs.renameSync(tempIndexPath, this.faissIndexPath)
      fs.renameSync(tempMappingPath, `${this.faissIndexPath}.mapping`)

      log.info('FAISS 索引保存成功:', {
        路径: this.faissIndexPath,
        向量数量: this.faissIndex.ntotal(),
        映射数量: this.vectorToIdMap.size
      })
    } catch (error) {
      log.error('保存 FAISS 索引失败:', error)
    }
  }

  /**
   * 批量重建索引
   * @param notes 所有笔记数据
   */
  public async rebuildIndex(notes: { id: string; content: any }[]): Promise<void> {
    if (!this.faissIndex) {
      throw new Error('FAISS 索引未初始化')
    }

    try {
      log.info('开始重建向量索引...')

      // 清空现有索引
      this.faissIndex = new faiss.IndexFlatL2(this.dimension)
      this.vectorToIdMap.clear()

      // 批量添加笔记
      for (const note of notes) {
        const text = extractTextFromContent(note.content)
        const vector = await this.getVector(text, note.id)
        await this.addToIndex(note.id, vector)
      }

      log.info('向量索引重建完成，总数:', this.faissIndex.ntotal())
    } catch (error) {
      log.error('重建向量索引失败:', error)
      throw error
    }
  }

  /**
   * 查找相似笔记
   * @param content 笔记内容
   * @param limit 返回结果数量
   */
  public async findSimilarNotes(
    content: any,
    limit: number = 5
  ): Promise<Array<{ id: string; similarity: number }>> {
    try {
      const text = extractTextFromContent(content)
      const vector = await this.getVector(text)
      return await this.searchSimilar(vector, limit)
    } catch (error) {
      log.error('查找相似笔记失败:', error)
      return []
    }
  }

  // 搜索相似向量
  public async searchSimilar(
    vector: number[],
    k: number = 5
  ): Promise<Array<{ id: string; similarity: number }>> {
    if (!this.faissIndex) {
      throw new Error('FAISS 索引未初始化')
    }

    try {
      const result = this.faissIndex.search(vector, k)

      // 创建一个索引到 ID 的反向映射
      const indexToId = new Map<number, string>()
      for (const [noteId, index] of this.vectorToIdMap.entries()) {
        indexToId.set(index, noteId)
      }

      return result.labels
        .map((index: number, i: number) => {
          const noteId = indexToId.get(index)
          return {
            id: noteId || '',
            similarity: 1 - result.distances[i] // 转换距离为相似度
          }
        })
        .filter((item) => item.id !== '') // 过滤掉无效的结果
    } catch (error) {
      log.error('FAISS 搜索失败:', error)
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
    // 使用简单的 djb2 哈希算法，但增加一些改进
    let hash = 5381
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = (hash << 5) + hash + char // hash * 33 + char
      hash = hash >>> 0 // 保持为 32 位无符号整数
    }
    // 使用 36 进制可以得到更短的字符串
    return hash.toString(36)
  }

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

          // 使用 isSignificantChange 方法判断是否需要更新
          const hasSignificantChange = this.isSignificantChange(similarity)

          log.info('向量比较:', {
            noteId,
            similarity,
            similarityLevel: this.getSimilarityLevel(similarity),
            textHash: this.hashText(vector.join(',')),
            significantChange: hasSignificantChange
          })

          if (!hasSignificantChange) {
            log.info('向量变化不显著，跳过更新:', {
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

        // 保存更新后的索引
        await this.saveFaissIndex()

        log.info('向量更新完成:', {
          noteId,
          newIndex: newIdx,
          totalVectors: this.faissIndex.ntotal(),
          vectorSimilarity: similarity,
          similarityLevel: this.getSimilarityLevel(similarity),
          contentChanged: this.isSignificantChange(similarity)
        })
      } else {
        // 新向量的处理
        const currentIndex = this.faissIndex.ntotal()
        this.faissIndex.add(vector)
        this.vectorToIdMap.set(noteId, currentIndex)
        this.noteVectors.set(noteId, vector)

        // 保存更新后的索引
        await this.saveFaissIndex()

        log.info('新向量添加成功:', {
          noteId,
          vectorIndex: currentIndex,
          totalVectors: this.faissIndex.ntotal(),
          isFirstVector: currentIndex === 0,
          similarityLevel: '新建笔记'
        })
      }

      // 更新向量缓存
      const textHash = this.hashText(vector.join(','))
      this.vectorCache.set(textHash, JSON.stringify(vector))
      await this.saveCache()
    } catch (error) {
      log.error('添加/更新向量失败:', error)
      throw error
    }
  }

  // 添加一个辅助方法来检查向量变化
  private isSignificantChange(similarity: number): boolean {
    return similarity < 0.85 // 可以根据需要调整阈值
  }
  // 添加一个辅助方法来分类相似度
  private getSimilarityLevel(similarity: number): string {
    if (similarity >= 0.85) {
      return '几乎相同'
    } else if (similarity >= 0.7) {
      return '高度相关'
    } else if (similarity >= 0.5) {
      return '部分相关'
    } else {
      return '不相关'
    }
  }
  // 添加辅助方法用于调试
  private calculateDotProduct(vec1: number[], vec2: number[]): number {
    let dotProduct = 0
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i]
    }
    return dotProduct
  }

  private calculateNorm(vec: number[]): number {
    let norm = 0
    for (let i = 0; i < vec.length; i++) {
      norm += vec[i] * vec[i]
    }
    return Math.sqrt(norm)
  }

  // 辅助方法：更新索引映射
  private updateMappings(excludeIndex: number): void {
    const newMap = new Map<string, number>()
    for (const [noteId, oldIndex] of this.vectorToIdMap.entries()) {
      if (oldIndex < excludeIndex) {
        newMap.set(noteId, oldIndex)
      } else if (oldIndex > excludeIndex) {
        newMap.set(noteId, oldIndex - 1)
      }
    }
    this.vectorToIdMap = newMap
  }

  public async getVector(text: string, noteId?: string): Promise<number[]> {
    if (!this.embeddings) {
      throw new Error('嵌入模型未初始化')
    }

    try {
      // 使用原有的 hashText 方法计算文本哈希
      const textHash = this.hashText(text)

      // 检查缓存
      const cachedVector = this.vectorCache.get(textHash)
      if (cachedVector) {
        const vector = JSON.parse(cachedVector)
        log.info('使用缓存的向量:', {
          textHash,
          textLength: text.length,
          noteId,
          vectorLength: vector.length
        })
        return vector
      }

      // 生成新向量
      log.info('开始生成新向量:', {
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
      await this.saveCache()

      log.info('新向量已生成:', {
        textHash,
        vectorLength: normalizedVector.length,
        textLength: text.length,
        noteId
      })

      return normalizedVector
    } catch (error) {
      log.error('生成向量失败:', {
        error,
        textLength: text.length,
        noteId
      })
      throw error
    }
  }

  // 添加向量标准化方法
  private normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    if (norm === 0) {
      log.warn('向量标准化失败: 零向量')
      return vector
    }
    const normalized = vector.map((val) => val / norm)

    log.debug('向量标准化:', {
      originalNorm: norm,
      normalizedNorm: Math.sqrt(normalized.reduce((sum, val) => sum + val * val, 0))
    })

    return normalized
  }
  // 添加新方法：清理向量数据
  public async clearVectorData(noteId: string): Promise<void> {
    this.noteVectors.delete(noteId)
    this.vectorToIdMap.delete(noteId)
    log.info('向量数据已清理:', { noteId })
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

  // 语义搜索
  public async semanticSearch(
    query: string,
    limit: number = 10
  ): Promise<
    Array<{
      noteId: string
      similarity: number
      similarityLevel: string
    }>
  > {
    try {
      if (!this.faissIndex) {
        throw new Error('FAISS 索引未初始化')
      }

      // 1. 将查询文本转换为向量
      const queryVector = await this.getVector(query)

      // 2. 使用 FAISS 进行最近邻搜索
      const searchVector = Array.from(queryVector)
      const k = Math.min(limit, this.faissIndex.ntotal())
      const results = this.faissIndex.search(searchVector, k)

      // 3. 从缓存中获取映射数据
      const mappingContent = await fs.promises.readFile(this.faissIndexPath + '.mapping', 'utf8')
      const mappingData = JSON.parse(mappingContent) as {
        vectorToIdMap: [string, number][] // 明确定义映射数据的类型
      }

      // 创建反向映射：索引 -> 笔记ID
      const indexToNoteId = new Map(
        mappingData.vectorToIdMap.map(([noteId, index]) => [index, noteId])
      )

      // 4. 处理搜索结果
      const searchResults: Array<{
        noteId: string
        similarity: number
        similarityLevel: string
      }> = []

      for (let i = 0; i < results.labels.length; i++) {
        const index = results.labels[i]
        if (index === -1) continue

        const noteId = indexToNoteId.get(index)
        if (!noteId) continue // 跳过找不到对应 ID 的结果

        const similarity = 1 - results.distances[i]

        searchResults.push({
          noteId,
          similarity,
          similarityLevel: this.getSimilarityLevel(similarity)
        })
      }

      log.info('语义搜索完成:', {
        query,
        resultCount: searchResults.length,
        topSimilarity: searchResults[0]?.similarity
      })

      return searchResults
    } catch (error) {
      log.error('语义搜索失败:', error)
      throw error
    }
  }

  // 添加测试方法
  public async testSemanticSearch(): Promise<void> {
    try {
      log.info('开始测试语义搜索')

      // 测试不同类型的查询
      const queries = ['测试笔记', '语义向量', '今天天气', 'AI 和机器学习']

      for (const query of queries) {
        log.info(`测试查询: "${query}"`)
        const results = await this.semanticSearch(query, 5)
        log.info('搜索结果:', {
          query,
          resultsCount: results.length,
          results: results.map((r) => ({
            noteId: r.noteId,
            similarity: r.similarity.toFixed(4),
            level: r.similarityLevel
          }))
        })
      }

      log.info('语义搜索测试完成')
    } catch (error) {
      log.error('语义搜索测试失败:', error)
    }
  }
}
