// src/preload/api/ragApi.ts
import { ipcRenderer } from 'electron'
import type { RAGContext } from '../../renderer/src/types/RAG'

export const ragApi = {
  // 检索相关上下文
  retrieveContext: async (query: string): Promise<RAGContext> => {
    try {
      const result = await ipcRenderer.invoke('retrieve-context', query)
      if (!result.success) throw new Error(result.error)
      return result.context
    } catch (error) {
      console.error('预加载脚本 → 检索上下文失败:', error)
      throw error
    }
  },

  // 生成 AI 回答
  generateAnswer: async (query: string): Promise<string> => {
    try {
      const result = await ipcRenderer.invoke('generate-answer', query)
      if (!result.success) throw new Error(result.error)
      return result.answer
    } catch (error) {
      console.error('预加载脚本 → 生成回答失败:', error)
      throw error
    }
  },

  // 获取历史记录
  getHistory: async (limit?: number): Promise<RAGContext[]> => {
    try {
      const result = await ipcRenderer.invoke('get-rag-history', limit)
      if (!result.success) throw new Error(result.error)
      return result.history
    } catch (error) {
      console.error('预加载脚本 → 获取RAG历史失败:', error)
      throw error
    }
  }
}
