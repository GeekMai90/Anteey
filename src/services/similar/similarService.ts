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
 * 优化相似度计算的权重配置
 */
interface SimilarityWeights {
  vector: number
  keyword: number
  title: number
  content: number
}

const DEFAULT_WEIGHTS: SimilarityWeights = {
  vector: 0.4, // 增加向量相似度权重
  keyword: 0.3, // 保持关键词权重
  title: 0.2, // 保持标题权重
  content: 0.1 // 降低内容权重
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
 * 优化向量相似度计算
 */
function calculateVectorSimilarity(a: Float32Array, b: Float32Array): number {
  try {
    // 添加向量验证
    if (!a || !b || a.length !== b.length) {
      log.warn('向量格式无效:', {
        vectorA: a?.length,
        vectorB: b?.length
      })
      return 0
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    // 普通循环计算，确保准确性
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    // 避免除以0
    if (normA === 0 || normB === 0) {
      log.warn('向量范数为0:', {
        normA,
        normB
      })
      return 0
    }

    // 计算余弦相似度
    const cosineSimilarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))

    // 将相似度映射到 [0,1] 区间，使用线性映射而不是sigmoid
    const normalizedSimilarity = (cosineSimilarity + 1) / 2

    // 添加详细的计算日志
    log.debug('向量相似度计算详情:', {
      vectorLengths: {
        a: a.length,
        b: b.length
      },
      scores: {
        dotProduct,
        normA,
        normB,
        cosineSimilarity,
        normalizedSimilarity
      }
    })

    return normalizedSimilarity
  } catch (error) {
    log.error('向量相似度计算失败:', error)
    return 0
  }
}

/**
 * 优化关键词相似度计算
 * @param sourceKeywords 源笔记的关键词
 * @param targetKeywords 目标笔记的关键词
 * @returns 相似度分数 (0-1)
 */
function calculateKeywordSimilarity(sourceKeywords: string[], targetKeywords: string[]): number {
  if (!sourceKeywords.length || !targetKeywords.length) return 0

  // 预处理关键词：转小写、去除引号、去重
  const processKeywords = (keywords: string[]) => [
    ...new Set(
      keywords.map((k) =>
        k
          .toLowerCase()
          .replace(/["""]/g, '') // 移除中文引号
          .replace(/"/g, '') // 移除英文引号
          .trim()
      )
    )
  ]

  const sourceSet = processKeywords(sourceKeywords)
  const targetSet = processKeywords(targetKeywords)

  // 计算直接匹配的关键词
  const directMatches = sourceSet.filter((k) => targetSet.includes(k))

  // 计算部分匹配的关键词（包含关系）
  const partialMatches = sourceSet
    .filter((sourceWord) =>
      targetSet.some(
        (targetWord) => targetWord.includes(sourceWord) || sourceWord.includes(targetWord)
      )
    )
    .filter((word) => !directMatches.includes(word)) // 排除已经直接匹配的

  // 计算相关词匹配（知识管理->知识内化、知识原子化等）
  const relatedMatches = sourceSet
    .filter((sourceWord) => {
      const sourceParts = sourceWord.split(/[\s-_]/)
      return targetSet.some((targetWord) => {
        const targetParts = targetWord.split(/[\s-_]/)
        return sourceParts.some((part) =>
          targetParts.some((targetPart) => targetPart.includes(part) || part.includes(targetPart))
        )
      })
    })
    .filter((word) => !directMatches.includes(word) && !partialMatches.includes(word))

  // 计算最终相似度分数
  const directMatchScore = directMatches.length * 1.0
  const partialMatchScore = partialMatches.length * 0.7
  const relatedMatchScore = relatedMatches.length * 0.5

  const totalScore = directMatchScore + partialMatchScore + relatedMatchScore
  const maxPossibleScore = Math.max(sourceSet.length, targetSet.length)

  // // 添加详细的计算日志
  // log.debug('关键词相似度计算详情:', {
  //   sourceKeywords: sourceSet,
  //   targetKeywords: targetSet,
  //   directMatches,
  //   partialMatches,
  //   relatedMatches,
  //   scores: {
  //     directMatchScore,
  //     partialMatchScore,
  //     relatedMatchScore,
  //     totalScore,
  //     maxPossibleScore,
  //     finalScore: totalScore / maxPossibleScore
  //   }
  // })

  return Math.min(1, totalScore / maxPossibleScore)
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
 * 优化搜索相似笔记的方法
 */
export async function searchSimilarNotes(
  query: string,
  limit: number = 10,
  options: {
    weights?: Partial<SimilarityWeights>
    minSimilarity?: number
    includeContent?: boolean
  } = {}
): Promise<Array<{ noteId: string; similarity: number; matchedKeywords?: string[] }>> {
  try {
    const startTime = Date.now()
    log.info('开始文本搜索相似笔记:', { query, limit, options })

    // 合并权重配置
    const weights = { ...DEFAULT_WEIGHTS, ...options.weights }
    const minSimilarity = options.minSimilarity ?? 0.3

    // 1. 生成查询向量（使用已初始化的服务）
    const embedder = await initEmbeddings()
    const vector = await embedder(query)
    const vectorArray = vector instanceof Float32Array ? vector : new Float32Array(vector)

    // 2. 使用 LanceDB 执行相似度搜索
    const lanceService = await LanceService.getInstance()
    const results = await lanceService.searchSimilar(vectorArray, limit * 2) // 获取更多结果用于后处理

    // 3. 后处理结果
    const processedResults = await Promise.all(
      results
        .filter((result: LanceDBSearchResult) => result.score >= minSimilarity)
        .map(async (result: LanceDBSearchResult) => {
          // 获取笔记内容（如果需要）
          let noteContent = null
          if (options.includeContent) {
            const note = await db('notes').where('id', result.id).select('content').first()
            noteContent = note?.content
          }

          // 计算综合相似度
          const similarity = calculateFullSimilarity(vectorArray, new Float32Array(result.vector), {
            sourceKeywords: new Set(result.keywords),
            targetKeywords: new Set(result.keywords),
            content: noteContent,
            weights
          })

          return {
            noteId: result.id,
            similarity,
            matchedKeywords: result.keywords
          }
        })
    )

    // 4. 排序和限制结果
    const finalResults = processedResults
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    const endTime = Date.now()
    log.info('搜索完成:', {
      duration: endTime - startTime,
      resultsCount: finalResults.length,
      averageSimilarity:
        finalResults.reduce((sum, r) => sum + r.similarity, 0) / finalResults.length
    })

    return finalResults
  } catch (error) {
    log.error('搜索相似笔记失败:', error)
    return []
  }
}

/**
 * 获取与指定笔记相似的其他笔记（基于关键词的初步筛选）
 */
export async function getKeywordSimilarNotes(
  noteId: string,
  limit: number = 10
): Promise<Array<{ noteId: string; similarity: number; matchedKeywords: string[] }>> {
  try {
    // 1. 获取源笔记的关键词
    const sourceNote = await db('notes')
      .where({
        id: noteId,
        isDeleted: false
      })
      .select(['keywords', 'cardType'])
      .first()

    if (!sourceNote?.keywords) {
      log.warn('源笔记不存在或没有关键词:', { noteId, sourceNote })
      return []
    }

    const sourceKeywords = JSON.parse(sourceNote.keywords)

    // 添加源笔记详细信息日志
    log.info('源笔记信息:', {
      noteId,
      cardType: sourceNote.cardType,
      keywords: sourceKeywords,
      keywordsCount: sourceKeywords.length
    })

    if (!Array.isArray(sourceKeywords) || !sourceKeywords.length) {
      log.warn('源笔记关键词格式无效:', { noteId, keywords: sourceKeywords })
      return []
    }

    // 2. 获取候选笔记，同样修改查询
    const query = db('notes')
      .where({
        isDeleted: false,
        cardType: sourceNote.cardType
      })
      .whereNot('id', noteId)
      .whereNotNull('keywords')
      .select(['id', 'keywords', 'cardType'])
      .orderBy('updatedAt', 'desc')
      .limit(limit * 3)

    // 记录查询条件
    log.info('查询条件:', {
      sql: query.toString(),
      params: {
        cardType: sourceNote.cardType,
        sourceNoteId: noteId
      }
    })

    const otherNotes = await query

    // 记录查询结果概况
    log.info('候选笔记查询结果:', {
      totalFound: otherNotes.length,
      sampleNotes: otherNotes.slice(0, 3).map((note) => ({
        id: note.id,
        cardType: note.cardType,
        hasKeywords: !!note.keywords
      }))
    })

    // 3. 计算相似度并排序 - 修复这里不再引用title
    const similarNotes = (
      await Promise.all(
        otherNotes.map(async (note) => {
          try {
            const targetKeywords = JSON.parse(note.keywords)
            if (!Array.isArray(targetKeywords) || !targetKeywords.length) {
              log.debug('跳过无效关键词的笔记:', {
                noteId: note.id,
                keywords: targetKeywords
              })
              return null
            }

            const similarity = calculateKeywordSimilarity(sourceKeywords, targetKeywords)
            const matchedKeywords = targetKeywords.filter((k) => sourceKeywords.includes(k))

            return {
              noteId: note.id,
              similarity,
              matchedKeywords,
              isMainCard: note.cardType === 'Maincard'
            }
          } catch (error) {
            log.error('处理笔记关键词失败:', {
              noteId: note.id,
              error: error instanceof Error ? error.message : String(error)
            })
            return null
          }
        })
      )
    ).filter((result): result is NonNullable<typeof result> => {
      const isValid = result !== null && result.similarity > 0.1
      return isValid
    })

    // 记录相似度计算结果统计 - 移除title相关引用
    log.info('相似度计算结果:', {
      totalProcessed: otherNotes.length,
      validResults: similarNotes.length,
      similarityDistribution: {
        high: similarNotes.filter((n) => n.similarity > 0.7).length,
        medium: similarNotes.filter((n) => n.similarity > 0.4 && n.similarity <= 0.7).length,
        low: similarNotes.filter((n) => n.similarity <= 0.4).length
      },
      topResults: similarNotes.slice(0, 3).map((n) => ({
        noteId: n.noteId,
        similarity: n.similarity,
        matchedKeywordsCount: n.matchedKeywords.length
      }))
    })

    // 4. 排序并返回结果
    const sortedNotes = similarNotes
      .sort((a, b) => {
        const similarityDiff = b.similarity - a.similarity
        if (Math.abs(similarityDiff) > 0.05) return similarityDiff
        if (a.isMainCard !== b.isMainCard) {
          return a.isMainCard ? -1 : 1
        }
        return b.matchedKeywords.length - a.matchedKeywords.length
      })
      .slice(0, limit)
      .map(({ noteId, similarity, matchedKeywords }) => ({
        noteId,
        similarity,
        matchedKeywords
      }))

    log.info('关键词相似笔记查询完成:', {
      sourceNote: {
        id: noteId,
        cardType: sourceNote.cardType,
        keywordsCount: sourceKeywords.length,
        keywords: sourceKeywords
      },
      results: {
        total: sortedNotes.length,
        topMatches: sortedNotes.slice(0, 3).map((n) => ({
          noteId: n.noteId,
          similarity: n.similarity,
          matchedKeywordsCount: n.matchedKeywords.length
        }))
      },
      timing: {
        totalCandidates: otherNotes.length,
        validMatches: similarNotes.length,
        finalResults: sortedNotes.length
      }
    })

    return sortedNotes
  } catch (error) {
    log.error('获取关键词相似笔记失败:', {
      noteId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return []
  }
}

/**
 * 获取与指定笔记相似的笔记
 */
export async function getSimilarNotesForNote(
  noteId: string,
  limit: number = 10
): Promise<Array<{ noteId: string; similarity: number; matchedKeywords: string[] }>> {
  try {
    const startTime = Date.now()
    log.info('开始获取相似笔记:', { noteId, limit })

    // 优化向量和关键词的获取逻辑
    // 首先尝试获取关键词相似度结果
    const keywordResults = await getKeywordSimilarNotes(noteId, limit * 2)

    let vectorResults: VectorSearchResult[] = []
    try {
      // 尝试获取向量相似度结果
      vectorResults = await getVectorSimilarNotes(noteId, limit * 2)
    } catch (error) {
      log.warn(
        '向量相似度获取失败，将只使用关键词相似度:',
        error instanceof Error ? error.message : String(error)
      )
      // 继续处理，只使用关键词结果
    }

    // 添加初始结果日志
    log.info('初始搜索结果:', {
      keywordResultsCount: keywordResults.length,
      vectorResultsCount: vectorResults.length,
      keywordSampleResults: keywordResults.slice(0, 3).map((r) => ({
        noteId: r.noteId,
        similarity: r.similarity,
        matchedKeywordsCount: r.matchedKeywords.length
      })),
      vectorSampleResults: vectorResults.slice(0, 3).map((r: any) => ({
        noteId: r.id,
        score: r.score,
        keywordsCount: r.keywords?.length
      }))
    })

    // 2. 合并结果并计算综合相似度
    const noteMap = new Map<
      string,
      {
        noteId: string
        keywordSimilarity: number
        vectorSimilarity: number
        matchedKeywords: string[]
      }
    >()

    // 处理关键词结果
    keywordResults.forEach((result) => {
      noteMap.set(result.noteId, {
        noteId: result.noteId,
        keywordSimilarity: result.similarity,
        vectorSimilarity: 0,
        matchedKeywords: result.matchedKeywords
      })
    })

    // 处理向量结果
    vectorResults.forEach((result: VectorSearchResult) => {
      const existing = noteMap.get(result.id)
      if (existing) {
        existing.vectorSimilarity = result.score
      } else {
        noteMap.set(result.id, {
          noteId: result.id,
          keywordSimilarity: 0,
          vectorSimilarity: result.score,
          matchedKeywords: result.keywords || []
        })
      }
    })

    // 添加合并后的结果日志
    log.info('合并后的结果:', {
      totalUniqueNotes: noteMap.size,
      sampleMergedResults: Array.from(noteMap.values())
        .slice(0, 3)
        .map((r) => ({
          noteId: r.noteId,
          keywordSimilarity: r.keywordSimilarity,
          vectorSimilarity: r.vectorSimilarity,
          matchedKeywordsCount: r.matchedKeywords.length
        }))
    })

    // 3. 计算综合分数并排序 - 修改权重分配和过滤逻辑
    const combinedResults = Array.from(noteMap.values())
      .map((result) => {
        const keywordWeight = result.vectorSimilarity > 0 ? 0.5 : 1.0 // 如果没有向量相似度，关键词权重为1
        const vectorWeight = result.vectorSimilarity > 0 ? 0.5 : 0 // 如果没有向量相似度，向量权重为0

        // 改进相似度计算，引入非线性增强
        let similarity =
          result.keywordSimilarity * keywordWeight + result.vectorSimilarity * vectorWeight

        // 奖励两种相似度都高的笔记
        if (result.keywordSimilarity > 0.3 && result.vectorSimilarity > 0.3) {
          similarity *= 1.2 // 增强系数
          similarity = Math.min(1.0, similarity) // 确保不超过1
        }

        // 笔记需要满足最低要求的向量相似度才有意义
        if (result.vectorSimilarity < 0.1 && similarity < 0.4) {
          similarity *= 0.8 // 降低完全没有语义相似性的笔记得分
        }

        return {
          noteId: result.noteId,
          similarity,
          matchedKeywords: result.matchedKeywords,
          keywordSimilarity: result.keywordSimilarity,
          vectorSimilarity: result.vectorSimilarity,
          keywordWeight,
          vectorWeight
        }
      })
      .filter((result) => {
        // 提高相似度阈值，避免低质量结果
        const minSimilarity = 0.15 // 提高最小相似度阈值
        const hasHighKeywordSimilarity = result.keywordSimilarity >= 0.25 // 提高关键词相似度阈值
        const hasHighVectorSimilarity = result.vectorSimilarity >= 0.25 // 提高向量相似度阈值
        const hasSignificantKeywordMatches = result.matchedKeywords.length >= 2 // 至少匹配两个关键词
        const isNotSelf = result.noteId !== noteId

        // 修改保留条件 - 需要更高的相似度
        const shouldKeep =
          isNotSelf &&
          (result.similarity >= minSimilarity ||
            hasHighKeywordSimilarity ||
            hasHighVectorSimilarity ||
            hasSignificantKeywordMatches)

        // 添加更详细的过滤日志
        log.debug('过滤决策:', {
          noteId: result.noteId,
          similarity: result.similarity,
          keywordSimilarity: result.keywordSimilarity,
          vectorSimilarity: result.vectorSimilarity,
          matchedKeywords: result.matchedKeywords,
          scores: {
            weightedKeyword: result.keywordSimilarity * result.keywordWeight,
            weightedVector: result.vectorSimilarity * result.vectorWeight,
            final: result.similarity
          },
          thresholds: {
            minSimilarity,
            keywordThreshold: 0.25,
            vectorThreshold: 0.25
          },
          kept: shouldKeep,
          reason: !shouldKeep
            ? isNotSelf
              ? result.matchedKeywords.length < 2
                ? 'insufficient keyword matches'
                : 'low similarity'
              : 'self reference'
            : 'passed'
        })

        return shouldKeep
      })
      .sort((a, b) => b.similarity - a.similarity)
      .map(({ noteId, similarity, matchedKeywords }) => ({
        // 最后再去掉额外的字段
        noteId,
        similarity,
        matchedKeywords
      }))
      .slice(0, limit)

    // 添加最终结果的详细统计
    log.info('过滤和排序后的结果统计:', {
      originalCount: noteMap.size,
      filteredCount: combinedResults.length,
      detailedResults: combinedResults.map((r) => ({
        noteId: r.noteId,
        similarity: r.similarity,
        matchedKeywordsCount: r.matchedKeywords.length
      }))
    })

    const endTime = Date.now()
    log.info('相似笔记查询完成:', {
      duration: endTime - startTime,
      totalResults: noteMap.size,
      filteredResults: combinedResults.length
    })

    return combinedResults
  } catch (error) {
    log.error('获取相似笔记失败:', {
      noteId,
      error: error instanceof Error ? error.message : String(error)
    })
    return []
  }
}

interface VectorSearchResult {
  id: string
  score: number
  vector: number[]
  keywords: string[]
  metadata: string
}

async function getVectorSimilarNotes(noteId: string, limit: number): Promise<VectorSearchResult[]> {
  try {
    const lanceService = await LanceService.getInstance()

    log.info('尝试获取笔记向量相似项:', { noteId, limit })

    try {
      // 首先尝试直接ID搜索
      const results = await lanceService.searchSimilarById(noteId, limit)

      if (results && results.length > 0) {
        log.info('通过ID直接搜索成功，找到相似笔记:', { count: results.length })
        return results.map((result: any) => ({
          id: result.id,
          score: result.score,
          vector: result.vector,
          keywords: result.keywords || [],
          metadata: result.metadata
        }))
      } else {
        log.warn('通过ID搜索未找到结果，尝试备用方法')
      }
    } catch (error) {
      log.warn(
        '通过ID搜索失败，尝试备用方法:',
        error instanceof Error ? error.message : String(error)
      )
    }

    // 备用方法1: 尝试获取笔记向量后搜索
    try {
      const sourceVector = await lanceService.getVectorById(noteId)

      if (sourceVector?.vector && Array.isArray(sourceVector.vector)) {
        log.info('成功获取笔记向量，进行相似度搜索:', {
          noteId,
          vectorLength: sourceVector.vector.length
        })

        const results = await lanceService.searchSimilar(
          new Float32Array(sourceVector.vector),
          limit
        )

        return results.map((result: any) => ({
          id: result.id,
          score: result.score,
          vector: result.vector,
          keywords: result.keywords || [],
          metadata: result.metadata
        }))
      } else {
        log.warn('获取到的向量无效，尝试从笔记内容生成')
      }
    } catch (error) {
      log.warn(
        '根据ID获取向量失败，尝试从笔记内容生成:',
        error instanceof Error ? error.message : String(error)
      )
    }

    // 备用方法2: 从笔记内容生成向量
    try {
      // 修改查询，移除title字段，只查询content
      const note = await db('notes').where('id', noteId).select(['content']).first()

      if (!note) {
        log.error('找不到源笔记')
        return []
      }

      // 生成笔记内容的向量表示 - 不再使用title
      const embedder = await initEmbeddings()
      const textToEmbed = note.content?.trim() || ''

      if (!textToEmbed) {
        log.error('笔记内容为空，无法生成向量')
        return []
      }

      log.info('从笔记内容生成向量:', { noteId, textLength: textToEmbed.length })

      const vector = await embedder(textToEmbed)
      const vectorArray = vector instanceof Float32Array ? vector : new Float32Array(vector)

      // 使用生成的向量进行搜索
      const results = await lanceService.searchSimilar(vectorArray, limit)

      // 可选：将生成的向量保存到数据库中以备将来使用
      try {
        // 获取关键词用于保存到元数据中
        const noteKeywords = await db('notes')
          .where('id', noteId)
          .select(['keywords'])
          .first()
          .then((result) => {
            try {
              return result?.keywords ? JSON.parse(result.keywords) : []
            } catch {
              return []
            }
          })

        await lanceService.addVector(noteId, vectorArray, {
          hasKeywords: noteKeywords && noteKeywords.length > 0,
          keywords: noteKeywords || [],
          timestamp: Date.now()
        })
        log.info('已将生成的向量保存到数据库')
      } catch (vectorSaveError) {
        log.warn('保存生成的向量失败:', vectorSaveError)
        // 继续执行，不影响当前搜索
      }

      return results.map((result: any) => ({
        id: result.id,
        score: result.score,
        vector: result.vector,
        keywords: result.keywords || [],
        metadata: result.metadata
      }))
    } catch (error) {
      log.error('从笔记内容生成向量并搜索失败:', {
        noteId,
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  } catch (error) {
    log.error('向量相似度搜索失败:', {
      noteId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return []
  }
}
