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
async function getOrCreateConversation(
  conversationId?: string,
  query?: string,
  agentId?: string
): Promise<Conversation> {
  try {
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

    const now = new Date()
    const conversation: Conversation = {
      id: uuidv4(),
      title: query?.slice(0, 20) + '...' || '新对话',
      agentId: agentId || null,
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
async function buildMessages(
  conversation: Conversation,
  query: string,
  agentId?: string,
  options: MessageBuildOptions = {}
): Promise<ChatMessage[]> {
  log.info('开始构建消息数组:', {
    conversationId: conversation.id,
    queryLength: query.length,
    agentId,
    options
  })

  try {
    const { includeSystemPrompt = true, maxHistoryMessages = MAX_CONTEXT_MESSAGES } = options
    const messages: ChatMessage[] = []

    // 添加系统消息
    if (includeSystemPrompt) {
      log.info('正在添加系统消息...')
      let systemMessage = DEFAULT_SYSTEM_PROMPT
      if (agentId) {
        const agent = await agentService.getAgentById(agentId)
        if (agent?.systemPrompt) {
          systemMessage = agent.systemPrompt
          log.info('使用 Agent 自定义系统提示词')
        }
      }
      messages.push({ role: 'system', content: systemMessage })
    }

    // 添加历史消息
    log.info('正在获取历史消息...', { maxHistoryMessages })
    const historyMessages = await getConversationMessages(conversation.id, maxHistoryMessages)
    log.info('历史消息获取完成, 数量:', historyMessages.length)

    messages.push(
      ...historyMessages.map((msg) => ({
        role: msg.role,
        content: msg.content
      }))
    )

    // 添加当前查询
    messages.push({
      role: 'user',
      content: query
    })

    log.info('消息数组构建完成:', {
      totalMessages: messages.length,
      systemPromptIncluded: includeSystemPrompt
    })
    return messages
  } catch (error) {
    log.error('构建消息失败:', {
      error,
      conversationId: conversation.id,
      agentId
    })
    throw new ChatError('构建消息失败', 'BUILD_MESSAGES_FAILED', { error })
  }
}

// ============= 对话处理方法 =============
export async function handleChatRequest(request: ChatRequest): Promise<ChatResponse> {
  const startTime = Date.now()
  log.info('开始处理聊天请求:', {
    conversationId: request.conversationId,
    query: request.query,
    agentId: request.agentId,
    parentMessageId: request.parentMessageId,
    references: request.references
  })

  try {
    // 1. 获取或创建会话
    log.info('正在获取/创建会话...')
    const conversation = await getOrCreateConversation(
      request.conversationId,
      request.query,
      request.agentId
    )
    log.info('会话信息:', {
      conversationId: conversation.id,
      title: conversation.title,
      isNew: !request.conversationId
    })

    // 2. 先创建用户消息并返回
    log.info('正在保存用户消息...')
    const userMessage = await createMessage(
      conversation.id,
      'user',
      request.query || '',
      request.parentMessageId
    )
    log.info('用户消息已保存:', { messageId: userMessage.id })

    // 处理笔记引用
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

      // 使用新的处理结果
      const processResult = await processNoteContent(request.references.noteIds)
      noteContents = processResult.contextText
      references = processResult.references
      sourceTypes = processResult.sourceTypes

      log.info('笔记处理完成:', {
        processedCount: processResult.references.notes.length,
        totalLength: processResult.contextText.length
      })
    }

    // 3. 构建消息数组
    log.info('正在构建消息数组...')
    const messages = await buildMessages(conversation, request.query || '', request.agentId)

    // 如果有笔记内容，添加到用户消息中
    if (noteContents) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'user') {
        lastMessage.content = `${lastMessage.content}\n\n参考以下笔记内容：\n\n${noteContents}`
      }
    }

    log.info('消息数组构建完成, 总消息数:', messages.length)

    // 4. 调用 LLM 服务获取回复
    log.info('正在调用 LLM 服务...')
    const aiResponse = await llmService.generateResponse(JSON.stringify(messages), request.agentId)
    log.info('LLM 响应内容:', {
      content: aiResponse,
      length: aiResponse.length
    })

    // 5. 保存 AI 响应
    log.info('正在保存 AI 响应...')
    const assistantMessage = await createMessage(
      conversation.id,
      'assistant',
      aiResponse,
      userMessage.id
    )
    log.info('AI 响应已保存:', { messageId: assistantMessage.id })

    // 6. 准备返回响应
    const response: ChatResponse = {
      messageId: assistantMessage.id,
      content: aiResponse,
      createdAt: assistantMessage.createdAt.getTime(),
      role: 'assistant',
      sourceTypes,
      references,
      conversationId: conversation.id,
      userMessageId: userMessage.id
    }

    const endTime = Date.now()
    log.info('聊天请求处理完成', {
      processingTime: `${endTime - startTime}ms`,
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      hasReferences: references !== undefined,
      references: references?.notes
    })
    console.log('处理聊天请求完成:', response)

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
