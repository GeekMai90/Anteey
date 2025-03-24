import { ipcMain } from 'electron'
import {
  handleChatRequest,
  abortChatRequest,
  listConversations,
  getConversationDetail,
  updateConversationStatus,
  deleteConversation
} from '../../services/aiChat/aiChatService'
import { ConversationStatus } from '@shared/types/ai-chat'
import type { ChatRequest } from '@shared/types/ai-chat'

export function setupAIChatHandlers() {
  // 发送聊天请求
  ipcMain.handle('send-chat-request', async (_event, request: ChatRequest) => {
    try {
      const response = await handleChatRequest(request)
      return { success: true, response }
    } catch (error) {
      console.error('主进程→ 处理聊天请求失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 中断当前请求
  ipcMain.handle('abort-chat-request', async () => {
    try {
      abortChatRequest()
      return { success: true }
    } catch (error) {
      console.error('主进程→ 中断聊天请求失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 获取会话列表
  ipcMain.handle(
    'list-conversations',
    async (
      _event,
      {
        status = ConversationStatus.ACTIVE,
        page = 1,
        pageSize = 20
      }: {
        status?: ConversationStatus
        page?: number
        pageSize?: number
      }
    ) => {
      try {
        const result = await listConversations(status, page, pageSize)
        return { success: true, ...result }
      } catch (error) {
        console.error('主进程→ 获取会话列表失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )

  // 获取会话详情
  ipcMain.handle('get-conversation-detail', async (_event, id: string) => {
    try {
      const conversation = await getConversationDetail(id)
      return { success: true, conversation }
    } catch (error) {
      console.error('主进程→ 获取会话详情失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 更新会话状态（归档/激活）
  ipcMain.handle(
    'update-conversation-status',
    async (_event, { id, status }: { id: string; status: ConversationStatus }) => {
      try {
        await updateConversationStatus(id, status)
        return { success: true }
      } catch (error) {
        console.error('主进程→ 更新会话状态失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )

  // 删除会话
  ipcMain.handle('delete-conversation', async (_event, id: string) => {
    try {
      await deleteConversation(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除会话失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 流式响应处理
  ipcMain.handle('send-stream-chat-request', async (_event, request: ChatRequest) => {
    try {
      // 获取发送事件的窗口
      const window = _event.sender

      const response = await handleChatRequest(request)

      // 通过 webContents.send 发送流式数据
      window.send('chat-stream-response', {
        type: 'content',
        data: response.content
      })

      // 发送完成信号
      window.send('chat-stream-response', {
        type: 'done',
        messageId: response.messageId
      })

      return { success: true }
    } catch (error) {
      console.error('主进程→ 处理流式聊天请求失败:', error)

      // 发送错误信号
      _event.sender.send('chat-stream-response', {
        type: 'error',
        error: error instanceof Error ? error.message : String(error)
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })
}
