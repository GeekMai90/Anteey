import { ipcRenderer } from 'electron'
import type { PomodoroConfig, BackgroundSound } from '@shared/types'

export const pomodoroApi = {
  // 获取今日番茄钟记录
  getTodayPomodoro: async () => {
    try {
      const result = await ipcRenderer.invoke('get-today-pomodoro')
      if (!result.success) throw new Error(result.error)
      return result.record
    } catch (error) {
      console.error('预加载脚本 → 获取今日番茄钟记录失败:', error)
      throw error
    }
  },

  // 更新今日番茄钟记录
  updateTodayPomodoro: async (count: number, minutes: number) => {
    try {
      const result = await ipcRenderer.invoke('update-today-pomodoro', { count, minutes })
      if (!result.success) throw new Error(result.error)
      return result.record
    } catch (error) {
      console.error('预加载脚本 → 更新今日番茄钟记录失败:', error)
      throw error
    }
  },

  // 获取番茄钟设置
  getPomodoroSettings: async (): Promise<PomodoroConfig> => {
    try {
      const result = await ipcRenderer.invoke('get-pomodoro-settings')
      if (!result.success) throw new Error(result.error)
      return result.settings
    } catch (error) {
      console.error('预加载脚本 → 获取番茄钟设置失败:', error)
      throw error
    }
  },

  // 更新番茄钟设置
  updatePomodoroSettings: async (config: Partial<PomodoroConfig>): Promise<PomodoroConfig> => {
    try {
      const result = await ipcRenderer.invoke('update-pomodoro-settings', config)
      if (!result.success) throw new Error(result.error)
      return result.settings
    } catch (error) {
      console.error('预加载脚本 → 更新番茄钟设置失败:', error)
      throw error
    }
  },

  // 获取日期范围内的番茄钟记录
  getPomodoroRecords: async (startDate: string, endDate: string) => {
    try {
      const result = await ipcRenderer.invoke('get-pomodoro-records', { startDate, endDate })
      if (!result.success) throw new Error(result.error)
      return result.records
    } catch (error) {
      console.error('预加载脚本 → 获取番茄钟记录失败:', error)
      throw error
    }
  },

  // 获取番茄钟统计数据
  getPomodoroStats: async () => {
    try {
      const result = await ipcRenderer.invoke('get-pomodoro-stats')
      if (!result.success) throw new Error(result.error)
      return result.stats
    } catch (error) {
      console.error('预加载脚本 → 获取番茄钟统计数据失败:', error)
      throw error
    }
  },

  // 获取音频文件路径
  getSoundFilePath: async (soundType: BackgroundSound) => {
    try {
      const result = await ipcRenderer.invoke('get-sound-file-path', soundType)
      if (!result.success) throw new Error(result.error)
      return result.path
    } catch (error) {
      console.error('预加载脚本 → 获取音频文件路径失败:', error)
      throw error
    }
  }
}
