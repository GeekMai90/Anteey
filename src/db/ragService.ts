// src/db/ragService.ts
// 基于关键词和向量检索的RAG服务
import { db } from './config'
import { initEmbeddings } from './embeddingService'
import log from 'electron-log'
import {
  AIAssistantMessage,
  ChatMessage,
  RAGContext,
  RAGHistoryRecord,
  RAGResult,
  UserMessage
} from '../renderer/src/types/assistant'
import { v4 as uuidv4 } from 'uuid'
import { LLMService } from '../services/llmService'
import { SimilarityService } from './utils/calculateSimilarity'
import { extractKeywords } from './similarityService'

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

export async function retrieveContext(query: string, limit: number = 5): Promise<RAGContext> {
  try {
    // 1. 初始化向量模型并生成查询向量
    const embedder = await initEmbeddings()
    const queryVector = await embedder(query)
    const queryFloat32Array = new Float32Array(queryVector)

    // 从查询中提取关键词
    const queryKeywords = await extractKeywords(query)
    log.info('查询关键词:', queryKeywords)

    // 2. 获取所有笔记
    const notes = await db('note_embeddings')
      .join('notes', 'note_embeddings.note_id', 'notes.id')
      .select('notes.*', 'note_embeddings.embedding', 'note_embeddings.keywords')

    log.info('检索到的笔记:', {
      总数: notes.length,
      示例: notes.slice(0, 2).map((n) => ({
        id: n.id,
        title: n.metadata?.title,
        content: n.content?.substring(0, 50) + '...',
        hasEmbedding: !!n.embedding,
        keywords: n.keywords
      }))
    })

    // 3. 计算相似度
    const results = notes
      .map((note) => {
        try {
          if (!note.embedding) {
            return null
          }

          const noteVector = SimilarityService.blobToFloat32Array(note.embedding)
          const noteKeywords = JSON.parse(note.keywords || '[]')

          const similarity = SimilarityService.calculateSimilarity(
            queryFloat32Array,
            noteVector,
            queryKeywords,
            noteKeywords
          )

          log.debug('相似度计算:', {
            笔记ID: note.id,
            标题: note.metadata?.title,
            相似度: similarity
          })

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
        const SIMILARITY_THRESHOLD = 0.2
        return result !== null && result.similarity > SIMILARITY_THRESHOLD
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    // 4. 转换结果
    const relevantDocs = results.map(transformDBResult)
    console.log('relevantDocs', relevantDocs)

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

    return {
      query,
      timestamp: new Date().toISOString(),
      relevantDocs
    }
  } catch (error) {
    log.error('RAG检索失败:', error)
    throw error
  }
}

// 保存检索历史
// 保存检索历史
export async function updateRAGHistory(
  sessionId: string,
  messages: ChatMessage[],
  contexts: RAGContext[]
): Promise<void> {
  try {
    const now = Date.now()
    const firstMessage = messages[0]

    // 计算元数据
    const metadata = {
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
        ) / contexts.length
    }

    // 生成摘要（使用第一条消息）
    const summary = firstMessage.content.slice(0, 100)
    const title = firstMessage.content.slice(0, 20)

    // 检查是否存在现有记录
    const existing = await db('rag_history').where('id', sessionId).first()

    if (existing) {
      // 更新现有记录
      await db('rag_history')
        .where('id', sessionId)
        .update({
          messages: JSON.stringify(messages),
          contexts: JSON.stringify(contexts),
          summary,
          metadata: JSON.stringify(metadata),
          updatedAt: now
        })
    } else {
      // 创建新记录
      await db('rag_history').insert({
        id: sessionId,
        title,
        messages: JSON.stringify(messages),
        contexts: JSON.stringify(contexts),
        summary,
        totalTokens: 0, // 可以实现 token 计算逻辑
        metadata: JSON.stringify(metadata),
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

export async function generateAnswer(
  query: string,
  sessionId: string | null, // 添加会话ID参数
  currentMessages: ChatMessage[] = [],
  currentContexts: RAGContext[] = []
): Promise<{
  answer: string
  context: RAGContext
  messages: ChatMessage[]
}> {
  try {
    // 1. 获取相关上下文
    const context = await retrieveContext(query)

    // 2. 构建提示词
    const prompt = buildPrompt(query, context)

    // 3. 调用大模型
    const answer = await llm.generateResponse(prompt)

    // 4. 构建新的消息
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

    // 5. 如果有会话ID，则更新历史记录
    if (sessionId) {
      await updateRAGHistory(sessionId, updatedMessages, updatedContexts)
    }

    // 6. 返回结果
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

// 构建中文提示词
function buildPrompt(query: string, context: RAGContext): string {
  const contextText = context.relevantDocs
    .map((doc) => `【笔记标题】${doc.title}\n【笔记内容】${doc.content}`)
    .join('\n\n')

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
### 上下文
${contextText}
### 问题
${query}

`
}
