export interface BackupSettings {
  backup_path: string
  auto_backup: boolean
  created_at: string
  updated_at: string
}

export interface BackupHistory {
  id: number
  backup_file_path: string
  backup_file_name: string
  backup_size: number
  created_at: string
}

export interface BackupStore {
  settings: BackupSettings | null
  history: BackupHistory[]
  getSettings: () => Promise<void>
  getHistory: () => Promise<void>
  updateSettings: (settings: Partial<BackupSettings>) => Promise<void>
  createBackup: () => Promise<void>
  restoreBackup: (backupPath: string) => Promise<void>
}
