import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChatRequest, ChatResponse, Conversation } from '@shared/types/ai-chat'
import { ConversationStatus } from '@shared/types/ai-chat'

export const useAIChatStore = defineStore('aiChat', () => {
  // ==================== 状态 ====================
  const conversations = ref<Conversation[]>([])
  const currentConversation = ref<Conversation | null>(null)
  const isLoading = ref(false)
  const currentStreamingContent = ref('')
  const totalConversations = ref(0)

  // ==================== 操作方法 ====================
  // 获取会话列表
  const fetchConversations = async (params?: {
    status?: ConversationStatus
    page?: number
    pageSize?: number
  }) => {
    try {
      isLoading.value = true
      const result = await window.electronAPI.aiChat.listConversations(params)
      conversations.value = result.conversations
      totalConversations.value = result.total
      return result
    } catch (error) {
      console.error('获取会话列表失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 修改消息处理相关的函数
  const handleChatResponse = (response: ChatResponse) => {
    if (!currentConversation.value) return

    // 确保 messages 数组存在
    if (!Array.isArray(currentConversation.value.messages)) {
      currentConversation.value.messages = []
    }

    // 构造消息数据
    const messageData = {
      id: response.messageId,
      conversationId: response.conversationId,
      parentMessageId: response.userMessageId || null,
      role: response.role,
      content: response.content,
      createdAt: new Date(),
      references: response.references
        ? {
            notes: response.references.notes || undefined,
            images: response.references.images || undefined,
            pdfs: response.references.pdfs || undefined
          }
        : undefined,
      sourceTypes: {
        hasNotes: response.sourceTypes?.hasNotes || false,
        hasImages: response.sourceTypes?.hasImages || false,
        hasPdfs: response.sourceTypes?.hasPdfs || false
      },
      usage: response.usage || undefined
    }

    const messages = currentConversation.value.messages

    // 查找并替换临时消息或添加新消息
    const tempIndex = messages.findIndex(
      (msg) => msg.role === 'assistant' && msg.id.startsWith('local-')
    )

    if (tempIndex !== -1) {
      messages[tempIndex] = messageData
    } else {
      // 检查是否已存在相同 ID 的消息
      const existingIndex = messages.findIndex((msg) => msg.id === messageData.id)
      if (existingIndex === -1) {
        messages.push(messageData)
      }
    }

    // 更新会话信息
    currentConversation.value = {
      ...currentConversation.value,
      id: response.conversationId,
      lastMessageAt: new Date(),
      messageCount: messages.length,
      messages // 确保更新消息数组
    }

    console.log('消息处理完成:', {
      messageId: messageData.id,
      conversationId: messageData.conversationId,
      messageCount: messages.length,
      hasReferences: !!messageData.references?.notes?.length
    })
  }

  // 修改会话详情处理函数
  const handleConversationDetail = async (conversation: Conversation) => {
    if (!currentConversation.value) return

    // 确保 messages 数组存在
    const currentMessages = Array.isArray(currentConversation.value.messages)
      ? currentConversation.value.messages
      : []

    // 更新会话基本信息
    currentConversation.value = {
      ...conversation,
      messages: currentMessages, // 保持现有消息
      createdAt: new Date(conversation.createdAt),
      updatedAt: new Date(conversation.updatedAt),
      lastMessageAt: new Date(conversation.lastMessageAt)
    }
  }

  // 获取会话详情
  const fetchConversationDetail = async (id: string, retryCount = 3): Promise<Conversation> => {
    console.log('开始获取会话详情:', { id, retryCount })

    try {
      isLoading.value = true
      const conversation = await window.electronAPI.aiChat.getConversationDetail(id)

      // 确保时间字段是 Date 对象
      conversation.createdAt = new Date(conversation.createdAt)
      conversation.updatedAt = new Date(conversation.updatedAt)
      conversation.lastMessageAt = new Date(conversation.lastMessageAt)

      // 处理消息数组中的时间
      if (conversation.messages) {
        conversation.messages = conversation.messages.map((msg) => ({
          ...msg,
          createdAt: new Date(msg.createdAt)
        }))
      }

      console.log('会话详情处理完成:', {
        id: conversation.id,
        messageCount: conversation.messages?.length,
        timestamps: conversation.messages?.map((m) => ({
          id: m.id,
          createdAt: m.createdAt.getTime()
        }))
      })

      await handleConversationDetail(conversation)
      return conversation
    } catch (error) {
      console.error('获取会话详情失败:', error)

      // 如果还有重试次数，等待后重试
      if (retryCount > 0) {
        console.log(`等待 500ms 后重试 (剩余重试次数: ${retryCount - 1})`)
        await new Promise((resolve) => setTimeout(resolve, 500))
        return fetchConversationDetail(id, retryCount - 1)
      }

      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 修改发送请求方法
  const sendChatRequest = async (request: ChatRequest): Promise<ChatResponse> => {
    try {
      isLoading.value = true

      // 1. 立即在当前会话中显示用户消息
      if (currentConversation.value) {
        // 确保 messages 数组存在
        if (!Array.isArray(currentConversation.value.messages)) {
          currentConversation.value.messages = []
        }

        const userMessage = {
          id: 'local-' + Date.now(),
          conversationId: currentConversation.value.id,
          parentMessageId: null,
          role: 'user' as const,
          content: request.query || '',
          createdAt: new Date(),
          references: undefined,
          sourceTypes: undefined,
          usage: undefined
        }

        currentConversation.value.messages.push(userMessage)
      } else {
        // 新会话：创建一个基本的会话结构
        currentConversation.value = {
          id: '',
          title: request.query?.slice(0, 20) + '...' || '新对话',
          agentId: request.agentId || null,
          status: ConversationStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastMessageAt: new Date(),
          messageCount: 1,
          messages: [
            {
              id: 'local-' + Date.now(),
              conversationId: '',
              parentMessageId: null,
              role: 'user' as const,
              content: request.query || '',
              createdAt: new Date(),
              references: undefined,
              sourceTypes: undefined,
              usage: undefined
            }
          ]
        }
      }

      // 2. 发送请求并获取响应
      const response = await window.electronAPI.aiChat.sendChatRequest(request)

      // 3. 处理响应
      handleChatResponse(response)

      // 4. 如果是新会话，更新会话列表
      if (!request.conversationId) {
        await fetchConversations()
      }

      return response
    } catch (error) {
      console.error('发送聊天请求失败:', error)

      // 发生错误时移除本地消息
      if (currentConversation.value) {
        currentConversation.value.messages = currentConversation.value.messages?.filter(
          (msg) => !msg.id.startsWith('local-')
        )
      }

      if (error instanceof Error && error.message.includes('max RPM')) {
        throw new Error('发送消息太快了，请稍等一下再试～')
      }
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 发送流式聊天请求
  const sendStreamChatRequest = async (
    request: ChatRequest,
    onUpdate?: (content: string) => void
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      currentStreamingContent.value = ''

      window.electronAPI.aiChat
        .sendStreamChatRequest(request, {
          onContent: (content: string) => {
            currentStreamingContent.value += content
            onUpdate?.(currentStreamingContent.value)
          },
          onDone: async (messageId: string) => {
            // 更新会话状态
            if (request.conversationId) {
              await fetchConversationDetail(request.conversationId)
            } else {
              // 获取最新的会话列表
              const result = await fetchConversations()
              if (result.conversations.length > 0) {
                await fetchConversationDetail(result.conversations[0].id)
              }
            }
            resolve(messageId)
          },
          onError: (error: string) => {
            reject(new Error(error))
          }
        })
        .catch(reject)
    })
  }

  // 中断当前请求
  const abortCurrentRequest = async () => {
    console.log('尝试中断当前请求')
    try {
      await window.electronAPI.aiChat.abortChatRequest()
      console.log('请求中断成功')
    } catch (error) {
      console.error('中断请求失败:', error)
      throw error
    }
  }

  // 更新会话状态
  const updateConversationStatus = async (id: string, status: ConversationStatus) => {
    try {
      await window.electronAPI.aiChat.updateConversationStatus(id, status)
      // 如果是当前会话，更新当前会话状态
      if (currentConversation.value?.id === id) {
        currentConversation.value.status = status
      }
      // 刷新会话列表
      await fetchConversations()
    } catch (error) {
      console.error('更新会话状态失败:', error)
      throw error
    }
  }

  // 删除会话
  const deleteConversation = async (id: string) => {
    try {
      await window.electronAPI.aiChat.deleteConversation(id)
      // 如果是当前会话，清空当前会话
      if (currentConversation.value?.id === id) {
        currentConversation.value = null
      }
      // 从列表中移除
      conversations.value = conversations.value.filter((conv) => conv.id !== id)
      totalConversations.value--
    } catch (error) {
      console.error('删除会话失败:', error)
      throw error
    }
  }

  // 清空当前流式内容
  const clearStreamingContent = () => {
    currentStreamingContent.value = ''
  }

  // 简化新建会话方法
  const createNewConversation = () => {
    currentConversation.value = null
  }

  return {
    // 状态
    conversations,
    currentConversation,
    isLoading,
    currentStreamingContent,
    totalConversations,

    // 方法
    fetchConversations,
    fetchConversationDetail,
    sendChatRequest,
    sendStreamChatRequest,
    abortCurrentRequest,
    updateConversationStatus,
    deleteConversation,
    clearStreamingContent,
    createNewConversation
  }
})
