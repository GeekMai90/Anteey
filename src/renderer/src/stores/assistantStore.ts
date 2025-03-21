import { defineStore } from 'pinia'
import { ref, markRaw } from 'vue' // 添加 markRaw
import type {
  ChatMessage,
  UserMessage,
  SystemMessage,
  RAGContext,
  RAGHistoryRecord,
  AIAssistantMessage,
  ChatSession,
  AssistantNoteReference
} from '@shared/types'
import { v4 as uuidv4 } from 'uuid'
import { useModelConfigStore } from '@renderer/stores/modelConfigStore'
import { message } from '@renderer/utils/message'

export const useAssistantStore = defineStore('assistant', () => {
  const messages = ref<ChatMessage[]>([])
  const isProcessing = ref(false)
  const currentContext = ref<RAGContext | null>(null)
  const contexts = ref<RAGContext[]>([]) // 新增：存储所有上下文
  const chatHistory = ref<RAGHistoryRecord[]>([])
  const currentSessionId = ref<string | null>(null) // 新增：当前会话ID
  const currentSessionStartTime = ref<number | null>(null) // 新增：当前会话开始时间
  const isLoadingHistory = ref(false) // 新增：是否正在加载历史记录
  const isInitializingEmbeddings = ref(false)
  const embeddingsProgress = ref({ total: 0, processed: 0 })
  const displayedMessageIds = ref<Set<string>>(new Set()) // 新增：记录已显示的消息ID

  const modelConfigStore = useModelConfigStore()

  // 确保配置已加载
  const ensureConfigLoaded = async () => {
    if (!modelConfigStore.defaultConfig) {
      await modelConfigStore.loadConfigs()
    }
  }

  // 清空对话时重置会话ID

  // 新增：会话追踪
  const currentSession = ref<ChatSession | null>(null)
  const performanceMetrics = ref<{
    messageCount: number
    averageResponseTime: number
    errorCount: number
  }>({
    messageCount: 0,
    averageResponseTime: 0,
    errorCount: 0
  })

  const sendMessage = async (content: string) => {
    const startTime = performance.now()
    try {
      isProcessing.value = true

      // 1. 会话管理
      if (!currentSessionId.value) {
        currentSessionId.value = uuidv4()
        currentSession.value = {
          id: currentSessionId.value,
          messages: [],
          currentContext: undefined,
          metadata: {
            startTime: new Date().toISOString(),
            lastUpdateTime: new Date().toISOString(),
            messageCount: 0,
            hasReferences: false
          }
        }
      }

      // 2. 添加用户消息
      const userMessage: UserMessage = {
        id: uuidv4(),
        role: 'user',
        content,
        timestamp: Date.now()
      }
      messages.value.push(markRaw(userMessage))

      // 3. 准备发送数据 - 深度清理数据
      const prepareDataForTransfer = (data: any) => {
        return JSON.parse(
          JSON.stringify(data, (key, value) => {
            if (typeof value === 'function' || key.startsWith('_')) {
              return undefined
            }
            return value
          })
        )
      }

      const messagesToSend = prepareDataForTransfer(messages.value.slice(0, -1))
      const contextsToSend = prepareDataForTransfer(contexts.value)

      // 4. 生成回答
      const result = await window.electronAPI.rag.generateAnswer(
        content,
        currentSessionId.value,
        messagesToSend,
        contextsToSend
      )

      if (!result) {
        throw new Error('生成回答失败：未收到响应')
      }

      const { context, answer } = result

      // 5. 添加AI回复
      const assistantMessage: AIAssistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: answer,
        timestamp: Date.now(),
        sourceType: context.relevantDocs.length > 0 ? 'notes' : 'ai',
        references:
          context.relevantDocs.length > 0 ? prepareDataForTransfer(context.relevantDocs) : undefined
      }
      messages.value.push(markRaw(assistantMessage))

      // 6. 更新上下文
      const cleanContext = prepareDataForTransfer(context)
      currentContext.value = markRaw(cleanContext)
      contexts.value = markRaw([...contexts.value, cleanContext]) as RAGContext[]

      // 7. 更新会话状态
      if (currentSession.value) {
        const cleanMessages = prepareDataForTransfer(messages.value)
        currentSession.value = markRaw({
          ...currentSession.value,
          messages: cleanMessages,
          currentContext: cleanContext,
          metadata: {
            ...currentSession.value.metadata,
            messageCount: currentSession.value.metadata.messageCount + 2,
            lastUpdateTime: new Date().toISOString(),
            hasReferences: context.relevantDocs.length > 0
          }
        })
      }

      // 8. 更新历史记录
      await window.electronAPI.rag.updateRAGHistory({
        sessionId: currentSessionId.value,
        messages: prepareDataForTransfer(messages.value),
        contexts: prepareDataForTransfer(contexts.value),
        metadata: prepareDataForTransfer(currentSession.value?.metadata)
      })

      // 9. 更新性能指标
      const duration = performance.now() - startTime
      updatePerformanceMetrics(duration)

      // 10. 记录性能数据
      await window.electronAPI.rag.trackRAGPerformance(
        currentSessionId.value!,
        'sendMessage',
        duration,
        {
          success: true,
          metadata: {
            messageLength: content.length,
            hasReferences: context.relevantDocs.length > 0
          }
        }
      )

      return {
        answer,
        context: cleanContext,
        messages: prepareDataForTransfer(messages.value)
      }
    } catch (error) {
      console.error('发送消息失败:', error)
      const errorMessage: SystemMessage = {
        id: uuidv4(),
        role: 'system',
        content: '抱歉，生成回答时出现错误，请稍后重试。',
        timestamp: Date.now()
      }
      messages.value.push(markRaw(errorMessage))

      // 记录错误性能数据
      const duration = performance.now() - startTime
      performanceMetrics.value.errorCount++
      await window.electronAPI.rag.trackRAGPerformance(
        currentSessionId.value!,
        'sendMessage',
        duration,
        {
          success: false,
          error: String(error)
        }
      )

      throw error
    } finally {
      isProcessing.value = false
    }
  }

  const sendMessageWithReference = async (
    content: string,
    noteReferences: AssistantNoteReference[]
  ) => {
    const startTime = performance.now()
    try {
      isProcessing.value = true

      // 1. 会话管理
      if (!currentSessionId.value) {
        currentSessionId.value = uuidv4()
        currentSession.value = {
          id: currentSessionId.value,
          messages: [],
          currentContext: undefined,
          metadata: {
            startTime: new Date().toISOString(),
            lastUpdateTime: new Date().toISOString(),
            messageCount: 0,
            hasReferences: true // 默认为 true，因为是带引用的消息
          }
        }
      }

      // 2. 添加用户消息
      const userMessage: UserMessage = {
        id: uuidv4(),
        role: 'user',
        content,
        timestamp: Date.now()
      }
      messages.value.push(markRaw(userMessage))

      // 3. 准备发送数据 - 深度清理数据
      const prepareDataForTransfer = (data: any) => {
        return JSON.parse(
          JSON.stringify(data, (key, value) => {
            if (typeof value === 'function' || key.startsWith('_')) {
              return undefined
            }
            return value
          })
        )
      }

      const messagesToSend = prepareDataForTransfer(messages.value.slice(0, -1))
      const contextsToSend = prepareDataForTransfer(contexts.value)
      const referencesToSend = prepareDataForTransfer(noteReferences)

      // 4. 生成带引用的回答
      const result = await window.electronAPI.rag.generateAnswerWithReferences(
        content,
        referencesToSend,
        currentSessionId.value,
        messagesToSend,
        contextsToSend
      )

      if (!result) {
        throw new Error('生成回答失败：未收到响应')
      }

      const { context, answer } = result

      // 5. 添加AI回复
      const assistantMessage: AIAssistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: answer,
        timestamp: Date.now(),
        sourceType: 'notes', // 固定为 notes，因为是引用笔记
        references: prepareDataForTransfer(context.relevantDocs)
      }
      messages.value.push(markRaw(assistantMessage))

      // 6. 更新上下文
      const cleanContext = prepareDataForTransfer(context)
      currentContext.value = markRaw(cleanContext)
      contexts.value = markRaw([...contexts.value, cleanContext]) as RAGContext[]

      // 7. 更新会话状态
      if (currentSession.value) {
        const cleanMessages = prepareDataForTransfer(messages.value)
        currentSession.value = markRaw({
          ...currentSession.value,
          messages: cleanMessages,
          currentContext: cleanContext,
          metadata: {
            ...currentSession.value.metadata,
            messageCount: currentSession.value.metadata.messageCount + 2,
            lastUpdateTime: new Date().toISOString(),
            hasReferences: true
          }
        })
      }

      // 8. 更新历史记录
      await window.electronAPI.rag.updateRAGHistory({
        sessionId: currentSessionId.value,
        messages: prepareDataForTransfer(messages.value),
        contexts: prepareDataForTransfer(contexts.value),
        metadata: prepareDataForTransfer(currentSession.value?.metadata)
      })

      // 9. 更新性能指标
      const duration = performance.now() - startTime
      updatePerformanceMetrics(duration)

      // 10. 记录性能数据
      await window.electronAPI.rag.trackRAGPerformance(
        currentSessionId.value!,
        'sendMessageWithReference',
        duration,
        {
          success: true,
          metadata: {
            messageLength: content.length,
            referencesCount: noteReferences.length
          }
        }
      )

      return {
        answer,
        context: cleanContext,
        messages: prepareDataForTransfer(messages.value)
      }
    } catch (error) {
      console.error('发送带引用消息失败:', error)
      const errorMessage: SystemMessage = {
        id: uuidv4(),
        role: 'system',
        content: '抱歉，生成回答时出现错误，请稍后重试。',
        timestamp: Date.now()
      }
      messages.value.push(markRaw(errorMessage))

      // 记录错误性能数据
      const duration = performance.now() - startTime
      performanceMetrics.value.errorCount++
      await window.electronAPI.rag.trackRAGPerformance(
        currentSessionId.value!,
        'sendMessageWithReference',
        duration,
        {
          success: false,
          error: String(error)
        }
      )

      throw error
    } finally {
      isProcessing.value = false
    }
  }

  const generateWriting = async () => {
    console.log('generateWriting')
  }
  const brainstorm = async () => {
    console.log('brainstorm')
  }
  const analyzeContent = async () => {
    console.log('analyzeContent')
  }
  const searchContent = async () => {
    console.log('searchContent')
  }

  // 更新性能指标
  const updatePerformanceMetrics = (duration: number) => {
    const metrics = performanceMetrics.value
    metrics.messageCount++
    metrics.averageResponseTime =
      (metrics.averageResponseTime * (metrics.messageCount - 1) + duration) / metrics.messageCount
  }

  // 清理过期会话
  const cleanupExpiredSessions = async () => {
    try {
      await window.electronAPI.rag.cleanupExpiredSessions()
      await loadHistory() // 重新加载历史记录
    } catch (error) {
      console.error('清理过期会话失败:', error)
      throw error
    }
  }

  const clearMessages = () => {
    messages.value = []
    contexts.value = []
    currentContext.value = null
    currentSessionId.value = null
    displayedMessageIds.value.clear() // 清空已显示消息记录
  }

  // 开始新对话
  const startNewChat = () => {
    clearMessages()
    currentSessionId.value = uuidv4()
    currentSessionStartTime.value = Date.now()
  }

  // ==================历史对话功能==================

  // 获取所有历史对话
  const loadHistory = async () => {
    try {
      isLoadingHistory.value = true
      chatHistory.value = await window.electronAPI.rag.getRAGHistory()
    } catch (error) {
      console.error('加载历史记录失败:', error)
      throw error
    } finally {
      isLoadingHistory.value = false
    }
  }

  // 在历史对话中发送新消息
  const continueHistoryChat = () => {
    // 更新当前会话的开始时间，这样之后的新消息就会显示打字机效果
    currentSessionStartTime.value = Date.now()
  }

  // 更新历史记录标题
  const updateHistoryTitle = async (id: string, title: string) => {
    try {
      await window.electronAPI.rag.updateRAGHistoryTitle(id, title)
      const index = chatHistory.value.findIndex((item) => item.id === id)
      if (index !== -1) {
        chatHistory.value[index].title = title
      }
    } catch (error) {
      console.error('更新历史记录标题失败:', error)
      throw error
    }
  }

  // 切换历史记录置顶状态
  const toggleHistoryPin = async (id: string) => {
    try {
      await window.electronAPI.rag.toggleRAGHistoryPin(id)
      const index = chatHistory.value.findIndex((item) => item.id === id)
      if (index !== -1) {
        chatHistory.value[index].isPinned = !chatHistory.value[index].isPinned
        chatHistory.value.sort((a, b) => {
          if (a.isPinned === b.isPinned) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          }
          return a.isPinned ? -1 : 1
        })
      }
    } catch (error) {
      console.error('切换历史记录置顶状态失败:', error)
      throw error
    }
  }

  // 删除单条历史记录
  const deleteHistory = async (id: string) => {
    try {
      await window.electronAPI.rag.deleteRAGHistory(id)
      // 更新本地状态
      chatHistory.value = chatHistory.value.filter((item) => item.id !== id)
    } catch (error) {
      console.error('删除历史记录失败:', error)
      throw error
    }
  }

  // 清空所有历史记录
  const clearAllHistory = async () => {
    try {
      await window.electronAPI.rag.clearAllRAGHistory()
      // 更新本地状态
      chatHistory.value = []
    } catch (error) {
      console.error('清空历史记录失败:', error)
      throw error
    }
  }

  // 加载指定历史记录的对话内容
  const loadHistoryChat = async (id: string) => {
    try {
      const historyDetail = await window.electronAPI.rag.getRAGHistoryDetail(id)
      if (historyDetail) {
        // 清空当前对话
        clearMessages()

        // 直接使用保存的消息和上下文
        messages.value = historyDetail.messages
        contexts.value = historyDetail.contexts
        currentContext.value = contexts.value[contexts.value.length - 1] || null
        currentSessionId.value = id

        // 将所有历史消息标记为已显示
        historyDetail.messages.forEach((msg) => {
          if (msg.role === 'assistant') {
            displayedMessageIds.value.add(msg.id)
          }
        })
      }
    } catch (error) {
      console.error('加载历史对话失败:', error)
      throw error
    }
  }
  // ==================问一问模式==================
  // 问一问模式
  const handleAskQuestion = async (
    content: string,
    noteReferences: AssistantNoteReference[] = []
  ) => {
    const startTime = performance.now()
    try {
      isProcessing.value = true

      // 1. 会话管理
      if (!currentSessionId.value) {
        currentSessionId.value = uuidv4()
        currentSession.value = {
          id: currentSessionId.value,
          messages: [],
          currentContext: undefined,
          metadata: {
            startTime: new Date().toISOString(),
            lastUpdateTime: new Date().toISOString(),
            messageCount: 0,
            hasReferences: noteReferences.length > 0
          }
        }
      }

      // 2. 添加用户消息
      const userMessage: UserMessage = {
        id: uuidv4(),
        role: 'user',
        content,
        timestamp: Date.now()
      }
      messages.value.push(markRaw(userMessage))

      // 3. 准备发送数据
      const prepareDataForTransfer = (data: any) => {
        return JSON.parse(
          JSON.stringify(data, (key, value) => {
            if (typeof value === 'function' || key.startsWith('_')) {
              return undefined
            }
            return value
          })
        )
      }

      const messagesToSend = prepareDataForTransfer(messages.value.slice(0, -1))
      const contextsToSend = prepareDataForTransfer(contexts.value)
      const referencesToSend = prepareDataForTransfer(noteReferences)

      // 4. 调用问一问模式
      const result = await window.electronAPI.rag.handleAskQuestion(
        content,
        referencesToSend,
        currentSessionId.value,
        messagesToSend,
        contextsToSend
      )

      // 检查是否有错误
      if (result.error) {
        const errorMessage: SystemMessage = {
          id: uuidv4(),
          role: 'system',
          content: result.error.message,
          timestamp: Date.now(),
          type: 'error',
          error: result.error
        }
        messages.value.push(markRaw(errorMessage))

        // 添加错误提示
        if (result.error.type === 'balance_insufficient') {
          message.error('账户余额不足,请充值后重试')
        } else if (result.error.type === 'network_error') {
          message.error('网络连接失败,请检查网络设置')
        } else {
          message.error(result.error.message)
        }

        return result
      }

      const { context, answer } = result

      // 5. 添加AI回复
      const assistantMessage: AIAssistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: answer,
        timestamp: Date.now(),
        sourceType: context.relevantDocs.length > 0 ? 'notes' : 'ai',
        references:
          context.relevantDocs.length > 0 ? prepareDataForTransfer(context.relevantDocs) : undefined
      }
      messages.value.push(markRaw(assistantMessage))

      // 6. 更新上下文
      const cleanContext = prepareDataForTransfer(context)
      currentContext.value = markRaw(cleanContext)
      contexts.value = markRaw([...contexts.value, cleanContext]) as RAGContext[]

      // 7. 更新会话状态
      if (currentSession.value) {
        const cleanMessages = prepareDataForTransfer(messages.value)
        currentSession.value = markRaw({
          ...currentSession.value,
          messages: cleanMessages,
          currentContext: cleanContext,
          metadata: {
            ...currentSession.value.metadata,
            messageCount: currentSession.value.metadata.messageCount + 2,
            lastUpdateTime: new Date().toISOString(),
            hasReferences: context.relevantDocs.length > 0
          }
        })
      }

      // 8. 更新历史记录
      await window.electronAPI.rag.updateRAGHistory({
        sessionId: currentSessionId.value,
        messages: prepareDataForTransfer(messages.value),
        contexts: prepareDataForTransfer(contexts.value),
        metadata: prepareDataForTransfer(currentSession.value?.metadata)
      })

      // 9. 更新性能指标
      const duration = performance.now() - startTime
      updatePerformanceMetrics(duration)

      // 10. 记录性能数据
      await window.electronAPI.rag.trackRAGPerformance(
        currentSessionId.value!,
        'askQuestion',
        duration,
        {
          success: true,
          metadata: {
            messageLength: content.length,
            hasReferences: context.relevantDocs.length > 0
          }
        }
      )

      return {
        answer,
        context: cleanContext,
        messages: prepareDataForTransfer(messages.value)
      }
    } catch (error) {
      console.error('问一问失败:', error)
      const errorMessage: SystemMessage = {
        id: uuidv4(),
        role: 'system',
        content: '抱歉，处理问题时出现错误，请稍后重试。',
        timestamp: Date.now(),
        type: 'error'
      }
      messages.value.push(markRaw(errorMessage))

      // 添加错误提示
      message.error('处理问题时出现错误，请稍后重试')

      // 记录错误性能数据
      const duration = performance.now() - startTime
      performanceMetrics.value.errorCount++
      await window.electronAPI.rag.trackRAGPerformance(
        currentSessionId.value!,
        'askQuestion',
        duration,
        {
          success: false,
          error: String(error)
        }
      )

      throw error
    } finally {
      isProcessing.value = false
    }
  }

  // 聊一聊模式
  const handleChat = async (content: string) => {
    const startTime = performance.now()
    try {
      await ensureConfigLoaded() // 确保配置已加载
      isProcessing.value = true

      // 1. 会话管理
      if (!currentSessionId.value) {
        currentSessionId.value = uuidv4()
        currentSession.value = {
          id: currentSessionId.value,
          messages: [],
          currentContext: undefined,
          metadata: {
            startTime: new Date().toISOString(),
            lastUpdateTime: new Date().toISOString(),
            messageCount: 0,
            hasReferences: false // 聊一聊模式不涉及笔记引用
          }
        }
      }

      // 2. 添加用户消息
      const userMessage: UserMessage = {
        id: uuidv4(),
        role: 'user',
        content,
        timestamp: Date.now()
      }
      messages.value.push(markRaw(userMessage))

      // 3. 准备发送数据
      const prepareDataForTransfer = (data: any) => {
        return JSON.parse(
          JSON.stringify(data, (key, value) => {
            if (typeof value === 'function' || key.startsWith('_')) {
              return undefined
            }
            return value
          })
        )
      }

      const messagesToSend = prepareDataForTransfer(messages.value.slice(0, -1))
      const contextsToSend = prepareDataForTransfer(contexts.value)

      // 4. 调用聊一聊模式时使用新的配置格式
      const defaultConfig = modelConfigStore.defaultConfig
      const result = await window.electronAPI.rag.handleChat(
        content,
        currentSessionId.value,
        messagesToSend,
        contextsToSend,
        defaultConfig?.parameters
          ? {
              temperature: defaultConfig.parameters.temperature ?? 0.7,
              maxTokens: defaultConfig.parameters.maxTokens ?? 2000
            }
          : undefined
      )

      // 检查是否有错误
      if (result.error) {
        const errorMessage: SystemMessage = {
          id: uuidv4(),
          role: 'system',
          content: result.error.message,
          timestamp: Date.now(),
          type: 'error',
          error: result.error
        }
        messages.value.push(markRaw(errorMessage))

        // 添加错误提示
        if (result.error.type === 'balance_insufficient') {
          message.error('账户余额不足,请充值后重试')
        } else if (result.error.type === 'network_error') {
          message.error('网络连接失败,请检查网络设置')
        } else {
          message.error(result.error.message)
        }

        return result
      }

      const { context, answer } = result

      // 5. 添加AI回复
      const assistantMessage: AIAssistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: answer,
        timestamp: Date.now(),
        sourceType: 'ai', // 聊一聊模式固定为 ai
        references: undefined // 聊一聊模式没有引用
      }
      messages.value.push(markRaw(assistantMessage))

      // 6. 更新上下文
      const cleanContext = prepareDataForTransfer(context)
      currentContext.value = markRaw(cleanContext)
      contexts.value = markRaw([...contexts.value, cleanContext]) as RAGContext[]

      // 7. 更新会话状态
      if (currentSession.value) {
        const cleanMessages = prepareDataForTransfer(messages.value)
        currentSession.value = markRaw({
          ...currentSession.value,
          messages: cleanMessages,
          currentContext: cleanContext,
          metadata: {
            ...currentSession.value.metadata,
            messageCount: currentSession.value.metadata.messageCount + 2,
            lastUpdateTime: new Date().toISOString(),
            hasReferences: false // 聊一聊模式不涉及笔记引用
          }
        })
      }

      // 8. 更新历史记录
      await window.electronAPI.rag.updateRAGHistory({
        sessionId: currentSessionId.value,
        messages: prepareDataForTransfer(messages.value),
        contexts: prepareDataForTransfer(contexts.value),
        metadata: prepareDataForTransfer(currentSession.value?.metadata)
      })

      // 9. 更新性能指标
      const duration = performance.now() - startTime
      updatePerformanceMetrics(duration)

      // 10. 记录性能数据
      await window.electronAPI.rag.trackRAGPerformance(currentSessionId.value!, 'chat', duration, {
        success: true,
        metadata: {
          messageLength: content.length,
          hasReferences: false // 聊一聊模式不涉及笔记引用
        }
      })

      return {
        answer,
        context: cleanContext,
        messages: prepareDataForTransfer(messages.value)
      }
    } catch (error) {
      console.error('聊天失败:', error)
      const errorMessage: SystemMessage = {
        id: uuidv4(),
        role: 'system',
        content: '抱歉，处理聊天时出现错误，请稍后重试。',
        timestamp: Date.now(),
        type: 'error'
      }
      messages.value.push(markRaw(errorMessage))

      // 添加错误提示
      message.error('处理聊天时出现错误，请稍后重试')

      // 记录错误性能数据
      const duration = performance.now() - startTime
      performanceMetrics.value.errorCount++
      await window.electronAPI.rag.trackRAGPerformance(currentSessionId.value!, 'chat', duration, {
        success: false,
        error: String(error)
      })

      throw error
    } finally {
      isProcessing.value = false
    }
  }

  const handleFindNotes = async (content: string) => {
    const startTime = performance.now()
    try {
      isProcessing.value = true

      // 1. 会话管理
      if (!currentSessionId.value) {
        currentSessionId.value = uuidv4()
        currentSession.value = {
          id: currentSessionId.value,
          messages: [],
          currentContext: undefined,
          metadata: {
            startTime: new Date().toISOString(),
            lastUpdateTime: new Date().toISOString(),
            messageCount: 0,
            hasReferences: true // 找一找模式总是有引用
          }
        }
      }

      // 2. 添加用户消息
      const userMessage: UserMessage = {
        id: uuidv4(),
        role: 'user',
        content,
        timestamp: Date.now()
      }
      messages.value.push(markRaw(userMessage))

      // 3. 准备发送数据
      const prepareDataForTransfer = (data: any) => {
        return JSON.parse(
          JSON.stringify(data, (key, value) => {
            if (typeof value === 'function' || key.startsWith('_')) {
              return undefined
            }
            return value
          })
        )
      }

      // 3. 准备发送数据
      const messagesToSend = prepareDataForTransfer(messages.value.slice(0, -1))
      const contextsToSend = prepareDataForTransfer(contexts.value)

      // 4. 调用找一找模式
      const result = await window.electronAPI.rag.handleFindNotes(
        content,
        currentSessionId.value,
        messagesToSend,
        contextsToSend
      )

      if (!result) {
        throw new Error('找一找失败：未收到响应')
      }

      const { context, answer } = result

      // 5. 添加AI回复
      const assistantMessage: AIAssistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: answer,
        timestamp: Date.now(),
        sourceType: 'notes',
        references: prepareDataForTransfer(context.relevantDocs)
      }
      messages.value.push(markRaw(assistantMessage))

      // 6. 更新上下文
      const cleanContext = prepareDataForTransfer(context)
      currentContext.value = markRaw(cleanContext)
      contexts.value = markRaw([...contexts.value, cleanContext]) as RAGContext[]

      // 7. 更新会话状态
      if (currentSession.value) {
        const cleanMessages = prepareDataForTransfer(messages.value)
        currentSession.value = markRaw({
          ...currentSession.value,
          messages: cleanMessages,
          currentContext: cleanContext,
          metadata: {
            ...currentSession.value.metadata,
            messageCount: currentSession.value.metadata.messageCount + 2,
            lastUpdateTime: new Date().toISOString(),
            hasReferences: true
          }
        })
      }

      // 8. 更新历史记录
      await window.electronAPI.rag.updateRAGHistory({
        sessionId: currentSessionId.value,
        messages: prepareDataForTransfer(messages.value),
        contexts: prepareDataForTransfer(contexts.value),
        metadata: prepareDataForTransfer(currentSession.value?.metadata)
      })

      // 9. 更新性能指标
      const duration = performance.now() - startTime
      updatePerformanceMetrics(duration)

      // 10. 记录性能数据
      await window.electronAPI.rag.trackRAGPerformance(
        currentSessionId.value!,
        'findNotes',
        duration,
        {
          success: true,
          metadata: {
            messageLength: content.length,
            hasReferences: true
          }
        }
      )

      return {
        answer,
        context: cleanContext,
        messages: prepareDataForTransfer(messages.value)
      }
    } catch (error) {
      console.error('找一找模式失败:', error)
      const errorMessage: SystemMessage = {
        id: uuidv4(),
        role: 'system',
        content: '抱歉，找一找失败，请稍后重试。',
        timestamp: Date.now()
      }
      messages.value.push(markRaw(errorMessage))

      // 记录错误性能数据
      const duration = performance.now() - startTime
      performanceMetrics.value.errorCount++
      await window.electronAPI.rag.trackRAGPerformance(
        currentSessionId.value!,
        'findNotes',
        duration,
        {
          success: false,
          error: String(error)
        }
      )

      throw error
    } finally {
      isProcessing.value = false
    }
  }

  // 添加初始化向量化方法
  const initializeEmbeddings = async () => {
    if (isInitializingEmbeddings.value) return

    try {
      isInitializingEmbeddings.value = true
      const result = await window.electronAPI.rag.initializeEmbeddings()
      embeddingsProgress.value = result
    } catch (error) {
      console.error('初始化向量化失败:', error)
      throw error
    } finally {
      isInitializingEmbeddings.value = false
    }
  }

  // 添加新的 action 来记录已显示的消息
  const markMessageAsDisplayed = (messageId: string) => {
    displayedMessageIds.value.add(messageId)
  }

  return {
    messages,
    isProcessing,
    currentContext,
    sendMessage,
    loadHistory,
    clearMessages,
    chatHistory,
    updateHistoryTitle,
    toggleHistoryPin,
    deleteHistory,
    clearAllHistory,
    loadHistoryChat,
    startNewChat,
    continueHistoryChat,
    isLoadingHistory,
    currentSessionStartTime,
    cleanupExpiredSessions,
    sendMessageWithReference,
    generateWriting,
    brainstorm,
    analyzeContent,
    searchContent,
    handleAskQuestion,
    handleChat,
    handleFindNotes,
    isInitializingEmbeddings,
    embeddingsProgress,
    initializeEmbeddings,
    markMessageAsDisplayed,
    displayedMessageIds
  }
})
