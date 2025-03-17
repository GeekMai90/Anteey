import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { S3Config, S3SyncHistory, S3SyncState } from '@shared/types'
import { useEventBus } from '@vueuse/core'

export const useS3Store = defineStore('s3', () => {
  // ==================== 状态 ====================
  const config = ref<S3Config | null>(null)
  const syncState = ref<S3SyncState | null>(null)
  const syncHistory = ref<S3SyncHistory[]>([])
  const isConfigModalOpen = ref(false)
  const isConnecting = ref(false)
  const isSyncing = ref(false)

  // ==================== 操作方法 ====================
  // 获取 S3 配置
  const fetchConfig = async () => {
    try {
      const fetchedConfig = await window.electronAPI.s3.getConfig()
      config.value = fetchedConfig
      return fetchedConfig
    } catch (error) {
      console.error('获取 S3 配置失败:', error)
      throw error
    }
  }

  // 更新 S3 配置
  const updateConfig = async (
    configData: Partial<S3Config>,
    options: { restartSync?: boolean } = {}
  ) => {
    try {
      const updatedConfig = await window.electronAPI.s3.updateConfig(configData, options)
      config.value = updatedConfig
      // 发送配置更新事件
      const s3ConfigEventBus = useEventBus('s3ConfigChange')
      s3ConfigEventBus.emit()
      return updatedConfig
    } catch (error) {
      console.error('更新 S3 配置失败:', error)
      throw error
    }
  }

  // 测试 S3 连接
  const testConnection = async (configData: Partial<S3Config>) => {
    try {
      isConnecting.value = true
      const isConnected = await window.electronAPI.s3.testConnection(configData)
      return { success: true, isConnected }
    } catch (error) {
      console.error('测试 S3 连接失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    } finally {
      isConnecting.value = false
    }
  }

  // 手动触发同步
  const triggerSync = async () => {
    try {
      isSyncing.value = true
      await window.electronAPI.s3.triggerSync()
    } catch (error) {
      console.error('手动同步失败:', error)
      throw error
    } finally {
      isSyncing.value = false
    }
  }

  // 获取同步历史
  const fetchSyncHistory = async () => {
    try {
      const history = await window.electronAPI.s3.getSyncHistory()
      syncHistory.value = history
      return history
    } catch (error) {
      console.error('获取同步历史失败:', error)
      throw error
    }
  }

  // 订阅同步状态变化
  const subscribeSyncState = async () => {
    try {
      await window.electronAPI.s3.subscribeSyncState((state) => {
        syncState.value = state
        // 如果同步完成或出错，刷新同步历史
        if (state.status === 'idle' || state.status === 'error') {
          fetchSyncHistory()
        }
      })
    } catch (error) {
      console.error('订阅同步状态失败:', error)
      throw error
    }
  }

  // 取消订阅同步状态变化
  const unsubscribeSyncState = async () => {
    try {
      await window.electronAPI.s3.unsubscribeSyncState()
      syncState.value = null
    } catch (error) {
      console.error('取消订阅同步状态失败:', error)
      throw error
    }
  }

  // 启动自动同步
  const startAutoSync = async () => {
    try {
      await window.electronAPI.s3.startAutoSync()
    } catch (error) {
      console.error('启动自动同步失败:', error)
      throw error
    }
  }

  // 停止自动同步
  const stopAutoSync = async () => {
    try {
      await window.electronAPI.s3.stopAutoSync()
    } catch (error) {
      console.error('停止自动同步失败:', error)
      throw error
    }
  }

  // 模态框控制
  const openConfigModal = () => (isConfigModalOpen.value = true)
  const closeConfigModal = () => (isConfigModalOpen.value = false)

  const autoSync = computed({
    get: () => Boolean(config.value?.autoSync ?? false),
    set: async (value) => {
      await updateConfig({ autoSync: Boolean(value) })
    }
  })

  return {
    // 状态
    config,
    syncState,
    syncHistory,
    isConfigModalOpen,
    isConnecting,
    isSyncing,

    // 方法
    fetchConfig,
    updateConfig,
    testConnection,
    triggerSync,
    fetchSyncHistory,
    subscribeSyncState,
    unsubscribeSyncState,
    startAutoSync,
    stopAutoSync,
    openConfigModal,
    closeConfigModal,
    autoSync
  }
})
