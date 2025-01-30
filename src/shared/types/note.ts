// src/types/Note.ts
import type { FlashcardData } from '@shared/types'

// 定义卡片类型
export type CardType = 'Maincard' | 'Bibcard' | 'Indexcard' | 'Hoplinkcard'

// 卡片笔记
export interface Note {
  [key: string]: any // 添加这行，允许字符串索引
  id: string
  type: 'note'
  address: string // Zettelkasten 编码地址
  cardType: CardType // 卡片类型
  content: object // 包含标题和正文
  createdAt: Date
  updatedAt: Date
  lastVectorizedAt?: Date

  // 引用关系
  references: References

  // 关系树缓存
  relationshipTree?: RelationshipTree

  // 图谱相关
  graphData?: {
    x?: number
    y?: number
    cluster?: string
    weight?: number
    level?: number
  }

  cardBoxId?: string
  parentId?: string // 父笔记的ID，支持笔记的层级结构
  isDeleted?: boolean
  isStarred?: boolean
  starredOrder?: number
  rightBarOrder?: number

  // 元数据
  metadata?: {
    title?: string
    summary?: string
    references?: string[]
    attachments?: string[]
  }

  // 新增：闪卡相关属性
  isFlashcard: boolean
  flashcard?: FlashcardData
}

// 引用类型和关系树接口保持不变
export type ReferenceType =
  | 'quote'
  | 'reference'
  | 'parent'
  | 'child'
  | 'sibling'
  | 'related'
  | 'sequence'

// 数据库中的引用关系接口
export interface NoteReference {
  id: string // 引用关系的唯一ID
  sourceNoteId: string // 引用源笔记ID
  targetNoteId: string // 被引用笔记ID
  type: 'reference' // 引用类型，目前固定为 'reference'
  context: {
    // 引用上下文
    text: string // 上下文文本
    position: number // 在文档中的位置
  }
  metadata: {
    // 引用元数据
    address: string // 引用笔记的地址
    title: string // 被引用笔记标题
    preview: string // 预览内容
    cardType?: CardType // 可选：笔记类型
  }
  createdAt: Date
  updatedAt: Date
}

// 笔记内部的引用关系接口（outgoing和incoming使用）
export interface InternalNoteReference {
  id: string
  sourceNoteId?: string // incoming引用需要
  targetNoteId?: string // outgoing引用需要
  type: 'reference'
  context: {
    text: string
    position: number
  }
  metadata: {
    address: string
    title: string
    preview: string
    cardType?: CardType
  }
  createdAt: Date
  updatedAt: Date
}

// 笔记的引用集合接口
export interface References {
  incoming: InternalNoteReference[]
  outgoing: InternalNoteReference[]
}

export interface RelationshipTree {
  parents: string[]
  children: string[]
  siblings: string[]
  sequence?: {
    prev?: string
    next?: string
    order?: number
  }
}

// 标签基础接口
export interface Tag {
  id: string
  name: string
  path: string[]
  color?: string
  icon?: string
  pinned: boolean
  pinOrder?: number
  useCount?: number
  createdAt: Date
  updatedAt: Date
}
// 用于构建标签导航树的类型
// 标签树节点（用于UI展示）
export interface TagTreeNode {
  id: string
  name: string
  path: string[]
  children: TagTreeNode[]
  noteCount: number // 直接使用该标签的笔记数
  totalCount: number // 包含子标签的笔记总数
  color?: string
  icon?: string
  pinned: boolean
  pinOrder?: number
}

// 卡片盒（文件夹）
export interface CardBox {
  id: string
  type: 'cardbox'
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
  noteIds: string[] //包含的笔记 id 列表
  parentId?: string // 父卡片盒的ID，支持嵌套结构
  isStarred?: boolean
  starredOrder?: number
  isPinned?: boolean
  pinnedOrder?: number
}

export interface SearchParams {
  mode: 'all' | 'address' | 'title'
  term: string
}

// 创建引用关系参数
export interface CreateNoteReferenceParams {
  sourceNoteId: string
  targetNoteId: string
  type: 'reference'
  context: {
    text: string
    position: number
  }
  metadata: {
    title: string
    preview: string
    cardType?: CardType // 使用 CardType 类型
  }
}

export interface GetPaginatedNotesParams {
  page: number
  limit: number
  cardBoxId?: string // 'all' | 'inbox' | string
  cardTypes?: string[] // ['Maincard', 'Bibcard', 'Indexcard']
  tags?: string[] // 标签ID数组
  keyword?: string // 搜索关键词
  isFlashcard?: boolean // 添加闪卡参数
  sortBy: string // 排序字段
  sortOrder: 'asc' | 'desc'
  customFilterId?: string // 新增：自定义筛选规则ID
}

// 时间线查询参数接口
export interface TimelineQueryParams {
  mode: 'all' | 'date' | 'range' // 查询模式
  page?: number // 分页模式参数
  limit?: number
  date?: string // 具体日期查询参数
  dateRange?: {
    // 日期范围查询参数
    start: Date
    end: Date
  }
  cardTypes?: CardType[] // 卡片类型过滤
  sortOrder?: 'asc' | 'desc' // 排序方向
  searchTerm?: string // 搜索关键词
  searchFields?: ('content' | 'address' | 'metadata')[] // 搜索字段
}

// 时间线查询结果接口
export interface TimelineQueryResult {
  notes: Note[] // 笔记列表
  totalCount: number // 总数
  currentPage?: number // 当前页码（仅在 mode='all' 时返回）
  hasMore?: boolean // 是否还有更多（仅在 mode='all' 时返回）
}
