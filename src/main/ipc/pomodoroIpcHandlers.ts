import { ipcMain } from 'electron'
import {
  getTodayRecord,
  updateTodayRecord,
  getPomodoroSettings,
  updatePomodoroSettings,
  getPomodoroRecords,
  getPomodoroStats
} from '../../services/widget/pomodoroService'
import type { PomodoroConfig, BackgroundSound } from '@shared/types'
import { join } from 'path'
import { app } from 'electron'

export function setupPomodoroHandlers() {
  // 获取今日番茄钟记录
  ipcMain.handle('get-today-pomodoro', async () => {
    try {
      const record = await getTodayRecord()
      return { success: true, record }
    } catch (error) {
      console.error('主进程→ 获取今日番茄钟记录失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新今日番茄钟记录
  ipcMain.handle(
    'update-today-pomodoro',
    async (_event, { count, minutes }: { count: number; minutes: number }) => {
      try {
        const record = await updateTodayRecord(count, minutes)
        return { success: true, record }
      } catch (error) {
        console.error('主进程→ 更新今日番茄钟记录失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取番茄钟设置
  ipcMain.handle('get-pomodoro-settings', async () => {
    try {
      const settings = await getPomodoroSettings()
      return { success: true, settings }
    } catch (error) {
      console.error('主进程→ 获取番茄钟设置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新番茄钟设置
  ipcMain.handle('update-pomodoro-settings', async (_event, config: Partial<PomodoroConfig>) => {
    try {
      const settings = await updatePomodoroSettings(config)
      return { success: true, settings }
    } catch (error) {
      console.error('主进程→ 更新番茄钟设置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取日期范围内的番茄钟记录
  ipcMain.handle(
    'get-pomodoro-records',
    async (_event, { startDate, endDate }: { startDate: string; endDate: string }) => {
      try {
        const records = await getPomodoroRecords(startDate, endDate)
        return { success: true, records }
      } catch (error) {
        console.error('主进程→ 获取番茄钟记录失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取番茄钟统计数据
  ipcMain.handle('get-pomodoro-stats', async () => {
    try {
      const stats = await getPomodoroStats()
      return { success: true, stats }
    } catch (error) {
      console.error('主进程→ 获取番茄钟统计数据失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取音频文件路径
  ipcMain.handle('get-sound-file-path', async (_event, soundType: BackgroundSound | 'complete') => {
    try {
      if (soundType === 'none') return null

      // 根据音频类型选择不同的扩展名
      const extension = soundType === 'complete' ? 'mp3' : 'wav'

      const resourcePath = app.isPackaged
        ? join(process.resourcesPath, 'sounds', `${soundType}.${extension}`)
        : join(app.getAppPath(), 'resources', 'sounds', `${soundType}.${extension}`)

      return { success: true, path: resourcePath }
    } catch (error) {
      console.error('主进程→ 获取音频文件路径失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
