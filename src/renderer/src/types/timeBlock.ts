// 单个时间块数据
export interface TimeBlock {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
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

// 添加未来日志接口
export interface FutureLog {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
}
