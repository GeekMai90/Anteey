// 内容项类型
export type TimeBlockItemType =
  | 'text' // 普通文本
  | 'task' // • 待办任务
  | 'event' // ○ 事件记录
  | 'note' // - 普通笔记

// 任务状态
export type TaskStatus =
  | 'pending' // 待处理
  | 'completed' // × 已完成
  | 'migrated' // > 已迁移
  | 'scheduled' // < 已规划

// 时间块内容项
export interface TimeBlockItem {
  id: string
  type: TimeBlockItemType
  content: string
  status?: TaskStatus // 仅任务类型有状态
  createdAt: Date
  updatedAt: Date
}

// 单个时间块数据
export interface TimeBlock {
  id: string
  items: TimeBlockItem[] // 按顺序存储所有内容项
  createdAt: Date
  updatedAt: Date
  // 添加 JSON 内容字段
  content?: string
}

// 时间块日期数据
export interface TimeBlockDay {
  id: string
  date: string
  weather: string | null
  mood: string | null
  blocks: { [hour: number]: TimeBlock }
  createdAt: Date
  updatedAt: Date
}

// 时间块设置
export interface TimeBlockSettings {
  enabled: boolean
  startTime: number
  endTime: number
}

// 这个接口可以保留，用于明确表示包含完整blocks的日期数据
export interface TimeBlockDayWithBlocks extends TimeBlockDay {
  blocks: { [hour: number]: TimeBlock }
}
