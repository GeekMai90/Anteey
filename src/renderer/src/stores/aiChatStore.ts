/**
 * @file aiChatStore.ts
 * @description AI 对话状态管理
 *
 * 主要功能：
 * 1. 会话管理
 *    - 会话列表获取与更新
 *    - 会话状态维护
 *    - 会话详情处理
 * 2. 消息处理
 *    - 消息发送与接收
 *    - 消息流式处理
 *    - 消息引用处理
 * 3. 状态维护
 *    - 加载状态管理
 *    - 当前会话状态
 *    - 流式内容缓存
 *
 * @author 麦先生
 * @created 2024-03-25
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChatRequest, ChatResponse, Conversation } from '@shared/types/ai-chat'
import { ConversationStatus } from '@shared/types/ai-chat'

export const useAIChatStore = defineStore(
  'aiChat',
  () => {
    /**
     * 状态定义
     * @property {Conversation[]} conversations - 会话列表
     * @property {Conversation | null} currentConversation - 当前活动会话
     * @property {boolean} isLoading - 加载状态
     * @property {string} currentStreamingContent - 当前流式响应内容
     * @property {number} totalConversations - 会话总数
     */
    const conversations = ref<Conversation[]>([])
    const currentConversation = ref<Conversation | null>(null)
    const isLoading = ref(false)
    const currentStreamingContent = ref('')
    const totalConversations = ref(0)

    /**
     * 获取会话列表
     * @async
     * @param {Object} params - 查询参数
     * @param {ConversationStatus} params.status - 会话状态
     * @param {number} params.page - 页码
     * @param {number} params.pageSize - 每页数量
     * @returns {Promise<{conversations: Conversation[], total: number}>} 会话列表和总数
     * @throws {Error} 获取失败时抛出错误
     */
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

    /**
     * 处理聊天响应
     * @description 处理AI响应消息，更新会话状态和消息列表
     * @param {ChatResponse} response - AI响应数据
     */
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

      // console.log('消息处理完成:', {
      //   messageId: messageData.id,
      //   conversationId: messageData.conversationId,
      //   messageCount: messages.length,
      //   hasReferences: !!messageData.references?.notes?.length
      // })
    }

    /**
     * 处理会话详情
     * @async
     * @description 处理会话详情数据，包括消息解析和状态更新
     * @param {Conversation} conversation - 会话数据
     */
    const handleConversationDetail = async (conversation: Conversation) => {
      const messages = Array.isArray(conversation.messages)
        ? conversation.messages.map((msg) => {
            // 解析存储为 JSON 字符串的字段
            const references =
              typeof msg.references === 'string' ? JSON.parse(msg.references) : msg.references

            const sourceTypes =
              typeof msg.sourceTypes === 'string'
                ? JSON.parse(msg.sourceTypes)
                : msg.sourceTypes || {
                    hasNotes: !!references?.notes?.length,
                    hasImages: !!references?.images?.length,
                    hasPdfs: !!references?.pdfs?.length
                  }

            const usage = typeof msg.usage === 'string' ? JSON.parse(msg.usage) : msg.usage

            return {
              ...msg,
              createdAt: new Date(msg.createdAt),
              references,
              sourceTypes,
              usage
            }
          })
        : []

      // 直接设置当前会话
      currentConversation.value = {
        ...conversation,
        messages, // 使用处理后的 messages
        createdAt: new Date(conversation.createdAt),
        updatedAt: new Date(conversation.updatedAt),
        lastMessageAt: new Date(conversation.lastMessageAt)
      }

      // console.log('当前会话已更新:', {
      //   id: currentConversation.value.id,
      //   messageCount: messages.length,
      //   title: currentConversation.value.title,
      //   messagesWithReferences: messages.filter(
      //     (m) => m.references?.notes?.length || m.sourceTypes?.hasNotes
      //   ).length
      // })
    }

    /**
     * 获取会话详情
     * @async
     * @param {string} id - 会话ID
     * @param {number} retryCount - 重试次数
     * @returns {Promise<Conversation>} 会话详情
     * @throws {Error} 获取失败时抛出错误
     */
    const fetchConversationDetail = async (id: string, retryCount = 3): Promise<Conversation> => {
      // console.log('开始获取会话详情:', { id, retryCount })

      try {
        isLoading.value = true
        // 获取会话详情
        const conversation = await window.electronAPI.aiChat.getConversationDetail(id)

        // 确保时间字段是 Date 对象
        const processedConversation = {
          ...conversation,
          createdAt: new Date(conversation.createdAt),
          updatedAt: new Date(conversation.updatedAt),
          lastMessageAt: new Date(conversation.lastMessageAt),
          messages:
            conversation.messages?.map((msg) => ({
              ...msg,
              createdAt: new Date(msg.createdAt)
            })) || []
        }

        // console.log('会话详情处理完成:', {
        //   id: processedConversation.id,
        //   messageCount: processedConversation.messages.length
        // })

        await handleConversationDetail(processedConversation)
        return processedConversation
      } catch (error) {
        console.error('获取会话详情失败:', error)
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

    /**
     * 发送聊天请求
     * @async
     * @description 发送聊天请求并处理响应
     * @param {ChatRequest} request - 聊天请求数据
     * @returns {Promise<ChatResponse>} 聊天响应
     * @throws {Error} 发送失败时抛出错误
     */
    const sendChatRequest = async (request: ChatRequest): Promise<ChatResponse> => {
      try {
        isLoading.value = true

        // 1. 处理会话初始化
        if (currentConversation.value) {
          // 确保 messages 数组始终存在
          currentConversation.value.messages = currentConversation.value.messages || []

          // 已存在的会话：总是显示用户消息（包括后续的 agent 对话）
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
          // 新会话：创建一个基本的会话结构，确保 messages 数组存在
          type MessageType = NonNullable<Conversation['messages']>[number]
          const messages: MessageType[] = []

          currentConversation.value = {
            id: '',
            title: request.query?.slice(0, 20) + '...' || '新对话',
            agentId: request.agentId || null,
            status: ConversationStatus.ACTIVE,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastMessageAt: new Date(),
            messageCount: 0,
            messages
          }

          // 只有在非 agent 对话时，才添加首次用户消息
          if (!request.agentId) {
            messages.push({
              id: 'local-' + Date.now(),
              conversationId: '',
              parentMessageId: null,
              role: 'user' as const,
              content: request.query || '',
              createdAt: new Date(),
              references: undefined,
              sourceTypes: undefined,
              usage: undefined
            })
            currentConversation.value.messageCount = 1
          }
        }

        // console.log('发送聊天请求:', {
        //   hasAgentId: !!request.agentId,
        //   isNewConversation: !currentConversation.value.id,
        //   query: request.query,
        //   references: request.references,
        //   currentMessages: currentConversation.value.messages?.length || 0
        // })

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

    /**
     * 发送流式聊天请求
     * @async
     * @param {ChatRequest} request - 聊天请求数据
     * @param {Function} onUpdate - 内容更新回调
     * @returns {Promise<string>} 消息ID
     */
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

    /**
     * 中断当前请求
     * @async
     * @description 中断正在进行的AI请求
     * @throws {Error} 中断失败时抛出错误
     */
    const abortCurrentRequest = async () => {
      // console.log('尝试中断当前请求')
      try {
        await window.electronAPI.aiChat.abortChatRequest()
        // console.log('请求中断成功')
      } catch (error) {
        console.error('中断请求失败:', error)
        throw error
      }
    }

    /**
     * 更新会话状态
     * @async
     * @param {string} id - 会话ID
     * @param {ConversationStatus} status - 新状态
     * @throws {Error} 更新失败时抛出错误
     */
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

    /**
     * 删除会话
     * @async
     * @param {string} id - 会话ID
     * @throws {Error} 删除失败时抛出错误
     */
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

    /**
     * 清空当前流式内容
     * @description 清空流式响应的临时内容
     */
    const clearStreamingContent = () => {
      currentStreamingContent.value = ''
    }

    /**
     * 创建新会话
     * @description 清空当前会话状态，准备创建新会话
     */
    const createNewConversation = () => {
      currentConversation.value = null
    }

    // 修改 loadingAnimation 的定义和相关方法
    const loadingAnimation = ref<{
      type:
        | 'candle'
        | 'pencil'
        | 'mouse'
        | 'pacman'
        | 'taichi'
        | 'windmill'
        | 'washing'
        | 'typewriter'
        | 'loadingFox'
      bottomOffset: number
    }>({
      type: 'candle',
      bottomOffset: -16
    })

    // 修改 initLoadingAnimation 方法
    const initLoadingAnimation = async () => {
      try {
        const settings = await window.electronAPI.userSettings.getAppearanceSettings()
        if (settings.loadingAnimationType) {
          setLoadingAnimation(settings.loadingAnimationType as any)
        }
      } catch (error) {
        console.error('初始化加载动画设置失败:', error)
      }
    }

    // 修改 setLoadingAnimation 方法中的保存逻辑
    const setLoadingAnimation = async (
      type:
        | 'candle'
        | 'pencil'
        | 'mouse'
        | 'pacman'
        | 'taichi'
        | 'windmill'
        | 'washing'
        | 'typewriter'
        | 'loadingFox'
    ) => {
      const offsets = {
        candle: -16,
        pencil: -40,
        mouse: -67,
        pacman: -59,
        taichi: -83,
        windmill: 29,
        washing: -60,
        typewriter: -39,
        loadingFox: -227
      }

      loadingAnimation.value = {
        type,
        bottomOffset: offsets[type]
      }

      // 修改这里的 API 调用
      try {
        await window.electronAPI.userSettings.updateAppearanceSettings({
          loadingAnimationType: type
        })
      } catch (error) {
        console.error('保存加载动画设置失败:', error)
        throw error
      }
    }

    return {
      // 状态导出
      conversations,
      currentConversation,
      isLoading,
      currentStreamingContent,
      totalConversations,

      // 方法导出
      fetchConversations,
      fetchConversationDetail,
      sendChatRequest,
      sendStreamChatRequest,
      abortCurrentRequest,
      updateConversationStatus,
      deleteConversation,
      clearStreamingContent,
      createNewConversation,
      loadingAnimation,
      setLoadingAnimation,
      initLoadingAnimation
    }
  },
  {
    persist: {
      // 指定需要持久化的state
      pick: ['loadingAnimation'],
      // 使用 localStorage 存储
      storage: localStorage,
      // 自定义存储的 key
      key: 'aiChat-store'
    }
  }
)
