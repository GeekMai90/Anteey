// 思维板元素的基础类型
interface MindBoardElementBase {
  id: string
  position: {
    x: number
    y: number
  }
  size: {
    width: number
    height: number
  }
  rotation?: number
  zIndex: number
}

// 文字卡片
interface TextCard extends MindBoardElementBase {
  type: 'text'
  content: string
  style?: {
    backgroundColor?: string
    textColor?: string
    fontSize?: number
  }
}

// 笔记卡片
interface NoteCard extends MindBoardElementBase {
  type: 'note'
  noteId: string // 引用的笔记ID
  preview?: {
    title: string
    content: string
  }
}

// 图片卡片
interface ImageCard extends MindBoardElementBase {
  type: 'image'
  imageId: string // 图片ID
  url: string // 图片URL
  alt?: string // 图片描述
}

// 连线样式选项
interface ConnectionStyle {
  // Leader Line 的样式选项
  color?: string
  size?: number
  dash?: boolean | number[]
  gradient?: {
    startColor: string
    endColor: string
  }
  startPlug?: 'arrow1' | 'arrow2' | 'arrow3' | 'disc' | 'square' | 'dot' | 'behind'
  endPlug?: 'arrow1' | 'arrow2' | 'arrow3' | 'disc' | 'square' | 'dot' | 'behind'
  startPlugSize?: number
  endPlugSize?: number
  startPlugColor?: string
  endPlugColor?: string
  path?: 'straight' | 'arc' | 'fluid' | 'magnet' | 'grid'
  outline?: boolean
  outlineColor?: string
  outlineSize?: number
  startSocket?: 'top' | 'right' | 'bottom' | 'left' | 'auto'
  endSocket?: 'top' | 'right' | 'bottom' | 'left' | 'auto'
}

// 连接线
interface MindBoardConnection {
  id: string
  fromId: string // 起始元素ID
  toId: string // 目标元素ID
  label?: string // 连线说明文字
  style?: ConnectionStyle
}

// 分组
interface Group extends MindBoardElementBase {
  type: 'group'
  name?: string
  memberIds: string[] // 组内元素的ID列表
  style?: {
    backgroundColor?: string
    borderColor?: string
    borderStyle?: 'solid' | 'dashed'
  }
}

// 思维板类型
interface MindBoard {
  id: string
  name: string
  description?: string
  elements: (TextCard | NoteCard | ImageCard | Group)[]
  connections: MindBoardConnection[]
  viewState?: {
    scale: number
    translateX: number
    translateY: number
  }
  createdAt: number
  updatedAt: number
}

// 导出所有类型
export type {
  MindBoardElementBase,
  TextCard,
  NoteCard,
  ImageCard,
  MindBoardConnection,
  ConnectionStyle,
  Group,
  MindBoard
}
