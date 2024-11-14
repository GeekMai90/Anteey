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
  NoteReference
} from '../types/assistant'
import { v4 as uuidv4 } from 'uuid'

export const useAssistantStore = defineStore('assistant', () => {
  const messages = ref<ChatMessage[]>([])
  const isProcessing = ref(false)
  const currentContext = ref<RAGContext | null>(null)
  const contexts = ref<RAGContext[]>([]) // 新增：存储所有上下文
  const chatHistory = ref<RAGHistoryRecord[]>([])
  const currentSessionId = ref<string | null>(null) // 新增：当前会话ID
  const currentSessionStartTime = ref<number | null>(null) // 新增：当前会话开始时间
  const isLoadingHistory = ref(false) // 新增：是否正在加载历史记录

  // const sendMessage = async (content: string) => {
  //   try {
  //     isProcessing.value = true

  //     // 1. 如果是新对话，生成新的会话ID
  //     if (!currentSessionId.value) {
  //       currentSessionId.value = uuidv4()
  //     }

  //     // 2. 立即添加用户消息
  //     const userMessage: UserMessage = markRaw({
  //       id: uuidv4(),
  //       role: 'user',
  //       content,
  //       timestamp: Date.now()
  //     })
  //     messages.value.push(userMessage)

  //     const messagesToSend = JSON.parse(JSON.stringify(messages.value.slice(0, -1)))
  //     const contextsToSend = JSON.parse(JSON.stringify(contexts.value))

  //     // 3. 调用后端生成回答，传入 sessionId
  //     const { context, answer } = await window.electronAPI.generateAnswer(
  //       content,
  //       currentSessionId.value, // 添加 sessionId
  //       messagesToSend,
  //       contextsToSend
  //     )

  //     // 4. 添加AI回复
  //     const assistantMessage: AIAssistantMessage = markRaw({
  //       id: uuidv4(),
  //       role: 'assistant',
  //       content: answer,
  //       timestamp: Date.now(),
  //       sourceType: context.relevantDocs.length > 0 ? 'notes' : 'ai',
  //       references: context.relevantDocs.length > 0 ? context.relevantDocs : undefined
  //     })
  //     messages.value.push(assistantMessage)

  //     // 5. 更新上下文
  //     currentContext.value = markRaw(context)
  //     contexts.value = markRaw([...contexts.value, context]) as RAGContext[]

  //     // 6. 更新历史记录
  //     await window.electronAPI.updateRAGHistory({
  //       sessionId: currentSessionId.value, // 修改为 sessionId
  //       messages: messages.value,
  //       contexts: contexts.value
  //     })
  //   } catch (error) {
  //     console.error('发送消息失败:', error)
  //     const errorMessage: SystemMessage = markRaw({
  //       id: uuidv4(),
  //       role: 'system',
  //       content: '抱歉，生成回答时出现错误，请稍后重试。',
  //       timestamp: Date.now()
  //     })
  //     messages.value.push(errorMessage)
  //     throw error
  //   } finally {
  //     isProcessing.value = false
  //   }
  // }

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
  // const sendMessage = async (content: string) => {
  //   try {
  //     isProcessing.value = true

  //     // 1. 如果是新对话，生成新的会话ID
  //     if (!currentSessionId.value) {
  //       currentSessionId.value = uuidv4()
  //     }

  //     // 2. 立即添加用户消息
  //     const userMessage: UserMessage = markRaw({
  //       id: uuidv4(),
  //       role: 'user',
  //       content,
  //       timestamp: Date.now()
  //     })
  //     messages.value.push(userMessage)

  //     // 3. 准备发送给后端的数据 - 确保数据是可序列化的
  //     const messagesToSend = JSON.parse(JSON.stringify(messages.value.slice(0, -1)))
  //     const contextsToSend = JSON.parse(JSON.stringify(contexts.value))

  //     // 4. 调用后端生成回答，传入 sessionId
  //     const { context, answer } = await window.electronAPI.generateAnswer(
  //       content,
  //       currentSessionId.value,
  //       messagesToSend,
  //       contextsToSend
  //     )

  //     // 5. 添加AI回复
  //     const assistantMessage: AIAssistantMessage = markRaw({
  //       id: uuidv4(),
  //       role: 'assistant',
  //       content: answer,
  //       timestamp: Date.now(),
  //       sourceType: context.relevantDocs.length > 0 ? 'notes' : 'ai',
  //       references: context.relevantDocs.length > 0 ? context.relevantDocs : undefined
  //     })
  //     messages.value.push(assistantMessage)

  //     // 6. 更新上下文
  //     currentContext.value = markRaw(context)
  //     contexts.value = markRaw([...contexts.value, context]) as RAGContext[]

  //     // 7. 更新历史记录 - 确保发送可序列化的数据
  //     await window.electronAPI.updateRAGHistory({
  //       sessionId: currentSessionId.value,
  //       messages: JSON.parse(JSON.stringify(messages.value)),
  //       contexts: JSON.parse(JSON.stringify(contexts.value))
  //     })
  //   } catch (error) {
  //     console.error('发送消息失败:', error)
  //     const errorMessage: SystemMessage = markRaw({
  //       id: uuidv4(),
  //       role: 'system',
  //       content: '抱歉，生成回答时出现错误，请稍后重试。',
  //       timestamp: Date.now()
  //     })
  //     messages.value.push(errorMessage)
  //     throw error
  //   } finally {
  //     isProcessing.value = false
  //   }
  // }

  // const sendMessage = async (content: string) => {
  //   const startTime = performance.now()
  //   try {
  //     isProcessing.value = true

  //     // 1. 会话管理
  //     if (!currentSessionId.value) {
  //       currentSessionId.value = uuidv4()
  //       currentSession.value = {
  //         id: currentSessionId.value,
  //         messages: [],
  //         currentContext: undefined,
  //         metadata: {
  //           startTime: new Date().toISOString(),
  //           lastUpdateTime: new Date().toISOString(),
  //           messageCount: 0,
  //           hasReferences: false
  //         }
  //       }
  //     }

  //     // 2. 添加用户消息
  //     const userMessage: UserMessage = markRaw({
  //       id: uuidv4(),
  //       role: 'user',
  //       content,
  //       timestamp: Date.now()
  //     })
  //     messages.value.push(userMessage)

  //     // 3. 准备发送数据
  //     const messagesToSend = JSON.parse(JSON.stringify(messages.value.slice(0, -1)))
  //     const contextsToSend = JSON.parse(JSON.stringify(contexts.value))

  //     // 4. 生成回答
  //     // 4. 生成回答
  //     const { context, answer } = await window.electronAPI.generateAnswer(
  //       // 注意这里改用 ragApi
  //       content, // 直接传递字符串
  //       currentSessionId.value,
  //       messagesToSend,
  //       contextsToSend
  //     )

  //     // 5. 添加AI回复
  //     const assistantMessage: AIAssistantMessage = markRaw({
  //       id: uuidv4(),
  //       role: 'assistant',
  //       content: answer,
  //       timestamp: Date.now(),
  //       sourceType: context.relevantDocs.length > 0 ? 'notes' : 'ai',
  //       references: context.relevantDocs.length > 0 ? context.relevantDocs : undefined
  //     })
  //     messages.value.push(assistantMessage)

  //     // 6. 更新上下文
  //     currentContext.value = markRaw(context)
  //     contexts.value = markRaw([...contexts.value, context]) as RAGContext[]

  //     // 7. 更新会话状态
  //     if (currentSession.value) {
  //       currentSession.value.messages = messages.value
  //       currentSession.value.currentContext = currentContext.value
  //       currentSession.value.metadata.messageCount += 2
  //       currentSession.value.metadata.lastUpdateTime = new Date().toISOString()
  //       currentSession.value.metadata.hasReferences = context.relevantDocs.length > 0
  //     }

  //     // 8. 更新历史记录
  //     await window.electronAPI.updateRAGHistory({
  //       sessionId: currentSessionId.value,
  //       messages: JSON.parse(JSON.stringify(messages.value)),
  //       contexts: JSON.parse(JSON.stringify(contexts.value)),
  //       metadata: currentSession.value?.metadata
  //     })

  //     // 9. 更新性能指标
  //     const duration = performance.now() - startTime
  //     updatePerformanceMetrics(duration)

  //     // 10. 记录性能数据
  //     await window.electronAPI.trackRAGPerformance(
  //       currentSessionId.value!,
  //       'sendMessage',
  //       duration,
  //       {
  //         success: true,
  //         metadata: {
  //           messageLength: content.length,
  //           hasReferences: context.relevantDocs.length > 0
  //         }
  //       }
  //     )
  //   } catch (error) {
  //     console.error('发送消息失败:', error)
  //     const errorMessage: SystemMessage = markRaw({
  //       id: uuidv4(),
  //       role: 'system',
  //       content: '抱歉，生成回答时出现错误，请稍后重试。',
  //       timestamp: Date.now()
  //     })
  //     messages.value.push(errorMessage)

  //     // 记录错误性能数据
  //     const duration = performance.now() - startTime
  //     performanceMetrics.value.errorCount++
  //     await window.electronAPI.trackRAGPerformance(
  //       currentSessionId.value!,
  //       'sendMessage',
  //       duration,
  //       {
  //         success: false,
  //         error: String(error)
  //       }
  //     )

  //     throw error
  //   } finally {
  //     isProcessing.value = false
  //   }
  // }

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
      const result = await window.electronAPI.generateAnswer(
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
      await window.electronAPI.updateRAGHistory({
        sessionId: currentSessionId.value,
        messages: prepareDataForTransfer(messages.value),
        contexts: prepareDataForTransfer(contexts.value),
        metadata: prepareDataForTransfer(currentSession.value?.metadata)
      })

      // 9. 更新性能指标
      const duration = performance.now() - startTime
      updatePerformanceMetrics(duration)

      // 10. 记录性能数据
      await window.electronAPI.trackRAGPerformance(
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
      await window.electronAPI.trackRAGPerformance(
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

  const sendMessageWithReference = async (content: string, noteReferences: NoteReference[]) => {
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
      const result = await window.electronAPI.generateAnswerWithReferences(
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
      await window.electronAPI.updateRAGHistory({
        sessionId: currentSessionId.value,
        messages: prepareDataForTransfer(messages.value),
        contexts: prepareDataForTransfer(contexts.value),
        metadata: prepareDataForTransfer(currentSession.value?.metadata)
      })

      // 9. 更新性能指标
      const duration = performance.now() - startTime
      updatePerformanceMetrics(duration)

      // 10. 记录性能数据
      await window.electronAPI.trackRAGPerformance(
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
      await window.electronAPI.trackRAGPerformance(
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
      await window.electronAPI.cleanupExpiredSessions()
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
    currentSessionId.value = null // 重置会话ID
    currentSessionStartTime.value = null
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
      chatHistory.value = await window.electronAPI.getRAGHistory()
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
      await window.electronAPI.updateRAGHistoryTitle(id, title)
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
      await window.electronAPI.toggleRAGHistoryPin(id)
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
      await window.electronAPI.deleteRAGHistory(id)
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
      await window.electronAPI.clearAllRAGHistory()
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
      const historyDetail = await window.electronAPI.getRAGHistoryDetail(id)
      if (historyDetail) {
        // 清空当前对话
        clearMessages()

        // 直接使用保存的消息和上下文
        messages.value = historyDetail.messages
        contexts.value = historyDetail.contexts
        currentContext.value = contexts.value[contexts.value.length - 1] || null
        currentSessionId.value = id
        // 设置会话开始时间为最新消息的时间戳，这样所有历史消息都会立即显示
        const latestMessage = historyDetail.messages[historyDetail.messages.length - 1]
        currentSessionStartTime.value = latestMessage ? latestMessage.timestamp + 1 : Date.now()
      }
    } catch (error) {
      console.error('加载历史对话失败:', error)
      throw error
    }
  }
  // ==================问一问模式==================
  // 问一问模式
  const handleAskQuestion = async (content: string, noteReferences: NoteReference[] = []) => {
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
      const result = await window.electronAPI.handleAskQuestion(
        content,
        referencesToSend,
        currentSessionId.value,
        messagesToSend,
        contextsToSend
      )

      if (!result) {
        throw new Error('问一问失败：未收到响应')
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
      await window.electronAPI.updateRAGHistory({
        sessionId: currentSessionId.value,
        messages: prepareDataForTransfer(messages.value),
        contexts: prepareDataForTransfer(contexts.value),
        metadata: prepareDataForTransfer(currentSession.value?.metadata)
      })

      // 9. 更新性能指标
      const duration = performance.now() - startTime
      updatePerformanceMetrics(duration)

      // 10. 记录性能数据
      await window.electronAPI.trackRAGPerformance(
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
        timestamp: Date.now()
      }
      messages.value.push(markRaw(errorMessage))

      // 记录错误性能数据
      const duration = performance.now() - startTime
      performanceMetrics.value.errorCount++
      await window.electronAPI.trackRAGPerformance(
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
    handleAskQuestion
  }
})
