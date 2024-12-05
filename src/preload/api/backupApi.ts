import { ipcRenderer } from 'electron'
import type { BackupSettings, BackupHistory } from '../../renderer/src/types/backup'

export const backupApi = {
  getBackupSettings: () =>
    ipcRenderer.invoke('get-backup-settings') as Promise<BackupSettings | null>,

  updateBackupSettings: (settings: Partial<BackupSettings>) =>
    ipcRenderer.invoke('update-backup-settings', settings) as Promise<void>,

  getBackupHistory: () => ipcRenderer.invoke('get-backup-history') as Promise<BackupHistory[]>,

  selectBackupDirectory: () =>
    ipcRenderer.invoke('select-backup-directory') as Promise<string | null>,

  createBackup: () =>
    ipcRenderer.invoke('create-backup') as Promise<{
      path: string
      fileName: string
      size: number
    }>,

  selectBackupFile: () => ipcRenderer.invoke('select-backup-file') as Promise<string | null>,

  restoreBackup: (backupPath: string) =>
    ipcRenderer.invoke('restore-backup', backupPath) as Promise<boolean>
}
