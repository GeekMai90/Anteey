// Readwise 高亮内容接口
export interface ReadwiseHighlight {
  id: string
  text: string // 高亮文本内容
  note?: string // 用户添加的笔记
  title?: string // 来源标题
  author?: string // 作者
  book_id: number // 书籍ID
  url?: string // 高亮链接
  source_type: string // 来源类型(book, article, etc)
  source_url?: string // 来源URL
  category?: string // 分类
  location?: number // 位置
  location_type?: string // 位置类型
  highlighted_at: string // 高亮时间
  created_at?: string // 创建时间
  updated_at: string // 更新时间
  tags?: string[] // 标签
  color?: string // 高亮颜色
  readwise_url?: string // Readwise的URL
  // 新增字段，存储书籍完整信息
  book_info?: ReadwiseBook
}

// Readwise 同步记录接口
export interface ReadwiseSyncRecord {
  id: string // 记录ID
  readwiseHighlightId: string // Readwise的高亮ID
  antinoteId: string // 对应到我们系统中的笔记ID
  lastSyncTime: Date // 最后同步时间
  createdAt: Date
  updatedAt: Date
}

// Readwise 同步配置接口
export interface ReadwiseSyncConfig {
  id: string
  token: string // Readwise API token
  lastSyncTime: string // 上次同步时间
  autoSync: boolean // 是否自动同步
  autoSyncInterval: number // 自动同步间隔（分钟）
  createdAt: Date
  updatedAt: Date
}

// Readwise 同步统计接口
export interface ReadwiseSyncStats {
  total: number // 总数
  added: number // 新增数
  updated: number // 更新数
  skipped: number // 已处理的笔记（非 Draftcard）跳过数
}

// Readwise API 响应接口
export interface ReadwiseApiResponse {
  count: number
  next_page_cursor?: string
  results: ReadwiseHighlight[]
}

// Readwise 错误响应接口
export interface ReadwiseApiError {
  status: number
  message: string
  code?: string
}

// Readwise 书籍信息接口
export interface ReadwiseBook {
  user_book_id: number
  title: string
  author?: string
  readable_title?: string
  source: string
  cover_image_url?: string
  unique_url?: string
  summary?: string
  category?: string
  source_url?: string
  book_tags?: Array<{ id: number; name: string }>
}
