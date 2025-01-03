// 基础的树节点类型
export interface KnowledgeTreeNode {
  id: string // 节点ID
  address: string // 节点地址编码
  title: string // 节点标题
  children?: KnowledgeTreeNode[] // 子节点
  childCount: number // 子节点数量
  isLoading?: boolean // 是否正在加载
  level: number // 节点层级
  isExpanded?: boolean
  isFocused?: boolean
  noteId?: string | null // 可以为 null（根节点的情况）
}

// 视图状态
export interface KnowledgeTreeViewState {
  scale: number // 缩放比例
  translateX: number // X轴偏移
  translateY: number // Y轴偏移
  isInFocusMode: boolean // 是否处于聚焦模式
}

// 聚焦历史记录
export interface FocusHistory {
  nodes: KnowledgeTreeNode[] // 历史节点记录
  currentIndex: number // 当前位置
}

// ECharts 树节点类型
export interface EChartsTreeNode {
  name: string
  value: string
  children?: EChartsTreeNode[]
  itemStyle?: Record<string, any>
  label?: Record<string, any>
  collapsed?: boolean
  childCount?: number
}

// G6需要的数据格式
export interface G6TreeData {
  id: string
  label: string
  children?: G6TreeData[]
}

export type AddressLevel = 'top' | 'second' | 'third' | `branch-${number}` // 支持任意层级的分支
