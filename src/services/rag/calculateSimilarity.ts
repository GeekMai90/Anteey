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
  // static vectorSimilarity(a: Float32Array, b: Float32Array): number {
  //   try {
  //     let dotProduct = 0
  //     let normA = 0
  //     let normB = 0

  //     for (let i = 0; i < a.length; i++) {
  //       dotProduct += a[i] * b[i]
  //       normA += a[i] * a[i]
  //       normB += b[i] * b[i]
  //     }

  //     const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))

  //     // 直接返回余弦相似度，只处理边界情况
  //     return Number.isNaN(similarity) ? 0 : Math.max(0, Math.min(1, similarity))
  //   } catch (error) {
  //     log.error('向量相似度计算失败:', error)
  //     return 0
  //   }
  // }
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

      const rawSimilarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))

      // 将[-1,1]映射到[0,1]，并调整分布
      const normalizedSimilarity = (rawSimilarity + 1) / 2

      // 使用分段函数调整分数
      let enhancedSimilarity = 0
      if (normalizedSimilarity < 0.5) {
        // 0-0.5 区间压缩到 0-0.3
        enhancedSimilarity = normalizedSimilarity * 0.6
      } else if (normalizedSimilarity < 0.8) {
        // 0.5-0.8 区间映射到 0.3-0.7
        enhancedSimilarity = 0.3 + (normalizedSimilarity - 0.5) * 1.33
      } else {
        // 0.8-1.0 区间映射到 0.7-1.0
        enhancedSimilarity = 0.7 + (normalizedSimilarity - 0.8) * 1.5
      }

      return Number.isNaN(enhancedSimilarity) ? 0 : enhancedSimilarity
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

  // 计算关键词相似度
  private static calculateKeywordSimilarity(
    sourceKeywords: string[],
    targetKeywords: string[]
  ): number {
    if (!sourceKeywords.length || !targetKeywords.length) return 0

    const sourceSet = new Set(sourceKeywords)
    const targetSet = new Set(targetKeywords)
    const intersection = new Set([...sourceSet].filter((x) => targetSet.has(x)))
    const union = new Set([...sourceSet, ...targetSet])

    return intersection.size / union.size
  }

  // 组合相似度计算
  // private static combineFactors(factors: {
  //   vectorSimilarity: number
  //   keywordSimilarity: number
  // }): number {
  //   const weights = {
  //     vectorSimilarity: 0.55, // 降低向量权重
  //     keywordSimilarity: 0.45 // 提高关键词权重
  //   }

  //   // 如果完全没有关键词匹配，显著降低分数
  //   const keywordPenalty = factors.keywordSimilarity === 0 ? 0.5 : 1.0

  //   const baseScore = Object.entries(weights).reduce((total, [key, weight]) => {
  //     return total + factors[key as keyof typeof factors] * weight
  //   }, 0)

  //   return baseScore * keywordPenalty
  // }

  private static combineFactors(factors: {
    vectorSimilarity: number
    keywordSimilarity: number
  }): number {
    // 基础权重
    const weights = {
      vectorSimilarity: 0.65, // 向量相似度权重提高
      keywordSimilarity: 0.35 // 关键词作为辅助判断
    }

    // 关键词匹配程度的影响
    let keywordMultiplier = 1.0
    if (factors.keywordSimilarity === 0) {
      keywordMultiplier = 0.3 // 无关键词匹配严重降分
    } else if (factors.keywordSimilarity > 0.3) {
      keywordMultiplier = 1.2 // 较好的关键词匹配加分
    }

    // 计算基础分数
    const baseScore = Object.entries(weights).reduce((total, [key, weight]) => {
      return total + factors[key as keyof typeof factors] * weight
    }, 0)

    // 应用关键词影响
    const finalScore = baseScore * keywordMultiplier

    // 确保分数在合理范围内
    return Math.max(0, Math.min(1, finalScore))
  }
  // 增强版相似度计算
  static calculateEnhancedSimilarity(
    sourceVector: Float32Array,
    targetVector: Float32Array,
    metadata: {
      sourceKeywords: string[]
      targetKeywords: string[]
    }
  ): number {
    try {
      // 1. 计算向量相似度
      const vectorSimilarity = this.vectorSimilarity(sourceVector, targetVector)

      // 2. 计算关键词相似度
      const keywordSimilarity = this.calculateKeywordSimilarity(
        metadata.sourceKeywords,
        metadata.targetKeywords
      )

      // 3. 组合计算
      const combinedScore = this.combineFactors({
        vectorSimilarity,
        keywordSimilarity
      })

      log.debug('相似度计算详情:', {
        vectorSimilarity,
        keywordSimilarity,
        combinedScore,
        metadata: {
          keywordsCount: {
            source: metadata.sourceKeywords.length,
            target: metadata.targetKeywords.length
          }
        }
      })

      return combinedScore
    } catch (error) {
      log.error('增强相似度计算失败:', error)
      return 0
    }
  }

  // 新增：计算文本匹配分数
  private static calculateTextMatchScore(
    text: string,
    keywords: Set<string>,
    weight: number
  ): number {
    if (!text || !keywords.size) return 0
    const textLower = text.toLowerCase()

    // 完全匹配检查
    if ([...keywords].some((k) => textLower === k.toLowerCase())) {
      return weight
    }

    // 关键词匹配
    const matchedKeywords = [...keywords].filter((k) => textLower.includes(k.toLowerCase()))
    return (matchedKeywords.length / keywords.size) * weight
  }

  // 增强版相似度计算 - 支持更多维度
  static calculateFullSimilarity(
    sourceVector: Float32Array,
    targetVector: Float32Array,
    params: {
      sourceKeywords: Set<string>
      targetKeywords: Set<string>
      title?: string
      content?: string
      weights?: {
        vector?: number
        keyword?: number
        title?: number
        content?: number
      }
    }
  ): number {
    try {
      const weights = {
        vector: 0.35, // 降低向量权重
        keyword: 0.35, // 提高关键词权重
        title: 0.2, // 保持标题权重
        content: 0.1, // 保持内容权重
        ...params.weights
      }

      // 1. 向量相似度
      const vectorScore = this.vectorSimilarity(sourceVector, targetVector) * weights.vector

      // 2. 关键词匹配 - 提高基础分
      const keywordScore =
        this.calculateKeywordSimilarity([...params.sourceKeywords], [...params.targetKeywords]) *
        weights.keyword *
        1.5 // 增加关键词匹配的基础分

      // 3. 标题匹配 - 增加完全匹配的奖励
      const titleScore = params.title
        ? this.calculateTextMatchScore(params.title, params.sourceKeywords, weights.title) * 1.3
        : 0

      // 4. 内容匹配
      const contentScore = params.content
        ? this.calculateTextMatchScore(params.content, params.sourceKeywords, weights.content)
        : 0

      // 5. 计算总分并提高基础分
      const baseScore = vectorScore + keywordScore + titleScore + contentScore
      const enhancedScore = Math.pow(baseScore, 0.8) // 使用幂函数提升低分区间

      // 确保分数在 0-1 之间
      const finalScore = Math.min(1, enhancedScore)

      log.debug('完整相似度计算详情:', {
        vectorScore,
        keywordScore,
        titleScore,
        contentScore,
        baseScore,
        enhancedScore,
        finalScore
      })

      return finalScore
    } catch (error) {
      log.error('完整相似度计算失败:', error)
      return 0
    }
  }
}
