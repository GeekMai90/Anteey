// src/db/ragService.ts
// 基于关键词和向量检索的RAG服务
import { db } from './config'
import { initEmbeddings } from './embeddingService'
import log from 'electron-log'
import {
  AIAssistantMessage,
  ChatMessage,
  ChatSession,
  ConversationTracker,
  RAGContext,
  RAGHistoryRecord,
  RAGResult,
  UserMessage
} from '../renderer/src/types/assistant'
import { v4 as uuidv4 } from 'uuid'
import { LLMService } from '../services/llmService'
import { SimilarityService } from './utils/calculateSimilarity'
import { extractKeywords } from './similarityService'
import { Keyword } from '@renderer/types/Embedding'

// RAG 系统配置
export const RAG_CONFIG = {
  similarity: {
    topicThreshold: 0.7, // 话题相似度阈值
    docThreshold: 0.6, // 文档相似度阈值
    contextWindowSize: 5 // 保留最近5轮对话
  },
  retrieval: {
    maxDocsPerQuery: 5, // 每次最多返回5个相关文档
    minSimilarity: 0.3, // 最小相似度要求
    reuseThreshold: 0.8, // 文档重用阈值
    weightDecayFactor: 0.8 // 历史文档权重衰减因子
  }
} as const

// 话题管理配置
export const TOPIC_CONFIG = {
  maxTopicAge: 30 * 60 * 1000, // 话题最大存活时间(30分钟)
  minMessagesForTopic: 2, // 形成话题的最小消息数
  maxTopicIdle: 5 * 60 * 1000 // 话题最大空闲时间(5分钟)
} as const

// 初始化 LLM 服务
const llm = new LLMService(process.env.ZHIPU_API_KEY || '')

// 将数据库结果转换为前端需要的格式
function transformDBResult(result: any): RAGResult {
  // 解析 metadata 字符串为对象
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

// export async function retrieveContext(query: string, limit: number = 5): Promise<RAGContext> {
//   try {
//     // 1. 初始化向量模型并生成查询向量
//     const embedder = await initEmbeddings()
//     const queryVector = await embedder(query)
//     const queryFloat32Array = new Float32Array(queryVector)

//     // 从查询中提取关键词
//     const queryKeywords = await extractKeywords(query)
//     log.info('查询关键词:', queryKeywords)

//     // 2. 获取所有笔记
//     const notes = await db('note_embeddings')
//       .join('notes', 'note_embeddings.note_id', 'notes.id')
//       .select('notes.*', 'note_embeddings.embedding', 'note_embeddings.keywords')

//     log.info('检索到的笔记:', {
//       总数: notes.length,
//       示例: notes.slice(0, 2).map((n) => ({
//         id: n.id,
//         title: n.metadata?.title,
//         content: n.content?.substring(0, 50) + '...',
//         hasEmbedding: !!n.embedding,
//         keywords: n.keywords
//       }))
//     })

//     // 3. 计算相似度
//     const results = notes
//       .map((note) => {
//         try {
//           if (!note.embedding) {
//             return null
//           }

//           const noteVector = SimilarityService.blobToFloat32Array(note.embedding)
//           const noteKeywords = JSON.parse(note.keywords || '[]')

//           const similarity = SimilarityService.calculateSimilarity(
//             queryFloat32Array,
//             noteVector,
//             queryKeywords,
//             noteKeywords
//           )

//           log.debug('相似度计算:', {
//             笔记ID: note.id,
//             标题: note.metadata?.title,
//             相似度: similarity
//           })

//           return {
//             ...note,
//             similarity
//           }
//         } catch (error) {
//           log.error('处理笔记相似度失败:', { id: note.id, error })
//           return null
//         }
//       })
//       .filter((result): result is NonNullable<typeof result> => {
//         const SIMILARITY_THRESHOLD = 0.2
//         return result !== null && result.similarity > SIMILARITY_THRESHOLD
//       })
//       .sort((a, b) => b.similarity - a.similarity)
//       .slice(0, limit)

//     // 4. 转换结果
//     const relevantDocs = results.map(transformDBResult)
//     console.log('relevantDocs', relevantDocs)

//     log.info('RAG检索结果:', {
//       查询: query,
//       关键词: queryKeywords,
//       相关文档数: relevantDocs.length,
//       相似度详情: relevantDocs.map((doc) => ({
//         id: doc.noteId,
//         title: doc.title,
//         similarity: doc.similarity
//       }))
//     })

//     return {
//       query,
//       timestamp: new Date().toISOString(),
//       relevantDocs
//     }
//   } catch (error) {
//     log.error('RAG检索失败:', error)
//     throw error
//   }
// }

// 保存检索历史
// 保存检索历史
// 修改检索上下文函数,增加会话追踪支持
export async function retrieveContext(
  query: string,
  session?: ChatSession,
  limit: number = 5
): Promise<RAGContext> {
  try {
    // 添加输入验证
    if (typeof query !== 'string') {
      log.error('检索上下文失败: 查询必须是字符串类型', {
        receivedType: typeof query,
        receivedValue: query
      })
      throw new Error('查询必须是字符串类型')
    }

    // 记录输入
    log.info('开始检索上下文:', {
      query,
      sessionId: session?.id
    })
    // 1. 初始化向量模型并生成查询向量
    const embedder = await initEmbeddings()
    const queryVector = await embedder(query)
    const queryFloat32Array = new Float32Array(queryVector)

    // 2. 提取查询关键词
    const queryKeywords = await extractKeywords(query)
    log.info('查询关键词:', queryKeywords)

    // 3. 判断话题相关性
    let relevantDocs: RAGResult[] = []
    if (session?.conversationTracker) {
      const { isRelatedTopic, topicSimilarity } = await checkTopicSimilarity(
        query,
        queryVector,
        session.conversationTracker
      )

      log.info('话题相关性检查:', {
        原始查询: query,
        是否相关话题: isRelatedTopic,
        话题相似度: topicSimilarity
      })

      if (isRelatedTopic) {
        // 3a. 同话题处理: 优先使用现有文档
        relevantDocs = await handleSameTopicRetrieval(
          query,
          queryFloat32Array,
          queryKeywords,
          session.conversationTracker,
          limit
        )
      } else {
        // 3b. 新话题处理: 重新检索
        relevantDocs = await handleNewTopicRetrieval(query, queryFloat32Array, queryKeywords, limit)

        // 更新话题追踪器
        session.conversationTracker = createNewTopicTracker(query, queryVector)
      }
    } else {
      // 4. 无会话上下文时的处理
      relevantDocs = await handleNewTopicRetrieval(query, queryFloat32Array, queryKeywords, limit)
    }

    // 5. 构建返回结果
    const context: RAGContext = {
      query,
      timestamp: new Date().toISOString(),
      relevantDocs
    }

    log.info('RAG检索结果:', {
      查询: query,
      关键词: queryKeywords,
      相关文档数: relevantDocs.length,
      相似度详情: relevantDocs.map((doc) => ({
        id: doc.noteId,
        title: doc.title,
        similarity: doc.similarity
      }))
    })

    return context
  } catch (error) {
    log.error('RAG检索失败:', error)
    throw error
  }
}

// 检查话题相关性
async function checkTopicSimilarity(
  query: string,
  queryVector: number[],
  tracker: ConversationTracker
): Promise<{ isRelatedTopic: boolean; topicSimilarity: number }> {
  try {
    // 1. 检查话题是否过期
    const topicAge = Date.now() - tracker.startTime
    if (topicAge > TOPIC_CONFIG.maxTopicAge) {
      return { isRelatedTopic: false, topicSimilarity: 0 }
    }

    // 2. 获取最近的问题向量
    const recentQuestions = tracker.questionHistory
      .slice(-RAG_CONFIG.similarity.contextWindowSize)
      .filter((q) => Date.now() - q.timestamp < TOPIC_CONFIG.maxTopicIdle)

    if (recentQuestions.length === 0) {
      return { isRelatedTopic: false, topicSimilarity: 0 }
    }

    // 3. 计算与最近问题的相似度
    const similarities = recentQuestions.map((q) => ({
      similarity: calculateVectorSimilarity(
        new Float32Array(queryVector),
        new Float32Array(q.vector)
      ),
      timestamp: q.timestamp
    }))

    // 4. 计算加权平均相似度(越近的问题权重越大)
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

// 处理同话题检索
async function handleSameTopicRetrieval(
  query: string,
  queryVector: Float32Array,
  queryKeywords: Keyword[],
  tracker: ConversationTracker,
  limit: number
): Promise<RAGResult[]> {
  // 1. 筛选和重新排序现有文档
  const reusableDocs = await filterAndReweightExistingDocs(
    tracker.docUsage,
    queryVector,
    queryKeywords
  )

  // 2. 补充检索新文档
  const supplementaryDocs = await retrieveSupplementaryDocs(
    query,
    queryVector,
    queryKeywords,
    reusableDocs,
    limit
  )

  // 3. 合并结果并更新使用记录
  const mergedDocs = mergeDocs(reusableDocs, supplementaryDocs, limit)
  updateDocUsage(tracker, mergedDocs)

  return mergedDocs
}

// 处理新话题检索
async function handleNewTopicRetrieval(
  query: string,
  queryVector: Float32Array,
  queryKeywords: Keyword[],
  limit: number
): Promise<RAGResult[]> {
  // 执行全新检索
  const notes = await db('note_embeddings')
    .join('notes', 'note_embeddings.note_id', 'notes.id')
    .select('notes.*', 'note_embeddings.embedding', 'note_embeddings.keywords')

  // 计算相似度并排序
  const results = notes
    .map((note) => {
      try {
        if (!note.embedding) return null

        const noteVector = SimilarityService.blobToFloat32Array(note.embedding)
        const noteKeywords = JSON.parse(note.keywords || '[]')

        const similarity = SimilarityService.calculateSimilarity(
          queryVector,
          noteVector,
          queryKeywords,
          noteKeywords
        )

        return {
          ...note,
          similarity
        }
      } catch (error) {
        log.error('处理笔记相似度失败:', { id: note.id, error })
        return null
      }
    })
    .filter((result): result is NonNullable<typeof result> => {
      return result !== null && result.similarity > RAG_CONFIG.retrieval.minSimilarity
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)

  return results.map(transformDBResult)
}

// 创建新的话题追踪器
function createNewTopicTracker(query: string, queryVector: number[]): ConversationTracker {
  return {
    topicId: uuidv4(),
    startTime: Date.now(),
    docUsage: {},
    questionHistory: [
      {
        content: query,
        vector: queryVector,
        timestamp: Date.now()
      }
    ]
  }
}

// 计算向量相似度
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

// 筛选和重新权重现有文档
async function filterAndReweightExistingDocs(
  docUsage: ConversationTracker['docUsage'],
  queryVector: Float32Array,
  queryKeywords: Keyword[]
): Promise<RAGResult[]> {
  const results: RAGResult[] = []

  for (const [noteId, usage] of Object.entries(docUsage)) {
    // 获取文档详情
    const note = await db('notes')
      .join('note_embeddings', 'notes.id', 'note_embeddings.note_id')
      .where('notes.id', noteId)
      .first()

    if (!note || !note.embedding) continue

    // 计算新的相似度
    const noteVector = SimilarityService.blobToFloat32Array(note.embedding)
    const noteKeywords = JSON.parse(note.keywords || '[]')
    const newSimilarity = SimilarityService.calculateSimilarity(
      queryVector,
      noteVector,
      queryKeywords,
      noteKeywords
    )

    // 应用使用频率和时间衰减
    const timeDecay = Math.exp(
      -(Date.now() - usage.lastUsed) / (RAG_CONFIG.retrieval.weightDecayFactor * 3600000)
    )
    const adjustedSimilarity = newSimilarity * (1 + usage.usageCount * 0.1) * timeDecay

    if (adjustedSimilarity >= RAG_CONFIG.retrieval.reuseThreshold) {
      results.push(
        transformDBResult({
          ...note,
          similarity: adjustedSimilarity
        })
      )
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity)
}

// 检索补充文档
async function retrieveSupplementaryDocs(
  query: string,
  queryVector: Float32Array,
  queryKeywords: Keyword[],
  existingDocs: RAGResult[],
  limit: number
): Promise<RAGResult[]> {
  // 获取已有文档ID
  const existingIds = new Set(existingDocs.map((doc) => doc.noteId))

  // 检索新文档
  const notes = await db('note_embeddings')
    .join('notes', 'note_embeddings.note_id', 'notes.id')
    .whereNotIn('notes.id', Array.from(existingIds))
    .select('notes.*', 'note_embeddings.embedding', 'note_embeddings.keywords')

  const results = notes
    .map((note) => {
      try {
        if (!note.embedding) return null

        const noteVector = SimilarityService.blobToFloat32Array(note.embedding)
        const noteKeywords = JSON.parse(note.keywords || '[]')
        const similarity = SimilarityService.calculateSimilarity(
          queryVector,
          noteVector,
          queryKeywords,
          noteKeywords
        )

        return { ...note, similarity }
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

// 更新文档使用记录
function updateDocUsage(tracker: ConversationTracker, docs: RAGResult[]): void {
  const now = Date.now()

  docs.forEach((doc) => {
    const currentUsage = tracker.docUsage[doc.noteId] || {
      usageCount: 0,
      lastUsed: now,
      similarity: 0
    }

    tracker.docUsage[doc.noteId] = {
      usageCount: currentUsage.usageCount + 1,
      lastUsed: now,
      similarity: Math.max(currentUsage.similarity, doc.similarity)
    }
  })
}

// 创建或更新检索历史
// export async function updateRAGHistory(
//   sessionId: string,
//   messages: ChatMessage[],
//   contexts: RAGContext[]
// ): Promise<void> {
//   try {
//     const now = Date.now()
//     const firstMessage = messages[0]

//     // 计算元数据
//     const metadata = {
//       messageCount: messages.length,
//       userMessageCount: messages.filter((m) => m.role === 'user').length,
//       aiMessageCount: messages.filter((m) => m.role === 'assistant').length,
//       averageRelevanceScore:
//         contexts.reduce(
//           (acc, ctx) =>
//             acc +
//             ctx.relevantDocs.reduce((sum, doc) => sum + doc.similarity, 0) /
//               ctx.relevantDocs.length,
//           0
//         ) / contexts.length
//     }

//     // 生成摘要（使用第一条消息）
//     const summary = firstMessage.content.slice(0, 100)
//     const title = firstMessage.content.slice(0, 20)

//     // 检查是否存在现有记录
//     const existing = await db('rag_history').where('id', sessionId).first()

//     if (existing) {
//       // 更新现有记录
//       await db('rag_history')
//         .where('id', sessionId)
//         .update({
//           messages: JSON.stringify(messages),
//           contexts: JSON.stringify(contexts),
//           summary,
//           metadata: JSON.stringify(metadata),
//           updatedAt: now
//         })
//     } else {
//       // 创建新记录
//       await db('rag_history').insert({
//         id: sessionId,
//         title,
//         messages: JSON.stringify(messages),
//         contexts: JSON.stringify(contexts),
//         summary,
//         totalTokens: 0, // 可以实现 token 计算逻辑
//         metadata: JSON.stringify(metadata),
//         isPinned: false,
//         createdAt: now,
//         updatedAt: now
//       })
//     }
//   } catch (error) {
//     log.error('更新RAG历史失败:', error)
//     throw error
//   }
// }

export async function updateRAGHistory(
  sessionId: string,
  messages: ChatMessage[],
  contexts: RAGContext[],
  metadata: any // 添加元数据参数
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
      ...metadata // 合并传入的元数据
    }

    // 检查是否存在现有记录
    const existing = await db('rag_history').where('id', sessionId).first()

    if (existing) {
      await db('rag_history')
        .where('id', sessionId)
        .update({
          messages: JSON.stringify(messages),
          contexts: JSON.stringify(contexts),
          metadata: JSON.stringify(extendedMetadata),
          updatedAt: now
        })
    } else {
      await db('rag_history').insert({
        id: sessionId,
        title: firstMessage.content.slice(0, 20),
        messages: JSON.stringify(messages),
        contexts: JSON.stringify(contexts),
        summary: firstMessage.content.slice(0, 100),
        totalTokens: 0, // 可以实现 token 计算逻辑
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
// 获取单条历史记录详情
export async function getRAGHistoryDetail(id: string): Promise<RAGHistoryRecord | null> {
  try {
    const item = await db('rag_history').where({ id }).first()
    if (!item) return null

    return {
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
    }
  } catch (error) {
    log.error('获取RAG历史详情失败:', error)
    throw error
  }
}

// export async function generateAnswer(
//   query: string,
//   sessionId: string | null, // 添加会话ID参数
//   currentMessages: ChatMessage[] = [],
//   currentContexts: RAGContext[] = []
// ): Promise<{
//   answer: string
//   context: RAGContext
//   messages: ChatMessage[]
// }> {
//   try {
//     // 1. 获取相关上下文
//     const context = await retrieveContext(query)

//     // 2. 构建提示词
//     const prompt = buildPrompt(query, context)

//     // 3. 调用大模型
//     const answer = await llm.generateResponse(prompt)

//     // 4. 构建新的消息
//     const userMessage: UserMessage = {
//       id: uuidv4(),
//       role: 'user',
//       content: query,
//       timestamp: Date.now()
//     }

//     const assistantMessage: AIAssistantMessage = {
//       id: uuidv4(),
//       role: 'assistant',
//       content: answer,
//       timestamp: Date.now(),
//       sourceType: context.relevantDocs.length > 0 ? 'notes' : 'ai',
//       references: context.relevantDocs.length > 0 ? context.relevantDocs : undefined
//     }

//     const updatedMessages = [...currentMessages, userMessage, assistantMessage]
//     const updatedContexts = [...currentContexts, context]

//     // 5. 如果有会话ID，则更新历史记录
//     if (sessionId) {
//       await updateRAGHistory(sessionId, updatedMessages, updatedContexts)
//     }

//     // 6. 返回结果
//     return {
//       answer,
//       context,
//       messages: updatedMessages
//     }
//   } catch (error) {
//     log.error('生成回答失败:', error)
//     throw error
//   }
// }

// 构建中文提示词

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

    // 4. 调用大模型
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

// 辅助函数：获取查询向量（带缓存）
const vectorCache = new Map<string, Float32Array>()

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

function buildPrompt(query: string, context: RAGContext, messages: ChatMessage[] = []): string {
  // 添加类型检查
  if (!context || !Array.isArray(context.relevantDocs)) {
    log.error('构建提示词失败: 无效的上下文格式', { context })
    throw new Error('无效的上下文格式')
  }

  try {
    const contextText = context.relevantDocs
      .map((doc) => {
        if (typeof doc.title !== 'string' || typeof doc.content !== 'string') {
          throw new Error('无效的文档格式')
        }
        return `【笔记标题】${doc.title}\n【笔记内容】${doc.content}`
      })
      .join('\n\n')

    const recentMessages = messages
      .slice(-RAG_CONFIG.similarity.contextWindowSize * 2)
      .map((msg) => {
        if (typeof msg.content !== 'string') {
          throw new Error('无效的消息格式')
        }
        return `${msg.role === 'user' ? '用户' : 'AI'}：${msg.content}`
      })
      .join('\n')

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

// 清理过期会话
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

  // 记录到日志
  log.info('RAG性能监控:', {
    会话ID: sessionId,
    方法: method,
    耗时: `${duration}ms`,
    状态: options.success ? '成功' : '失败',
    错误: options.error,
    元数据: options.metadata
  })

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

// 获取性能日志
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
