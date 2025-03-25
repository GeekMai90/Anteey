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

// 添加 AI 功能类型枚举
export type AIFeatureType = 'firstDraft' | 'polish'

// 添加 AI 功能配置接口
export interface AIFeatureConfig {
  featureType: AIFeatureType
  modelConfigId: string // 关联到 ModelConfig 的 id
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

  // 添加 AI 功能配置
  aiFeatureConfigs?: AIFeatureConfig[] // 每个文稿可以有自己的 AI 功能配置

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
    type: string
    content: JsonContent[]
  }
  polishedContent?: {
    type: string
    content: JsonContent[]
  }
  aiFeatureConfigs?: AIFeatureConfig[] // 添加 AI 功能配置更新
}

// 提示词模板类型
export type PromptTemplateType = 'firstDraft' | 'polish'

// 提示词模板 - 修改后的接口
export interface PromptTemplate {
  id: string
  type: PromptTemplateType // 模板类型：初稿/润色/深度思考
  content: string // 模板内容
  description?: string // 可选的描述
  createdAt: Date
  updatedAt: Date
}

// 创建提示词模板的参数 - 简化后的接口
export interface CreatePromptTemplateParams {
  type: PromptTemplateType
  content: string
  description?: string
}

// 更新提示词模板的参数 - 简化后的接口
export interface UpdatePromptTemplateParams {
  type: PromptTemplateType
  content: string
  description?: string
}

// AI 功能参数接口 - 移除 promptTemplateId
export interface PolishManuscriptParams {
  id: string
  style?: string
  modelConfigId?: string
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
  modelConfigId?: string
}

// 添加深度思考参数接口
export interface DeepThinkingParams {
  id: string
  style?: string
  modelConfigId?: string
}
