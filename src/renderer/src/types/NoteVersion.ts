import { CardType } from './Note'

// 笔记版本的类型定义
export interface NoteVersion {
  id: string // 版本ID
  noteId: string // 关联的笔记ID

  // 核心笔记信息
  content: any // 版本内容
  address: string // 笔记编码地址
  cardType: CardType // 卡片类型
  createdAt: Date // 笔记创建时间

  // 版本信息
  versionCreatedAt: Date // 版本创建时间
  versionNumber: number // 版本号
}

// 创建版本时的参数
export interface CreateVersionParams {
  noteId: string
  content: any
  address: string
  cardType: CardType
  createdAt: Date // 笔记创建时间
}

// 版本列表的查询参数
export interface GetVersionsParams {
  noteId: string
  limit?: number // 限制返回数量
  offset?: number // 分页偏移量
}

// 版本恢复参数
export interface RestoreVersionParams {
  noteId: string
  versionId: string
}
