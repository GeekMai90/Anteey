import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CloudSyncConfig, CloudSyncType, UpdateCloudSyncOptions } from '@shared/types'

export const useCloudSyncStore = defineStore('cloudSync', () => {
  // ==================== 状态 ====================
  const currentConfig = ref<CloudSyncConfig | null>(null)

  // ==================== 操作方法 ====================
  // 获取当前云同步配置
  const getCurrentConfig = async () => {
    try {
      const config = await window.electronAPI.cloudSync.getCurrentConfig()
      currentConfig.value = config
      return config
    } catch (error) {
      console.error('获取云同步配置失败:', error)
      throw error
    }
  }

  // 更新云同步配置
  const updateConfig = async (
    config: Partial<CloudSyncConfig>,
    options?: UpdateCloudSyncOptions
  ) => {
    try {
      const updatedConfig = await window.electronAPI.cloudSync.updateConfig(config, options)
      currentConfig.value = updatedConfig
      return updatedConfig
    } catch (error) {
      console.error('更新云同步配置失败:', error)
      throw error
    }
  }

  // 切换同步类型
  const switchSyncType = async (syncType: CloudSyncType) => {
    try {
      return await updateConfig(
        { syncType, enabled: syncType !== 'none' },
        { disablePrevSync: true }
      )
    } catch (error) {
      console.error('切换同步类型失败:', error)
      throw error
    }
  }

  // 切换启用状态
  const toggleEnabled = async (enabled: boolean) => {
    try {
      return await updateConfig({ enabled })
    } catch (error) {
      console.error('切换启用状态失败:', error)
      throw error
    }
  }

  return {
    // 状态
    currentConfig,

    // 方法
    getCurrentConfig,
    updateConfig,
    switchSyncType,
    toggleEnabled
  }
})
