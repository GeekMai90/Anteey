// src/preload/api/ragApi.ts
import { ipcRenderer } from 'electron'
import type { RAGContext } from '../../renderer/src/types/RAG'
import { ChatMessage, RAGHistoryRecord } from '@renderer/types/assistant'

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

  // 生成 AI 回答 - 更新以支持会话ID和消息历史
  generateAnswer: async (
    query: string,
    sessionId: string | null,
    currentMessages: ChatMessage[] = [],
    currentContexts: RAGContext[] = []
  ): Promise<{
    answer: string
    context: RAGContext
    messages: ChatMessage[]
  }> => {
    try {
      const result = await ipcRenderer.invoke('generate-answer', {
        query,
        sessionId,
        currentMessages,
        currentContexts
      })
      if (!result.success) throw new Error(result.error)
      return result
    } catch (error) {
      console.error('预加载脚本 → 生成回答失败:', error)
      throw error
    }
  },

  // 更新历史记录
  updateRAGHistory: async (params: {
    sessionId: string
    messages: ChatMessage[]
    contexts: RAGContext[]
  }): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('update-rag-history', params)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 更新历史记录失败:', error)
      throw error
    }
  },
  // 更新历史记录标题
  updateRAGHistoryTitle: async (id: string, title: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('update-rag-history-title', id, title)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 更新RAG历史标题失败:', error)
      throw error
    }
  },
  // 更新置顶状态
  toggleRAGHistoryPin: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('toggle-rag-history-pin', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 更新RAG历史置顶状态失败:', error)
      throw error
    }
  },
  // 删除历史记录
  deleteRAGHistory: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-rag-history', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除RAG历史失败:', error)
      throw error
    }
  },
  // 清空所有历史记录
  clearAllRAGHistory: async (): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('clear-all-rag-history')
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 清空RAG历史失败:', error)
      throw error
    }
  },
  // 获取历史记录 - 返回类型更新
  getRAGHistory: async (): Promise<RAGHistoryRecord[]> => {
    try {
      const result = await ipcRenderer.invoke('get-rag-history')
      if (!result.success) throw new Error(result.error)
      return result.history
    } catch (error) {
      console.error('预加载脚本 → 获取RAG历史失败:', error)
      throw error
    }
  },
  // 获取单条历史记录详情 - 返回类型更新
  getRAGHistoryDetail: async (id: string): Promise<RAGHistoryRecord | null> => {
    try {
      const result = await ipcRenderer.invoke('get-rag-history-detail', id)
      if (!result.success) throw new Error(result.error)
      return result.detail
    } catch (error) {
      console.error('预加载脚本 → 获取RAG历史详情失败:', error)
      throw error
    }
  }
}
