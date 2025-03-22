import type { JsonContent } from './note'

// 文稿状态
export type ManuscriptStatus = 'draft' | 'polished' | 'completed'

// 文稿中的卡片类型
export type ManuscriptCardType = 'reference' | 'paragraph'

// 文稿中的卡片
export interface ManuscriptCard {
  id: string
  type: 'reference' | 'paragraph'
  content: any // 或者更具体的类型
  order: number
  noteId?: string // 如果是引用卡片，关联原笔记 ID
  createdAt: Date
  updatedAt: Date
}

// 文稿接口
export interface Manuscript {
  id: string
  title: string
  status: ManuscriptStatus
  cards: ManuscriptCard[]

  // 草稿模式数据
  draftCards: ManuscriptCard[]

  // 润色模式数据
  polishedContent?: {
    type: string
    content: any[]
  }

  // 元数据
  createdAt: Date
  updatedAt: Date
  lastPolishedAt?: Date
}

// 创建文稿的参数
export interface CreateManuscriptParams {
  title: string
}

// 更新文稿的参数
export interface UpdateManuscriptParams {
  id: string
  title?: string
  status?: ManuscriptStatus
  draftCards?: ManuscriptCard[]
  polishedContent?: {
    type: string
    content: JsonContent[]
  }
}

// AI 润色请求参数
export interface PolishManuscriptParams {
  id: string
  style?: string
}

// 文稿卡片操作参数
export interface ManuscriptCardOperation {
  manuscriptId: string
  operation: 'add' | 'remove' | 'move' | 'update'
  cardId?: string
  noteId?: string // 添加引用卡片时使用
  content?: {
    type: string
    content: JsonContent[]
  }
  order?: number
}

// 写作台接口（用于管理多个文稿）
export interface WritingDesk {
  manuscripts: Manuscript[]
  totalCount: number
  recentManuscripts?: Manuscript[] // 最近编辑的文稿
}
