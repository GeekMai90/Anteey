import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  ChatMessage,
  UserMessage,
  AIAssistantMessage,
  SystemMessage,
  RAGContext
} from '../types/assistant'
import { v4 as uuidv4 } from 'uuid'

export const useAssistantStore = defineStore('assistant', () => {
  const messages = ref<ChatMessage[]>([])
  const isProcessing = ref(false)
  const currentContext = ref<RAGContext | null>(null)

  const sendMessage = async (content: string) => {
    try {
      isProcessing.value = true

      // 1. 添加用户消息
      const userMessage: UserMessage = {
        id: uuidv4(),
        role: 'user',
        content,
        timestamp: Date.now()
      }
      messages.value.push(userMessage)

      // 2. 调用后端生成回答（包含检索和生成）
      const { answer, context } = await window.electronAPI.generateAnswer(content)
      currentContext.value = context
      console.log('context', context)

      // 3. 添加助手回复
      const assistantMessage: AIAssistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: answer,
        timestamp: Date.now(),
        sourceType: context.relevantDocs.length > 0 ? 'notes' : 'ai',
        references: context.relevantDocs.length > 0 ? context.relevantDocs : undefined
      }
      messages.value.push(assistantMessage)
    } catch (error) {
      console.error('发送消息失败:', error)
      // 添加错误消息
      const errorMessage: SystemMessage = {
        id: uuidv4(),
        role: 'system',
        content: '抱歉，生成回答时出现错误，请稍后重试。',
        timestamp: Date.now()
      }
      messages.value.push(errorMessage)
      throw error
    } finally {
      isProcessing.value = false
    }
  }

  // 获取历史对话
  const loadHistory = async (limit: number = 10) => {
    try {
      const history = await window.electronAPI.getHistory(limit)
      return history
    } catch (error) {
      console.error('加载历史记录失败:', error)
      throw error
    }
  }

  // 清空对话
  const clearMessages = () => {
    messages.value = []
    currentContext.value = null
  }

  return {
    messages,
    isProcessing,
    currentContext,
    sendMessage,
    loadHistory,
    clearMessages
  }
})
