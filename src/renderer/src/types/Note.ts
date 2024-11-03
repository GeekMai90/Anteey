// src/types/Note.ts

// 定义卡片类型
export type CardType = 'Maincard' | 'Bibcard' | 'Indexcard' | 'Hoplinkcard'

// 关键词接口
export interface Keyword {
  word: string
  weight: number
}

// 相关笔记接口（扩展 Note 接口）
export interface RelatedNote extends Note {
  similarity: number
  matchType?: 'keyword' | 'semantic' | 'hybrid' | 'error'
}

// 相关笔记查询结果接口
export interface RelatedNotesResult {
  success: boolean
  notes: RelatedNote[]
  error?: string // 添加可选的错误信息字段
  totalProcessed?: number // 添加这个可选属性
  stats?: {
    keywordMatches: number
    semanticMatches: number
    hybridMatches: number
    errors: number
  }
}

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

  tags: string[] // 标签列表

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

  // 语义相关
  keywords?: Keyword[] // 存储提取的关键词
  semanticVector?: number[] // 存储文本的语义向量

  // 元数据
  metadata?: {
    title?: string
    summary?: string
    references?: string[]
    attachments?: string[]
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
// 标签接口
export interface Tag {
  id: string
  name: string // 完整的标签名，如 'work/project/dev'
  path: string[] // 标签路径，如 ['work', 'project', 'dev']
  color?: string // 标签颜色（可选）
  icon?: string // 标签图标（可选）
  metadata: {
    count: number // 使用该标签的笔记数量
    lastUsed: Date // 最后使用时间
    totalCount?: number // 添加该标签及子标签的笔记总数
  }
  createdAt: Date
  updatedAt: Date
}
// 用于构建标签导航树的类型
export interface TagTreeNode {
  id: string
  name: string // 显示名称
  path: string[] // 完整路径
  children: TagTreeNode[]
  noteCount: number // 该标签及子标签的笔记总数
  totalCount?: number // 该标签及子标签的笔记总数
  color?: string // 继承自 Tag 的颜色
  icon?: string // 继承自 Tag 的图标
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
}

// 根白板
export interface RootWhiteboard {
  id: string
  createdAt: Date
  updatedAt: Date
  zoomLevel: number // 缩放级别
  scrollPosition: { x: number; y: number } // 滚动位置
  scale: number // 缩放比例
  translateX: number // 平移X
  translateY: number // 平移Y
}
// 白板
export interface Whiteboard {
  id: string
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
  position: { x: number; y: number } // 在父白板中的位置（如果是子白板）
  size: { width: number; height: number }
  parentId: string // 父白板的ID（如果是子白板）
  isTopLevel: boolean // 是否为顶级白板（直接在根白板下的白板）
  isStarred?: boolean
  starredOrder?: number
  zoomLevel: number
  scrollPosition: { x: number; y: number }
  scale: number
  translateX: number
  translateY: number
}

// 白板笔记（用于在白板中引用笔记）
export interface WhiteboardNote {
  id: string
  whiteboardId: string // 所属白板的ID
  noteId: string // 引用实际卡片笔记的ID
  position: { x: number; y: number }
  size: { width: number; height: number }
  zIndex: number
  rotation: number
  isAutoHeight: boolean // 新增：控制是否自动调整高度
  type: 'card' | 'text' | 'image' // 新增类型字段
  content?: string // 文本内容
  imageUrl?: string // 图片链接
}
// 分组
export interface WhiteboardGroup {
  id: string
  whiteboardId: string // 所属白板的ID
  name: string
  itemIds: string[] // 组内项目的ID列表
  position: { x: number; y: number }
  size: { width: number; height: number }
  zIndex: number
  style?: {
    backgroundColor?: string
    borderColor?: string
    borderStyle?: string
  }
  rotation: number
}
// 连线
export interface WhiteboardConnection {
  id: string
  whiteboardId: string // 所属白板的ID
  startItemId: string
  endItemId: string
  startEdge: 'top' | 'right' | 'bottom' | 'left'
  endEdge: 'top' | 'right' | 'bottom' | 'left'
  color?: string
  thickness?: number
  label?: string
  labelPosition?: { x: number; y: number }
  lineStyle?: 'solid' | 'dashed'
  startArrow?: boolean
  endArrow?: boolean
  lineShape?: 'straight' | 'curved' | 'angled'
  position: { x: number; y: number }
  controlPoints?: { x: number; y: number }[]
  zIndex: number
  size: { width: number; height: number }
  rotation: number
}
// 创建白板的输入
export interface CreateWhiteboardInput {
  isTopLevel: boolean
  position: { x: number; y: number }
  name: string
  description?: string
  size: { width: number; height: number }
  parentId: string
  isStarred?: boolean
  starredOrder?: number
  zoomLevel: number
  scrollPosition: { x: number; y: number }
  scale: number
  translateX: number
  translateY: number
}

// 创建白板笔记的输入
export interface CreateWhiteboardNoteInput {
  whiteboardId: string
  noteId: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  zIndex: number
  rotation: number
  isAutoHeight: boolean // 新增：控制是否自动调整高度
  type: 'card' | 'text' | 'image' // 新增类型字段
  content?: string // 文本内容
  imageUrl?: string // 图片链接
}

export interface Connection {
  id: string
  whiteboardId: string
  startItemId: string
  endItemId: string
  startPoint: { x: number; y: number }
  endPoint: { x: number; y: number }
  description?: string
}
export interface ConnectionCreateData {
  whiteboardId: string
  startItemId: string
  endItemId: string
  startPoint: { x: number; y: number }
  endPoint: { x: number; y: number }
  description?: string
}
export interface ConnectionUpdateData {
  id: string
  startPoint?: { x: number; y: number }
  endPoint?: { x: number; y: number }
  description?: string
}
