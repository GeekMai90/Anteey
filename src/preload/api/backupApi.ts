import { ipcRenderer } from 'electron'
import type { BackupSettings, BackupHistory } from '../../renderer/src/types/backup'

export const backupApi = {
  getBackupSettings: () =>
    ipcRenderer.invoke('getBackupSettings') as Promise<BackupSettings | null>,

  updateBackupSettings: (settings: Partial<BackupSettings>) =>
    ipcRenderer.invoke('updateBackupSettings', settings) as Promise<void>,

  getBackupHistory: () => ipcRenderer.invoke('getBackupHistory') as Promise<BackupHistory[]>,

  selectBackupDirectory: () =>
    ipcRenderer.invoke('selectBackupDirectory') as Promise<string | null>,

  createBackup: () =>
    ipcRenderer.invoke('createBackup') as Promise<{
      path: string
      fileName: string
      size: number
    }>,

  selectBackupFile: () => ipcRenderer.invoke('selectBackupFile') as Promise<string | null>,

  restoreBackup: (backupPath: string) =>
    ipcRenderer.invoke('restoreBackup', backupPath) as Promise<boolean>,

  clearBackupHistory: () => ipcRenderer.invoke('clearBackupHistory') as Promise<void>
}
