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
  }): number {
    // 设置权重
    const weights = {
      vectorSimilarity: 0.6, // 向量相似度权重仍然最高
      keywordSimilarity: 0.25, // 关键词相似度次之
      timeDecay: 0.15 // 时间衰减权重最小
    }

    // 计算加权平均
    const score =
      factors.vectorSimilarity * weights.vectorSimilarity +
      factors.keywordSimilarity * weights.keywordSimilarity +
      factors.timeDecay * weights.timeDecay

    // 确保分数在 [0,1] 范围内
    return Math.max(0, Math.min(1, score))
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
   * 增强版相似度计算 V2
   * 结合向量相似度、关键词相似度和时间衰减
   */
  static calculateEnhancedSimilarity(
    sourceVector: Float32Array,
    targetVector: Float32Array,
    metadata: {
      createdAt: number
      sourceKeywords: string[]
      targetKeywords: string[]
    }
  ): number {
    try {
      // 1. 计算向量余弦相似度
      const vectorSimilarity = this.vectorSimilarity(sourceVector, targetVector)

      // 2. 计算关键词相似度
      const keywordSimilarity = this.calculateKeywordSimilarity(
        metadata.sourceKeywords,
        metadata.targetKeywords
      )

      // 3. 计算时间衰减因子
      const timeAgeInDays = (Date.now() - metadata.createdAt) / (24 * 60 * 60 * 1000)
      const timeDecay = 1 / (1 + Math.log1p(timeAgeInDays / 30))

      // 4. 组合所有因子
      const combinedScore = this.combineFactors({
        vectorSimilarity,
        keywordSimilarity,
        timeDecay
      })

      log.debug('相似度计算详情:', {
        vectorSimilarity,
        keywordSimilarity,
        timeDecay,
        combinedScore
      })

      return combinedScore
    } catch (error) {
      log.error('增强相似度计算失败:', error)
      return 0
    }
  }
}
