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
}
