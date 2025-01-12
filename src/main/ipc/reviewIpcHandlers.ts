import { ipcMain } from 'electron'
import { getReviewData } from '../../services/widget/reviewService'

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
}
