import { defineStore } from 'pinia'
import { ref, markRaw } from 'vue' // 添加 markRaw
import type {
  ChatMessage,
  UserMessage,
  SystemMessage,
  RAGContext,
  RAGHistoryRecord,
  AIAssistantMessage
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

  const sendMessage = async (content: string) => {
    try {
      isProcessing.value = true

      // 1. 如果是新对话，生成新的会话ID
      if (!currentSessionId.value) {
        currentSessionId.value = uuidv4()
      }

      // 2. 立即添加用户消息
      const userMessage: UserMessage = markRaw({
        id: uuidv4(),
        role: 'user',
        content,
        timestamp: Date.now()
      })
      messages.value.push(userMessage)

      // 3. 准备发送给后端的数据 - 确保数据是可序列化的
      const messagesToSend = JSON.parse(JSON.stringify(messages.value.slice(0, -1)))
      const contextsToSend = JSON.parse(JSON.stringify(contexts.value))

      // 4. 调用后端生成回答，传入 sessionId
      const { context, answer } = await window.electronAPI.generateAnswer(
        content,
        currentSessionId.value,
        messagesToSend,
        contextsToSend
      )

      // 5. 添加AI回复
      const assistantMessage: AIAssistantMessage = markRaw({
        id: uuidv4(),
        role: 'assistant',
        content: answer,
        timestamp: Date.now(),
        sourceType: context.relevantDocs.length > 0 ? 'notes' : 'ai',
        references: context.relevantDocs.length > 0 ? context.relevantDocs : undefined
      })
      messages.value.push(assistantMessage)

      // 6. 更新上下文
      currentContext.value = markRaw(context)
      contexts.value = markRaw([...contexts.value, context]) as RAGContext[]

      // 7. 更新历史记录 - 确保发送可序列化的数据
      await window.electronAPI.updateRAGHistory({
        sessionId: currentSessionId.value,
        messages: JSON.parse(JSON.stringify(messages.value)),
        contexts: JSON.parse(JSON.stringify(contexts.value))
      })
    } catch (error) {
      console.error('发送消息失败:', error)
      const errorMessage: SystemMessage = markRaw({
        id: uuidv4(),
        role: 'system',
        content: '抱歉，生成回答时出现错误，请稍后重试。',
        timestamp: Date.now()
      })
      messages.value.push(errorMessage)
      throw error
    } finally {
      isProcessing.value = false
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
    currentSessionStartTime
  }
})
