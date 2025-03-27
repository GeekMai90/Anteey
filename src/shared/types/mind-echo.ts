import type { Note } from './note'
import type { MessageRecord } from './ai-chat'

// 思维共鸣的类型定义
export interface MindEcho {
  id: string
  noteId: string // 关联的笔记ID
  conversationId: string // 关联的AI对话ID
  messageId: string // 具体的消息ID
  title: string // 回响标题
  content: string // 回响内容（可以复用Note中的JsonContent类型）
  summary: string // 简短总结，用于折叠状态显示
  createdAt: Date
  updatedAt: Date
  order?: number // 显示顺序
  isArchived?: boolean // 是否归档
}

// 创建思维共鸣的参数接口
export interface CreateMindEchoParams {
  noteId: string
  conversationId: string
  messageId: string
  title: string
  content: string
  summary: string
}

// 更新思维共鸣的参数接口
export interface UpdateMindEchoParams {
  id: string
  title?: string
  content?: string
  summary?: string
  order?: number
  isArchived?: boolean
}

// 查询思维共鸣的参数接口
export interface GetMindEchoesParams {
  noteId: string
  includeArchived?: boolean
}

// 思维共鸣的完整信息（包含关联数据）
export interface MindEchoWithRelations extends MindEcho {
  note?: Note
  conversation?: {
    id: string
    title: string
    message?: MessageRecord
  }
}

// 批量操作类型
export type MindEchoBatchOperationType =
  | 'archive' // 归档
  | 'unarchive' // 取消归档
  | 'delete' // 删除
  | 'reorder' // 重新排序

// 批量操作参数接口
export interface MindEchoBatchOperationParams {
  echoIds: string[]
  operationType: MindEchoBatchOperationType
  payload?: {
    orders?: { [key: string]: number } // 用于reorder操作
  }
}

// 批量操作结果接口
export interface MindEchoBatchOperationResult {
  success: boolean
  affectedEchoes: string[]
  failedEchoes?: {
    id: string
    error: string
  }[]
  message?: string
}

// AI生成思维共鸣的请求参数
export interface GenerateMindEchoParams {
  noteId: string
  conversationId: string
  messageId: string
}

// AI生成思维共鸣的响应结果
export interface GenerateMindEchoResult {
  title: string
  content: string
  summary: string
  error?: {
    code: string
    message: string
  }
}
