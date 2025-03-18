import { ipcRenderer } from 'electron'
import type { CloudSyncConfig, UpdateCloudSyncOptions } from '@shared/types'

export const cloudSyncApi = {
  // 获取当前云同步配置
  getCurrentConfig: async (): Promise<CloudSyncConfig | null> => {
    try {
      const result = await ipcRenderer.invoke('get-cloud-sync-config')
      if (!result.success) throw new Error(result.error)
      return result.config
    } catch (error) {
      console.error('预加载脚本 → 获取云同步配置失败:', error)
      throw error
    }
  },

  // 更新云同步配置
  updateConfig: async (
    config: Partial<CloudSyncConfig>,
    options?: UpdateCloudSyncOptions
  ): Promise<CloudSyncConfig> => {
    try {
      const result = await ipcRenderer.invoke('update-cloud-sync-config', { config, options })
      if (!result.success) throw new Error(result.error)
      return result.config
    } catch (error) {
      console.error('预加载脚本 → 更新云同步配置失败:', error)
      throw error
    }
  },

  // 获取当前同步状态
  getCurrentSyncState: async (): Promise<{ isSyncing: boolean }> => {
    try {
      return await ipcRenderer.invoke('get-current-sync-state')
    } catch (error) {
      console.error('预加载脚本 → 获取同步状态失败:', error)
      throw error
    }
  },

  // 添加同步开始事件监听
  onSyncStart: (callback: () => void) => {
    ipcRenderer.on('sync-start', callback)
  },

  // 添加同步完成事件监听
  onSyncComplete: (callback: (data: { message: string }) => void) => {
    ipcRenderer.on('sync-complete', (_event, data) => callback(data))
  },

  // 添加同步错误事件监听
  onSyncError: (callback: (data: { message: string; error: string }) => void) => {
    ipcRenderer.on('sync-error', (_event, data) => callback(data))
  },

  // 移除所有事件监听
  removeAllListeners: (event: string) => {
    ipcRenderer.removeAllListeners(event)
  }
}
