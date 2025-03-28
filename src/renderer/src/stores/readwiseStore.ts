import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ReadwiseSyncConfig } from '@shared/types'
import { useEventBus } from '@vueuse/core'

export const useReadwiseStore = defineStore('readwise', () => {
  // ==================== 状态 ====================
  const syncConfig = ref<ReadwiseSyncConfig | null>(null)
  const isSyncing = ref(false)
  const lastSyncStats = ref<{
    total: number
    added: number
    updated: number
    skipped: number
  } | null>(null)
  const lastSyncMessage = ref<string>('')
  const isConfigModalOpen = ref(false)
  const isInboxEnabled = ref(true)

  // ==================== 操作方法 ====================
  // 获取同步配置
  const fetchSyncConfig = async () => {
    try {
      const config = await window.electronAPI.readwise.getSyncConfig()
      syncConfig.value = config
      return config
    } catch (error) {
      console.error('获取同步配置失败:', error)
      throw error
    }
  }

  // 更新同步配置
  const updateSyncConfig = async (config: Partial<ReadwiseSyncConfig>) => {
    try {
      const updatedConfig = await window.electronAPI.readwise.updateSyncConfig(config)
      syncConfig.value = updatedConfig
      return updatedConfig
    } catch (error) {
      console.error('更新同步配置失败:', error)
      throw error
    }
  }

  // 执行增量同步
  const syncHighlights = async () => {
    try {
      isSyncing.value = true
      const result = await window.electronAPI.readwise.syncHighlights()
      lastSyncStats.value = result.stats
      lastSyncMessage.value = result.message

      // 发送同步完成事件
      const syncCompleteEventBus = useEventBus('readwiseSyncComplete')
      syncCompleteEventBus.emit({ stats: result.stats, message: result.message })

      return {
        success: true,
        message: `同步完成：新增 ${result.stats.added}，更新 ${result.stats.updated}，跳过 ${result.stats.skipped}`
      }
    } catch (error) {
      console.error('同步失败:', error)
      throw error
    } finally {
      isSyncing.value = false
    }
  }

  // 执行全量同步
  const fullSyncHighlights = async () => {
    try {
      isSyncing.value = true
      const result = await window.electronAPI.readwise.fullSyncHighlights()
      lastSyncStats.value = result.stats
      lastSyncMessage.value = result.message

      // 发送同步完成事件
      const syncCompleteEventBus = useEventBus('readwiseSyncComplete')
      syncCompleteEventBus.emit({ stats: result.stats, message: result.message })

      return {
        success: true,
        message: `全量同步完成：新增 ${result.stats.added}，更新 ${result.stats.updated}，跳过 ${result.stats.skipped}`
      }
    } catch (error) {
      console.error('全量同步失败:', error)
      throw error
    } finally {
      isSyncing.value = false
    }
  }

  // 更新自动同步设置
  const updateAutoSync = async ({
    autoSync,
    autoSyncInterval
  }: {
    autoSync: boolean
    autoSyncInterval?: number
  }) => {
    try {
      const { config, message } = await window.electronAPI.readwise.updateAutoSync({
        autoSync,
        autoSyncInterval
      })
      syncConfig.value = config
      return { config, message }
    } catch (error) {
      console.error('更新 Readwise 自动同步设置失败:', error)
      throw error
    }
  }

  // 模态框控制
  const openConfigModal = () => (isConfigModalOpen.value = true)
  const closeConfigModal = () => (isConfigModalOpen.value = false)

  // 初始化
  const initialize = async () => {
    try {
      await fetchSyncConfig()
    } catch (error) {
      console.error('初始化 Readwise 同步失败:', error)
    }
  }

  return {
    // 状态
    syncConfig,
    isSyncing,
    lastSyncStats,
    lastSyncMessage,
    isConfigModalOpen,
    isInboxEnabled,

    // 方法
    initialize,
    fetchSyncConfig,
    updateSyncConfig,
    syncHighlights,
    fullSyncHighlights,
    updateAutoSync,
    openConfigModal,
    closeConfigModal
  }
})
