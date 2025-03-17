import { ipcMain } from 'electron'
import { s3Service } from '../../services/s3/s3Service'
import type { S3Config } from '@shared/types'

export function setupS3Handlers() {
  // 获取 S3 配置
  ipcMain.handle('get-s3-config', async () => {
    try {
      const config = await s3Service.getConfig()
      return { success: true, config }
    } catch (error) {
      console.error('主进程→ 获取 S3 配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新 S3 配置
  ipcMain.handle(
    'update-s3-config',
    async (_event, config: Partial<S3Config>, options?: { restartSync?: boolean }) => {
      try {
        const updatedConfig = await s3Service.updateConfig(config, options)
        return { success: true, config: updatedConfig }
      } catch (error) {
        console.error('主进程→ 更新 S3 配置失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 测试 S3 连接
  ipcMain.handle('test-s3-connection', async (_event, config: Partial<S3Config>) => {
    try {
      const isConnected = await s3Service.testConnection(config)
      return { success: true, isConnected }
    } catch (error) {
      console.error('主进程→ 测试 S3 连接失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 手动触发同步
  ipcMain.handle('trigger-s3-sync', async () => {
    try {
      await s3Service.sync('manual')
      return { success: true }
    } catch (error) {
      console.error('主进程→ 手动同步失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取同步历史
  ipcMain.handle('get-s3-sync-history', async () => {
    try {
      const history = await s3Service.getSyncHistory()
      return { success: true, history }
    } catch (error) {
      console.error('主进程→ 获取同步历史失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 监听同步状态变化
  ipcMain.handle('subscribe-s3-sync-state', (_event) => {
    try {
      const handleSyncStateChange = (state: any) => {
        // 通过 webContents 发送状态更新
        _event.sender.send('s3-sync-state-changed', state)
      }

      // 添加事件监听器
      s3Service.on('sync-state-changed', handleSyncStateChange)

      // 返回当前状态
      return { success: true }
    } catch (error) {
      console.error('主进程→ 订阅同步状态失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 取消监听同步状态变化
  ipcMain.handle('unsubscribe-s3-sync-state', () => {
    try {
      s3Service.removeAllListeners('sync-state-changed')
      return { success: true }
    } catch (error) {
      console.error('主进程→ 取消订阅同步状态失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 启动自动同步
  ipcMain.handle('start-s3-auto-sync', async () => {
    try {
      await s3Service.startAutoSync()
      return { success: true }
    } catch (error) {
      console.error('主进程→ 启动自动同步失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 停止自动同步
  ipcMain.handle('stop-s3-auto-sync', () => {
    try {
      s3Service.stopAutoSync()
      return { success: true }
    } catch (error) {
      console.error('主进程→ 停止自动同步失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
