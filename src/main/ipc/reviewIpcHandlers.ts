import { ipcMain } from 'electron'
import { getReviewData, getOneRandomNote } from '../../services/widget/reviewService'

export function setupReviewHandlers() {
  // 获取智能回顾数据
  ipcMain.handle('get-review-data', async () => {
    try {
      const data = await getReviewData()
      return { success: true, data }
    } catch (error) {
      console.error('主进程→ 获取智能回顾数据失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取单条随机笔记
  ipcMain.handle('get-one-random-note', async () => {
    try {
      const note = await getOneRandomNote()
      return { success: true, data: note }
    } catch (error) {
      console.error('主进程→ 获取单条随机笔记失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
