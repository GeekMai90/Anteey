import { Note } from './note'

// 智能回顾笔记的响应结构
export interface ReviewResponse {
  notes: Note[] // 今日随机选中的3条笔记
  lastRefreshedAt: Date // 上次刷新时间
}

// 智能回顾的状态
export interface ReviewState {
  currentIndex: number // 当前显示的笔记索引
  remainingCount: number // 剩余未查看的笔记数量
  note: Note | null // 当前显示的笔记
}

// 小组件
export interface ReviewWidget {
  type: 'review'
  data: ReviewResponse
}
