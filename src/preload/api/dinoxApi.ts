import { ipcRenderer } from 'electron'
import type { DinoxSyncConfig } from '@shared/types'

export const dinoxApi = {
  // 获取同步配置
  getSyncConfig: async (): Promise<DinoxSyncConfig> => {
    try {
      const result = await ipcRenderer.invoke('get-dinox-sync-config')
      if (!result.success) throw new Error(result.error)
      return result.config
    } catch (error) {
      console.error('预加载脚本 → 获取 Dinox 同步配置失败:', error)
      throw error
    }
  },

  // 更新同步配置
  updateSyncConfig: async (updateData: Partial<DinoxSyncConfig>): Promise<DinoxSyncConfig> => {
    try {
      const result = await ipcRenderer.invoke('update-dinox-sync-config', updateData)
      if (!result.success) throw new Error(result.error)
      return result.config
    } catch (error) {
      console.error('预加载脚本 → 更新 Dinox 同步配置失败:', error)
      throw error
    }
  },

  // 执行同步
  syncNotes: async (): Promise<{
    stats: {
      total: number
      added: number
      updated: number
      deleted: number
      skipped: number
    }
    message: string
  }> => {
    try {
      const result = await ipcRenderer.invoke('sync-dinox-notes')
      if (!result.success) throw new Error(result.error)
      return {
        stats: result.stats,
        message: result.message
      }
    } catch (error) {
      console.error('预加载脚本 → 同步 Dinox 笔记失败:', error)
      throw error
    }
  },

  // 执行全量同步
  fullSyncNotes: async (): Promise<{
    stats: {
      total: number
      added: number
      updated: number
      deleted: number
      skipped: number
    }
    message: string
  }> => {
    try {
      const result = await ipcRenderer.invoke('full-sync-dinox-notes')
      if (!result.success) throw new Error(result.error)
      return {
        stats: result.stats,
        message: result.message
      }
    } catch (error) {
      console.error('预加载脚本 → 全量同步 Dinox 笔记失败:', error)
      throw error
    }
  },

  // 标记笔记为已毕业
  graduateNote: async (dinoxNoteId: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('graduate-dinox-note', dinoxNoteId)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 标记 Dinox 笔记毕业状态失败:', error)
      throw error
    }
  },

  // 重置同步时间
  resetSyncTime: async (): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('reset-dinox-sync-time')
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 重置 Dinox 同步时间失败:', error)
      throw error
    }
  },

  // 更新自动同步设置
  updateAutoSync: async ({
    autoSync,
    autoSyncInterval
  }: {
    autoSync: boolean
    autoSyncInterval?: number
  }): Promise<{
    config: DinoxSyncConfig
    message: string
  }> => {
    try {
      const result = await ipcRenderer.invoke('update-dinox-auto-sync', {
        autoSync,
        autoSyncInterval
      })
      if (!result.success) throw new Error(result.error)
      return {
        config: result.config,
        message: result.message
      }
    } catch (error) {
      console.error('预加载脚本 → 更新 Dinox 自动同步设置失败:', error)
      throw error
    }
  }
}
