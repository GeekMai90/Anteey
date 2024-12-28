// WebDAV 相关的所有类型定义

// WebDAV 服务器类型
export type WebDAVServerType = 'jianguoyun' | 'aliyundrive' | 'custom'

// 同步方向
export type SyncDirection = 'upload' | 'download' | 'bidirectional'

// 同步文件类型
export type SyncFileType = 'database' | 'images' | 'all'

// WebDAV 配置
export interface WebDAVConfig {
  id: string // 配置ID
  enabled: boolean // 是否启用WebDAV同步
  serverType: WebDAVServerType // 服务器类型
  url: string // WebDAV服务器地址
  username: string // 用户名
  password: string // 密码(需要加密存储)
  syncInterval: number // 同步间隔(分钟)
  autoSync: boolean // 是否自动同步
  syncDirection: SyncDirection // 同步方向
  syncFileTypes: SyncFileType[] // 要同步的文件类型
  lastSyncTime: Date | null // 上次同步时间(可能为空)
  createdAt: Date // 创建时间
  updatedAt: Date // 更新时间
}

// 同步状态
export interface SyncStatus {
  status: 'idle' | 'syncing' | 'error' | 'completed' // 增加completed状态
  progress: number // 同步进度(0-100)
  lastSync: Date | null // 最后同步时间
  error?: string // 错误信息
  currentTask?: string // 当前同步任务描述
}

// 同步历史记录
export interface SyncHistory {
  id: string // 历史记录ID
  timestamp: Date // 同步时间
  type: 'auto' | 'manual' // 同步类型:自动/手动
  status: 'success' | 'failed' // 同步结果
  details: string // 详细信息(JSON字符串)
  errorMessage?: string // 错误信息(如果失败)
  syncedFiles?: number // 同步的文件数量
}

export interface SyncState {
  status: 'idle' | 'syncing' | 'error' | 'completed'
  progress: number
  currentFile?: string
  error?: string
}

// WebDAV API 方法接口
export interface WebDAVAPI {
  // 获取 WebDAV 配置
  getWebDAVConfig: () => Promise<WebDAVConfig | null>

  // 更新 WebDAV 配置
  updateWebDAVConfig: (config: Partial<WebDAVConfig>) => Promise<WebDAVConfig>

  // 测试 WebDAV 连接
  testWebDAVConnection: () => Promise<boolean>

  // 执行同步
  syncWebDAV: () => Promise<void>
}
