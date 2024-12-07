import { ipcRenderer } from 'electron'
import type { TimeBlockDay } from '../../renderer/src/types/timeBlock'

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
  updateTimeBlock: async (dayId: string, hour: number, content: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('updateTimeBlock', dayId, hour, content)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 更新时间块内容失败:', error)
      throw error
    }
  },

  // 更新天气和心情
  updateTimeBlockDayStatus: async (
    id: string,
    data: { weather?: string; mood?: string }
  ): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('updateTimeBlockDayStatus', id, data)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 更新时间块状态失败:', error)
      throw error
    }
  },

  // 获取时间块设置
  getTimeBlockSettings: async () => {
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
  }) => {
    try {
      const result = await ipcRenderer.invoke('updateTimeBlockSettings', settings)
      if (!result.success) throw new Error(result.error)
      return result.settings
    } catch (error) {
      console.error('预加载脚本 → 更新时间块设置失败:', error)
      throw error
    }
  }
}
