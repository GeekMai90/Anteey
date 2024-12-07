import { ipcMain } from 'electron'
import {
  getTimeBlockDay,
  updateTimeBlock,
  updateTimeBlockDayStatus,
  getTimeBlockSettings,
  updateTimeBlockSettings
} from '../../services/timeBlockService'

export function setupTimeBlockHandlers() {
  // 获取某天的时间块数据
  ipcMain.handle('getTimeBlockDay', async (_event, date: string) => {
    try {
      const day = await getTimeBlockDay(date)
      return { success: true, day }
    } catch (error) {
      console.error('主进程→ 获取时间块数据失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新时间块内容
  ipcMain.handle(
    'updateTimeBlock',
    async (_event, dayId: string, hour: number, content: string) => {
      try {
        await updateTimeBlock(dayId, hour, content)
        return { success: true }
      } catch (error) {
        console.error('主进程→ 更新时间块内容失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 更新天气和心情
  ipcMain.handle(
    'updateTimeBlockDayStatus',
    async (_event, id: string, data: { weather?: string; mood?: string }) => {
      try {
        await updateTimeBlockDayStatus(id, data)
        return { success: true }
      } catch (error) {
        console.error('主进程→ 更新时间块状态失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取时间块设置
  ipcMain.handle('getTimeBlockSettings', async () => {
    try {
      const settings = await getTimeBlockSettings()
      return { success: true, settings }
    } catch (error) {
      console.error('主进程→ 获取时间块设置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新时间块设置
  ipcMain.handle(
    'updateTimeBlockSettings',
    async (_event, settings: { enabled?: boolean; startTime?: number; endTime?: number }) => {
      try {
        const updatedSettings = await updateTimeBlockSettings(settings)
        return { success: true, settings: updatedSettings }
      } catch (error) {
        console.error('主进程→ 更新时间块设置失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )
}
