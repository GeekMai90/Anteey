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
}

// 闪卡统计信息
export interface FlashcardStats {
  totalCards: number // 总卡片数
  dueCards: number // 待复习数量
  newCards: number // 新卡片数量
  learningCards: number // 学习中的卡片
  masteredCards: number // 已掌握的卡片
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
