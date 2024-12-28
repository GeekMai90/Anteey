import { ipcRenderer } from 'electron'
import type { WebDAVConfig, SyncState, SyncHistory } from '../../renderer/src/types/WebDAV'

export const webdavApi = {
  // 获取 WebDAV 配置
  getWebDAVConfig: async (): Promise<WebDAVConfig | null> => {
    try {
      return await ipcRenderer.invoke('get-webdav-config')
    } catch (error) {
      console.error('预加载脚本 → 获取 WebDAV 配置失败:', error)
      throw error
    }
  },

  // 更新 WebDAV 配置
  updateWebDAVConfig: async (config: Partial<WebDAVConfig>): Promise<WebDAVConfig> => {
    try {
      return await ipcRenderer.invoke('update-webdav-config', config)
    } catch (error) {
      console.error('预加载脚本 → 更新 WebDAV 配置失败:', error)
      throw error
    }
  },

  // 测试 WebDAV 连接
  testWebDAVConnection: async (config: Partial<WebDAVConfig>): Promise<boolean> => {
    try {
      return await ipcRenderer.invoke('test-webdav-connection', config)
    } catch (error) {
      console.error('预加载脚本 → 测试 WebDAV 连接失败:', error)
      throw error
    }
  },

  // 执行同步
  syncWebDAV: async (type: 'auto' | 'manual' = 'manual'): Promise<void> => {
    try {
      await ipcRenderer.invoke('sync-webdav', type)
    } catch (error) {
      console.error('预加载脚本 → WebDAV 同步失败:', error)
      throw error
    }
  },

  // 获取同步历史
  getWebDAVSyncHistory: async (): Promise<SyncHistory[]> => {
    try {
      return await ipcRenderer.invoke('get-webdav-sync-history')
    } catch (error) {
      console.error('预加载脚本 → 获取同步历史失败:', error)
      throw error
    }
  },

  // 添加同步状态变更监听
  syncStateChanged: (callback: (state: SyncState) => void) => {
    ipcRenderer.on('sync-state-changed', (_, state) => callback(state))
  },

  startWebDAVAutoSync: async (): Promise<void> => {
    try {
      await ipcRenderer.invoke('start-webdav-auto-sync')
    } catch (error) {
      console.error('预加载脚本 → 启动自动同步失败:', error)
      throw error
    }
  },

  stopWebDAVAutoSync: async (): Promise<void> => {
    try {
      await ipcRenderer.invoke('stop-webdav-auto-sync')
    } catch (error) {
      console.error('预加载脚本 → 停止自动同步失败:', error)
      throw error
    }
  }
}
