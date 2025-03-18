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
  }
}
