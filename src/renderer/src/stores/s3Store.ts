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
  const providerConfigs = ref<Record<string, any>>({})

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
      console.log('s3Store → 开始更新S3配置:', { configData, options })

      // 通知UI状态发生变化
      const s3ConfigEventBus = useEventBus('s3ConfigChange')
      s3ConfigEventBus.emit('updating')

      // 确保options是可选的，并默认不重启同步
      const finalOptions = {
        restartSync: false,
        ...(options || {})
      }

      console.log('s3Store → 传递选项:', finalOptions)

      // 添加超时处理
      const startTime = Date.now()

      const updatedConfig = await window.electronAPI.s3.updateConfig(configData, finalOptions)

      console.log('s3Store → 更新S3配置成功, 耗时:', Date.now() - startTime, 'ms')
      config.value = updatedConfig

      // 发送配置更新成功事件
      s3ConfigEventBus.emit('updated')

      return updatedConfig
    } catch (error) {
      console.error('s3Store → 更新 S3 配置失败:', error)
      // 发送配置更新失败事件
      const s3ConfigEventBus = useEventBus('s3ConfigChange')
      s3ConfigEventBus.emit('error', error)

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

  // 获取所有提供商的配置
  const fetchAllProviderConfigs = async () => {
    try {
      const allConfigs = await window.electronAPI.s3.getAllProviderConfigs()
      // 保存到 store 中并持久化到 localStorage
      providerConfigs.value = allConfigs
      localStorage.setItem('s3ProviderConfigs', JSON.stringify(allConfigs))
      return allConfigs
    } catch (error) {
      console.error('获取所有提供商配置失败:', error)
      throw error
    }
  }

  // 强制上传到云端
  const uploadToCloud = async () => {
    try {
      isSyncing.value = true
      await window.electronAPI.s3.uploadToCloud()
    } catch (error) {
      console.error('上传到云端失败:', error)
      throw error
    } finally {
      isSyncing.value = false
    }
  }

  // 强制从云端下载
  const downloadFromCloud = async () => {
    try {
      isSyncing.value = true
      await window.electronAPI.s3.downloadFromCloud()
    } catch (error) {
      console.error('从云端下载失败:', error)
      throw error
    } finally {
      isSyncing.value = false
    }
  }

  return {
    // 状态
    config,
    syncState,
    syncHistory,
    isConfigModalOpen,
    isConnecting,
    isSyncing,
    providerConfigs,

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
    autoSync,
    fetchAllProviderConfigs,
    uploadToCloud,
    downloadFromCloud
  }
})
