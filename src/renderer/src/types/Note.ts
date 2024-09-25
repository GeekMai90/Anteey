// src/types/Note.ts

// 定义卡片类型
export type CardType = 'Maincard' | 'Bibcard' | 'Indexcard' | 'Hoplinkcard'

// 卡片笔记
export interface Note {
  id: string
  type: 'note'
  address: string // Zettelkasten 编码地址
  cardType: CardType // 卡片类型
  content: object // 包含标题和正文
  createdAt: Date
  updatedAt: Date
  tags: string[] // 标签列表
  linkedTo: string[]
  linkedFrom: string[]
  cardBoxId?: string
  parentId?: string // 父笔记的ID，支持笔记的层级结构
  isDeleted?: boolean
  isStarred?: boolean
  starredOrder?: number
  rightBarOrder?: number
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

// 标签
export interface Tag {
  id: string
  type: 'tag'
  name: string
  color: string
}

// 白板项目
export type WhiteboardItem = WhiteboardNote | WhiteboardSubboard | WhiteboardGroup | Connection

export interface CreateWhiteboardInput {
  isRoot: boolean
  position: { x: number; y: number }
  name: string
  description?: string
  size: { width: number; height: number }
  parentId?: string
  isStarred?: boolean
  starredOrder?: number
  zoomLevel: number
  scrollPosition: { x: number; y: number }
  scale: number
  translateX: number
  translateY: number
}

// 根白板
export interface RootWhiteboard {
  id: string
  createdAt: Date
  updatedAt: Date
  items: Whiteboard[] // 包含子白板
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
  items: WhiteboardItem[] // 包含卡片笔记、子白板、分组和连接
  position: { x: number; y: number } // 在父白板中的位置（如果是子白板）
  size: { width: number; height: number } // 在父白板中的大小（如果是子白板）
  parentId?: string // 父白板的ID（如果是子白板）
  isRoot: boolean // 是否为顶层白板
  isStarred?: boolean // 是否被标星
  starredOrder?: number // 标星顺序
  zoomLevel: number // 缩放级别
  scrollPosition?: { x: number; y: number } // 滚动位置
  scale: number // 缩放比例
  translateX: number // 平移X
  translateY: number // 平移Y
}

// 创建白板笔记的输入
export interface CreateWhiteboardNoteInput {
  whiteboardId: string
  noteId: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  zIndex: number
  rotation: number
}

// 白板上的笔记引用
export interface WhiteboardNote {
  id: string
  type: 'note'
  noteId: string // 引用实际卡片笔记的ID
  position: { x: number; y: number }
  size: { width: number; height: number }
  zIndex: number
  rotation: number
}

// 白板上的白板引用
export interface WhiteboardSubboard {
  id: string
  type: 'subboard'
  whiteboardId: string // 引用实际白板的ID
  position: { x: number; y: number }
  size: { width: number; height: number }
  zIndex: number
}

// 白板上的分组
export interface WhiteboardGroup {
  id: string
  type: 'group'
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
}

// 白板上的连线
export interface Connection {
  id: string
  type: 'connection'
  startItemId: string // 起点项目的ID
  endItemId: string // 终点项目的ID
  startEdge: 'top' | 'right' | 'bottom' | 'left' // 起点边
  endEdge: 'top' | 'right' | 'bottom' | 'left' // 终点边
  color?: string // 连线颜色
  thickness?: number // 连线粗细
  label?: string // 连线中的文字内容
  labelPosition?: { x: number; y: number } // 新增：标签位置
  lineStyle?: 'solid' | 'dashed' // 连线样式
  startArrow?: boolean // 起点是否有箭头，默认false
  endArrow?: boolean // 终点是否有箭头，默认true
  lineShape?: 'straight' | 'curved' | 'angled' // 连线形状
  position?: { x: number; y: number } // 新增：连线的位置
  controlPoints?: { x: number; y: number }[] // 新增：控制点，用于调整连线形状
  zIndex?: number // 新增：用于控制连线的层级
}
