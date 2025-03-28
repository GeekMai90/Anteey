import { ipcRenderer } from 'electron'
import type { ReadwiseSyncConfig } from '@shared/types'

export const readwiseApi = {
  // 获取同步配置
  getSyncConfig: async (): Promise<ReadwiseSyncConfig> => {
    try {
      const result = await ipcRenderer.invoke('get-readwise-sync-config')
      if (!result.success) throw new Error(result.error)
      return result.config
    } catch (error) {
      console.error('预加载脚本 → 获取 Readwise 同步配置失败:', error)
      throw error
    }
  },

  // 更新同步配置
  updateSyncConfig: async (
    updateData: Partial<ReadwiseSyncConfig>
  ): Promise<ReadwiseSyncConfig> => {
    try {
      const result = await ipcRenderer.invoke('update-readwise-sync-config', updateData)
      if (!result.success) throw new Error(result.error)
      return result.config
    } catch (error) {
      console.error('预加载脚本 → 更新 Readwise 同步配置失败:', error)
      throw error
    }
  },

  // 执行增量同步
  syncHighlights: async (): Promise<{
    stats: {
      total: number
      added: number
      updated: number
      skipped: number
    }
    message: string
  }> => {
    try {
      const result = await ipcRenderer.invoke('sync-readwise-highlights')
      if (!result.success) throw new Error(result.error)
      return {
        stats: result.stats,
        message: result.message
      }
    } catch (error) {
      console.error('预加载脚本 → 同步 Readwise 高亮失败:', error)
      throw error
    }
  },

  // 执行全量同步
  fullSyncHighlights: async (): Promise<{
    stats: {
      total: number
      added: number
      updated: number
      skipped: number
    }
    message: string
  }> => {
    try {
      const result = await ipcRenderer.invoke('full-sync-readwise-highlights')
      if (!result.success) throw new Error(result.error)
      return {
        stats: result.stats,
        message: result.message
      }
    } catch (error) {
      console.error('预加载脚本 → 全量同步 Readwise 高亮失败:', error)
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
    config: ReadwiseSyncConfig
    message: string
  }> => {
    try {
      const result = await ipcRenderer.invoke('update-readwise-auto-sync', {
        autoSync,
        autoSyncInterval
      })
      if (!result.success) throw new Error(result.error)
      return {
        config: result.config,
        message: result.message
      }
    } catch (error) {
      console.error('预加载脚本 → 更新 Readwise 自动同步设置失败:', error)
      throw error
    }
  }
}
