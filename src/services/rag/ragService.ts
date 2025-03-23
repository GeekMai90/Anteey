/**
 * RAG (Retrieval-Augmented Generation) 服务
 * 基于关键词和向量检索的智能问答系统
 */

import { db } from '../../db/config'
import { initEmbeddings } from './embeddingService'
import log from 'electron-log'
import {
  AIAssistantMessage,
  AssistantNoteReference,
  ChatMessage,
  ChatSession,
  ConversationTracker,
  RAGContext,
  RAGHistoryRecord,
  RAGResult,
  UserMessage,
  LLMError
} from '@shared/types'
import { v4 as uuidv4 } from 'uuid'
import { LLMService } from './llmService'
import { blobToFloat32Array, calculateFullSimilarity } from '@services/similar/similarService'
import { Note } from '@shared/types'
import { getKeywordExtractor } from './keywordExtractor'
import { ModelConfigService } from './llmConfigService'
import { LanceService } from '../../db/vector/lanceService'
import { convertToAgent } from './agentService'

/**
 * 系统配置常量
 */
// RAG 系统配置
export const RAG_CONFIG = {
  similarity: {
    topicThreshold: 0.7, // 话题相似度阈值
    docThreshold: 0.6, // 文档相似度阈值
    contextWindowSize: 5, // 对话上下文窗口大小
    weights: {
      // 新增权重配置
      vectorSimilarity: 0.65,
      keywordSimilarity: 0.35
    }
  },
  retrieval: {
    maxDocsPerQuery: 5, // 单次查询最大文档数
    minSimilarity: 0.25, // 最小相似度要求
    reuseThreshold: 0.8, // 文档重用阈值
    weightDecayFactor: 0.8 // 历史权重衰减因子
  }
} as const

// 话题管理配置
export const TOPIC_CONFIG = {
  maxTopicAge: 30 * 60 * 1000, // 话题最大存活时间(30分钟)
  minMessagesForTopic: 2, // 形成话题的最小消息数
  maxTopicIdle: 5 * 60 * 1000 // 话题最大空闲时间(5分钟)
} as const

// 初始化 LLM 服务
const llm = new LLMService()

// 创建 ModelConfigService 实例
const modelConfigService = new ModelConfigService()

/**
 * 修改 LLMError 处理函数中的错误类型
 */
export function handleLLMError(error: any): LLMError {
  const now = new Date().toISOString()

  // 处理请求取消的错误
  if (error instanceof Error) {
    if (error.name === 'AbortError' || error.message.includes('canceled')) {
      return {
        type: 'user_abort',
        code: 'REQUEST_CANCELLED',
        message: '用户取消了请求',
        details: '用户主动取消了正在进行的请求',
        timestamp: now
      }
    }
  }

  // 处理 402 余额不足错误
  if (error.response?.status === 402) {
    return {
      code: '402',
      message: '账户余额不足,请充值后重试',
      details: error.response.data?.error?.message || error.message,
      timestamp: now,
      type: 'balance_insufficient'
    }
  }

  // 处理网络错误
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return {
      code: error.code,
      message: '网络连接失败,请检查网络设置或API地址',
      details: error.message,
      timestamp: now,
      type: 'network_error'
    }
  }

  // 处理API密钥错误
  if (error.response?.status === 401) {
    return {
      code: '401',
      message: 'API密钥无效或已过期',
      details: error.response.data?.error?.message || error.message,
      timestamp: now,
      type: 'api_error'
    }
  }

  // 处理请求格式错误
  if (error.response?.status === 400) {
    return {
      code: '400',
      message: '请求格式错误',
      details: error.response.data?.error?.message || error.message,
      timestamp: now,
      type: 'api_error'
    }
  }

  // 其他 API 错误
  if (error.response) {
    return {
      code: String(error.response.status),
      message: '服务调用失败',
      details: error.response.data?.error?.message || error.message,
      timestamp: now,
      type: 'api_error'
    }
  }

  // 未知错误
  return {
    code: '500',
    message: '发生未知错误',
    details: error.message,
    timestamp: now,
    type: 'unknown'
  }
}

/**
 * 核心检索功能
 */

/**
 * 将数据库查询结果转换为前端所需格式
 * @param result - 数据库查询结果
 * @returns 格式化后的RAG结果
 */
function transformDBResult(result: any): RAGResult {
  const metadata = result.metadata ? JSON.parse(result.metadata) : {}
  return {
    noteId: result.id,
    address: result.address,
    title: metadata.title,
    content: result.content,
    similarity: result.similarity,
    createdAt: new Date(Number(result.createdAt)).toISOString()
  }
}

/**
 * 问一问模式处理函数
 * 根据用户输入查询相关笔记并生成回答
 *
 * 处理流程：
 * 1. 如果用户指定了笔记引用，直接使用这些笔记
 * 2. 如果没有指定引用，则通过语义搜索找到相关笔记
 * 3. 结合笔记内容和用户问题生成回答
 *
 * @param query - 用户的问题
 * @param assistantNoteReferences - 用户指定的笔记引用列表
 * @param sessionId - 会话ID，用于维护会话状态和历史记录
 * @param currentMessages - 当前会话的消息历史
 * @param currentContexts - 当前会话的上下文历史
 * @param deepseekConfig - 大模型配置参数
 * @returns 包含答案、上下文和更新后消息列表的对象
 */
export async function handleAskQuestion(
  query: string,
  assistantNoteReferences: AssistantNoteReference[],
  sessionId: string | null,
  currentMessages: ChatMessage[] = [],
  currentContexts: RAGContext[] = []
): Promise<{
  answer: string
  context: RAGContext
  messages: ChatMessage[]
  error?: LLMError
}> {
  // 创建新的 LLMService 实例
  const llmService = new LLMService()

  // 如果已经有正在进行的请求,先中断它
  if (currentAskController) {
    currentAskController.llmService.abortCurrentRequest()
    currentAskController = null
  }

  // 设置新的控制器
  currentAskController = {
    abortController: new AbortController(),
    llmService
  }

  try {
    // 1. 参数验证：确保查询是字符串类型
    if (typeof query !== 'string') {
      throw new Error('查询必须是字符串类型')
    }

    // 2. 获取或创建会话：如果有sessionId，尝试恢复会话状态
    let session: ChatSession | undefined
    if (sessionId) {
      const history = await getRAGHistoryDetail(sessionId)
      if (history) {
        session = {
          id: sessionId,
          messages: currentMessages,
          currentContext: currentContexts[currentContexts.length - 1],
          conversationTracker: history.metadata?.conversationTracker,
          metadata: {
            startTime: history.createdAt,
            lastUpdateTime: history.updatedAt,
            messageCount: history.metadata.messageCount,
            hasReferences: assistantNoteReferences.length > 0,
            currentTopicId: history.metadata.currentTopicId,
            topicStartTime: history.metadata.topicStartTime
          }
        }
      }
    }

    let context: RAGContext
    let answer: string
    // 判断是否是新会话
    const isNewChat = currentMessages.length === 0

    // 3. 处理笔记引用和生成回答
    if (assistantNoteReferences.length > 0) {
      // 3a. 处理有引用笔记的情况：直接使用用户指定的笔记
      const notes = await db('notes').whereIn(
        'id',
        assistantNoteReferences.map((ref) => ref.id)
      )
      if (notes.length === 0) {
        throw new Error('未找到引用的笔记')
      }

      // 构建上下文：将引用的笔记转换为标准格式
      context = {
        query,
        timestamp: new Date().toISOString(),
        relevantDocs: notes.map((note: Note) => ({
          noteId: note.id,
          address: note.address || '',
          title: note.metadata?.title || '',
          content: note.content,
          similarity: 1, // 用户指定的笔记相似度设为1
          createdAt: new Date(Number(note.createdAt)).toISOString()
        })),
        processingType: 'qa'
      }

      // 生成回答
      const prompt = buildAskQuestionPrompt(query, context, currentMessages, isNewChat)
      answer = await llmService.generateResponse(prompt)
    } else {
      // 3b. 处理无引用笔记的情况：通过语义搜索找到相关笔记
      context = await retrieveContext(query, session)
      const prompt = buildAskQuestionPrompt(query, context, currentMessages, isNewChat)
      answer = await llmService.generateResponse(prompt)
    }

    // 4. 构建新的消息：记录用户问题和AI回答
    const userMessage: UserMessage = {
      id: uuidv4(),
      role: 'user',
      content: query,
      timestamp: Date.now()
    }

    const assistantMessage: AIAssistantMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: answer,
      timestamp: Date.now(),
      sourceType: context.relevantDocs.length > 0 ? 'notes' : 'ai',
      references: context.relevantDocs.length > 0 ? context.relevantDocs : undefined
    }

    const updatedMessages = [...currentMessages, userMessage, assistantMessage]
    const updatedContexts = [...currentContexts, context]

    // 5. 更新会话状态：维护对话历史和话题追踪
    if (session?.conversationTracker) {
      const queryVector = await getQueryVector(query)
      session.conversationTracker.questionHistory.push({
        content: query,
        vector: Array.from(queryVector),
        timestamp: Date.now()
      })

      // 维护固定大小的历史窗口
      if (
        session.conversationTracker.questionHistory.length > RAG_CONFIG.similarity.contextWindowSize
      ) {
        session.conversationTracker.questionHistory.shift()
      }

      session.metadata.messageCount += 2
      session.metadata.lastUpdateTime = new Date().toISOString()
    }

    // 6. 更新历史记录：持久化会话状态
    if (sessionId) {
      await updateRAGHistory(sessionId, updatedMessages, updatedContexts, {
        ...session?.metadata,
        conversationTracker: session?.conversationTracker
      })
    }

    // 7. 返回结果
    return {
      answer,
      context,
      messages: updatedMessages,
      error: undefined
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        answer: '请求已取消',
        context: {
          query,
          timestamp: new Date().toISOString(),
          relevantDocs: [],
          processingType: 'qa'
        },
        messages: currentMessages,
        error: {
          code: 'REQUEST_CANCELLED',
          message: '用户取消了请求',
          details: '用户主动取消了正在进行的请求',
          type: 'request_error',
          timestamp: new Date().toISOString()
        }
      }
    }

    // 处理其他错误
    log.error('问一问模式处理失败:', error)
    const llmError = handleLLMError(error)

    return {
      answer: '',
      context: {
        query,
        timestamp: new Date().toISOString(),
        relevantDocs: [],
        processingType: 'qa'
      },
      messages: currentMessages,
      error: llmError
    }
  } finally {
    // 确保清理控制器
    if (currentAskController?.llmService === llmService) {
      currentAskController = null
    }
  }
}

/**
 * 检索相关上下文函数
 * 根据用户查询检索相关笔记，支持会话上下文和话题追踪
 *
 * 处理流程：
 * 1. 并行处理用户查询：生成向量表示和提取关键词
 * 2. 根据会话状态选择检索策略：
 *    - 有会话且话题相关：优先使用现有文档
 *    - 有会话但话题不相关：作为新话题处理
 *    - 无会话：直接检索新文档
 * 3. 返回检索结果和相关上下文
 *
 * @param query - 用户的查询文本
 * @param session - 当前会话信息，包含会话状态和话题追踪器
 * @param limit - 最大返回文档数量，默认为5
 * @returns 包含查询相关文档的上下文对象
 */
export async function retrieveContext(
  query: string,
  session?: ChatSession,
  limit: number = 5
): Promise<RAGContext> {
  try {
    // 1. 输入验证：确保查询是字符串类型
    if (typeof query !== 'string') {
      log.error('检索上下文失败: 查询必须是字符串类型', {
        receivedType: typeof query,
        receivedValue: query
      })
      throw new Error('查询必须是字符串类型')
    }

    // 2. 并行处理：同时进行向量生成和关键词提取以提高性能
    const [queryVector, queryKeywords] = await Promise.all([
      // 2.1 初始化向量模型并生成查询向量
      (async () => {
        const embedder = await initEmbeddings()
        const vector = await embedder(query)
        return new Float32Array(vector)
      })(),
      // 2.2 提取查询关键词
      (async () => {
        const keywordExtractor = await getKeywordExtractor()
        const keywords = await keywordExtractor.extract(query)
        return keywords.map((k) => k.word)
      })()
    ])

    // 3. 根据会话状态处理检索
    let relevantDocs: RAGResult[] = []
    if (session?.conversationTracker) {
      // 3.1 检查当前查询与会话话题的相关性
      const { isRelatedTopic } = await checkTopicSimilarity(
        query,
        queryVector,
        session.conversationTracker
      )

      if (isRelatedTopic) {
        // 3.2 同话题处理：优先复用现有文档，可能补充新文档
        relevantDocs = await handleSameTopicRetrieval(
          queryVector,
          queryKeywords,
          session.conversationTracker,
          limit
        )
      } else {
        // 3.3 新话题处理：重新检索文档并创建新的话题追踪器
        relevantDocs = await handleNewTopicRetrieval(queryVector, queryKeywords, limit)
        session.conversationTracker = createNewTopicTracker(query, queryVector, queryKeywords)
      }
    } else {
      // 3.4 无会话上下文：直接执行新文档检索
      relevantDocs = await handleNewTopicRetrieval(queryVector, queryKeywords, limit)
    }

    // 4. 构建并返回上下文对象
    return {
      query, // 原始查询文本
      queryKeywords, // 查询关键词，用于前端展示和后续处理
      timestamp: new Date().toISOString(), // 检索时间戳
      relevantDocs // 相关文档列表
    }
  } catch (error) {
    // 5. 错误处理：记录错误并向上抛出
    log.error('RAG检索失败:', error)
    throw error
  }
}

/**
 * 处理新话题的文档检索函数
 * 使用 LanceDB 进行向量检索
 */
async function handleNewTopicRetrieval(
  queryVector: Float32Array,
  queryKeywords: string[],
  limit: number
): Promise<RAGResult[]> {
  try {
    // 1. 获取 LanceDB 实例
    const lanceService = await LanceService.getInstance()
    log.info('开始向量检索:', {
      keywordsCount: queryKeywords.length,
      limit
    })

    // 2. 使用 LanceDB 的混合搜索功能
    const searchResults = await lanceService.searchNotes(queryVector, queryKeywords, limit * 2)

    // 3. 获取检索到的笔记完整信息
    const noteIds = searchResults.map((result: any) => result.id)

    // 分批获取笔记信息
    const BATCH_SIZE = 5
    const allNotes: any[] = []

    for (let i = 0; i < noteIds.length; i += BATCH_SIZE) {
      const batchIds = noteIds.slice(i, i + BATCH_SIZE)
      const batchNotes = await db('notes').whereIn('id', batchIds).select('*')
      allNotes.push(...batchNotes)

      // 添加小延迟，避免资源竞争
      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    // 4. 整合搜索结果和笔记信息
    const results = searchResults
      .map((searchResult: any) => {
        const note = allNotes.find((n: any) => n.id === searchResult.id)
        if (!note) return null

        try {
          const metadata = note.metadata ? JSON.parse(note.metadata) : {}
          return {
            noteId: note.id,
            address: note.address || '',
            title: metadata.title || '',
            content: note.content,
            similarity: searchResult.score, // 直接使用 LanceDB 计算的分数
            createdAt: new Date(Number(note.createdAt)).toISOString(),
            matchedKeywords: searchResult.keywords || []
          }
        } catch (e) {
          log.error('解析笔记元数据失败:', { noteId: note.id, error: e })
          return null
        }
      })
      .filter(
        (result: any): result is NonNullable<typeof result> =>
          result !== null && result.similarity > 0.1
      )
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, limit)

    log.info('向量检索完成:', {
      queryKeywords,
      resultCount: results.length,
      topSimilarities: results.slice(0, 3).map((r: any) => ({
        similarity: r.similarity,
        title: r.title,
        matchedKeywords: r.matchedKeywords
      }))
    })

    return results
  } catch (error) {
    log.error('向量检索失败:', error)
    throw error
  }
}

/**
 * 话题管理相关功能
 */

/**
 * 检查查询与当前话题的相关性
 * @param query - 用户查询
 * @param queryVector - 查询向量
 * @param tracker - 会话追踪器
 * @returns 相关性判断结果
 */
async function checkTopicSimilarity(
  _query: string,
  queryVector: Float32Array,
  tracker: ConversationTracker
): Promise<{ isRelatedTopic: boolean; topicSimilarity: number }> {
  try {
    // 检查话题是否过期
    const topicAge = Date.now() - tracker.startTime
    if (topicAge > TOPIC_CONFIG.maxTopicAge) {
      return { isRelatedTopic: false, topicSimilarity: 0 }
    }

    // 获取最近的问题记录
    const recentQuestions = tracker.questionHistory
      .slice(-RAG_CONFIG.similarity.contextWindowSize)
      .filter((q) => Date.now() - q.timestamp < TOPIC_CONFIG.maxTopicIdle)

    if (recentQuestions.length === 0) {
      return { isRelatedTopic: false, topicSimilarity: 0 }
    }

    // 计算与历史问题的相似度
    const similarities = recentQuestions.map((q) => ({
      similarity: calculateVectorSimilarity(
        new Float32Array(queryVector),
        new Float32Array(q.vector)
      ),
      timestamp: q.timestamp
    }))

    // 计算加权平均相似度
    const weightedSimilarity = calculateWeightedSimilarity(similarities)

    return {
      isRelatedTopic: weightedSimilarity >= RAG_CONFIG.similarity.topicThreshold,
      topicSimilarity: weightedSimilarity
    }
  } catch (error) {
    log.error('话题相似度检查失败:', error)
    return { isRelatedTopic: false, topicSimilarity: 0 }
  }
}

/**
 * 创建新的话题追踪器
 */
function createNewTopicTracker(
  query: string,
  queryVector: Float32Array,
  queryKeywords: string[] // 添加关键词参数
): ConversationTracker {
  return {
    topicId: uuidv4(),
    startTime: Date.now(),
    docUsage: {},
    questionHistory: [
      {
        content: query,
        vector: Array.from(queryVector),
        timestamp: Date.now()
      }
    ],
    topicKeywords: queryKeywords // 添加关键词
  }
}

/**
 * 文档处理相关功能
 */

/**
 * 处理同话题下的文档检索
 * 优先使用历史相关文档，必要时补充新文档
 */
async function handleSameTopicRetrieval(
  queryVector: Float32Array,
  queryKeywords: string[], // 添加关键词参数
  tracker: ConversationTracker,
  limit: number
): Promise<RAGResult[]> {
  // 筛选和重新排序现有文档
  const reusableDocs = await filterAndReweightExistingDocs(
    tracker.docUsage,
    queryVector,
    queryKeywords // 传入关键词
  )

  // 补充检索新文档
  const supplementaryDocs = await retrieveSupplementaryDocs(
    queryVector,
    queryKeywords, // 传入关键词
    reusableDocs,
    limit
  )

  // 合并结果并更新使用记录
  return mergeDocs(reusableDocs, supplementaryDocs, limit)
}

/**
 * 计算向量相似度
 * 使用余弦相似度计算两个向量的相似程度
 */
function calculateVectorSimilarity(vec1: Float32Array, vec2: Float32Array): number {
  if (vec1.length !== vec2.length) {
    throw new Error('向量维度不匹配')
  }

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i]
    norm1 += vec1[i] * vec1[i]
    norm2 += vec2[i] * vec2[i]
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
}

// 计算加权相似度
function calculateWeightedSimilarity(
  similarities: { similarity: number; timestamp: number }[]
): number {
  if (similarities.length === 0) return 0

  const now = Date.now()
  let totalWeight = 0
  let weightedSum = 0

  similarities.forEach(({ similarity, timestamp }) => {
    // 时间衰减权重: 越近的问题权重越大
    const age = now - timestamp
    const weight = Math.exp(-age / (12 * 60 * 60 * 1000)) // 12小时半衰期

    weightedSum += similarity * weight
    totalWeight += weight
  })

  return weightedSum / totalWeight
}

/**
 * 筛选和重新计算现有文档的权重
 */
async function filterAndReweightExistingDocs(
  docUsage: ConversationTracker['docUsage'],
  queryVector: Float32Array,
  queryKeywords: string[] // 添加关键词参数
): Promise<RAGResult[]> {
  const results: RAGResult[] = []

  for (const [noteId, usage] of Object.entries(docUsage)) {
    const note = await db('notes')
      .join('note_embeddings', 'notes.id', 'note_embeddings.note_id')
      .where('notes.id', noteId)
      .first()

    if (!note || !note.embedding) continue

    // 解析笔记关键词
    const noteKeywords = note.keywords ? JSON.parse(note.keywords) : []

    // 计算新的相似度（使用增强版计算）
    const noteVector = blobToFloat32Array(note.embedding)
    const similarity = calculateFullSimilarity(queryVector, noteVector, {
      sourceKeywords: new Set(queryKeywords),
      targetKeywords: new Set(noteKeywords),
      title: note.title,
      content: note.content,
      weights: {
        vector: 0.35,
        keyword: 0.35,
        title: 0.2,
        content: 0.1
      }
    })

    // 应用使用频率和时间衰减因子
    const timeDecay = Math.exp(
      -(Date.now() - usage.lastUsed) / (RAG_CONFIG.retrieval.weightDecayFactor * 3600000)
    )
    const adjustedSimilarity = similarity * (1 + usage.usageCount * 0.1) * timeDecay

    if (adjustedSimilarity >= RAG_CONFIG.retrieval.reuseThreshold) {
      results.push(
        transformDBResult({
          ...note,
          similarity: adjustedSimilarity,
          matchedKeywords: noteKeywords.filter((k: string) => queryKeywords.includes(k))
        })
      )
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity)
}

// 检索补充文档
async function retrieveSupplementaryDocs(
  queryVector: Float32Array,
  queryKeywords: string[], // 添加关键词参数
  existingDocs: RAGResult[],
  limit: number
): Promise<RAGResult[]> {
  // 获取已有文档ID
  const existingIds = new Set(existingDocs.map((doc) => doc.noteId))

  // 检索新文档
  const notes = await db('notes')
    .join('note_embeddings', 'notes.id', 'note_embeddings.note_id')
    .whereNotIn('notes.id', Array.from(existingIds))
    .select('notes.*', 'note_embeddings.embedding', 'note_embeddings.keywords')

  const results = notes
    .map((note) => {
      try {
        if (!note.embedding) return null

        const noteVector = blobToFloat32Array(note.embedding)
        const noteKeywords = note.keywords ? JSON.parse(note.keywords) : []

        // 使用增强版相似度计算
        const similarity = calculateFullSimilarity(queryVector, noteVector, {
          sourceKeywords: new Set(queryKeywords),
          targetKeywords: new Set(noteKeywords),
          title: note.title,
          content: note.content,
          weights: {
            vector: 0.35,
            keyword: 0.35,
            title: 0.2,
            content: 0.1
          }
        })

        return {
          ...note,
          similarity,
          matchedKeywords: noteKeywords.filter((k: string) => queryKeywords.includes(k))
        }
      } catch (error) {
        log.error('处理补充文档失败:', { id: note.id, error })
        return null
      }
    })
    .filter((result): result is NonNullable<typeof result> => {
      return result !== null && result.similarity > RAG_CONFIG.retrieval.minSimilarity
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit - existingDocs.length)

  return results.map(transformDBResult)
}

// 合并文档结果
function mergeDocs(
  existingDocs: RAGResult[],
  supplementaryDocs: RAGResult[],
  limit: number
): RAGResult[] {
  return [...existingDocs, ...supplementaryDocs]
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
}

/**
 * 历史记录管理功能
 */

/**
 * 更新RAG历史记录
 * @param sessionId - 会话ID
 * @param messages - 对话消息列表
 * @param contexts - 上下文列表
 * @param metadata - 元数据
 */
export async function updateRAGHistory(
  sessionId: string,
  messages: ChatMessage[],
  contexts: RAGContext[],
  metadata: any
): Promise<void> {
  try {
    const now = Date.now()
    const firstMessage = messages[0]

    // 扩展元数据
    const extendedMetadata = {
      messageCount: messages.length,
      userMessageCount: messages.filter((m) => m.role === 'user').length,
      aiMessageCount: messages.filter((m) => m.role === 'assistant').length,
      averageRelevanceScore:
        contexts.reduce(
          (acc, ctx) =>
            acc +
            ctx.relevantDocs.reduce((sum, doc) => sum + doc.similarity, 0) /
              ctx.relevantDocs.length,
          0
        ) / contexts.length,
      isHistorical: false, // 新建的对话默认为非历史对话
      ...metadata
    }

    // 检查是否存在现有记录
    const existing = await db('rag_history').where('id', sessionId).first()

    if (existing) {
      // 更新现有记录时保持原有的 isHistorical 状态
      const existingMetadata = JSON.parse(existing.metadata)
      extendedMetadata.isHistorical = existingMetadata.isHistorical ?? true

      await db('rag_history')
        .where('id', sessionId)
        .update({
          messages: JSON.stringify(messages),
          contexts: JSON.stringify(contexts),
          metadata: JSON.stringify(extendedMetadata),
          updatedAt: now
        })
    } else {
      // 创建新记录
      await db('rag_history').insert({
        id: sessionId,
        title: firstMessage.content.slice(0, 20),
        messages: JSON.stringify(messages),
        contexts: JSON.stringify(contexts),
        summary: firstMessage.content.slice(0, 100),
        totalTokens: 0,
        metadata: JSON.stringify(extendedMetadata),
        isPinned: false,
        createdAt: now,
        updatedAt: now
      })
    }
  } catch (error) {
    log.error('更新RAG历史失败:', error)
    throw error
  }
}

// 更新历史记录标题
export async function updateRAGHistoryTitle(id: string, title: string): Promise<void> {
  try {
    await db('rag_history').where({ id }).update({
      title,
      updatedAt: Date.now()
    })
  } catch (error) {
    log.error('更新历史记录标题失败:', error)
    throw error
  }
}

// 更新置顶状态
export async function toggleRAGHistoryPin(id: string): Promise<void> {
  try {
    // 先获取当前状态
    const record = await db('rag_history').where({ id }).first()

    // 切换状态
    await db('rag_history').where({ id }).update({
      isPinned: !record.isPinned,
      updatedAt: Date.now()
    })
  } catch (error) {
    log.error('更新置顶状态失败:', error)
    throw error
  }
}

// 删除历史记录
export async function deleteRAGHistory(id: string): Promise<void> {
  try {
    await db('rag_history').where({ id }).delete()
  } catch (error) {
    log.error('删除历史记录失败:', error)
    throw error
  }
}

// 清空所有历史记录
export async function clearAllRAGHistory(): Promise<void> {
  try {
    await db('rag_history').delete()
  } catch (error) {
    log.error('清空历史记录失败:', error)
    throw error
  }
}

// 获取检索历史
export async function getRAGHistory(): Promise<RAGHistoryRecord[]> {
  try {
    const history = await db('rag_history').orderBy([
      { column: 'isPinned', order: 'desc' },
      { column: 'createdAt', order: 'desc' }
    ])

    return history.map((item) => ({
      id: item.id,
      title: item.title,
      messages: JSON.parse(item.messages),
      contexts: JSON.parse(item.contexts),
      summary: item.summary,
      totalTokens: item.totalTokens,
      metadata: JSON.parse(item.metadata),
      isPinned: Boolean(item.isPinned),
      createdAt: new Date(Number(item.createdAt)).toISOString(),
      updatedAt: new Date(Number(item.updatedAt)).toISOString()
    }))
  } catch (error) {
    log.error('获取RAG历史失败:', error)
    throw error
  }
}

// 获取单条历史记录详情
export async function getRAGHistoryDetail(id: string): Promise<RAGHistoryRecord | null> {
  try {
    const item = await db('rag_history').where({ id }).first()
    if (!item) return null

    const metadata = JSON.parse(item.metadata)
    // 确保 metadata 中包含 isHistorical 字段
    if (!('isHistorical' in metadata)) {
      metadata.isHistorical = true // 默认将旧记录标记为历史对话
    }

    return {
      id: item.id,
      title: item.title,
      messages: JSON.parse(item.messages),
      contexts: JSON.parse(item.contexts),
      summary: item.summary,
      totalTokens: item.totalTokens,
      metadata: metadata,
      isPinned: Boolean(item.isPinned),
      createdAt: new Date(Number(item.createdAt)).toISOString(),
      updatedAt: new Date(Number(item.updatedAt)).toISOString()
    }
  } catch (error) {
    log.error('获取RAG历史详情失败:', error)
    throw error
  }
}

/**
 * 答案生成相关功能
 */

/**
 * 生成回答
 * 整合检索结果和历史对话，生成合适的回答
 */

export async function generateAnswer(
  query: string,
  sessionId: string | null,
  currentMessages: ChatMessage[] = [],
  currentContexts: RAGContext[] = []
): Promise<{
  answer: string
  context: RAGContext
  messages: ChatMessage[]
}> {
  try {
    // 参数验证
    if (typeof query !== 'string') {
      throw new Error('查询必须是字符串类型')
    }

    if (sessionId !== null && typeof sessionId !== 'string') {
      throw new Error('会话ID必须是字符串或null')
    }

    if (!Array.isArray(currentMessages)) {
      throw new Error('currentMessages必须是数组')
    }

    if (!Array.isArray(currentContexts)) {
      throw new Error('currentContexts必须是数组')
    }

    // 记录调用信息
    log.info('生成回答 - 输入参数:', {
      query,
      sessionId,
      messagesCount: currentMessages.length,
      contextsCount: currentContexts.length
    })
    // 1. 获取或创建会话
    let session: ChatSession | undefined
    if (sessionId) {
      const history = await getRAGHistoryDetail(sessionId)
      if (history) {
        session = {
          id: sessionId,
          messages: currentMessages,
          currentContext: currentContexts[currentContexts.length - 1],
          conversationTracker: history.metadata?.conversationTracker, // 从历史记录中恢复会话追踪器
          metadata: {
            startTime: history.createdAt,
            lastUpdateTime: history.updatedAt,
            messageCount: history.metadata.messageCount,
            hasReferences: true,
            currentTopicId: history.metadata.currentTopicId,
            topicStartTime: history.metadata.topicStartTime
          }
        }
      }
    }

    // 2. 获取相关上下文（传入会话信息）
    const context = await retrieveContext(query, session)

    // 3. 构建提示词（包含历史对话）
    const prompt = buildPrompt(query, context, currentMessages)

    // 4. 调用大模型时传入 deepseekConfig
    const answer = await llm.generateResponse(prompt)

    // 5. 构建新的消息
    const userMessage: UserMessage = {
      id: uuidv4(),
      role: 'user',
      content: query,
      timestamp: Date.now()
    }

    const assistantMessage: AIAssistantMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: answer,
      timestamp: Date.now(),
      sourceType: context.relevantDocs.length > 0 ? 'notes' : 'ai',
      references: context.relevantDocs.length > 0 ? context.relevantDocs : undefined
    }

    const updatedMessages = [...currentMessages, userMessage, assistantMessage]
    const updatedContexts = [...currentContexts, context]

    // 6. 更新会话状态
    // 6. 更新会话状态
    if (session?.conversationTracker) {
      // 更新问题历史
      const queryVector = await getQueryVector(query)
      session.conversationTracker.questionHistory.push({
        content: query,
        vector: Array.from(queryVector), // 转换为普通数组
        timestamp: Date.now()
      })

      // 如果超过窗口大小，移除最旧的记录
      if (
        session.conversationTracker.questionHistory.length > RAG_CONFIG.similarity.contextWindowSize
      ) {
        session.conversationTracker.questionHistory.shift()
      }

      // 更新元数据
      session.metadata.messageCount += 2 // 用户消息和AI回复各算一条
      session.metadata.lastUpdateTime = new Date().toISOString()
    }

    // 7. 如果有会话ID，则更新历史记录
    if (sessionId) {
      await updateRAGHistory(sessionId, updatedMessages, updatedContexts, {
        ...session?.metadata,
        conversationTracker: session?.conversationTracker
      })
    }

    // 8. 返回结果
    return {
      answer,
      context,
      messages: updatedMessages
    }
  } catch (error) {
    log.error('生成回答失败:', error)
    throw error
  }
}

/**
 * 工具函数
 */

// 辅助函数：获取查询向量（带缓存）
const vectorCache = new Map<string, Float32Array>()

/**
 * 获取查询向量（带缓存）
 * @param query - 查询文本
 * @returns 向量表示
 */
async function getQueryVector(query: string): Promise<Float32Array> {
  const cached = vectorCache.get(query)
  if (cached) return cached

  const embedder = await initEmbeddings()
  const vector = new Float32Array(await embedder(query))

  // 缓存结果（可以设置一个最大缓存大小）
  if (vectorCache.size > 1000) {
    // 限制缓存大小
    const oldestKey = vectorCache.keys().next().value
    vectorCache.delete(oldestKey as string)
  }
  vectorCache.set(query, vector)

  return vector
}

/**
 * 构建提示词
 * 整合上下文和历史对话，生成结构化的提示词
 */
function buildPrompt(query: string, context: RAGContext, messages: ChatMessage[] = []): string {
  // 添加类型检查
  if (!context || !Array.isArray(context.relevantDocs)) {
    log.error('构建提示词失败: 无效的上下文格式', { context })
    throw new Error('无效的上下文格式')
  }

  try {
    // 格式化相关文档
    const contextText = context.relevantDocs
      .map((doc) => {
        if (typeof doc.title !== 'string' || typeof doc.content !== 'string') {
          throw new Error('无效的文档格式')
        }
        return `【笔记标题】${doc.title}\n【笔记内容】${doc.content}`
      })
      .join('\n\n')
    // 格式化历史对话
    const recentMessages = messages
      .slice(-RAG_CONFIG.similarity.contextWindowSize * 2)
      .map((msg) => {
        if (typeof msg.content !== 'string') {
          throw new Error('无效的消息格式')
        }
        return `${msg.role === 'user' ? '用户' : 'AI'}：${msg.content}`
      })
      .join('\n')
    // 返回结构化的提示词
    return `
# Role: RAG笔记应用AI助手安安

## Profile
- 名字：安安
- 角色：笔记应用的AI助手
- 职责：基于笔记库和知识为用户提供智能问答服务
- 性格：温柔可爱

## Core Functions
1. 优先使用笔记库内容回答问题
2. 在无相关笔记时使用自身知识回答
3. 提供简洁清晰的答案

## Response Guidelines
1. 不提及信息来源（如"根据笔记"、"没有相关笔记"等）
2. 使用通俗易懂的语言
3. 确保回答简洁且结构清晰
4. 严格遵循格式规范

## Format Specifications
使用markdown格式

## Workflow
	1.	接收问题
	2.	检索笔记库
	3.	组织答案内容
	4.	按格式规范输出

## Input Variables
### 历史对话
${recentMessages}
### 上下文
${contextText}
### 问题
${query}

`
  } catch (error) {
    log.error('构建提示词失败:', error)
    throw error
  }
}

// 批量获取历史记录
export async function batchGetRAGHistory(ids: string[]): Promise<RAGHistoryRecord[]> {
  try {
    const records = await db('rag_history')
      .whereIn('id', ids)
      .select('*')
      .orderBy('updatedAt', 'desc')

    return records.map((item) => ({
      id: item.id,
      title: item.title,
      messages: JSON.parse(item.messages),
      contexts: JSON.parse(item.contexts),
      summary: item.summary,
      totalTokens: item.totalTokens,
      metadata: JSON.parse(item.metadata),
      isPinned: Boolean(item.isPinned),
      createdAt: new Date(Number(item.createdAt)).toISOString(),
      updatedAt: new Date(Number(item.updatedAt)).toISOString()
    }))
  } catch (error) {
    log.error('批量获取历史记录失败:', error)
    throw error
  }
}

/**
 * 性能监控
 */
// 性能监控方法
export interface RAGPerformanceData {
  sessionId: string
  method: string
  duration: number
  timestamp: number
  success: boolean
  error?: string
  metadata?: Record<string, any>
}

const performanceLog: RAGPerformanceData[] = []
/**
 * 记录RAG性能数据
 */
export function trackRAGPerformance(
  sessionId: string,
  method: string,
  duration: number,
  options: {
    success: boolean
    error?: string
    metadata?: Record<string, any>
  } = { success: true }
): void {
  const performanceData: RAGPerformanceData = {
    sessionId,
    method,
    duration,
    timestamp: Date.now(),
    ...options
  }

  // 记录到内存
  performanceLog.push(performanceData)

  // 如果日志太多，清理旧的
  if (performanceLog.length > 1000) {
    performanceLog.splice(0, 100)
  }

  // 如果性能异常，记录警告
  if (duration > 5000) {
    // 超过5秒
    log.warn('RAG性能警告 - 响应时间过长:', {
      会话ID: sessionId,
      方法: method,
      耗时: `${duration}ms`
    })
  }
}

/**
 * 获取性能日志
 * 支持多种过滤条件
 */
export function getRAGPerformanceLogs(
  options: {
    startTime?: number
    endTime?: number
    method?: string
    sessionId?: string
    onlyErrors?: boolean
  } = {}
): RAGPerformanceData[] {
  let filtered = performanceLog

  if (options.startTime) {
    filtered = filtered.filter((log) => log.timestamp >= options.startTime!)
  }

  if (options.endTime) {
    filtered = filtered.filter((log) => log.timestamp <= options.endTime!)
  }

  if (options.method) {
    filtered = filtered.filter((log) => log.method === options.method)
  }

  if (options.sessionId) {
    filtered = filtered.filter((log) => log.sessionId === options.sessionId)
  }

  if (options.onlyErrors) {
    filtered = filtered.filter((log) => !log.success)
  }

  return filtered
}

/**
 * 系统维护
 */
/**
 * 清理过期会话
 * 定期清理超过最大存活时间的非置顶会话
 */
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    const expirationTime = Date.now() - TOPIC_CONFIG.maxTopicAge
    const result = await db('rag_history')
      .where('updatedAt', '<', expirationTime)
      .whereNot('isPinned', true) // 不删除置顶的会话
      .delete()

    log.info('清理过期会话完成:', {
      清理时间: new Date().toISOString(),
      删除数量: result
    })
  } catch (error) {
    log.error('清理过期会话失败:', error)
    throw error
  }
}

/**
 * 生成带引用回答
 */
export async function generateAnswerWithReferences(
  query: string,
  assistantNoteReferences: AssistantNoteReference[],
  sessionId: string | null,
  currentMessages: ChatMessage[] = [],
  currentContexts: RAGContext[] = []
): Promise<{
  answer: string
  context: RAGContext
  messages: ChatMessage[]
}> {
  try {
    // 1. 参数验证
    if (typeof query !== 'string') {
      throw new Error('查询必须是字符串类型')
    }

    // 记录调用信息
    log.info('生成带引用回答 - 输入参数:', {
      query,
      sessionId,
      referencesCount: assistantNoteReferences.length,
      messagesCount: currentMessages.length,
      contextsCount: currentContexts.length
    })

    // 2. 获取或创建会话（复用原有逻辑）
    let session: ChatSession | undefined
    if (sessionId) {
      const history = await getRAGHistoryDetail(sessionId)
      if (history) {
        session = {
          id: sessionId,
          messages: currentMessages,
          currentContext: currentContexts[currentContexts.length - 1],
          conversationTracker: history.metadata?.conversationTracker,
          metadata: {
            startTime: history.createdAt,
            lastUpdateTime: history.updatedAt,
            messageCount: history.metadata.messageCount,
            hasReferences: true,
            currentTopicId: history.metadata.currentTopicId,
            topicStartTime: history.metadata.topicStartTime
          }
        }
      }
    }

    // 3. 获取被引用笔记的完整内容
    const notes = await db('notes').whereIn(
      'id',
      assistantNoteReferences.map((ref) => ref.id)
    )
    if (notes.length === 0) {
      throw new Error('未找到引用的笔记')
    }

    // 4. 构建上下文（使用引用的笔记作为相关文档）
    const context: RAGContext = {
      query,
      timestamp: new Date().toISOString(),
      relevantDocs: notes.map((note) => ({
        noteId: note.id,
        address: note.address || '',
        title: note.title,
        content: note.content,
        similarity: 1, // 直接引用的笔记，相关度设为 1
        createdAt: new Date(Number(note.createdAt)).toISOString()
      })),
      processingType: 'qa'
    }

    // 5. 构建特殊的 prompt，强调这些是用户主动引用的笔记
    const referencesText = notes
      .map((note, index) => `笔记 ${index + 1}（${note.title}）：\n${note.content}`)
      .join('\n\n')
    const prompt = `用户引用了以下笔记，请基于这些笔记的内容来回答用户的问题：\n\n${referencesText}\n\n用户问题：${query}`

    // 6. 调用大模型时传入 deepseekConfig
    const answer = await llm.generateResponse(prompt)

    // 7. 构建新的消息（复用原有逻辑）
    const userMessage: UserMessage = {
      id: uuidv4(),
      role: 'user',
      content: query,
      timestamp: Date.now()
    }

    const assistantMessage: AIAssistantMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: answer,
      timestamp: Date.now(),
      sourceType: 'notes',
      references: context.relevantDocs
    }

    const updatedMessages = [...currentMessages, userMessage, assistantMessage]
    const updatedContexts = [...currentContexts, context]

    // 8. 更新会话状态（复用原有逻辑）
    if (session?.conversationTracker) {
      const queryVector = await getQueryVector(query)
      session.conversationTracker.questionHistory.push({
        content: query,
        vector: Array.from(queryVector),
        timestamp: Date.now()
      })

      if (
        session.conversationTracker.questionHistory.length > RAG_CONFIG.similarity.contextWindowSize
      ) {
        session.conversationTracker.questionHistory.shift()
      }

      session.metadata.messageCount += 2
      session.metadata.lastUpdateTime = new Date().toISOString()
    }

    // 9. 更新历史记录
    if (sessionId) {
      await updateRAGHistory(sessionId, updatedMessages, updatedContexts, {
        ...session?.metadata,
        conversationTracker: session?.conversationTracker
      })
    }

    // 10. 返回结果
    return {
      answer,
      context,
      messages: updatedMessages
    }
  } catch (error) {
    log.error('生成带引用回答失败:', error)
    throw error
  }
}

// 提取单个节点的文本
function extractNodeText(node: any): string {
  if (!node) return ''

  // 如果是文本节点，直接返回文本
  if (node.type === 'text') return node.text

  // 如果有子内容，递归处理
  if (node.content) {
    const texts = node.content.map((child: any) => extractNodeText(child)).filter(Boolean)

    // 根据节点类型添加额外的格式
    switch (node.type) {
      case 'heading':
        return `${texts.join('')}\n`
      case 'paragraph':
        return `${texts.join('')}\n`
      case 'listItem':
        return `• ${texts.join('')}\n` // 添加项目符号
      case 'bulletList':
      case 'orderedList':
        return texts.join('')
      default:
        return texts.join('')
    }
  }

  return ''
}

// 提取文档内容
function extractTextFromContent(content: any): string {
  try {
    const contentObj = typeof content === 'string' ? JSON.parse(content) : content

    if (!contentObj || !contentObj.content) {
      log.error('内容格式无效:', content)
      return ''
    }

    const text = extractNodeText(contentObj)

    // 清理多余的换行符
    return text.split('\n').filter(Boolean).join('\n')
  } catch (error) {
    log.error('提取文本内容失败:', error)
    return String(content)
  }
}

/**
 * 构建问一问模式的提示词
 */
function buildAskQuestionPrompt(
  query: string,
  context: RAGContext,
  messages: ChatMessage[] = [],
  isNewChat: boolean = messages.length === 0 // 添加参数判断是否是新对话
): string {
  // 添加类型检查
  if (!context || !Array.isArray(context.relevantDocs)) {
    log.error('构建提示词失败: 无效的上下文格式', { context })
    throw new Error('无效的上下文格式')
  }

  try {
    // 格式化相关文档
    const contextText = context.relevantDocs
      .map((doc, index) => {
        const textContent = extractTextFromContent(doc.content)
        if (!textContent && textContent !== '') {
          log.error(`文档 ${index} 内容为空:`, doc.content)
          throw new Error(`文档 ${index} 内容为空`)
        }
        const title = doc.title || ''
        return `【笔记内容】${textContent}${title ? `\n【笔记标题】${title}` : ''}`
      })
      .join('\n\n')

    // 格式化历史对话
    const recentMessages = messages
      .slice(-RAG_CONFIG.similarity.contextWindowSize * 2)
      .map((msg) => {
        if (typeof msg.content !== 'string') {
          throw new Error('无效的消息格式')
        }
        return `${msg.role === 'user' ? '用户' : 'AI'}：${msg.content}`
      })
      .join('\n')

    // 只在新对话时添加角色定位
    const rolePrompt = isNewChat
      ? `# Role: RAG笔记应用AI助手安安

## Profile
- 名字：安安
- 角色：笔记应用的问答助手
- 职责：帮助用户理解和获取笔记中的知识
- 性格：专业、耐心

## Core Functions
1. 准确理解用户问题
2. 从笔记中提取相关信息
3. 提供清晰的解答

## Response Guidelines
1. 直接回答问题，不提及信息来源
2. 确保回答准确且有针对性
3. 使用简洁清晰的语言
4. 如有必要，可以适当组织和整理信息

## Format Specifications
使用markdown格式，保持回答结构清晰

## Workflow
1. 理解用户问题
2. 分析相关笔记内容
3. 组织核心信息
4. 生成清晰答案

`
      : ''

    return `${rolePrompt}${recentMessages ? `历史对话：\n${recentMessages}\n\n` : ''}相关笔记：\n${contextText}\n\n用户问题：\n${query}`
  } catch (error) {
    log.error('构建问一问提示词失败:', error)
    throw error
  }
}

/**
 * 聊一聊模式
 * 直接与AI对话,不检索笔记内容
 */
export async function handleChat(
  query: string,
  sessionId: string | null,
  currentMessages: ChatMessage[] = [],
  currentContexts: RAGContext[] = []
): Promise<{
  answer: string
  context: RAGContext
  messages: ChatMessage[]
  error?: LLMError
}> {
  // 创建新的 LLMService 实例
  const llmService = new LLMService()

  // 如果已经有正在进行的请求,先中断它
  if (currentChatController) {
    currentChatController.llmService.abortCurrentRequest()
    currentChatController = null
  }

  // 设置新的控制器
  currentChatController = {
    abortController: new AbortController(),
    llmService
  }

  try {
    // 1. 参数验证
    if (typeof query !== 'string') {
      throw new Error('查询必须是字符串类型')
    }

    // 记录调用信息
    log.info('聊一聊模式 - 输入参数:', {
      query,
      sessionId,
      messagesCount: currentMessages.length,
      contextsCount: currentContexts.length
    })

    // 2. 获取或创建会话
    let session: ChatSession | undefined
    if (sessionId) {
      const history = await getRAGHistoryDetail(sessionId)
      if (history) {
        session = {
          id: sessionId,
          messages: currentMessages,
          currentContext: currentContexts[currentContexts.length - 1],
          conversationTracker: history.metadata?.conversationTracker,
          metadata: {
            startTime: history.createdAt,
            lastUpdateTime: history.updatedAt,
            messageCount: history.metadata.messageCount,
            hasReferences: false,
            currentTopicId: history.metadata.currentTopicId,
            topicStartTime: history.metadata.topicStartTime
          }
        }
      }
    }

    // 3. 构建空上下文
    const context: RAGContext = {
      query,
      timestamp: new Date().toISOString(),
      relevantDocs: [],
      processingType: 'chat'
    }

    // 4. 构建聊天提示词 - 根据是否是新会话来决定
    const isNewChat = currentMessages.length === 0
    const prompt = await buildChatPrompt(query, currentMessages, isNewChat)

    // 5. 使用当前 llmService 生成回答
    const answer = await llmService.generateResponse(prompt)

    // 6. 构建新的消息
    const userMessage: UserMessage = {
      id: uuidv4(),
      role: 'user',
      content: query,
      timestamp: Date.now()
    }

    const assistantMessage: AIAssistantMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: answer,
      timestamp: Date.now(),
      sourceType: 'ai'
    }

    const updatedMessages = [...currentMessages, userMessage, assistantMessage]
    const updatedContexts = [...currentContexts, context]

    // 7. 更新会话状态
    if (session?.conversationTracker) {
      const queryVector = await getQueryVector(query)
      session.conversationTracker.questionHistory.push({
        content: query,
        vector: Array.from(queryVector),
        timestamp: Date.now()
      })

      if (
        session.conversationTracker.questionHistory.length > RAG_CONFIG.similarity.contextWindowSize
      ) {
        session.conversationTracker.questionHistory.shift()
      }

      session.metadata.messageCount += 2
      session.metadata.lastUpdateTime = new Date().toISOString()
    }

    // 8. 更新历史记录
    if (sessionId) {
      await updateRAGHistory(sessionId, updatedMessages, updatedContexts, {
        ...session?.metadata,
        conversationTracker: session?.conversationTracker
      })
    }

    // 9. 清理当前控制器
    currentChatController = null

    // 10. 返回结果
    return {
      answer,
      context,
      messages: updatedMessages,
      error: undefined
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        answer: '请求已取消',
        context: {
          query,
          timestamp: new Date().toISOString(),
          relevantDocs: [],
          processingType: 'chat'
        },
        messages: currentMessages,
        error: {
          code: 'REQUEST_CANCELLED',
          message: '用户取消了请求',
          details: '用户主动取消了正在进行的请求',
          type: 'request_error',
          timestamp: new Date().toISOString()
        }
      }
    }

    // 处理其他错误
    log.error('聊天模式处理失败:', error)
    const llmError = handleLLMError(error)

    return {
      answer: '',
      context: {
        query,
        timestamp: new Date().toISOString(),
        relevantDocs: [],
        processingType: 'chat'
      },
      messages: currentMessages,
      error: llmError
    }
  } finally {
    // 确保清理控制器
    if (currentChatController?.llmService === llmService) {
      currentChatController = null
    }
  }
}

/**
 * 构建聊天模式的提示词
 */
async function buildChatPrompt(
  query: string,
  messages: ChatMessage[] = [],
  isNewChat: boolean = false
): Promise<string> {
  try {
    const recentMessages = messages
      .slice(-RAG_CONFIG.similarity.contextWindowSize * 2)
      .map((msg) => {
        if (typeof msg.content !== 'string') {
          throw new Error('无效的消息格式')
        }
        return `${msg.role === 'user' ? '用户' : 'AI'}：${msg.content}`
      })
      .join('\n')

    // 只在新会话时添加角色定位
    let rolePrompt = ''
    if (isNewChat) {
      try {
        const config = await modelConfigService.getSystemPrompt()
        rolePrompt = config.systemPrompt
      } catch (error) {
        log.error('获取系统提示词失败，使用默认提示词:', error)
        // 如果获取失败，使用默认提示词
        rolePrompt = `# 角色定位：智慧顾问\n\n## 核心定位\n- 专业知识分享者\n- 思维引导者\n- 平等对话者\n\n...`
      }
    }

    return `${rolePrompt}${recentMessages ? `历史对话记录：\n${recentMessages}\n\n` : ''}用户的问题是：\n${query}`
  } catch (error) {
    log.error('构建聊天提示词失败:', error)
    throw error
  }
}

/**
 * 找一找模式
 * 通过语义搜索查找相关笔记
 */
/**
 * 找一找模式
 * 通过语义搜索查找相关笔记
 */
export async function handleFindNotes(
  query: string,
  sessionId: string | null,
  currentMessages: ChatMessage[] = [],
  currentContexts: RAGContext[] = []
): Promise<{
  answer: string
  context: RAGContext
  messages: ChatMessage[]
}> {
  try {
    // 1. 参数验证
    if (typeof query !== 'string') {
      throw new Error('查询必须是字符串类型')
    }

    log.info('找一找模式 - 输入参数:', {
      query,
      sessionId,
      messagesCount: currentMessages.length
    })

    // 2. 获取关键词提取器实例并提取关键词
    const extractor = await getKeywordExtractor()
    const extractedKeywords = await extractor.extract(query)
    const keywords = extractedKeywords.map((k) => k.word)

    log.info('查询关键词:', keywords)

    // 3. 初始化向量模型并生成查询向量
    const embedder = await initEmbeddings()
    const queryVector = await embedder(query)
    const queryFloat32Array = new Float32Array(queryVector)

    // 4. 设置找一找模式的特定配置
    const FIND_CONFIG = {
      minSimilarity: 0.25, // 相似度阈值
      maxResults: 15, // 最大返回数量
      minKeywordMatch: 1 // 最小关键词匹配数
    }

    // 5. 执行增强版语义搜索
    const results = await handleEnhancedSemanticSearch(queryFloat32Array, query, FIND_CONFIG)

    // 6. 构建上下文
    const context: RAGContext = {
      query,
      timestamp: new Date().toISOString(),
      relevantDocs: results,
      processingType: 'find'
    }

    // 7. 生成回答文本
    const answer = `根据你的描述，我找到了以下 ${results.length} 条相关笔记。`

    // 8. 构建消息
    const userMessage: UserMessage = {
      id: uuidv4(),
      role: 'user',
      content: query,
      timestamp: Date.now()
    }

    const assistantMessage: AIAssistantMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: answer,
      timestamp: Date.now(),
      sourceType: 'notes',
      references: results
    }

    const updatedMessages = [...currentMessages, userMessage, assistantMessage]
    const updatedContexts = [...currentContexts, context]

    // 9. 更新历史记录
    if (sessionId) {
      await updateRAGHistory(sessionId, updatedMessages, updatedContexts, {
        processingType: 'find',
        queryVector: Array.from(queryVector)
      })
    }

    return {
      answer,
      context,
      messages: updatedMessages
    }
  } catch (error) {
    log.error('找一找模式处理失败:', error)
    throw error
  }
}

/**
 * 执行增强版语义搜索
 * 结合向量相似度和关键词匹配的搜索实现
 */

async function handleEnhancedSemanticSearch(
  queryVector: Float32Array,
  queryText: string,
  config: {
    minSimilarity: number
    maxResults: number
  }
): Promise<RAGResult[]> {
  try {
    // 1. 获取查询的关键词
    const keywordExtractor = await getKeywordExtractor()
    const queryKeywords = await keywordExtractor.extract(queryText)
    const queryKeywordSet = new Set(queryKeywords.map((k) => k.word.toLowerCase()))

    const notes = await db('note_embeddings')
      .join('notes', 'note_embeddings.note_id', 'notes.id')
      .select('notes.*', 'note_embeddings.embedding', 'note_embeddings.keywords')

    const results = notes
      .map((note) => {
        try {
          if (!note.embedding) return null

          const noteVector = blobToFloat32Array(note.embedding)
          const noteKeywords: Set<string> = note.keywords
            ? new Set(JSON.parse(note.keywords).map((k: { word: string }) => k.word.toLowerCase()))
            : new Set()

          const similarity = calculateFullSimilarity(queryVector, noteVector, {
            sourceKeywords: queryKeywordSet,
            targetKeywords: noteKeywords,
            title: note.title,
            content: note.content
          })

          return {
            ...note,
            similarity,
            keywords: noteKeywords
          }
        } catch (error) {
          log.error('处理笔记相似度失败:', { id: note.id, error })
          return null
        }
      })
      .filter((result): result is NonNullable<typeof result> => {
        return result !== null && result.similarity > config.minSimilarity
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, config.maxResults)

    // 添加最终结果的详细日志
    log.info(
      '搜索最终结果:',
      results.map((r) => ({
        title: r.title || '无标题',
        similarity: (r.similarity * 100).toFixed(1) + '%',
        keywords: Array.from(r.keywords),
        queryKeywords: Array.from(queryKeywordSet)
      }))
    )

    return results.map(transformDBResult)
  } catch (error) {
    log.error('语义搜索失败:', error)
    throw error
  }
}

/**
 * Agent 聊天模式
 * @param params.query - 用户输入(可选,首次调用时不需要)
 * @param params.agentId - Agent ID
 * @param params.noteId - 笔记 ID(可选)
 * @param params.sessionId - 会话 ID(可选)
 * @param params.currentMessages - 当前消息列表
 * @param params.currentContexts - 当前上下文列表
 */
export async function handleAgentChat(params: {
  query?: string
  agentId: string
  noteId?: string
  sessionId?: string | null
  currentMessages?: ChatMessage[]
  currentContexts?: RAGContext[]
}): Promise<{
  answer: string
  context: RAGContext
  messages: ChatMessage[]
  error?: LLMError
}> {
  // 创建新的 LLMService 实例
  const llmService = new LLMService()

  // 如果已经有正在进行的请求,先中断它
  console.log('Agent 聊天模式 - 当前控制器状态:', currentAgentController)
  if (currentAgentController) {
    currentAgentController.llmService.abortCurrentRequest()
    currentAgentController = null
  }

  // 创建新的 AbortController
  const abortController = new AbortController()

  // 设置新的控制器 - 移到这里，确保在调用 generateResponse 之前就设置好
  currentAgentController = {
    abortController,
    llmService
  }

  try {
    const {
      query,
      agentId,
      noteId,
      sessionId = null,
      currentMessages = [],
      currentContexts = []
    } = params

    // 1. 获取 Agent 配置
    console.log('获取 Agent 配置 - agentId:', agentId)
    const agentRecord = await db('agents').where('id', agentId).first()
    if (!agentRecord) {
      throw new Error('未找到指定的 Agent')
    }
    const agent = convertToAgent(agentRecord) // 现在可以使用这个函数了
    console.log('获取到 Agent 配置:', agent)

    // 2. 如果是新对话且有打招呼语,添加打招呼消息
    const updatedMessages = [...currentMessages]
    if (currentMessages.length === 0 && agent.greeting) {
      const greetingMessage: AIAssistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: agent.greeting,
        timestamp: Date.now(),
        sourceType: 'ai'
      }
      updatedMessages.push(greetingMessage)
      console.log('添加打招呼消息:', greetingMessage)
    }

    // 3. 如果提供了笔记ID，获取笔记内容
    let noteContent = ''
    let noteTitle = ''
    let noteAddress = ''
    if (noteId) {
      console.log('获取笔记内容 - noteId:', noteId)
      const note = await db('notes').where('id', noteId).first()
      if (!note) {
        throw new Error('未找到指定的笔记')
      }
      noteContent = extractTextFromContent(note.content)
      ;(noteTitle = note.metadata?.title || ''), (noteAddress = note.address || '') // 假设笔记表中有 address 字段
      console.log('获取到笔记内容长度:', noteContent.length)
    }

    // 4. 构建上下文
    const context: RAGContext = {
      query: query || '',
      timestamp: new Date().toISOString(),
      relevantDocs: noteId
        ? [
            {
              noteId,
              address: noteAddress,
              title: noteTitle,
              content: { text: noteContent },
              similarity: 1,
              createdAt: new Date().toISOString()
            }
          ]
        : [],
      processingType: 'agent_chat'
    }
    console.log('构建的上下文:', context)

    // 5. 构建提示词并调用大模型
    console.log('构建提示词')
    const prompt = buildAgentPrompt(agent.systemPrompt, query, noteContent, updatedMessages)
    console.log('构建的提示词:', prompt)

    // 使用 Agent 的配置调用大模型
    console.log('调用大模型, 配置:', {
      temperature: agent.temperature,
      modelConfigId: agent.modelConfigId
    })
    console.log('调用LLM前的配置:', {
      modelConfigId: agent.modelConfigId,
      temperature: agent.temperature
    })
    const answer = await llmService.generateResponse(prompt, agent.modelConfigId, {
      temperature: agent.temperature,
      signal: abortController.signal
    })
    console.log('获取到大模型回答:', answer)

    // 6. 构建消息
    // 如果有用户输入,添加用户消息
    if (query) {
      const userMessage: UserMessage = {
        id: uuidv4(),
        role: 'user',
        content: query,
        timestamp: Date.now()
      }
      updatedMessages.push(userMessage)
      console.log('添加用户消息:', userMessage)
    }

    const assistantMessage: AIAssistantMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: answer,
      timestamp: Date.now(),
      sourceType: noteId ? 'notes' : 'ai',
      references: noteId ? context.relevantDocs : undefined
    }
    updatedMessages.push(assistantMessage)
    console.log('添加助手消息:', assistantMessage)

    const updatedContexts = [...currentContexts, context]

    // 7. 更新历史记录
    if (sessionId) {
      console.log('更新历史记录 - sessionId:', sessionId)
      await updateRAGHistory(sessionId, updatedMessages, updatedContexts, {
        agentId,
        noteId,
        processingType: 'agent_chat'
      })
    }

    console.log('Agent 聊天处理完成')
    return {
      answer: assistantMessage.content,
      context,
      messages: updatedMessages,
      error: undefined
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        answer: '请求已取消',
        context: {
          query: params.query || '',
          timestamp: new Date().toISOString(),
          relevantDocs: [],
          processingType: 'agent_chat'
        },
        messages: params.currentMessages || [],
        error: {
          code: 'REQUEST_CANCELLED',
          message: '用户取消了请求',
          details: '用户主动取消了正在进行的请求',
          type: 'request_error',
          timestamp: new Date().toISOString()
        }
      }
    }

    // 处理其他错误
    console.error('Agent 聊天模式处理失败:', error)
    const llmError = handleLLMError(error)

    return {
      answer: '',
      context: {
        query: params.query || '',
        timestamp: new Date().toISOString(),
        relevantDocs: [],
        processingType: 'agent_chat'
      },
      messages: params.currentMessages || [],
      error: llmError
    }
  } finally {
    // 确保清理控制器 - 修改判断条件
    if (currentAgentController?.abortController === abortController) {
      currentAgentController = null
    }
  }
}

// 修改: 构建 Agent 提示词的辅助函数
function buildAgentPrompt(
  systemPrompt: string,
  query?: string,
  noteContent?: string,
  messages: ChatMessage[] = []
): string {
  console.log('构建 Agent 提示词, 参数:', {
    systemPromptLength: systemPrompt.length,
    hasQuery: !!query,
    hasNoteContent: !!noteContent,
    messagesCount: messages.length
  })

  let prompt = systemPrompt

  // 如果有笔记内容，添加到提示词中
  if (noteContent) {
    prompt += `\n\n当前笔记内容：\n${noteContent}`
  }

  // 添加历史对话
  if (messages.length > 0) {
    const recentMessages = messages
      .slice(-RAG_CONFIG.similarity.contextWindowSize * 2)
      .map((msg) => `${msg.role === 'user' ? '用户' : 'AI'}：${msg.content}`)
      .join('\n')
    prompt += `\n\n历史对话：\n${recentMessages}`
  }

  // 如果有用户输入，添加到提示词末尾
  if (query) {
    prompt += `\n\n用户：${query}`
  }

  console.log('构建的完整提示词长度:', prompt.length)
  return prompt
}

// 添加中断控制器管理
let currentAskController: {
  abortController: AbortController
  llmService: LLMService
} | null = null

// 中断当前对话
export function abortCurrentAskQuestion(): void {
  if (currentAskController) {
    currentAskController.abortController.abort()
    currentAskController.llmService.abortCurrentRequest()
    currentAskController = null
  }
}

// 修改 handleAgentChat 函数，添加类似的中断支持
let currentAgentController: {
  abortController: AbortController
  llmService: LLMService
} | null = null

export function abortCurrentAgentChat(): void {
  console.log('尝试中断 Agent 聊天请求，当前控制器状态:', currentAgentController)
  if (currentAgentController) {
    console.log('开始中断请求...')
    currentAgentController.abortController.abort()
    currentAgentController.llmService.abortCurrentRequest()
    currentAgentController = null
    console.log('已成功中断 Agent 聊天请求')
  } else {
    console.log('没有找到正在进行的 Agent 聊天请求')
  }
}

// 1. 首先在文件顶部添加中断控制器的类型定义
interface ChatController {
  abortController: AbortController
  llmService: LLMService
}

// 2. 添加中断控制器的声明
let currentChatController: ChatController | null = null

// 3. 添加中断函数
export function abortCurrentChat(): void {
  console.log('后端服务 → 收到中断Chat请求', currentChatController)
  if (currentChatController) {
    currentChatController.abortController.abort()
    currentChatController.llmService.abortCurrentRequest()
    currentChatController = null
  }
}

// 添加中断当前请求的方法
export function abortCurrentRequest(): void {
  if (llm) {
    llm.abortCurrentRequest()
  }
}
