import type { XYPosition } from '@vue-flow/core'

// 视图状态类型
export interface Viewport {
  x: number
  y: number
  zoom: number
}

// 思维板基本信息
export interface Mindboard {
  id: string
  name: string
  description?: string
  viewport: Viewport
  created_at: string
  updated_at: string
}

// 节点类型枚举
export enum MindboardNodeType {
  TEXT = 'text',
  NOTE = 'note',
  IMAGE = 'image'
}

// 节点基础接口
interface BaseMindboardNode {
  id: string
  mindboard_id: string
  parent_id?: string
  type: MindboardNodeType
  position: XYPosition
  draggable?: boolean
  selected?: boolean
  created_at: string
  updated_at: string
}

// 文字卡片节点
export interface TextMindboardNode extends BaseMindboardNode {
  type: MindboardNodeType.TEXT
  data: {
    content: any // TipTap JSON content
    label: string
    toolbarPosition: string
    toolbarVisible: boolean
    action: string | null
    width: number
    height: number
    backgroundColor: string
    borderColor: string
  }
}

// 笔记卡片节点
export interface NoteMindboardNode extends BaseMindboardNode {
  type: MindboardNodeType.NOTE
  data: {
    note_id: string
    label: string
    toolbarPosition: string
    toolbarVisible: boolean
    action: string | null
    width: number
    height: number
    backgroundColor: string
    borderColor: string
  }
}

// 图片卡片节点
export interface ImageMindboardNode extends BaseMindboardNode {
  type: MindboardNodeType.IMAGE
  data: {
    image_path: string
    label: string
    toolbarPosition: string
    toolbarVisible: boolean
    action: string | null
    width: number
    height: number
    backgroundColor: string
    borderColor: string
  }
}

// 节点类型联合
export type MindboardNode = TextMindboardNode | NoteMindboardNode | ImageMindboardNode

// 连线数据
export interface MindboardEdge {
  id: string
  mindboard_id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
  type: string
  style?: {
    animated?: boolean
    selected?: boolean
  }
  created_at: string
  updated_at: string
}

// 数据库操作接口
export interface MindboardService {
  // 思维板操作
  createMindboard(data: Omit<Mindboard, 'id' | 'created_at' | 'updated_at'>): Promise<Mindboard>
  getMindboard(id: string): Promise<Mindboard>
  updateMindboard(id: string, data: Partial<Mindboard>): Promise<Mindboard>
  deleteMindboard(id: string): Promise<void>

  // 节点操作
  createNode(data: Omit<MindboardNode, 'id' | 'created_at' | 'updated_at'>): Promise<MindboardNode>
  getNodes(mindboardId: string): Promise<MindboardNode[]>
  updateNode(id: string, data: Partial<MindboardNode>): Promise<MindboardNode>
  deleteNode(id: string): Promise<void>

  // 连线操作
  createEdge(data: Omit<MindboardEdge, 'id' | 'created_at' | 'updated_at'>): Promise<MindboardEdge>
  getEdges(mindboardId: string): Promise<MindboardEdge[]>
  updateEdge(id: string, data: Partial<MindboardEdge>): Promise<MindboardEdge>
  deleteEdge(id: string): Promise<void>
}
