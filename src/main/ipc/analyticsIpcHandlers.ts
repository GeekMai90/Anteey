import { ipcMain } from 'electron'
import {
  getHeatmapData,
  getLastDayNoteCount,
  getNoteCount,
  getUserUsageDays
} from '../../services/notes/analyticsService'

export function setupAnalyticsHandlers() {
  // 获取热力图数据
  ipcMain.handle('get-heatmap-data', async () => {
    try {
      const result = await getHeatmapData()
      return result
    } catch (error) {
      console.error('主进程 → 获取热力图数据失败:', error)
      throw error
    }
  })

  // 获取笔记总数量
  ipcMain.handle('get-note-count', async () => {
    try {
      const result = await getNoteCount()
      return result
    } catch (error) {
      console.error('主进程 → 获取笔记数量失败:', error)
      throw error
    }
  })

  // 获取昨日笔记数量
  ipcMain.handle('get-last-day-note-count', async () => {
    try {
      const result = await getLastDayNoteCount()
      return result
    } catch (error) {
      console.error('主进程 → 获取昨日笔记数量失败:', error)
      throw error
    }
  })

  // 获取用户使用天数
  ipcMain.handle('get-user-usage-days', async () => {
    try {
      const result = await getUserUsageDays()
      return result
    } catch (error) {
      console.error('主进程 → 获取用户使用天数失败:', error)
      throw error
    }
  })
}
