// 基础用户设置字段
export interface BaseUserSettings {
  // 外观设置
  theme: 'light' | 'dark' | 'system'
  fontSize: number
  lineHeight: number
  uiFont: string
  editorFont: string

  // 功能开关
  enableWhiteboard: boolean
  enableAIAssistant: boolean

  // 界面状态
  defaultPage: string
  starredExpanded: boolean
  tagsExpanded: boolean
  recentExpanded: boolean

  // 用户信息
  globalHotkey: string
  authorName: string
  authorMotto: string
  qrcodeUrl: string
}

// 完整的用户设置记录
export interface UserSettings extends BaseUserSettings {
  id: string // 使用 'default' 作为固定 ID
  createdAt: string
  updatedAt: string
}

// 用于更新的部分字段
export type UpdateUserSettings = Partial<BaseUserSettings>

// 数据库中的类型
export interface DBUserSettings extends BaseUserSettings {
  id: string
  createdAt: number // 使用时间戳
  updatedAt: number // 使用时间戳
}

export interface AppearanceSettings {
  id: string
  uiFont: string
  editorFont: string
  defaultPage: string
  starredExpanded: boolean
  tagsExpanded: boolean
  recentExpanded: boolean
  enableWhiteboard: boolean
  enableAIAssistant: boolean
  enableHoverSidebar: boolean
  showSlimSidebar: boolean
  aiProcessModelId: string | null
  createdAt: Date
  updatedAt: Date
  loadingAnimationType:
    | 'candle'
    | 'pencil'
    | 'mouse'
    | 'pacman'
    | 'taichi'
    | 'windmill'
    | 'washing'
    | 'typewriter'
    | 'loadingFox'
}
