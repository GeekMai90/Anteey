// src/renderer/src/types/flashcard.ts

// 复习反馈的类型定义
export type ReviewFeedback =
  | 'skip' // 跳过
  | 'forgot' // 完全不会
  | 'partially_recalled' // 部分记住
  | 'recalled_effort' // 费力记住
  | 'easily_recalled' // 轻松记住

// 熟练度的类型定义
export type ProficiencyLevel =
  | 'new' // 新卡片
  | 'learning' // 学习中
  | 'familiar' // 熟悉
  | 'mastered' // 已掌握

// SM2 算法数据
export interface SM2Data {
  repetitions: number // 连续正确的次数
  easiness: number // 难度因子
  interval: number // 间隔天数
}

// 闪卡数据
export interface FlashcardData {
  lastReviewedAt?: Date // 上次复习时间
  nextReviewAt?: Date // 下次复习时间
  reviewCount?: number // 复习次数
  lastFeedback?: ReviewFeedback // 上次复习的反馈结果
  proficiency?: ProficiencyLevel // 当前熟练度
  sm2?: SM2Data // SM2 算法数据
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
