import type { JsonContent } from './note'

// 文稿状态
export type ManuscriptStatus = 'draft' | 'first_draft' | 'polished' | 'completed'

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

  // 初稿数据
  firstDraftContent?: {
    type: string
    content: any[]
  }

  // 终稿(润色)数据
  polishedContent?: {
    type: string
    content: any[]
  }

  // 元数据
  createdAt: Date
  updatedAt: Date
  lastFirstDraftAt?: Date // 新增：最后生成初稿时间
  lastPolishedAt?: Date // 最后润色时间
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
  firstDraftContent?: {
    // 新增：初稿内容
    type: string
    content: JsonContent[]
  }
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

// 新增：生成初稿的参数接口
export interface GenerateFirstDraftParams {
  id: string
  style?: string
}
