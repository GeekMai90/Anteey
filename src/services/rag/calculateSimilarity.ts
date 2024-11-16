import log from 'electron-log'

export class SimilarityService {
  // 将二进制向量转换为数字数组
  static blobToFloat32Array(blob: Buffer): Float32Array {
    try {
      return new Float32Array(blob.buffer)
    } catch (error) {
      log.error('向量转换失败:', error)
      throw error
    }
  }

  // 计算向量余弦相似度
  static vectorSimilarity(a: Float32Array, b: Float32Array): number {
    try {
      let dotProduct = 0
      let normA = 0
      let normB = 0

      for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i]
        normA += a[i] * a[i]
        normB += b[i] * b[i]
      }

      const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
      return Number.isNaN(similarity) ? 0 : similarity
    } catch (error) {
      log.error('向量相似度计算失败:', error)
      return 0
    }
  }

  // 计算两个笔记的相似度
  static calculateSimilarity(sourceVector: Float32Array, targetVector: Float32Array): number {
    try {
      return this.vectorSimilarity(sourceVector, targetVector)
    } catch (error) {
      log.error('相似度计算失败:', error)
      return 0
    }
  }

  /**
   * 组合相似度因子
   */
  private static combineFactors(factors: {
    vectorSimilarity: number
    timeDecay: number
    keywordSimilarity: number
    titleSimilarity: number
  }): number {
    // 调整权重分配
    const weights = {
      vectorSimilarity: 0.55, // 降低向量权重
      keywordSimilarity: 0.25, // 提高关键词权重
      timeDecay: 0.1, // 保持时间权重
      titleSimilarity: 0.1 // 保持标题权重
    }

    // 添加关键词惩罚机制
    const keywordPenalty = factors.keywordSimilarity === 0 ? 0.8 : 1.0

    // 计算基础分数
    const baseScore = Object.entries(weights).reduce((score, [key, weight]) => {
      return score + factors[key as keyof typeof factors] * weight
    }, 0)

    // 应用关键词惩罚
    const finalScore = baseScore * keywordPenalty

    // 记录详细的计算过程
    log.debug('相似度组合计算:', {
      原始分数: {
        向量: factors.vectorSimilarity,
        关键词: factors.keywordSimilarity,
        时间: factors.timeDecay,
        标题: factors.titleSimilarity
      },
      权重: weights,
      基础分数: baseScore,
      关键词惩罚: keywordPenalty,
      最终分数: finalScore
    })

    return finalScore
  }

  /**
   * 计算关键词相似度
   */
  private static calculateKeywordSimilarity(
    sourceKeywords: string[],
    targetKeywords: string[]
  ): number {
    if (!sourceKeywords.length || !targetKeywords.length) return 0

    // 转换为 Set 以便快速查找
    const sourceSet = new Set(sourceKeywords)
    const targetSet = new Set(targetKeywords)

    // 计算交集大小
    const intersection = new Set([...sourceSet].filter((x) => targetSet.has(x)))

    // 使用 Jaccard 相似度
    const union = new Set([...sourceSet, ...targetSet])
    return intersection.size / union.size
  }

  /**
   * 计算标题相似度
   */
  private static calculateTitleSimilarity(query: string, title?: string): number {
    if (!query || !title) return 0

    // 将查询和标题转换为小写并分词
    const queryWords = new Set(query.toLowerCase().split(/\s+/).filter(Boolean))
    const titleWords = new Set(title.toLowerCase().split(/\s+/).filter(Boolean))

    // 如果任一集合为空，返回0
    if (queryWords.size === 0 || titleWords.size === 0) return 0

    // 计算词重叠度
    const intersection = new Set([...queryWords].filter((x) => titleWords.has(x)))
    return intersection.size / Math.max(queryWords.size, titleWords.size)
  }

  /**
   * 增强版相似度计算 V2
   * 结合向量相似度、关键词相似度和时间衰减
   */
  // static calculateEnhancedSimilarity(
  //   sourceVector: Float32Array,
  //   targetVector: Float32Array,
  //   metadata: {
  //     createdAt: number
  //     sourceKeywords: string[]
  //     targetKeywords: string[]
  //   }
  // ): number {
  //   try {
  //     // 1. 计算向量余弦相似度
  //     const vectorSimilarity = this.vectorSimilarity(sourceVector, targetVector)

  //     // 2. 计算关键词相似度
  //     const keywordSimilarity = this.calculateKeywordSimilarity(
  //       metadata.sourceKeywords,
  //       metadata.targetKeywords
  //     )

  //     // 3. 计算时间衰减因子
  //     const timeAgeInDays = (Date.now() - metadata.createdAt) / (24 * 60 * 60 * 1000)
  //     const timeDecay = 1 / (1 + Math.log1p(timeAgeInDays / 30))

  //     // 4. 组合所有因子
  //     const combinedScore = this.combineFactors({
  //       vectorSimilarity,
  //       keywordSimilarity,
  //       timeDecay
  //     })

  //     log.debug('相似度计算详情:', {
  //       vectorSimilarity,
  //       keywordSimilarity,
  //       timeDecay,
  //       combinedScore
  //     })

  //     return combinedScore
  //   } catch (error) {
  //     log.error('增强相似度计算失败:', error)
  //     return 0
  //   }
  // }
  /**
   * 增强版相似度计算
   */
  static calculateEnhancedSimilarity(
    sourceVector: Float32Array,
    targetVector: Float32Array,
    metadata: {
      createdAt: number
      sourceKeywords: string[]
      targetKeywords: string[]
      title?: string // 可选的标题
      query?: string // 可选的查询文本
    }
  ): number {
    try {
      // 1. 向量相似度
      const vectorSimilarity = this.vectorSimilarity(sourceVector, targetVector)

      // 2. 关键词相似度
      const keywordSimilarity = this.calculateKeywordSimilarity(
        metadata.sourceKeywords,
        metadata.targetKeywords
      )

      // 3. 时间衰减
      const timeAgeInDays = (Date.now() - metadata.createdAt) / (24 * 60 * 60 * 1000)
      const timeDecay = 1 / (1 + Math.log1p(timeAgeInDays / 30))

      // 4. 标题相似度
      const titleSimilarity = this.calculateTitleSimilarity(metadata.query || '', metadata.title)

      // 5. 组合所有因子
      const combinedScore = this.combineFactors({
        vectorSimilarity,
        keywordSimilarity,
        timeDecay,
        titleSimilarity
      })

      // 详细日志记录
      log.debug('相似度计算详情:', {
        vectorSimilarity,
        keywordSimilarity,
        timeDecay,
        titleSimilarity,
        combinedScore,
        metadata: {
          hasTitle: !!metadata.title,
          keywordsCount: {
            source: metadata.sourceKeywords.length,
            target: metadata.targetKeywords.length
          },
          createdDaysAgo: Math.floor(timeAgeInDays)
        }
      })

      return combinedScore
    } catch (error) {
      log.error('增强相似度计算失败:', error)
      return 0
    }
  }
}
