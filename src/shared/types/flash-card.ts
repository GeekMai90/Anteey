// src/renderer/src/types/flashcard.ts

import type { Card as FSRSCard, StateType as FSRSStateType } from 'ts-fsrs'
import { State } from 'ts-fsrs'

// 复习反馈的类型定义
export type ReviewFeedback =
  | 'skip' // Manual
  | 'forgot' // Again
  | 'partially_recalled' // Hard
  | 'recalled_effort' // Good
  | 'easily_recalled' // Easy

// 熟练度的类型定义（直接使用 FSRS 的状态）
export type ProficiencyLevel = FSRSStateType // 'New' | 'Learning' | 'Review' | 'Relearning'

// 时间统计数据
export interface TimeStats {
  totalTime: number // 总用时（毫秒）
  lastReviewTime: number // 最近一次复习用时（毫秒）
}

// 闪卡数据
export interface FlashcardData {
  lastReviewedAt?: Date
  nextReviewAt?: Date
  reviewCount?: number
  lastFeedback?: ReviewFeedback
  proficiency?: ProficiencyLevel
  fsrs?: FSRSCard & {
    state: State // 确保这里是 State 枚举类型
  }
  timeStats?: TimeStats // 新增时间统计数据
}

// 闪卡统计信息
export interface FlashcardStats {
  totalCards: number // 总卡片数
  dueCards: number // 待复习数量
  newCards: number // 新卡片数量
  learningCards: number // 学习中的卡片
  masteredCards: number // 已掌握的卡片
  todayStats: DailyStats // 新增今日统计
  weeklyStats: DailyStats[] // 新增周统计
  history: {
    daysStudied: number
    currentStreak: number
    bestStreak: number
    heatmap: Array<{
      date: string
      count: number
      level: 'none' | 'few' | 'target' | 'above_target'
    }>
  }
}

// 卡组基础统计信息
export interface DeckStats {
  dueCount: number // 待复习数量
  totalCount: number // 总卡片数
  masteredCount: number // 已掌握数量
  progress: number // 学习进度(百分比)
}

// 标签卡组信息
export interface TaggedDeck extends DeckStats {
  tagId: string // 标签ID
  name: string // 标签名称
}

// 未分类卡组信息
export interface UntaggedDeck extends DeckStats {
  // 继承基础统计信息即可
}

// 所有卡组数据
export interface FlashcardDecks {
  untagged: UntaggedDeck // 未分类卡组
  tagged: TaggedDeck[] // 标签卡组列表
}

// 卡组类型
export type DeckType = 'untagged' | 'tagged'

// 卡组排序方式
export type DeckSortBy =
  | 'name' // 按名称
  | 'dueCount' // 按待复习数量
  | 'totalCount' // 按总卡片数
  | 'progress' // 按进度
  | 'lastReviewed' // 按最后复习时间

// 记忆卡设置
export interface FlashcardSettings {
  // 学习计划
  dailyGoal: number // 每日目标数量
  newCardsPerDay: number // 每日新卡片数量
  reviewsPerDay: number // 每日复习上限
  dayStartsAt: number // 新的一天开始时间(0-23小时)
  // 学习顺序
  newCardPosition: 'mix' | 'front' | 'end' // 新卡片顺序
  // 算法参数
  requestRetention: number // 目标记忆率
  maximumInterval: number // 最大间隔天数
  // 界面设置
  simplifyButtons: boolean // 简化反馈按钮
  showNextReview: boolean // 显示下次复习时间
  // 统计设置
  maxAnswerTime: number // 最大记忆卡片回答时间(秒)
  forgetThreshold: number // 遗忘阈值(次数)
  reviewAgainAfter: number // 超前学习时间(分钟)
}

// 默认设置
export const DEFAULT_FLASHCARD_SETTINGS: FlashcardSettings = {
  dailyGoal: 30, // 默认每日目标 30 张卡片
  newCardsPerDay: 20,
  reviewsPerDay: 100,
  dayStartsAt: 4, // 默认凌晨 4 点开始新的一天
  newCardPosition: 'mix',
  requestRetention: 0.9,
  maximumInterval: 180,
  simplifyButtons: false, // 默认显示完整按钮
  showNextReview: true, // 默认显示下次复习时间
  maxAnswerTime: 20, // 默认 20 秒
  forgetThreshold: 4, // 默认 4 次
  reviewAgainAfter: 15 // 默认 15 分钟
}

// 复习记录
export interface ReviewRecord {
  id: string
  noteId: string
  reviewedAt: Date
  feedback: ReviewFeedback
  reviewTime: number // 毫秒
}

// 每日统计
export interface DailyStats {
  date: string
  uniqueCards: number // 去重后的卡片数
  totalReviews: number // 总复习次数
  totalTime: number // 总复习时间(毫秒)
  feedbackStats: {
    // 各类反馈的统计
    skip: number
    forgot: number
    partially_recalled: number
    recalled_effort: number
    easily_recalled: number
  }
}

// 学习历史热力图数据
export interface StudyHeatmap {
  date: string // 日期 YYYY-MM-DD
  count: number // 学习卡片数量
  level: 'none' | 'few' | 'target' | 'above_target' // 学习量级别
}

// 学习历史统计
export interface StudyHistory {
  daysStudied: number // 总学习天数
  currentStreak: number // 当前连续学习天数
  bestStreak: number // 最佳连续学习天数
  heatmap: StudyHeatmap[] // 最近6个月的每日学习数据(展示用)
  allRecords?: StudyHeatmap[] // 可选:所有历史记录
}
