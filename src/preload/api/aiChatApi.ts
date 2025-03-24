import { ipcRenderer } from 'electron'
import type { ChatRequest, ChatResponse, ConversationStatus } from '@shared/types/ai-chat'

export const aiChatApi = {
  // 发送聊天请求
  sendChatRequest: async (request: ChatRequest): Promise<ChatResponse> => {
    try {
      const result = await ipcRenderer.invoke('send-chat-request', request)
      if (!result.success) throw new Error(result.error)
      return result.response
    } catch (error) {
      console.error('预加载脚本 → 发送聊天请求失败:', error)
      throw error
    }
  },

  // 中断当前请求
  abortChatRequest: async (): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('abort-chat-request')
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 中断聊天请求失败:', error)
      throw error
    }
  },

  // 获取会话列表
  listConversations: async (params?: {
    status?: ConversationStatus
    page?: number
    pageSize?: number
  }) => {
    try {
      const result = await ipcRenderer.invoke('list-conversations', params || {})
      if (!result.success) throw new Error(result.error)
      return {
        conversations: result.conversations,
        total: result.total
      }
    } catch (error) {
      console.error('预加载脚本 → 获取会话列表失败:', error)
      throw error
    }
  },

  // 获取会话详情
  getConversationDetail: async (id: string) => {
    try {
      const result = await ipcRenderer.invoke('get-conversation-detail', id)
      if (!result.success) throw new Error(result.error)
      return result.conversation
    } catch (error) {
      console.error('预加载脚本 → 获取会话详情失败:', error)
      throw error
    }
  },

  // 更新会话状态
  updateConversationStatus: async (id: string, status: ConversationStatus): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('update-conversation-status', { id, status })
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 更新会话状态失败:', error)
      throw error
    }
  },

  // 删除会话
  deleteConversation: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-conversation', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除会话失败:', error)
      throw error
    }
  },

  // 发送流式聊天请求
  sendStreamChatRequest: async (
    request: ChatRequest,
    callbacks: {
      onContent: (content: string) => void
      onDone: (messageId: string) => void
      onError: (error: string) => void
    }
  ): Promise<void> => {
    try {
      // 设置监听器
      const streamListener = (_event: any, data: any) => {
        switch (data.type) {
          case 'content':
            callbacks.onContent(data.data)
            break
          case 'done':
            callbacks.onDone(data.messageId)
            // 移除监听器
            ipcRenderer.removeListener('chat-stream-response', streamListener)
            break
          case 'error':
            callbacks.onError(data.error)
            // 移除监听器
            ipcRenderer.removeListener('chat-stream-response', streamListener)
            break
        }
      }

      // 添加监听器
      ipcRenderer.on('chat-stream-response', streamListener)

      // 发送请求
      const result = await ipcRenderer.invoke('send-stream-chat-request', request)
      if (!result.success) {
        // 移除监听器
        ipcRenderer.removeListener('chat-stream-response', streamListener)
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('预加载脚本 → 发送流式聊天请求失败:', error)
      throw error
    }
  }
}
