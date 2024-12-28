import { ipcMain, dialog, BrowserWindow } from 'electron'
import { backupService } from '../../services/backupService'

export function setupBackupIpcHandlers(): void {
  ipcMain.handle('getBackupSettings', async () => {
    return await backupService.getBackupSettings()
  })

  ipcMain.handle('updateBackupSettings', async (_, settings) => {
    await backupService.updateBackupSettings(settings)
  })

  ipcMain.handle('getBackupHistory', async () => {
    return await backupService.getBackupHistory()
  })

  ipcMain.handle('selectBackupDirectory', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(window!, {
      properties: ['openDirectory', 'createDirectory']
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  })

  ipcMain.handle('createBackup', async () => {
    return await backupService.performBackup()
  })

  ipcMain.handle('selectBackupFile', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(window!, {
      properties: ['openFile'],
      filters: [{ name: 'Database Files', extensions: ['db'] }]
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  })

  ipcMain.handle('restoreBackup', async (_, backupPath) => {
    await backupService.restoreBackup(backupPath)
    return true
  })

  ipcMain.handle('clearBackupHistory', async () => {
    await backupService.clearBackupHistory()
  })
}
