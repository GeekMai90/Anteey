/**
 * @file aiChatService.ts
 * @description AI 对话服务核心实现
 *
 * 主要功能：
 * 1. 对话管理
 *    - 创建/获取/更新/删除会话
 *    - 会话状态维护
 *    - Agent 配置管理
 * 2. 消息处理
 *    - 消息构建与存储
 *    - 历史消息管理
 *    - 系统提示词处理
 * 3. 笔记引用集成
 *    - 笔记内容处理
 *    - 引用信息管理
 * 4. LLM 服务集成
 *    - 模型配置管理
 *    - 响应生成控制
 *
 * @author 麦先生
 * @created 2024-01-20
 */

// chatService.ts

import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import {
  ChatRequest,
  ChatResponse,
  MessageRole,
  MessageMetadata,
  Conversation,
  MessageRecord,
  ChatMessage,
  ConversationStatus
} from '@shared/types/ai-chat'
import { LLMService } from '../rag/llmService'
import * as agentService from '../rag/agentService'
import log from 'electron-log'
import { processNoteContent } from './ProcessNoteContent'

// ============= 常量定义 =============
const MAX_CONTEXT_MESSAGES = 20 // 最大上下文消息数量
const DEFAULT_SYSTEM_PROMPT = '你是一个AI助手，请为用户提供安全、有帮助、准确的回答。'

// ============= 错误类型定义 =============
export class ChatError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ChatError'
  }
}

// ============= 类型定义 =============

type MessageBuildOptions = {
  includeSystemPrompt?: boolean
  maxHistoryMessages?: number
  // TODO: 实现笔记引用功能
  // includeReferences?: boolean
}

// ============= LLM服务实例 =============
const llmService = new LLMService()

// ============= 会话管理方法 =============

/**
 * Agent 配置接口
 * @interface AgentConfig
 * @property {string} modelConfigId - 使用的模型配置ID
 * @property {number} temperature - 温度参数
 * @property {string} systemPrompt - 系统提示词
 */
interface AgentConfig {
  modelConfigId: string
  temperature: number
  systemPrompt: string
}

// 添加一个 Map 来缓存会话的 Agent 配置
const conversationAgentConfigs = new Map<string, AgentConfig>()

/**
 * 创建 Agent 会话配置
 * @async
 * @description 根据 agentId 获取并创建 agent 的会话配置
 *
 * @param {string} agentId - Agent ID
 * @param {string} [query] - 用户查询内容，可选
 * @returns {Promise<{conversation: Conversation, agentConfig: AgentConfig}>} 返回会话和配置信息
 * @throws {ChatError} Agent 不存在时抛出错误
 */
async function createAgentConversation(
  agentId: string,
  query?: string
): Promise<{ conversation: Conversation; agentConfig: AgentConfig }> {
  const agent = await agentService.getAgentById(agentId)
  if (!agent) {
    throw new ChatError('Agent 不存在', 'AGENT_NOT_FOUND', { agentId })
  }

  log.info('获取到 Agent 配置:', {
    agentId,
    modelConfigId: agent.modelConfigId,
    temperature: agent.temperature,
    systemPromptLength: agent.systemPrompt?.length
  })

  // 创建 agent 配置
  const agentConfig: AgentConfig = {
    modelConfigId: agent.modelConfigId,
    temperature: agent.temperature,
    systemPrompt: agent.systemPrompt || ''
  }

  // 创建会话
  const now = new Date()
  const title = query ? query.slice(0, 20) + '...' : `与 ${agent.name} 的对话`
  const conversation: Conversation = {
    id: uuidv4(),
    title,
    agentId,
    status: ConversationStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    messageCount: 0
  }

  return { conversation, agentConfig }
}

/**
 * 保存会话和配置
 * @async
 * @description 将会话信息保存到数据库，配置信息保存到缓存
 *
 * @param {Conversation} conversation - 会话信息
 * @param {AgentConfig} agentConfig - Agent 配置信息
 * @returns {Promise<Conversation>} 返回保存的会话
 */
async function saveConversationAndConfig(
  conversation: Conversation,
  agentConfig: AgentConfig
): Promise<Conversation> {
  await db('chat_conversations').insert(conversation)
  conversationAgentConfigs.set(conversation.id, agentConfig)

  log.info('已保存会话和 Agent 配置:', {
    conversationId: conversation.id,
    agentId: conversation.agentId,
    title: conversation.title,
    modelConfigId: agentConfig.modelConfigId,
    temperature: agentConfig.temperature,
    systemPromptLength: agentConfig.systemPrompt.length
  })

  return conversation
}

/**
 * 获取或创建会话
 * @async
 * @param {string} [conversationId] - 会话ID，可选
 * @param {string} [query] - 用户查询内容，可选
 * @param {string} [agentId] - Agent ID，可选
 * @returns {Promise<Conversation>} 返回会话对象
 * @throws {ChatError} 会话操作失败时抛出错误
 */
async function getOrCreateConversation(
  conversationId?: string,
  query?: string,
  agentId?: string
): Promise<Conversation> {
  try {
    // 获取现有会话
    if (conversationId) {
      const conversation = await db('chat_conversations')
        .where({ id: conversationId })
        .whereNot({ status: ConversationStatus.DELETED })
        .first()

      if (!conversation) {
        throw new ChatError('会话不存在', 'CONVERSATION_NOT_FOUND', { conversationId })
      }
      return conversation
    }

    // 创建新的 Agent 会话
    if (agentId) {
      const { conversation, agentConfig } = await createAgentConversation(agentId, query)
      return await saveConversationAndConfig(conversation, agentConfig)
    }

    // 创建普通会话
    const now = new Date()
    const conversation: Conversation = {
      id: uuidv4(),
      title: query ? query.slice(0, 20) + '...' : '新对话',
      agentId: null,
      status: ConversationStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      messageCount: 0
    }

    await db('chat_conversations').insert(conversation)
    return conversation
  } catch (error) {
    log.error('会话创建/获取失败:', error)
    if (error instanceof ChatError) {
      throw error
    }
    throw new ChatError('会话操作失败', 'CONVERSATION_OPERATION_FAILED', { error })
  }
}

// 获取历史会话列表
export async function listConversations(
  status: ConversationStatus = ConversationStatus.ACTIVE,
  page = 1,
  pageSize = 20
): Promise<{ conversations: Conversation[]; total: number }> {
  try {
    const offset = (page - 1) * pageSize

    // 获取总数
    const [{ count }] = await db('chat_conversations').where({ status }).count('* as count')

    // 获取会话列表
    const conversations = await db('chat_conversations')
      .where({ status })
      .orderBy('lastMessageAt', 'desc')
      .offset(offset)
      .limit(pageSize)

    return {
      conversations,
      total: Number(count)
    }
  } catch (error) {
    log.error('获取会话列表失败:', error)
    throw new ChatError('获取会话列表失败', 'LIST_CONVERSATIONS_FAILED', { error })
  }
}

// 获取会话详情
export async function getConversationDetail(
  id: string
): Promise<Conversation & { messages: MessageRecord[] }> {
  try {
    const conversation = await db('chat_conversations')
      .where({ id })
      .whereNot({ status: ConversationStatus.DELETED })
      .first()

    if (!conversation) {
      throw new ChatError('会话不存在', 'CONVERSATION_NOT_FOUND', { id })
    }

    const messages = await getConversationMessages(id)

    return {
      ...conversation,
      messages
    }
  } catch (error) {
    log.error('获取会话详情失败:', error)
    if (error instanceof ChatError) {
      throw error
    }
    throw new ChatError('获取会话详情失败', 'GET_CONVERSATION_DETAIL_FAILED', { error })
  }
}

// 更新会话状态
export async function updateConversationStatus(
  id: string,
  status: ConversationStatus
): Promise<void> {
  try {
    const updated = await db('chat_conversations').where({ id }).update({
      status,
      updatedAt: new Date()
    })

    if (!updated) {
      throw new ChatError('会话不存在', 'CONVERSATION_NOT_FOUND', { id })
    }
  } catch (error) {
    log.error('更新会话状态失败:', error)
    if (error instanceof ChatError) {
      throw error
    }
    throw new ChatError('更新会话状态失败', 'UPDATE_CONVERSATION_STATUS_FAILED', { error })
  }
}

// 删除会话
export async function deleteConversation(id: string): Promise<void> {
  try {
    await db.transaction(async (trx) => {
      await trx('chat_messages').where({ conversationId: id }).delete()
      await trx('chat_conversations').where({ id }).delete()
    })

    // 清理会话的 Agent 配置
    clearAgentConfig(id)
  } catch (error) {
    log.error('删除会话失败:', error)
    throw new ChatError('删除会话失败', 'DELETE_CONVERSATION_FAILED', { error })
  }
}

// ============= 消息相关方法 =============
async function createMessage(
  conversationId: string,
  role: MessageRole,
  content: string,
  parentMessageId?: string,
  metadata: MessageMetadata = {}
): Promise<MessageRecord> {
  log.info('开始创建消息:', {
    conversationId,
    role,
    contentLength: content.length,
    parentMessageId,
    hasMetadata: Object.keys(metadata).length > 0
  })

  try {
    const message: MessageRecord = {
      id: uuidv4(),
      conversationId,
      parentMessageId: parentMessageId || null,
      role,
      content,
      ...metadata,
      createdAt: new Date()
    }

    await db.transaction(async (trx) => {
      log.info('开始数据库事务...')
      await trx('chat_messages').insert(message)
      log.info('消息已插入数据库')

      await trx('chat_conversations')
        .where({ id: conversationId })
        .update({
          updatedAt: new Date(),
          lastMessageAt: new Date(),
          messageCount: trx.raw('messageCount + 1')
        })
      log.info('会话计数已更新')
    })

    log.info('消息创建成功:', { messageId: message.id })
    return message
  } catch (error) {
    log.error('消息创建失败:', {
      error,
      conversationId,
      role
    })
    throw new ChatError('消息创建失败', 'CREATE_MESSAGE_FAILED', { error })
  }
}

async function getConversationMessages(
  conversationId: string,
  limit = MAX_CONTEXT_MESSAGES
): Promise<MessageRecord[]> {
  try {
    const messages = await db('chat_messages')
      .where({ conversationId })
      .orderBy('createdAt', 'asc')
      .limit(limit)

    return messages
  } catch (error) {
    log.error('获取会话消息失败:', error)
    throw new ChatError('获取会话消息失败', 'GET_MESSAGES_FAILED', { error })
  }
}

// ============= 消息构建方法 =============
/**
 * 构建消息数组
 * @async
 * @description 构建完整的消息数组，包括系统提示词、历史消息等
 *
 * 消息构建顺序：
 * 1. 系统提示词（Agent提示词或默认提示词）
 * 2. 历史消息
 * 3. 当前查询消息
 *
 * @param {Conversation} conversation - 会话对象
 * @param {string} query - 用户查询
 * @param {MessageBuildOptions} options - 构建选项
 * @returns {Promise<ChatMessage[]>} 返回构建好的消息数组
 */
async function buildMessages(
  conversation: Conversation,
  query: string,
  options: MessageBuildOptions = {}
): Promise<ChatMessage[]> {
  try {
    const { maxHistoryMessages = MAX_CONTEXT_MESSAGES } = options
    const messages: ChatMessage[] = []

    // 获取历史消息
    const historyMessages = await getConversationMessages(conversation.id, maxHistoryMessages)

    // 获取 agent 配置
    const agentConfig = conversationAgentConfigs.get(conversation.id)

    // 如果是 agent 对话，始终在消息开头添加系统提示词
    if (agentConfig?.systemPrompt) {
      messages.push({ role: 'system', content: agentConfig.systemPrompt })
      log.info('已添加 Agent 系统提示词:', {
        promptLength: agentConfig.systemPrompt.length,
        prompt: agentConfig.systemPrompt
      })
    } else if (!conversationAgentConfigs.has(conversation.id) && historyMessages.length === 0) {
      // 非 agent 对话且是首次对话时，添加默认系统提示词
      messages.push({ role: 'system', content: DEFAULT_SYSTEM_PROMPT })
      log.info('已添加默认系统提示词')
    }

    // 添加历史消息
    messages.push(
      ...historyMessages.map((msg) => ({
        role: msg.role,
        content: msg.content
      }))
    )

    log.info('最终构建的消息数组:', {
      totalMessages: messages.length,
      messagesSummary: messages.map((m) => ({
        role: m.role,
        contentLength: m.content.length,
        content: m.content.slice(0, 50) + '...'
      }))
    })

    return messages
  } catch (error) {
    log.error('构建消息失败:', error)
    throw error
  }
}

// ============= 对话处理方法 =============
/**
 * 处理笔记引用
 * @async
 * @description 处理请求中的笔记引用
 *
 * 处理内容：
 * 1. 提取笔记内容
 * 2. 生成引用信息
 * 3. 更新源类型标记
 *
 * @param {ChatRequest} request - 聊天请求对象
 * @returns {Promise<{noteContents: string, references: ChatResponse['references'], sourceTypes: ChatResponse['sourceTypes']}>}
 */
async function processReferences(request: ChatRequest): Promise<{
  noteContents: string
  references: ChatResponse['references']
  sourceTypes: ChatResponse['sourceTypes']
}> {
  let noteContents = ''
  let references: ChatResponse['references']
  let sourceTypes: ChatResponse['sourceTypes'] = {
    hasNotes: false,
    hasImages: false,
    hasPdfs: false
  }

  if (request.references?.noteIds && request.references.noteIds.length > 0) {
    log.info('处理引用的笔记:', {
      noteCount: request.references.noteIds.length
    })

    const processResult = await processNoteContent(request.references.noteIds)
    noteContents = processResult.contextText
    references = processResult.references
    sourceTypes = processResult.sourceTypes

    log.info('笔记处理完成:', {
      processedCount: processResult.references.notes.length,
      totalLength: processResult.contextText.length
    })
  }

  return { noteContents, references, sourceTypes }
}

/**
 * 生成AI响应
 * @async
 * @description 调用LLM服务生成响应
 *
 * 处理逻辑：
 * 1. 获取会话的Agent配置
 * 2. 使用配置的模型和参数
 * 3. 调用LLM服务生成响应
 *
 * @param {ChatMessage[]} messages - 消息数组
 * @param {string} conversationId - 会话ID
 * @returns {Promise<string>} 返回生成的响应内容
 */
async function generateAIResponse(
  messages: ChatMessage[],
  conversationId: string
): Promise<string> {
  log.info('正在调用 LLM 服务...')

  // 获取会话的 Agent 配置
  const agentConfig = conversationAgentConfigs.get(conversationId)

  log.info('使用会话配置:', {
    conversationId,
    hasAgentConfig: !!agentConfig,
    modelConfigId: agentConfig?.modelConfigId,
    temperature: agentConfig?.temperature
  })

  const aiResponse = await llmService.generateResponse(
    JSON.stringify(messages),
    agentConfig?.modelConfigId,
    { temperature: agentConfig?.temperature }
  )

  return aiResponse
}

// 创建初始用户消息
async function createInitialUserMessage(
  conversation: Conversation,
  query: string,
  parentMessageId?: string
): Promise<MessageRecord> {
  log.info('正在保存用户消息...')
  const userMessage = await createMessage(conversation.id, 'user', query, parentMessageId)
  log.info('用户消息已保存:', { messageId: userMessage.id })
  return userMessage
}

/**
 * 准备消息内容
 * @async
 * @description 处理消息内容，包括笔记引用的集成
 *
 * 笔记引用处理逻辑：
 * 1. Agent首次对话：在系统提示词后直接添加笔记内容
 * 2. 有用户消息：将笔记内容添加到最后一条用户消息
 * 3. 其他情况：创建新的用户消息包含笔记内容
 *
 * @param {Conversation} conversation - 会话对象
 * @param {string} query - 用户查询
 * @param {string} noteContents - 笔记内容
 * @returns {Promise<ChatMessage[]>} 返回处理后的消息数组
 */
async function prepareMessages(
  conversation: Conversation,
  query: string,
  noteContents: string
): Promise<ChatMessage[]> {
  log.info('正在构建消息数组...')
  const messages = await buildMessages(conversation, query, {
    maxHistoryMessages: MAX_CONTEXT_MESSAGES
  })

  // 如果有笔记内容，添加到消息数组中
  if (noteContents) {
    log.info('处理笔记引用内容')
    // 如果是 agent 对话且没有用户消息，直接在系统提示词后添加笔记内容
    if (messages.length === 1 && messages[0].role === 'system') {
      messages.push({
        role: 'user',
        content: `参考以下笔记内容：\n\n${noteContents}`
      })
      log.info('在系统提示词后添加笔记引用')
    } else {
      // 否则将笔记内容添加到最后一条用户消息中
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'user') {
        lastMessage.content = `${lastMessage.content}\n\n参考以下笔记内容：\n\n${noteContents}`
        log.info('将笔记引用添加到用户消息中')
      } else {
        // 如果最后一条不是用户消息，创建新的用户消息包含笔记内容
        messages.push({
          role: 'user',
          content: `参考以下笔记内容：\n\n${noteContents}`
        })
        log.info('创建新的用户消息包含笔记引用')
      }
    }
  }

  log.info('消息数组构建完成:', {
    totalMessages: messages.length,
    hasNoteContents: !!noteContents,
    messageRoles: messages.map((m) => m.role)
  })
  return messages
}

/**
 * 处理聊天请求
 * @async
 * @description 主要的对话处理流程
 *
 * 处理步骤：
 * 1. 获取或创建会话
 * 2. 处理用户消息（区分Agent首次对话）
 * 3. 处理笔记引用
 * 4. 准备消息内容
 * 5. 生成AI响应
 * 6. 保存响应消息
 * 7. 返回处理结果
 *
 * @param {ChatRequest} request - 聊天请求对象
 * @returns {Promise<ChatResponse>} 返回处理结果
 * @throws {ChatError} 处理失败时抛出错误
 */
export async function handleChatRequest(request: ChatRequest): Promise<ChatResponse> {
  const startTime = Date.now()
  log.info('开始处理聊天请求，详细信息:', {
    conversationId: request.conversationId,
    query: request.query,
    queryLength: request.query?.length,
    agentId: request.agentId,
    hasParentMessageId: !!request.parentMessageId,
    hasReferences: !!request.references
  })

  try {
    // 1. 获取或创建会话
    const conversation = await getOrCreateConversation(
      request.conversationId,
      request.query,
      request.agentId
    )

    let userMessage: MessageRecord | null = null

    // 2. 只在非首次 agent 对话时创建用户消息
    if (request.conversationId || !request.agentId) {
      log.info('准备创建用户消息:', {
        query: request.query,
        conversationId: conversation.id,
        parentMessageId: request.parentMessageId
      })

      userMessage = await createInitialUserMessage(
        conversation,
        request.query || '',
        request.parentMessageId
      )
    } else {
      log.info('首次 agent 对话，跳过创建用户消息')
    }

    // 3. 处理笔记引用
    const { noteContents, references, sourceTypes } = await processReferences(request)

    // 4. 准备消息内容
    const messages = await prepareMessages(conversation, request.query || '', noteContents)

    // 5. 生成 AI 响应，传入会话 ID
    const aiResponse = await generateAIResponse(messages, conversation.id)

    // 6. 保存 AI 响应
    const assistantMessage = await createMessage(
      conversation.id,
      'assistant',
      aiResponse,
      userMessage?.id || undefined // 使用可选链和空值合并
    )

    // 7. 准备返回响应
    const response: ChatResponse = {
      messageId: assistantMessage.id,
      content: aiResponse,
      createdAt: assistantMessage.createdAt.getTime(),
      role: 'assistant',
      sourceTypes,
      references,
      conversationId: conversation.id,
      userMessageId: userMessage?.id || '' // 使用可选链和空值合并
    }

    const endTime = Date.now()
    log.info('聊天请求处理完成', {
      processingTime: `${endTime - startTime}ms`,
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      hasUserMessage: !!userMessage
    })

    return response
  } catch (error) {
    log.error('处理聊天请求失败:', {
      error,
      request,
      processingTime: `${Date.now() - startTime}ms`
    })
    if (error instanceof ChatError) {
      throw error
    }
    throw new ChatError('处理聊天请求失败', 'HANDLE_CHAT_REQUEST_FAILED', { error })
  }
}

// ============= 中断请求方法 =============
export function abortChatRequest() {
  llmService.abortCurrentRequest()
}

// 添加清理方法（可以在删除会话时调用）
function clearAgentConfig(conversationId: string) {
  conversationAgentConfigs.delete(conversationId)
  log.info('已清理会话的 Agent 配置:', { conversationId })
}
