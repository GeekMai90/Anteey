// src/main/ipc/ragIpcHandlers.ts
import { ipcMain } from 'electron'
import {
  retrieveContext,
  generateAnswer,
  getRAGHistory,
  getRAGHistoryDetail,
  updateRAGHistoryTitle,
  toggleRAGHistoryPin,
  deleteRAGHistory,
  clearAllRAGHistory,
  updateRAGHistory
} from '../../db/ragService'
import log from 'electron-log'
import { ChatMessage, RAGContext } from '@renderer/types/assistant'

export function setupRAGHandlers() {
  // 检索相关上下文
  ipcMain.handle('retrieve-context', async (_event, query: string) => {
    try {
      const context = await retrieveContext(query)
      return { success: true, context }
    } catch (error) {
      log.error('主进程→ 检索上下文失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 生成回答 - 更新参数
  ipcMain.handle(
    'generate-answer',
    async (
      _event,
      {
        query,
        sessionId,
        currentMessages,
        currentContexts
      }: {
        query: string
        sessionId: string | null
        currentMessages: ChatMessage[]
        currentContexts: RAGContext[]
      }
    ) => {
      try {
        const result = await generateAnswer(query, sessionId, currentMessages, currentContexts)
        return { success: true, ...result }
      } catch (error) {
        log.error('主进程→ 生成回答失败:', error)
        throw error
      }
    }
  )

  // 更新或保存历史记录
  ipcMain.handle(
    'update-rag-history',
    async (
      _event,
      {
        sessionId,
        messages,
        contexts
      }: {
        sessionId: string
        messages: ChatMessage[]
        contexts: RAGContext[]
      }
    ) => {
      try {
        await updateRAGHistory(sessionId, messages, contexts)
        return { success: true }
      } catch (error) {
        log.error('主进程→ 更新RAG历史失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )
  // 更新历史记录标题
  ipcMain.handle('update-rag-history-title', async (_event, id: string, title: string) => {
    try {
      await updateRAGHistoryTitle(id, title)
      return { success: true }
    } catch (error) {
      log.error('主进程→ 更新RAG历史标题失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新置顶状态
  ipcMain.handle('toggle-rag-history-pin', async (_event, id: string) => {
    try {
      await toggleRAGHistoryPin(id)
      return { success: true }
    } catch (error) {
      log.error('主进程→ 更新RAG历史置顶状态失败:', error)
      return { success: false, error: String(error) }
    }
  })
  // 删除历史记录
  ipcMain.handle('delete-rag-history', async (_event, id: string) => {
    try {
      await deleteRAGHistory(id)
      return { success: true }
    } catch (error) {
      log.error('主进程→ 删除RAG历史失败:', error)
      return { success: false, error: String(error) }
    }
  })
  // 清空所有历史记录
  ipcMain.handle('clear-all-rag-history', async () => {
    try {
      await clearAllRAGHistory()
      return { success: true }
    } catch (error) {
      log.error('主进程→ 清空RAG历史失败:', error)
      return { success: false, error: String(error) }
    }
  })
  // 获取历史记录列表 - 返回类型会自动更新
  ipcMain.handle('get-rag-history', async () => {
    try {
      const history = await getRAGHistory()
      return { success: true, history }
    } catch (error) {
      log.error('主进程→ 获取RAG历史失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取单条历史记录详情 - 返回类型会自动更新
  ipcMain.handle('get-rag-history-detail', async (_event, id: string) => {
    try {
      const detail = await getRAGHistoryDetail(id)
      return { success: true, detail }
    } catch (error) {
      log.error('主进程→ 获取RAG历史详情失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
