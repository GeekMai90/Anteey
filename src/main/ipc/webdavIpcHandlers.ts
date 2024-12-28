import { ipcMain, BrowserWindow } from 'electron'
import { webdavService } from '../../services/webdav/webdavService'
import type { WebDAVConfig, SyncState } from '../../renderer/src/types/WebDAV'

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
  ipcMain.handle('sync-webdav', async () => {
    return await webdavService.sync()
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
