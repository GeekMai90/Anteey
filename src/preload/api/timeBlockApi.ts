import { ipcRenderer } from 'electron'
import type {
  TimeBlockDay,
  TimeBlockSettings,
  FutureLog,
  MonthlyLog
} from '../../renderer/src/types/timeBlock'

export const timeBlockApi = {
  // 获取某天的时间块数据
  getTimeBlockDay: async (date: string): Promise<TimeBlockDay> => {
    try {
      const result = await ipcRenderer.invoke('getTimeBlockDay', date)
      if (!result.success) throw new Error(result.error)
      return result.day
    } catch (error) {
      console.error('预加载脚本 → 获取时间块数据失败:', error)
      throw error
    }
  },

  // 更新时间块内容
  updateTimeBlock: async (dayId: string, hour: number, content: string): Promise<string> => {
    try {
      const result = await ipcRenderer.invoke('updateTimeBlock', dayId, hour, content)
      if (!result.success) throw new Error(result.error)
      return result.blockId
    } catch (error) {
      console.error('预加载脚本 → 更新时间块内容失败:', error)
      throw error
    }
  },

  // 更新时间块日期状态
  updateTimeBlockDayStatus: async (
    id: string,
    data: { weather?: string; mood?: string }
  ): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('updateTimeBlockDayStatus', id, data)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 更新时间块日期状态失败:', error)
      throw error
    }
  },

  // 获取时间块设置
  getTimeBlockSettings: async (): Promise<TimeBlockSettings> => {
    try {
      const result = await ipcRenderer.invoke('getTimeBlockSettings')
      if (!result.success) throw new Error(result.error)
      return result.settings
    } catch (error) {
      console.error('预加载脚本 → 获取时间块设置失败:', error)
      throw error
    }
  },

  // 更新时间块设置
  updateTimeBlockSettings: async (settings: {
    enabled?: boolean
    startTime?: number
    endTime?: number
  }): Promise<TimeBlockSettings> => {
    try {
      const result = await ipcRenderer.invoke('updateTimeBlockSettings', settings)
      if (!result.success) throw new Error(result.error)
      return result.settings
    } catch (error) {
      console.error('预加载脚本 → 更新时间块设置失败:', error)
      throw error
    }
  },

  // 获取未来日志
  getFutureLog: async (): Promise<FutureLog | null> => {
    try {
      const result = await ipcRenderer.invoke('getFutureLog')
      if (!result.success) throw new Error(result.error)
      return result.log
    } catch (error) {
      console.error('预加载脚本 → 获取未来日志失败:', error)
      throw error
    }
  },

  // 更新未来日志
  updateFutureLog: async (content: string): Promise<string> => {
    try {
      const result = await ipcRenderer.invoke('updateFutureLog', content)
      if (!result.success) throw new Error(result.error)
      return result.id
    } catch (error) {
      console.error('预加载脚本 → 更新未来日志失败:', error)
      throw error
    }
  },

  // 获取月度日志
  getMonthlyLog: async (year: number, month: number): Promise<MonthlyLog | null> => {
    try {
      const result = await ipcRenderer.invoke('getMonthlyLog', year, month)
      if (!result.success) throw new Error(result.error)
      return result.log
    } catch (error) {
      console.error('预加载脚本 → 获取月度日志失败:', error)
      throw error
    }
  },

  // 更新月度日志
  updateMonthlyLog: async (year: number, month: number, content: string): Promise<string> => {
    try {
      const result = await ipcRenderer.invoke('updateMonthlyLog', year, month, content)
      if (!result.success) throw new Error(result.error)
      return result.id
    } catch (error) {
      console.error('预加载脚本 → 更新月度日志失败:', error)
      throw error
    }
  },

  // 获取指定年份的所有月度日志
  getYearMonthlyLogs: async (year: number): Promise<MonthlyLog[]> => {
    try {
      const result = await ipcRenderer.invoke('getYearMonthlyLogs', year)
      if (!result.success) throw new Error(result.error)
      return result.logs
    } catch (error) {
      console.error('预加载脚本 → 获取年度月度日志失败:', error)
      throw error
    }
  }
}

export type TimeBlockAPI = typeof timeBlockApi
