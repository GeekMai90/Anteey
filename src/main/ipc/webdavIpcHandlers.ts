import { ipcMain, BrowserWindow } from 'electron'
import { webdavService } from '../../services/webdav/webdavService'
import type { WebDAVConfig, SyncState } from '@shared/types'

export function setupWebDAVHandlers(): void {
  // 获取 WebDAV 配置
  ipcMain.handle('get-webdav-config', async () => {
    return await webdavService.getConfig()
  })

  // 更新 WebDAV 配置
  ipcMain.handle(
    'update-webdav-config',
    async (_, config: Partial<WebDAVConfig>): Promise<WebDAVConfig> => {
      return await webdavService.updateConfig(config)
    }
  )

  // 测试 WebDAV 连接
  ipcMain.handle('test-webdav-connection', async (_, config: Partial<WebDAVConfig>) => {
    return await webdavService.testConnection(config)
  })

  // 执行同步
  ipcMain.handle('sync-webdav', async (_, type: 'auto' | 'manual' = 'manual') => {
    return await webdavService.sync(type)
  })

  // 强制上传到云端
  ipcMain.handle('force-upload-webdav', async () => {
    return await webdavService.forceUpload('manual')
  })

  // 从云端下载
  ipcMain.handle('force-download-webdav', async () => {
    return await webdavService.forceDownload('manual')
  })

  // 获取同步历史
  ipcMain.handle('get-webdav-sync-history', async () => {
    return await webdavService.getSyncHistory()
  })

  // 监听服务端的状态变更
  webdavService.on('sync-state-changed', (state: SyncState) => {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('sync-state-changed', state)
    })
  })

  ipcMain.handle('start-webdav-auto-sync', async () => {
    await webdavService.startAutoSync()
  })

  ipcMain.handle('stop-webdav-auto-sync', async () => {
    webdavService.stopAutoSync()
  })
}
