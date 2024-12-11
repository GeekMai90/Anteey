import { ipcMain } from 'electron'
import {
  getTimeBlockDay,
  updateTimeBlock,
  updateTimeBlockDayStatus,
  getTimeBlockSettings,
  updateTimeBlockSettings,
  getFutureLog,
  updateFutureLog,
  getMonthlyLog,
  updateMonthlyLog,
  getYearMonthlyLogs,
  searchTimeBlocks
} from '../../services/timeBlockService'
import log from '../logger'

export function setupTimeBlockHandlers() {
  // 获取某天的时间块数据
  ipcMain.handle('getTimeBlockDay', async (_event, date: string) => {
    try {
      const day = await getTimeBlockDay(date)
      return { success: true, day }
    } catch (error) {
      log.error('主进程→ 获取时间块数据失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新时间块内容
  ipcMain.handle(
    'updateTimeBlock',
    async (_event, dayId: string, hour: number, content: string) => {
      try {
        const blockId = await updateTimeBlock(dayId, hour, content)
        return { success: true, blockId }
      } catch (error) {
        log.error('主进程→ 更新时间块内容失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 更新时间块日期状态
  ipcMain.handle(
    'updateTimeBlockDayStatus',
    async (_event, id: string, data: { weather?: string; mood?: string }) => {
      try {
        await updateTimeBlockDayStatus(id, data)
        return { success: true }
      } catch (error) {
        log.error('主进程→ 更新时间块日期状态失败:', error)
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
      log.error('主进程→ 获取时间块设置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新时间块设置
  ipcMain.handle(
    'updateTimeBlockSettings',
    async (
      _event,
      settings: {
        enabled?: boolean
        startTime?: number
        endTime?: number
      }
    ) => {
      try {
        const updatedSettings = await updateTimeBlockSettings(settings)
        return { success: true, settings: updatedSettings }
      } catch (error) {
        log.error('主进程→ 更新时间块设置失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取未来日志
  ipcMain.handle('getFutureLog', async () => {
    try {
      const log = await getFutureLog()
      console.log('IPC: 获取到的未来日志:', log)
      return { success: true, log }
    } catch (error) {
      log.error('主进程→ 获取未来日志失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新未来日志
  ipcMain.handle('updateFutureLog', async (_event, content: string) => {
    try {
      const id = await updateFutureLog(content)
      return { success: true, id }
    } catch (error) {
      log.error('主进程→ 更新未来日志失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取月度日志
  ipcMain.handle('getMonthlyLog', async (_event, year: number, month: number) => {
    try {
      const log = await getMonthlyLog(year, month)
      return { success: true, log }
    } catch (error) {
      log.error('主进程→ 获取月度日志失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新月度日志
  ipcMain.handle(
    'updateMonthlyLog',
    async (_event, year: number, month: number, content: string) => {
      try {
        const id = await updateMonthlyLog(year, month, content)
        return { success: true, id }
      } catch (error) {
        log.error('主进程→ 更新月度日志失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取指定年份的所有月度日志
  ipcMain.handle('getYearMonthlyLogs', async (_event, year: number) => {
    try {
      const logs = await getYearMonthlyLogs(year)
      return { success: true, logs }
    } catch (error) {
      log.error('主进程→ 获取年度月度日志失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 搜索时光记
  ipcMain.handle('searchTimeBlocks', async (_event, searchTerm: string) => {
    try {
      const results = await searchTimeBlocks(searchTerm)
      return { success: true, results }
    } catch (error) {
      log.error('主进程→ 搜索时光记失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
