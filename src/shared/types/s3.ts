/**
 * S3 服务商类型
 */
export type S3Provider = 'aws' | 'aliyun' | 'tencent' | 'custom' | 'binfenyun'

/**
 * S3 同步文件类型
 */
export type S3SyncFileType = 'database' | 'images' | 'all'

/**
 * S3 配置接口
 */
export interface S3Config {
  id: string
  enabled: boolean
  provider: S3Provider
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  endpoint?: string // 自定义 S3 兼容服务的端点
  autoSync: boolean
  syncInterval: number // 同步间隔（分钟）
  syncDirection: 'upload' | 'download' | 'bidirectional'
  syncFileTypes: S3SyncFileType[] // 要同步的文件类型
  startupShutdownSync: boolean // 是否在应用启动和关闭时进行同步
  createdAt: Date
  updatedAt: Date
}

/**
 * S3 同步状态
 */
export interface S3SyncState {
  status: 'idle' | 'syncing' | 'completed' | 'error'
  progress: number
  type: 'auto' | 'manual'
  message?: string
  error?: string
}

/**
 * S3 同步历史记录
 */
export interface S3SyncHistory {
  id: string
  timestamp: Date
  type: 'auto' | 'manual'
  status: 'success' | 'failed'
  details: {
    error?: string
    syncedFiles: number
    syncDirection?: string
    provider?: string
  }
}

/**
 * S3 文件统计信息
 */
export interface S3Stats {
  totalFiles: number
  totalSize: number
  lastSyncTime?: Date
  syncStatus: 'synced' | 'pending' | 'error'
}
