// 图片基础信息
export interface ImageInfo {
  id: string
  filename: string
  path: string
  hash: string
  size: number
  createdAt: number | null
  lastUsed: number | null
}

// 带有使用状态的图片信息
export interface ImageWithStatus extends ImageInfo {
  isOrphan: boolean // 是否为孤立图片
  usageCount: number // 被引用次数
  notes?: {
    // 可选：关联的笔记信息
    id: string
    title: string
  }[]
}

// 图片查询参数
export interface ImageQueryParams {
  status?: 'all' | 'orphaned' | 'linked' // 图片状态过滤
  sortBy?: 'lastUsed' | 'size' | 'filename' // 排序字段
  sortOrder?: 'asc' | 'desc' // 排序方向
  page?: number // 分页
  pageSize?: number // 每页数量
}

// 图片查询结果
export interface ImageQueryResult {
  images: ImageWithStatus[]
  total: number
  orphanedCount: number // 孤立图片数量
  totalSize: number // 所有图片总大小
}
