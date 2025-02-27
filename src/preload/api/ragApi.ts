// src/preload/api/ragApi.ts
import { ipcRenderer } from 'electron'
import type { RAGContext } from '@shared/types'
import { ChatMessage, ChatSession, AssistantNoteReference, RAGHistoryRecord } from '@shared/types'
import { RAGPerformanceData } from '../../services/rag/ragService'
import { LLMError } from '@shared/types'

export const ragApi = {
  // 检索相关上下文 - 支持会话
  retrieveContext: async (query: string, session?: ChatSession): Promise<RAGContext> => {
    try {
      const result = await ipcRenderer.invoke('retrieve-context', { query, session })
      if (!result.success) throw new Error(result.error)
      return result.context
    } catch (error) {
      console.error('预加载脚本 → 检索上下文失败:', error)
      throw error
    }
  },

  // 生成 AI 回答 - 支持会话和上下文
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
      console.log('预加载脚本 - 生成回答:', {
        query,
        sessionId,
        messagesCount: currentMessages.length,
        contextsCount: currentContexts.length
      })

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

  // 更新历史记录 - 支持元数据
  updateRAGHistory: async (params: {
    sessionId: string
    messages: ChatMessage[]
    contexts: RAGContext[]
    metadata?: any
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
  },
  // 添加新的批量操作方法
  batchGetRAGHistory: async (ids: string[]): Promise<(RAGHistoryRecord | null)[]> => {
    try {
      const result = await ipcRenderer.invoke('batch-get-rag-history', ids)
      if (!result.success) throw new Error(result.error)
      return result.details
    } catch (error) {
      console.error('预加载脚本 → 批量获取RAG历史失败:', error)
      throw error
    }
  },

  // 添加会话清理方法
  cleanupExpiredSessions: async (): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('cleanup-expired-sessions')
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 清理过期会话失败:', error)
      throw error
    }
  },

  // 添加重试装饰器
  withRetry: <T>(fn: () => Promise<T>, retries = 3, delay = 1000): (() => Promise<T>) => {
    return async () => {
      let lastError: Error | null = null
      for (let i = 0; i < retries; i++) {
        try {
          return await fn()
        } catch (error) {
          lastError = error as Error
          if (i < retries - 1) {
            await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)))
          }
        }
      }
      throw lastError
    }
  },

  // 性能监控
  trackRAGPerformance: async (data: RAGPerformanceData): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('track-rag-performance', data)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 性能监控失败:', error)
      throw error
    }
  },

  // 生成带引用回答
  generateAnswerWithReferences: async (
    query: string,
    noteReferences: AssistantNoteReference[],
    sessionId: string | null,
    currentMessages: ChatMessage[] = [],
    currentContexts: RAGContext[] = []
  ): Promise<{
    answer: string
    context: RAGContext
    messages: ChatMessage[]
  }> => {
    try {
      console.log('预加载脚本 - 生成带引用回答:', {
        query,
        sessionId,
        referencesCount: noteReferences.length,
        messagesCount: currentMessages.length,
        contextsCount: currentContexts.length
      })

      const result = await ipcRenderer.invoke('generate-answer-with-references', {
        query,
        noteReferences,
        sessionId,
        currentMessages,
        currentContexts
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      return result
    } catch (error) {
      console.error('预加载脚本 → 生成带引用回答失败:', error)
      throw error
    }
  },
  // 问一问模式
  handleAskQuestion: async (
    query: string,
    noteReferences: AssistantNoteReference[] = [],
    sessionId: string | null = null,
    currentMessages: ChatMessage[] = [],
    currentContexts: RAGContext[] = [],
    deepseekConfig?: {
      temperature?: number
      maxTokens?: number
    }
  ): Promise<{
    answer: string
    context: RAGContext
    messages: ChatMessage[]
    error?: LLMError
  }> => {
    try {
      const result = await ipcRenderer.invoke('handle-ask-question', {
        query,
        noteReferences,
        sessionId,
        currentMessages,
        currentContexts,
        deepseekConfig
      })

      if (!result.success) {
        if (result.error?.code) {
          return result
        }
        throw new Error(result.error)
      }

      return result
    } catch (error) {
      console.error('预加载脚本 → 问一问模式失败:', error)
      throw error
    }
  },
  // 聊一聊模式
  handleChat: async (
    query: string,
    sessionId: string | null = null,
    currentMessages: ChatMessage[] = [],
    currentContexts: RAGContext[] = [],
    deepseekConfig?: {
      temperature?: number
      maxTokens?: number
    }
  ): Promise<{
    answer: string
    context: RAGContext
    messages: ChatMessage[]
    error?: LLMError
  }> => {
    try {
      const result = await ipcRenderer.invoke('handle-chat', {
        query,
        sessionId,
        currentMessages,
        currentContexts,
        deepseekConfig
      })

      if (!result.success) {
        if (result.error?.code) {
          return result
        }
        throw new Error(result.error)
      }

      return result
    } catch (error) {
      console.error('预加载脚本 → 聊一聊模式失败:', error)
      throw error
    }
  },
  // 找一找模式
  handleFindNotes: async (
    query: string,
    sessionId: string | null,
    currentMessages: ChatMessage[] = [],
    currentContexts: RAGContext[] = [],
    deepseekConfig?: {
      temperature?: number
      maxTokens?: number
    }
  ) => {
    try {
      const result = await ipcRenderer.invoke('handle-find-notes', {
        query,
        sessionId,
        currentMessages,
        currentContexts,
        deepseekConfig
      })
      if (!result.success) throw new Error(result.error)
      return result
    } catch (error) {
      console.error('预加载脚本 → 找一找模式失败:', error)
      throw error
    }
  },
  // 添加初始化向量化方法
  initializeEmbeddings: async (): Promise<{
    total: number
    processed: number
  }> => {
    try {
      const result = await ipcRenderer.invoke('initialize-embeddings')
      if (!result.success) throw new Error(result.error)
      return {
        total: result.total,
        processed: result.processed
      }
    } catch (error) {
      console.error('预加载脚本 → 初始化向量化失败:', error)
      throw error
    }
  }
}
