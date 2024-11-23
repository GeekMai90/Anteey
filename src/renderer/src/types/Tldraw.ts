// 基础类型
export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Camera {
  x: number
  y: number
  z: number
}

// 白板相关类型
export interface TldrawBoard {
  id: string
  name: string
  description?: string
  parentId?: string
  isFolder: boolean
  sortOrder?: number
  isStarred: boolean
  starredOrder?: number
  metadata?: TldrawBoardMetadata
  createdAt: Date
  updatedAt: Date
}

// 白板状态
export interface TldrawBoardState {
  boardId: string
  content: TldrawSnapshot
  camera: Camera
  createdAt: Date
  updatedAt: Date
}

// 白板中的笔记
export interface TldrawBoardNote {
  id: string
  boardId: string
  noteId: string
  position: Position
  size: Size
  rotation: number
  zIndex: number
  isLocked: boolean
  isHidden: boolean
  createdAt: Date
  updatedAt: Date
  style?: {
    backgroundColor?: string
    borderColor?: string
    textColor?: string
  }
  metadata?: {
    lastSync?: Date
    version?: number
  }
}

// 创建白板的参数
export interface CreateBoardDto {
  name: string
  description?: string
  parentId?: string
  isFolder?: boolean
  sortOrder?: number
  metadata?: TldrawBoardMetadata
}

// 更新白板的参数
export interface UpdateBoardDto {
  name?: string
  description?: string
  parentId?: string
  isFolder?: boolean
  sortOrder?: number
  isStarred?: boolean
  starredOrder?: number
  metadata?: TldrawBoardMetadata
}

// 创建白板笔记的参数
export interface CreateBoardNoteDto {
  boardId: string
  noteId: string
  position: Position
  size: Size
  rotation?: number
  zIndex: number
}

// 更新白板笔记的参数
export interface UpdateBoardNoteDto {
  position?: Position
  size?: Size
  rotation?: number
  zIndex?: number
  isLocked?: boolean
  isHidden?: boolean
}

// 白板树形结构节点
export interface TldrawBoardTreeNode extends TldrawBoard {
  children?: TldrawBoardTreeNode[]
}

// 白板列表过滤参数
export interface TldrawBoardFilter {
  parentId?: string
  isStarred?: boolean
  searchText?: string
}

// 白板排序选项
export enum TldrawBoardSortField {
  CreatedAt = 'createdAt',
  UpdatedAt = 'updatedAt',
  Name = 'name',
  StarredOrder = 'starredOrder'
}

export interface TldrawBoardSort {
  field: TldrawBoardSortField
  order: 'asc' | 'desc'
}

// 添加 metadata 类型定义
export interface TldrawBoardMetadata {
  content?: any
  camera?: {
    x: number
    y: number
    z: number
  }
}

// 添加 TldrawSnapshot 类型
export interface TldrawSnapshot {
  shapes: Record<string, TldrawShape>
  bindings: Record<string, TldrawBinding>
  assets: Record<string, TldrawAsset>
}

export interface TldrawShape {
  id: string
  type: string
  parentId: string
  childIndex: number
  props: Record<string, any>
}

export interface TldrawBinding {
  id: string
  fromId: string
  toId: string
  type: string
}

export interface TldrawAsset {
  id: string
  type: string
  src: string
  props: Record<string, any>
}

export enum TldrawErrorCode {
  BOARD_NOT_FOUND = 'BOARD_NOT_FOUND',
  NOTE_NOT_FOUND = 'NOTE_NOT_FOUND',
  INVALID_OPERATION = 'INVALID_OPERATION',
  DATABASE_ERROR = 'DATABASE_ERROR'
}

export class TldrawError extends Error {
  constructor(
    public code: TldrawErrorCode,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'TldrawError'
  }
}

export interface TldrawBoardEvent {
  type: 'create' | 'update' | 'delete'
  boardId: string
  data: TldrawBoard
}

export interface TldrawBoardStateEvent {
  type: 'save' | 'load'
  boardId: string
  state: TldrawBoardState
}

export interface TldrawBoardNoteEvent {
  type: 'create' | 'update' | 'delete'
  boardId: string
  noteId: string
  data: TldrawBoardNote
}
