import { ipcRenderer } from 'electron'
import type { S3Config, S3SyncHistory, S3SyncState } from '@shared/types'

export const s3Api = {
  // 获取 S3 配置
  getConfig: async (): Promise<S3Config | null> => {
    try {
      const result = await ipcRenderer.invoke('get-s3-config')
      if (!result.success) throw new Error(result.error)
      return result.config
    } catch (error) {
      console.error('预加载脚本 → 获取 S3 配置失败:', error)
      throw error
    }
  },

  // 更新 S3 配置
  updateConfig: async (
    config: Partial<S3Config>,
    options?: { restartSync?: boolean }
  ): Promise<S3Config> => {
    try {
      console.log('预加载脚本 → 更新 S3 配置开始:', { config, options })
      // 添加超时处理
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('更新 S3 配置超时')), 30000) // 30秒超时
      })

      const resultPromise = ipcRenderer.invoke('update-s3-config', config, options)

      // 使用Promise.race竞争两个Promise，看哪个先完成
      const result = (await Promise.race([resultPromise, timeoutPromise])) as any

      console.log('预加载脚本 → 更新 S3 配置结果:', result)

      if (!result) {
        throw new Error('未收到响应')
      }

      if (!result.success) {
        throw new Error(result.error || '更新失败，但未返回具体错误')
      }

      return result.config
    } catch (error) {
      console.error('预加载脚本 → 更新 S3 配置失败:', error)
      throw error
    }
  },

  // 测试 S3 连接
  testConnection: async (config: Partial<S3Config>): Promise<boolean> => {
    try {
      const result = await ipcRenderer.invoke('test-s3-connection', config)
      if (!result.success) throw new Error(result.error)
      return result.isConnected
    } catch (error) {
      console.error('预加载脚本 → 测试 S3 连接失败:', error)
      throw error
    }
  },

  // 手动触发同步
  triggerSync: async (): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('trigger-s3-sync')
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 手动同步失败:', error)
      throw error
    }
  },

  // 获取同步历史
  getSyncHistory: async (): Promise<S3SyncHistory[]> => {
    try {
      const result = await ipcRenderer.invoke('get-s3-sync-history')
      if (!result.success) throw new Error(result.error)
      return result.history
    } catch (error) {
      console.error('预加载脚本 → 获取同步历史失败:', error)
      throw error
    }
  },

  // 订阅同步状态变化
  subscribeSyncState: async (callback: (state: S3SyncState) => void): Promise<void> => {
    try {
      // 添加事件监听器
      ipcRenderer.on('s3-sync-state-changed', (_event, state) => {
        callback(state)
      })

      // 注册订阅
      const result = await ipcRenderer.invoke('subscribe-s3-sync-state')
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 订阅同步状态失败:', error)
      throw error
    }
  },

  // 取消订阅同步状态变化
  unsubscribeSyncState: async (): Promise<void> => {
    try {
      // 移除所有事件监听器
      ipcRenderer.removeAllListeners('s3-sync-state-changed')

      // 通知主进程取消订阅
      const result = await ipcRenderer.invoke('unsubscribe-s3-sync-state')
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 取消订阅同步状态失败:', error)
      throw error
    }
  },

  // 启动自动同步
  startAutoSync: async (): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('start-s3-auto-sync')
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 启动自动同步失败:', error)
      throw error
    }
  },

  // 停止自动同步
  stopAutoSync: async (): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('stop-s3-auto-sync')
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 停止自动同步失败:', error)
      throw error
    }
  },

  // 获取所有 S3 提供商配置
  getAllProviderConfigs: async (): Promise<Record<string, any>> => {
    try {
      const result = await ipcRenderer.invoke('get-all-s3-provider-configs')
      return result
    } catch (error) {
      console.error('预加载脚本 → 获取所有 S3 提供商配置失败:', error)
      throw error
    }
  },

  // 强制上传到云端
  uploadToCloud: async (): Promise<void> => {
    try {
      await ipcRenderer.invoke('upload-to-cloud')
    } catch (error) {
      console.error('预加载脚本 → 上传到云端失败:', error)
      throw error
    }
  },

  // 强制从云端下载
  downloadFromCloud: async (): Promise<void> => {
    try {
      await ipcRenderer.invoke('download-from-cloud')
    } catch (error) {
      console.error('预加载脚本 → 从云端下载失败:', error)
      throw error
    }
  }
}
