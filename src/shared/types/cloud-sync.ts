// 云同步类型
export type CloudSyncType = 'none' | 'webdav' | 's3'

// 云同步状态
export type CloudSyncStatus = 'idle' | 'syncing' | 'error' | 'completed'

// 云同步配置接口
export interface CloudSyncConfig {
  id?: string
  syncType: CloudSyncType
  enabled: boolean
  updatedAt?: Date
}

// 云同步状态接口
export interface CloudSyncState {
  status: CloudSyncStatus
  syncType: CloudSyncType
  progress: number
  message?: string
  error?: string
  lastSyncTime?: Date
}

// 云同步历史记录接口
export interface CloudSyncHistory {
  id: string
  syncType: CloudSyncType
  timestamp: Date
  status: 'success' | 'failed'
  details: {
    error?: string
    syncedFiles?: number
    message?: string
  }
  createdAt: Date
}

// 云同步服务状态
export interface CloudSyncServiceStatus {
  webdav: {
    enabled: boolean
    running: boolean
    lastSyncTime?: Date
  }
  s3: {
    enabled: boolean
    running: boolean
    lastSyncTime?: Date
  }
}

// 云同步错误
export interface CloudSyncError {
  code: string
  message: string
  details?: any
}

// 云同步事件类型
export type CloudSyncEvent = {
  type: 'status-changed' | 'error' | 'sync-completed' | 'config-updated'
  data: CloudSyncState | CloudSyncError | CloudSyncConfig
}

// 用于更新云同步配置的选项
export interface UpdateCloudSyncOptions {
  disablePrevSync?: boolean // 是否需要禁用之前的同步服务
}
