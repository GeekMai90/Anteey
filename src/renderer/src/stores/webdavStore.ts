import { defineStore } from 'pinia'
import type { WebDAVConfig, SyncState, SyncHistory } from '../types/WebDAV'

interface WebDAVStore {
  config: WebDAVConfig | null
  syncState: SyncState
  syncHistory: SyncHistory[]
  loading: boolean
  error: string | null
  lastSuccessfulSync: Date | null
}

export const useWebDAVStore = defineStore('webdav', {
  state: (): WebDAVStore => ({
    config: null,
    syncState: {
      status: 'idle',
      progress: 0,
      type: 'manual'
    },
    syncHistory: [],
    loading: false,
    error: null,
    lastSuccessfulSync: null
  }),

  actions: {
    async loadConfig() {
      try {
        this.loading = true
        this.error = null
        this.config = await window.electronAPI.getWebDAVConfig()
      } catch (error) {
        this.error = error instanceof Error ? error.message : '加载配置失败'
        console.error('加载 WebDAV 配置失败:', error)
      } finally {
        this.loading = false
      }
    },

    async updateConfig(config: Partial<WebDAVConfig>) {
      try {
        this.loading = true
        this.error = null
        this.config = await window.electronAPI.updateWebDAVConfig(config)
      } catch (error) {
        this.error = error instanceof Error ? error.message : '更新配置失败'
        console.error('更新 WebDAV 配置失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async testConnection(config: Partial<WebDAVConfig>): Promise<boolean> {
      try {
        this.loading = true
        this.error = null
        return await window.electronAPI.testWebDAVConnection(config)
      } catch (error) {
        this.error = error instanceof Error ? error.message : '测试连接失败'
        console.error('测试 WebDAV 连接失败:', error)
        return false
      } finally {
        this.loading = false
      }
    },

    async sync(type: 'auto' | 'manual' = 'manual') {
      try {
        this.loading = true
        this.error = null
        this.syncState.type = type
        await window.electronAPI.syncWebDAV()
      } catch (error) {
        this.error = error instanceof Error ? error.message : '同步失败'
        console.error('WebDAV 同步失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    updateSyncState(state: SyncState) {
      const type = state.type || this.syncState.type
      this.syncState = {
        ...state,
        type
      }
      if (state.status === 'completed') {
        this.lastSuccessfulSync = new Date()
      }
    },

    async loadSyncHistory() {
      try {
        this.loading = true
        this.error = null
        this.syncHistory = await window.electronAPI.getWebDAVSyncHistory()
        const lastSuccess = this.syncHistory.find((record) => record.status === 'success')
        if (lastSuccess) {
          this.lastSuccessfulSync = new Date(lastSuccess.timestamp)
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : '加载同步历史失败'
        console.error('加载同步历史失败:', error)
      } finally {
        this.loading = false
      }
    }
  }
})
