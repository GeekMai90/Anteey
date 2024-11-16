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
  private static combineFactors(factors: { vectorSimilarity: number; timeDecay: number }): number {
    // 设置权重
    const weights = {
      vectorSimilarity: 0.8, // 向量相似度权重更高
      timeDecay: 0.2 // 时间衰减权重较小
    }

    // 计算加权平均
    const score =
      factors.vectorSimilarity * weights.vectorSimilarity + factors.timeDecay * weights.timeDecay

    // 确保分数在 [0,1] 范围内
    return Math.max(0, Math.min(1, score))
  }

  /**
   * 增强版相似度计算 V1
   * 结合向量相似度和时间衰减
   */
  static calculateEnhancedSimilarity(
    sourceVector: Float32Array,
    targetVector: Float32Array,
    metadata: {
      createdAt: number
    }
  ): number {
    try {
      // 1. 计算向量余弦相似度
      const vectorSimilarity = this.vectorSimilarity(sourceVector, targetVector)

      // 2. 计算时间衰减因子
      // 使用对数衰减，避免时间权重下降过快
      const timeAgeInDays = (Date.now() - metadata.createdAt) / (24 * 60 * 60 * 1000)
      const timeDecay = 1 / (1 + Math.log1p(timeAgeInDays / 30)) // 30天为一个衰减周期

      // 3. 组合两个因子
      const combinedScore = this.combineFactors({
        vectorSimilarity,
        timeDecay
      })

      return combinedScore
    } catch (error) {
      log.error('增强相似度计算失败:', error)
      return 0
    }
  }
}
