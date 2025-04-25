// src/types/Note.ts
import type { FlashcardData, IconName } from '@shared/types'

// 定义卡片类型
export type CardType =
  | 'Maincard'
  | 'Bibcard'
  | 'Indexcard'
  | 'Hoplinkcard'
  | 'Draftcard'
  | 'Snippetcard'

// 批量操作类型
export type BatchOperationType =
  | 'moveToCardBox' // 移动到卡片盒
  | 'delete' // 删除
  | 'convertToFlashcard' // 转换为闪卡
  | 'removeFlashcard' // 取消闪卡
  | 'addTags' // 添加标签
  | 'removeTags' // 移除标签
  | 'changeCardType' // 修改卡片类型

// 批量操作参数接口
export interface BatchOperationParams {
  noteIds: string[] // 要操作的笔记 ID 列表
  operationType: BatchOperationType
  payload?: {
    cardBoxId?: string // 用于 moveToCardBox
    cardType?: CardType // 用于 changeCardType
    tagIds?: string[] // 用于 addTags 和 removeTags
  }
}

// 批量操作结果接口
export interface BatchOperationResult {
  success: boolean
  affectedNotes: string[] // 成功操作的笔记 ID 列表
  failedNotes?: {
    // 操作失败的笔记信息
    id: string
    error: string
  }[]
  message?: string // 操作结果消息
}

export interface JsonContent {
  type: string
  content?: JsonContent[]
  text?: string
  marks?: { type: string }[]
  attrs?: {
    level?: number
    textAlign?: string
    src?: string
    alt?: string
    title?: string
  }
}

// 卡片笔记
export interface Note {
  id: string
  type: 'note'
  title: string // 新增：直接在根级别添加 title 字段
  address: string
  cardType: CardType

  // 新增：索引相关字段
  isIndexed?: boolean
  indexInfo?: {
    firstLetter: string // 首字母分类
    order: number // 排序权重
    addedAt: Date // 添加到索引的时间
  }

  content: {
    type: string
    content: JsonContent[]
  }
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
    title?: string // 保留原有的 title 字段以保持向后兼容
    summary?: string
    references?: string[]
    attachments?: string[]
    // Dinox 相关元数据
    dinoxNoteId?: string
    dinoxCreateTime?: string
    // Readwise 相关元数据
    readwiseHighlightId?: string // 高亮的唯一ID
    readwiseBookId?: number // 对应书籍的ID
    readwiseHighlightedAt?: string // 高亮创建时间
  }

  // 新增：闪卡相关属性
  isFlashcard: boolean
  flashcard?: FlashcardData
  nextReviewAt?: Date

  // 新增：关键词和标签相关
  keywords?: string[] // 存储关键词
  suggestedTags?: string[] // 存储推荐标签
  aiProcessingStatus?: {
    // AI处理状态
    keywords: 'pending' | 'processing' | 'completed' | 'failed'
    lastKeywordUpdateAt?: Date // 最后关键词更新时间
  }
  vectorStatus?: {
    // 向量处理状态
    status: 'pending' | 'processing' | 'completed' | 'failed'
    lastVectorizedAt?: Date // 最后向量化时间
  }
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
  icon?: IconName
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
  icon?: IconName
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
  targetNoteId?: string // 新增：目标笔记ID
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

// 1. 首先需要更新 GetPaginatedNotesResponse 接口
export interface GetPaginatedNotesResponse {
  notes: Note[]
  totalCount: number
  targetPosition?: number // 添加可选的 targetPosition 属性
}

// 新增：AI处理结果接口
export interface AIProcessingResult {
  keywords: string[]
  suggestedTags: string[]
}

// 新增：处理状态类型
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface SearchResult {
  id: string
  title: string
  address: string
  blocks: Array<{ content: string }>
  priority: number
}

// 表格展示用的笔记接口
export interface TableNote {
  noteId: string
  address: string
  title: string
  referenceCount: number
  referencedCount: number
  createdAt: string
  updatedAt: string
  references: Array<{
    noteId: string
    address: string
    title: string
  }>
  referencedBy: Array<{
    noteId: string
    address: string
    title: string
  }>
}
