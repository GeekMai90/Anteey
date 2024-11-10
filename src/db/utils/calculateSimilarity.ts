// 计算相似度的工具类
import log from 'electron-log'
import { Keyword } from '../../renderer/src/types/Embedding'

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

  // 计算关键词相似度
  static keywordSimilarity(keywords1: Keyword[], keywords2: Keyword[]): number {
    try {
      const map1 = new Map(keywords1.map((k) => [k.word, k.weight]))
      const map2 = new Map(keywords2.map((k) => [k.word, k.weight]))

      let dotProduct = 0
      let norm1 = 0
      let norm2 = 0

      map1.forEach((weight1, word) => {
        norm1 += weight1 * weight1
        const weight2 = map2.get(word)
        if (weight2) {
          dotProduct += weight1 * weight2
        }
      })

      map2.forEach((weight2) => {
        norm2 += weight2 * weight2
      })

      const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))

      log.debug('关键词相似度计算:', {
        共同关键词: Array.from(map1.keys())
          .filter((word) => map2.has(word))
          .map((word) => ({
            词: word,
            权重1: map1.get(word)?.toFixed(4),
            权重2: map2.get(word)?.toFixed(4)
          })),
        相似度: similarity.toFixed(4)
      })

      return Number.isNaN(similarity) ? 0 : similarity
    } catch (error) {
      log.error('关键词相似度计算失败:', error)
      return 0
    }
  }

  // 计算最终相似度
  static calculateFinalSimilarity(vectorSimilarity: number, keywordSimilarity: number): number {
    const KEYWORD_THRESHOLDS = {
      VERY_LOW: 0.1, // 几乎没有共同关键词
      LOW: 0.3, // 较少共同关键词
      MEDIUM: 0.5 // 中等程度共同关键词
    }

    try {
      // 根据关键词相似度的不同区间，调整向量相似度的权重
      if (keywordSimilarity < KEYWORD_THRESHOLDS.VERY_LOW) {
        // 几乎没有共同关键词，大幅降低相似度
        return vectorSimilarity * 0.4
      } else if (keywordSimilarity < KEYWORD_THRESHOLDS.LOW) {
        // 较少共同关键词，适度降低相似度
        return vectorSimilarity * 0.6 + keywordSimilarity * 0.2
      } else if (keywordSimilarity < KEYWORD_THRESHOLDS.MEDIUM) {
        // 一定程度的共同关键词，正常权重
        return vectorSimilarity * 0.7 + keywordSimilarity * 0.3
      } else {
        // 较多共同关键词，给予更高权重
        return vectorSimilarity * 0.8 + keywordSimilarity * 0.2
      }
    } catch (error) {
      log.error('最终相似度计算失败:', error)
      return 0
    }
  }

  // 计算综合相似度并返回结果
  static calculateSimilarity(
    sourceVector: Float32Array,
    targetVector: Float32Array,
    sourceKeywords: Keyword[],
    targetKeywords: Keyword[]
  ): number {
    try {
      // 计算向量相似度
      const vectorSimilarity = this.vectorSimilarity(sourceVector, targetVector)

      // 计算关键词相似度
      const keywordSimilarity = this.keywordSimilarity(sourceKeywords, targetKeywords)

      // 计算最终相似度
      return this.calculateFinalSimilarity(vectorSimilarity, keywordSimilarity)
    } catch (error) {
      log.error('综合相似度计算失败:', error)
      return 0
    }
  }
}
