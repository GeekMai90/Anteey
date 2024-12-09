import { ipcRenderer } from 'electron'
import type {
  TimeBlockDay,
  TimeBlockItemType,
  TaskStatus,
  TimeBlockItem,
  TimeBlockSettings
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

  // 添加时间块内容项
  addTimeBlockItem: async (
    blockId: string,
    data: {
      type: TimeBlockItemType
      content: string
      status?: TaskStatus
    }
  ): Promise<TimeBlockItem> => {
    try {
      const result = await ipcRenderer.invoke('addTimeBlockItem', blockId, data)
      if (!result.success) throw new Error(result.error)
      return result.item
    } catch (error) {
      console.error('预加载脚本 → 添加时间块内容项失败:', error)
      throw error
    }
  },

  // 更新内容项状态
  updateItemStatus: async (itemId: string, status: TaskStatus): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('updateItemStatus', itemId, status)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 更新内容项状态失败:', error)
      throw error
    }
  },

  // 迁移内容项
  migrateItem: async (itemId: string, targetBlockId: string): Promise<TimeBlockItem> => {
    try {
      const result = await ipcRenderer.invoke('migrateItem', itemId, targetBlockId)
      if (!result.success) throw new Error(result.error)
      return result.item
    } catch (error) {
      console.error('预加载脚本 → 迁移内容项失败:', error)
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
  }
}

export type TimeBlockAPI = typeof timeBlockApi
