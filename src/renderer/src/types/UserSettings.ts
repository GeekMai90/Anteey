// 基础的用户设置字段
export interface BaseUserSettings {
  theme: 'light' | 'dark' | 'system'
  fontSize: number
  lineHeight: number
  globalHotkey: string
  authorName: string
  authorMotto: string
  qrcodeUrl: string
}

// 完整的用户设置记录
export interface UserSettings extends BaseUserSettings {
  id: string // 改为 string，因为我们使用 'default' 作为固定 ID
  createdAt: string
  updatedAt: string
}

// 用于更新的部分字段
export type UpdateUserSettings = Partial<BaseUserSettings>

// 数据库中的类型（如果在同一文件中需要用到）
export interface DBUserSettings extends BaseUserSettings {
  id: string
  createdAt: number | string // 支持时间戳
  updatedAt: number | string // 支持时间戳
}
