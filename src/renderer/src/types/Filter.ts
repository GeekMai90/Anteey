import { Note } from './Note'

// 筛选规则的字段类型
export type FilterField = 'tag' | 'cardBox' | 'keyword' | 'cardType' | 'isFlashcard'

// 筛选规则的操作符
export type FilterOperator = 'contains' | 'doesNotContain' | 'is' | 'isNot'

// 单条筛选规则
export interface FilterRule {
  id: string
  field: FilterField
  operator: FilterOperator
  value: string | string[]
  createdAt: Date
  updatedAt: Date
}

// 自定义筛选规则集合
export interface CustomFilter {
  id: string
  name: string
  matchType: 'all' | 'any' // all: AND, any: OR
  rules: FilterRule[]
  isPinned: boolean
  isStarred: boolean
  pinnedOrder?: number
  createdAt: Date
  updatedAt: Date
}

// 创建自定义筛选规则的输入
export interface CreateCustomFilterInput {
  name: string
  matchType: 'all' | 'any'
  rules: Omit<FilterRule, 'id' | 'createdAt' | 'updatedAt'>[]
}

// 更新自定义筛选规则的输入
export interface UpdateCustomFilterInput {
  id: string
  name?: string
  matchType?: 'all' | 'any'
  rules?: Omit<FilterRule, 'id' | 'createdAt' | 'updatedAt'>[]
  isPinned?: boolean
  isStarred?: boolean
  pinnedOrder?: number
}

// 应用筛选规则后的笔记查询参数
export interface FilteredNotesParams {
  customFilterId?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// 筛选规则的执行结果
export interface FilterExecutionResult {
  success: boolean
  notes: Note[]
  totalCount: number
  error?: string
}
