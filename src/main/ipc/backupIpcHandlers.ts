import { ipcMain, dialog } from 'electron'
import { backupService } from '../../services/backupService'

export function setupBackupHandlers(): void {
  // 获取备份设置
  ipcMain.handle('get-backup-settings', async () => {
    return await backupService.getBackupSettings()
  })

  // 更新备份设置
  ipcMain.handle('update-backup-settings', async (_, settings) => {
    await backupService.updateBackupSettings(settings)
  })

  // 获取备份历史
  ipcMain.handle('get-backup-history', async () => {
    return await backupService.getBackupHistory()
  })

  // 选择备份目录
  ipcMain.handle('select-backup-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  })

  // 执行备份
  ipcMain.handle('create-backup', async () => {
    const settings = await backupService.getBackupSettings()
    if (!settings?.backup_path) {
      throw new Error('未设置备份路径')
    }

    const result = await backupService.performBackup()
    if (!result) {
      throw new Error('备份失败')
    }

    return result
  })

  // 恢复备份
  ipcMain.handle('restore-backup', async (_, backupPath: string) => {
    await backupService.restoreBackup(backupPath)
    return true
  })

  // 选择备份文件
  ipcMain.handle('select-backup-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  })
}
