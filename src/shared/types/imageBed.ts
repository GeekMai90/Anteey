// 图床服务类型
export type ImageBedType = 'aliyun-oss' | 'qiniu' | 'tencent-cos' | 'aws-s3'

// 图片上传状态
export type ImageUploadStatus = 'local' | 'uploading' | 'uploaded' | 'failed'

// 阿里云OSS配置
export interface AliyunOSSConfig {
  enabled: boolean
  accessKeyId: string
  accessKeySecret: string
  bucket: string
  region: string
  endpoint?: string
  customDomain?: string
  pathPrefix?: string // 路径前缀，如 'images/'
}

// 腾讯云COS配置
export interface TencentCOSConfig {
  enabled: boolean
  secretId: string
  secretKey: string
  bucket: string
  region: string
  endpoint?: string
  customDomain?: string
  pathPrefix?: string // 路径前缀，如 'images/'
}

// 图床配置（数据库结构）
export interface ImageBedConfig {
  id: string
  name: string
  type: ImageBedType
  enabled: boolean
  isDefault: boolean
  // 阿里云OSS字段
  accessKeyId?: string
  accessKeySecret?: string
  // 腾讯云COS字段
  secretId?: string
  secretKey?: string
  // 通用字段
  bucket?: string
  region?: string
  endpoint?: string
  customDomain?: string
  pathPrefix?: string
  extraConfig?: any
  createdAt: Date
  updatedAt: Date
  lastTestTime?: Date
  testResult?: boolean
  testMessage?: string
}

// 图片映射信息
export interface ImageMappingInfo {
  id: string // 图片ID（UUID）
  localPath: string // 本地路径：app-image:///images/{uuid}.{ext}
  remotePath?: string // 远程路径：https://domain.com/images/{uuid}.{ext}
  uploadStatus: ImageUploadStatus
  preferRemote: boolean // 是否优先显示远程图片
  uploadTime?: number // 上传时间戳
  lastSyncTime?: number // 最后同步时间
  fileSize?: number // 文件大小
  mimeType?: string // 文件类型
  errorMessage?: string // 错误信息（上传失败时）
}

// 图床上传参数
export interface ImageBedUploadParams {
  file: File | Buffer
  filename: string
  mimeType?: string
  pathPrefix?: string
}

// 图床上传结果
export interface ImageBedUploadResult {
  success: boolean
  url?: string
  remotePath?: string
  objectName?: string
  size?: number
  error?: string
  errorMessage?: string
  uploadTime?: number
}

// 图床连接测试结果
export interface ImageBedTestResult {
  success: boolean
  message: string
  latency?: number // 延迟（毫秒）
}

// 图片迁移参数
export interface ImageMigrationParams {
  imageId: string
  forceReupload?: boolean // 是否强制重新上传
}

// 图片迁移结果
export interface ImageMigrationResult {
  success: boolean
  imageId: string
  remotePath?: string
  errorMessage?: string
}

// 批量迁移参数
export interface BatchMigrationParams {
  imageIds: string[]
  concurrency?: number // 并发数，默认3
  onProgress?: (completed: number, total: number, current: string) => void
}

// 批量迁移结果
export interface BatchMigrationResult {
  total: number
  successful: number
  failed: number
  results: ImageMigrationResult[]
}

// 图床统计信息
export interface ImageBedStats {
  totalImages: number
  localOnlyImages: number
  uploadedImages: number
  failedImages: number
  totalLocalSize: number
  totalRemoteSize: number
  lastSyncTime?: number
}

// 图片显示模式
export type ImageDisplayMode = 'auto' | 'remote-first' | 'local-only'

// 图床设置
export interface ImageBedSettings {
  enabled: boolean
  displayMode: ImageDisplayMode
  autoUpload: boolean // 新图片是否自动上传
  retryCount: number // 上传失败重试次数
  retryDelay: number // 重试延迟（毫秒）
  config: ImageBedConfig
}
