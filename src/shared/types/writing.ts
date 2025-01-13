// 合集
export interface Collection {
  id: string
  name: string
  description?: string
  created_at: number
  updated_at: number
  is_deleted: boolean
  parent_id?: string // 这里定义为可选的 string
  order?: number
}

// 文章与合集的关联
export interface ArticleCollection {
  id: string
  article_id: string
  collection_id: string
  created_at: number
}

// 文章状态枚举
export type ArticleStatus = 'draft' | 'published' | 'archived'

// 文章
export interface Article {
  id: string
  title: string
  description?: string
  created_at: number
  updated_at: number
  status: ArticleStatus
  tags?: string[]
  is_deleted: boolean
  collection_ids?: string[]
  word_count?: number // 新增：字数统计
}

// 卡片类型枚举
export type WritingCardType = 'writing' | 'note' // 只保留写作卡片和引用笔记两种类型

// 文章内容卡片
export interface ArticleCard {
  id: string
  article_id: string
  card_type: WritingCardType
  card_id?: string // 关联的笔记ID（当card_type为note时）
  content?: string // 如果是写作卡片，则存储内容
  parent_id: string | null
  level: number
  order: number
  created_at: number
  updated_at: number
  prev_id?: string | null
  next_id?: string | null
}
