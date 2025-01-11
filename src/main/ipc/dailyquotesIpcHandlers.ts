import { ipcMain } from 'electron'
import {
  getTodayQuote,
  addQuote,
  getAllQuotes,
  deleteQuote,
  updateQuote
} from '../../services/widget/dailyquotesService'

export function setupDailyQuotesHandlers() {
  // 获取今日金句
  ipcMain.handle('get-today-quote', async () => {
    try {
      const quote = await getTodayQuote()
      return { success: true, quote }
    } catch (error) {
      console.error('主进程→ 获取今日金句失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 添加新金句
  ipcMain.handle(
    'add-quote',
    async (_event, { content, author }: { content: string; author: string }) => {
      try {
        const quote = await addQuote(content, author)
        return { success: true, quote }
      } catch (error) {
        console.error('主进程→ 添加金句失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取所有金句
  ipcMain.handle('get-all-quotes', async () => {
    try {
      const quotes = await getAllQuotes()
      return { success: true, quotes }
    } catch (error) {
      console.error('主进程→ 获取所有金句失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 删除金句
  ipcMain.handle('delete-quote', async (_event, id: string) => {
    try {
      await deleteQuote(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除金句失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新金句
  ipcMain.handle(
    'update-quote',
    async (_event, { id, data }: { id: string; data: { content?: string; author?: string } }) => {
      try {
        const quote = await updateQuote(id, data)
        return { success: true, quote }
      } catch (error) {
        console.error('主进程→ 更新金句失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )
}
