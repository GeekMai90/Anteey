import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DinoxSyncConfig } from '@shared/types'
import { useEventBus } from '@vueuse/core'

export const useDinoxStore = defineStore('dinox', () => {
  // ==================== 状态 ====================
  const syncConfig = ref<DinoxSyncConfig | null>(null)
  const isSyncing = ref(false)
  const lastSyncStats = ref<{
    total: number
    added: number
    updated: number
    deleted: number
    skipped: number
  } | null>(null)
  const lastSyncMessage = ref<string>('')
  const isConfigModalOpen = ref(false)

  // ==================== 操作方法 ====================
  // 获取同步配置
  const fetchSyncConfig = async () => {
    try {
      const config = await window.electronAPI.dinox.getSyncConfig()
      syncConfig.value = config
      return config
    } catch (error) {
      console.error('获取同步配置失败:', error)
      throw error
    }
  }

  // 更新同步配置
  const updateSyncConfig = async (config: Partial<DinoxSyncConfig>) => {
    try {
      const updatedConfig = await window.electronAPI.dinox.updateSyncConfig(config)
      syncConfig.value = updatedConfig
      return updatedConfig
    } catch (error) {
      console.error('更新同步配置失败:', error)
      throw error
    }
  }

  // 执行同步
  const syncNotes = async () => {
    try {
      isSyncing.value = true
      const result = await window.electronAPI.dinox.syncNotes()
      lastSyncStats.value = result.stats
      lastSyncMessage.value = result.message

      // 发送同步完成事件
      const syncCompleteEventBus = useEventBus('dinoxSyncComplete')
      syncCompleteEventBus.emit({ stats: result.stats, message: result.message })

      return {
        success: true,
        message: `同步完成：新增 ${result.stats.added}，更新 ${result.stats.updated}，删除 ${result.stats.deleted}，跳过 ${result.stats.skipped}`
      }
    } catch (error) {
      console.error('同步失败:', error)
      throw error
    } finally {
      isSyncing.value = false
    }
  }

  // 执行全量同步
  const fullSyncNotes = async () => {
    try {
      isSyncing.value = true
      const result = await window.electronAPI.dinox.fullSyncNotes()
      lastSyncStats.value = result.stats
      lastSyncMessage.value = result.message

      // 发送同步完成事件
      const syncCompleteEventBus = useEventBus('dinoxSyncComplete')
      syncCompleteEventBus.emit({ stats: result.stats, message: result.message })

      return {
        success: true,
        message: `全量同步完成：新增 ${result.stats.added}，更新 ${result.stats.updated}，删除 ${result.stats.deleted}，跳过 ${result.stats.skipped}`
      }
    } catch (error) {
      console.error('全量同步失败:', error)
      throw error
    } finally {
      isSyncing.value = false
    }
  }

  // 标记笔记为已毕业
  const graduateNote = async (dinoxNoteId: string) => {
    try {
      await window.electronAPI.dinox.graduateNote(dinoxNoteId)
      // 发送笔记毕业事件
      const noteGraduatedEventBus = useEventBus('dinoxNoteGraduated')
      noteGraduatedEventBus.emit(dinoxNoteId)
    } catch (error) {
      console.error('标记 Dinox 笔记毕业状态失败:', error)
      throw error
    }
  }

  // 重置同步时间
  const resetSyncTime = async () => {
    try {
      await window.electronAPI.dinox.resetSyncTime()
      // 重新获取配置
      await fetchSyncConfig()
    } catch (error) {
      console.error('重置 Dinox 同步时间失败:', error)
      throw error
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
      const { config, message } = await window.electronAPI.dinox.updateAutoSync({
        autoSync,
        autoSyncInterval
      })
      syncConfig.value = config
      return { config, message }
    } catch (error) {
      console.error('更新 Dinox 自动同步设置失败:', error)
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
      console.error('初始化 Dinox 同步失败:', error)
    }
  }

  return {
    // 状态
    syncConfig,
    isSyncing,
    lastSyncStats,
    lastSyncMessage,
    isConfigModalOpen,

    // 方法
    initialize,
    fetchSyncConfig,
    updateSyncConfig,
    syncNotes,
    fullSyncNotes,
    graduateNote,
    resetSyncTime,
    updateAutoSync,
    openConfigModal,
    closeConfigModal
  }
})
