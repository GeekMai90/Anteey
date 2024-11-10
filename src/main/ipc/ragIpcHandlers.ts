// src/main/ipc/ragIpcHandlers.ts
import { ipcMain } from 'electron'
import { retrieveContext, generateAnswer, getRAGHistory } from '../../db/ragService'
import log from 'electron-log'

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

  // 生成 AI 回答
  ipcMain.handle('generate-answer', async (_event, query: string) => {
    try {
      const answer = await generateAnswer(query)
      return { success: true, answer }
    } catch (error) {
      log.error('主进程→ 生成回答失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取历史记录
  ipcMain.handle('get-rag-history', async (_event, limit?: number) => {
    try {
      const history = await getRAGHistory(limit)
      return { success: true, history }
    } catch (error) {
      log.error('主进程→ 获取RAG历史失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
