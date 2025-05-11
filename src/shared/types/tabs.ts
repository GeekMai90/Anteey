/**
 * 标签页相关类型定义
 */

// 标签页内容类型
export type TabItemType = 'Note' | 'MindBoard' | 'Article' | 'Other'

// 标签页项目接口
export interface TabItem {
  id: string // 唯一标识符
  contentId: string // 关联内容ID（笔记ID、思维板ID等）
  type: TabItemType // 内容类型
  title: string // 标签标题
  address?: string // 编码地址（主要用于Note类型）
  isPinned: boolean // 是否固定
  lastAccessTime: number // 最后访问时间（时间戳）
  order: number // 排序顺序
  icon?: string // 图标（可选）
  metadata?: string // 额外元数据（JSON字符串格式）
  isActive?: boolean // 是否为当前活动标签（运行时状态，不存储）
}

// 获取标签页请求参数
export interface GetTabsRequest {
  limit?: number // 获取数量限制
}

// 添加标签页请求参数
export interface AddTabRequest {
  contentId: string // 内容ID
  type: TabItemType // 类型
  title: string // 标题
  address?: string // 编码地址（主要用于Note类型）
  isPinned?: boolean // 是否固定(可选)
  icon?: string // 图标(可选)
  metadata?: any // 元数据(可选)
}

// 更新标签页请求参数
export interface UpdateTabRequest {
  id: string // 标签ID
  title?: string // 标题(可选)
  address?: string // 编码地址(可选)
  isPinned?: boolean // 是否固定(可选)
  order?: number // 排序(可选)
  metadata?: any // 元数据(可选)
}

// 批量更新标签页顺序参数
export interface ReorderTabsRequest {
  tabs: Array<{
    id: string
    order: number
  }>
}

// 标签页响应数据
export interface TabsResponse {
  tabs: TabItem[]
  totalCount: number
}
