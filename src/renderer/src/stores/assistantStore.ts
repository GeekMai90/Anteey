// src/renderer/src/stores/assistantStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AssistantMessage } from '../types/assistant'
import type { RAGContext } from '../types/RAG'
import { v4 as uuidv4 } from 'uuid'

export const useAssistantStore = defineStore('assistant', () => {
  const messages = ref<AssistantMessage[]>([])
  const isProcessing = ref(false)
  const currentContext = ref<RAGContext | null>(null)

  const sendMessage = async (content: string) => {
    try {
      isProcessing.value = true

      // 1. 添加用户消息
      const userMessage: AssistantMessage = {
        id: uuidv4(),
        role: 'user',
        content,
        timestamp: Date.now()
      }
      messages.value.push(userMessage)

      // 2. 生成 AI 回复
      const answer = await window.electronAPI.generateAnswer(content)

      // 3. 添加助手回复
      const assistantMessage: AssistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: answer,
        timestamp: Date.now()
      }
      messages.value.push(assistantMessage)
    } catch (error) {
      console.error('发送消息失败:', error)
      // 添加错误消息
      messages.value.push({
        id: uuidv4(),
        role: 'system',
        content: '抱歉，生成回答时出现错误，请稍后重试。',
        timestamp: Date.now()
      })
      throw error
    } finally {
      isProcessing.value = false
    }
  }

  // 获取历史对话
  const loadHistory = async (limit: number = 10) => {
    try {
      const history = await window.electronAPI.getHistory(limit)
      // TODO: 处理历史记录
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
