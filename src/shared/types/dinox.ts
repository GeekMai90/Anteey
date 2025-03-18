// Dinox 笔记接口
export interface DinoxNote {
  title: string
  createTime: string
  contentMd: string // 添加 Markdown 格式的内容字段
  noteId: string
  tags: string[]
  isDel: boolean
  isAudio: boolean
  zettelBoxes: string[]
  type: string // 添加笔记类型字段
  updateTime: string // 添加更新时间字段
  audioDetail?: {
    // 添加音频详情字段
    remote: string | null
    local: string | null
    length: number | null
  }
}

// Dinox 同步记录接口
export interface DinoxSyncRecord {
  id: string // 记录ID
  dinoxNoteId: string // Dinox的笔记ID
  antinoteId: string // 对应到我们系统中的笔记ID
  lastSyncTime: Date // 最后同步时间
  graduated: boolean // 是否已经"毕业"（转换为其他类型）
  createdAt: Date
  updatedAt: Date
}

// Dinox 同步配置接口
export interface DinoxSyncConfig {
  id: string
  token: string // Dinox API token
  lastSyncTime: string // 上次同步时间
  autoSync: boolean // 是否自动同步
  autoSyncInterval: number // 自动同步间隔（分钟）
  createdAt: Date
  updatedAt: Date
}
