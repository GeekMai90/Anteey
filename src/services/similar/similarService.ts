import log from 'electron-log'
import { db } from '../../db/config'
import { LanceService } from '../../db/vector/lanceService'
import { initEmbeddings } from '@services/rag/embeddingService'

// 定义 LanceDB 搜索结果的接口
interface LanceDBSearchResult {
  id: string
  score: number
  vector: number[]
  keywords: string[]
  metadata: string
}

/**
 * 将二进制向量转换为 Float32Array
 */
export function blobToFloat32Array(blob: Buffer): Float32Array {
  try {
    return new Float32Array(blob.buffer)
  } catch (error) {
    log.error('向量转换失败:', error)
    throw error
  }
}

/**
 * 计算两个向量的余弦相似度
 * 使用分段函数优化相似度分数分布
 */
function calculateVectorSimilarity(a: Float32Array, b: Float32Array): number {
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
    const normalizedSimilarity = (rawSimilarity + 1) / 2

    // 优化分数分布
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
 * 计算关键词相似度
 */
export function calculateKeywordSimilarity(
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
 */
function calculateTextMatchScore(text: string, keywords: Set<string>, weight: number): number {
  if (!text || !keywords.size) return 0
  const textLower = text.toLowerCase()

  if ([...keywords].some((k) => textLower === k.toLowerCase())) {
    return weight
  }

  const matchedKeywords = [...keywords].filter((k) => textLower.includes(k.toLowerCase()))
  return (matchedKeywords.length / keywords.size) * weight
}

/**
 * 计算多维度综合相似度
 */
export function calculateFullSimilarity(
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
      vector: 0.35,
      keyword: 0.35,
      title: 0.2,
      content: 0.1,
      ...params.weights
    }

    const vectorScore = calculateVectorSimilarity(sourceVector, targetVector) * weights.vector
    const keywordScore =
      calculateKeywordSimilarity([...params.sourceKeywords], [...params.targetKeywords]) *
      weights.keyword *
      1.5

    const titleScore = params.title
      ? calculateTextMatchScore(params.title, params.sourceKeywords, weights.title) * 1.3
      : 0

    const contentScore = params.content
      ? calculateTextMatchScore(params.content, params.sourceKeywords, weights.content)
      : 0

    const baseScore = vectorScore + keywordScore + titleScore + contentScore
    const enhancedScore = Math.pow(baseScore, 0.8)
    const finalScore = Math.min(1, enhancedScore)

    return finalScore
  } catch (error) {
    log.error('完整相似度计算失败:', error)
    return 0
  }
}

/**
 * 基于文本查询搜索相似笔记
 */
export async function searchSimilarNotes(
  query: string,
  limit: number = 10
): Promise<Array<{ noteId: string; similarity: number }>> {
  try {
    log.info('开始文本搜索相似笔记:', { query, limit })

    // 1. 生成查询向量
    const embedder = await initEmbeddings()
    const vector = await embedder(query)
    const vectorArray = vector instanceof Float32Array ? vector : new Float32Array(vector)
    log.debug('生成查询向量成功:', { vectorLength: vectorArray.length })

    // 2. 使用 LanceDB 执行相似度搜索
    const lanceService = await LanceService.getInstance()
    const results = await lanceService.searchSimilar(vectorArray, limit)
    log.debug('LanceDB 搜索结果:', {
      resultCount: results.length,
      sampleResults: results.slice(0, 2)
    })

    // 3. 转换结果格式
    const formattedResults = results.map((result: LanceDBSearchResult) => ({
      noteId: result.id,
      similarity: result.score || 0
    }))
    log.info('搜索完成，返回结果数:', formattedResults.length)

    return formattedResults
  } catch (error) {
    log.error('搜索相似笔记失败:', error)
    return []
  }
}

/**
 * 获取与指定笔记相似的其他笔记
 */
export async function getSimilarNotesForNote(
  noteId: string,
  limit: number = 10
): Promise<Array<{ noteId: string; similarity: number }>> {
  try {
    log.info('开始获取相似笔记:', { noteId, limit })

    // 1. 获取源笔记的向量和关键词
    const lanceService = await LanceService.getInstance()
    const sourceNote = await db('notes').where({ id: noteId, isDeleted: false }).first()
    log.debug('获取源笔记:', {
      noteExists: !!sourceNote,
      noteId: sourceNote?.id
    })

    if (!sourceNote) {
      log.warn('源笔记不存在:', noteId)
      return []
    }

    // 2. 从 LanceDB 获取源笔记的向量和关键词
    const sourceVector = await lanceService.getVectorById(noteId)
    if (!sourceVector) {
      log.warn('源笔记向量不存在:', noteId)
      return []
    }

    // 使用 sourceVector 中已经处理好的关键词
    const keywords = sourceVector.keywords.slice(0, 10) // 限制使用前10个关键词

    log.debug('获取源笔记向量:', {
      hasVector: !!sourceVector,
      vectorLength: sourceVector?.vector?.length,
      keywords: keywords,
      allKeywords: sourceVector.keywords // 显示所有关键词以便调试
    })

    // 3. 执行混合搜索，增加搜索数量以确保有足够的结果
    const results = await lanceService.searchNotes(
      new Float32Array(sourceVector.vector),
      keywords,
      limit * 2 // 搜索更多结果，以便后续过滤
    )
    log.debug('LanceDB 混合搜索结果:', {
      resultCount: results.length,
      sampleResults: results.slice(0, 2),
      keywords: keywords
    })

    // 4. 转换结果格式，调整相似度阈值
    const filteredResults = results
      .filter((result: LanceDBSearchResult) => result.id !== noteId)
      .map((result: LanceDBSearchResult) => ({
        noteId: result.id,
        similarity: result.score || 0
      }))
      .filter((result: { similarity: number }) => result.similarity > 0.3) // 提高相似度阈值
      .slice(0, limit)

    log.info('相似笔记查询完成:', {
      totalResults: results.length,
      filteredCount: filteredResults.length,
      similarityThreshold: 0.3,
      sampleScores: results.slice(0, 2).map((r: LanceDBSearchResult) => ({
        id: r.id,
        score: r.score,
        keywords: r.keywords
      }))
    })

    return filteredResults
  } catch (error) {
    log.error('获取相似笔记失败:', {
      noteId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return []
  }
}
