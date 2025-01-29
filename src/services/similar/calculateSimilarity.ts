import log from 'electron-log'

/**
 * 相似度计算服务
 * 提供多维度的相似度计算功能，包括：
 * - 向量相似度（语义层面）
 * - 关键词匹配（主题层面）
 * - 文本匹配（内容层面）
 */
export class SimilarityService {
  /**
   * 将二进制向量转换为 Float32Array
   * @param blob 二进制格式的向量数据
   * @returns Float32Array 格式的向量
   * @throws 转换失败时抛出错误
   */
  static blobToFloat32Array(blob: Buffer): Float32Array {
    try {
      return new Float32Array(blob.buffer)
    } catch (error) {
      log.error('向量转换失败:', error)
      throw error
    }
  }

  /**
   * 计算两个向量的余弦相似度
   * 使用分段函数优化相似度分数分布：
   * - [0, 0.5] 映射到 [0, 0.3]
   * - [0.5, 0.8] 映射到 [0.3, 0.7]
   * - [0.8, 1.0] 映射到 [0.7, 1.0]
   *
   * @param a 第一个向量
   * @param b 第二个向量
   * @returns 优化后的相似度分数 [0,1]
   */
  static vectorSimilarity(a: Float32Array, b: Float32Array): number {
    try {
      // 计算点积和向量范数
      let dotProduct = 0
      let normA = 0
      let normB = 0

      for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i]
        normA += a[i] * a[i]
        normB += b[i] * b[i]
      }

      // 计算原始余弦相似度 [-1,1]
      const rawSimilarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))

      // 归一化到 [0,1] 区间
      const normalizedSimilarity = (rawSimilarity + 1) / 2

      // 使用分段函数优化分数分布
      let enhancedSimilarity = 0
      if (normalizedSimilarity < 0.5) {
        enhancedSimilarity = normalizedSimilarity * 0.6
      } else if (normalizedSimilarity < 0.8) {
        enhancedSimilarity = 0.3 + (normalizedSimilarity - 0.5) * 1.33
      } else {
        enhancedSimilarity = 0.7 + (normalizedSimilarity - 0.8) * 1.5
      }

      return Number.isNaN(enhancedSimilarity) ? 0 : enhancedSimilarity
    } catch (error) {
      log.error('向量相似度计算失败:', error)
      return 0
    }
  }

  /**
   * 计算两组关键词的相似度（Jaccard 相似系数）
   * 相似度 = 交集大小 / 并集大小
   *
   * @param sourceKeywords 源关键词数组
   * @param targetKeywords 目标关键词数组
   * @returns 关键词相似度 [0,1]
   */
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

  /**
   * 计算文本与关键词的匹配分数
   * 考虑完全匹配和部分匹配两种情况
   *
   * @param text 待匹配的文本
   * @param keywords 关键词集合
   * @param weight 权重系数
   * @returns 匹配分数 [0,1]
   */
  private static calculateTextMatchScore(
    text: string,
    keywords: Set<string>,
    weight: number
  ): number {
    if (!text || !keywords.size) return 0
    const textLower = text.toLowerCase()

    // 完全匹配检查（文本完全等于某个关键词）
    if ([...keywords].some((k) => textLower === k.toLowerCase())) {
      return weight
    }

    // 部分匹配检查（文本包含关键词）
    const matchedKeywords = [...keywords].filter((k) => textLower.includes(k.toLowerCase()))
    return (matchedKeywords.length / keywords.size) * weight
  }

  /**
   * 计算多维度综合相似度
   * 综合考虑向量相似度、关键词匹配、标题匹配和内容匹配
   *
   * @param sourceVector 源向量
   * @param targetVector 目标向量
   * @param params 计算参数
   * @param params.sourceKeywords 源关键词集合
   * @param params.targetKeywords 目标关键词集合
   * @param params.title 标题文本（可选）
   * @param params.content 内容文本（可选）
   * @param params.weights 各维度权重配置（可选）
   * @returns 综合相似度分数 [0,1]
   */
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
      // 默认权重配置
      const weights = {
        vector: 0.35, // 向量相似度权重
        keyword: 0.35, // 关键词匹配权重
        title: 0.2, // 标题匹配权重
        content: 0.1, // 内容匹配权重
        ...params.weights
      }

      // 1. 计算向量相似度
      const vectorScore = this.vectorSimilarity(sourceVector, targetVector) * weights.vector

      // 2. 计算关键词匹配度（增加 1.5 倍基础分）
      const keywordScore =
        this.calculateKeywordSimilarity([...params.sourceKeywords], [...params.targetKeywords]) *
        weights.keyword *
        1.5

      // 3. 计算标题匹配度（增加 1.3 倍奖励）
      const titleScore = params.title
        ? this.calculateTextMatchScore(params.title, params.sourceKeywords, weights.title) * 1.3
        : 0

      // 4. 计算内容匹配度
      const contentScore = params.content
        ? this.calculateTextMatchScore(params.content, params.sourceKeywords, weights.content)
        : 0

      // 5. 计算综合分数
      const baseScore = vectorScore + keywordScore + titleScore + contentScore
      // 使用幂函数(0.8)提升低分区间的分数
      const enhancedScore = Math.pow(baseScore, 0.8)
      // 确保最终分数在 [0,1] 范围内
      const finalScore = Math.min(1, enhancedScore)

      // 记录详细计算过程
      // log.debug('完整相似度计算详情:', {
      //   vectorScore,
      //   keywordScore,
      //   titleScore,
      //   contentScore,
      //   baseScore,
      //   enhancedScore,
      //   finalScore
      // })

      return finalScore
    } catch (error) {
      log.error('完整相似度计算失败:', error)
      return 0
    }
  }
}
