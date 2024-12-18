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
// export interface WhiteboardConnection {
//   id: string
//   whiteboardId: string // 所属白板的ID
//   startItemId: string
//   endItemId: string
//   startEdge: 'top' | 'right' | 'bottom' | 'left'
//   endEdge: 'top' | 'right' | 'bottom' | 'left'
//   color?: string
//   thickness?: number
//   label?: string
//   labelPosition?: { x: number; y: number }
//   lineStyle?: 'solid' | 'dashed'
//   startArrow?: boolean
//   endArrow?: boolean
//   lineShape?: 'straight' | 'curved' | 'angled'
//   position: { x: number; y: number }
//   controlPoints?: { x: number; y: number }[]
//   zIndex: number
//   size: { width: number; height: number }
//   rotation: number
// }

// 文本卡片
export interface WhiteboardTextCard {
  id: string
  whiteboardId: string
  content: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  zIndex: number
  rotation: number
  style?: {
    backgroundColor?: string
    textColor?: string
    fontSize?: number
    fontFamily?: string
  }
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
