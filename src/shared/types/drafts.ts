// 草稿纸数据结构
export interface Draft {
  id: string
  content: object // 包含 TipTap 编辑器的内容
  createdAt: Date
  updatedAt: Date
}

// 创建草稿纸的输入
export interface CreateDraftInput {
  content: object
}

// 更新草稿纸的输入
export interface UpdateDraftInput {
  id: string
  content: object
}

// 快速添加内容的输入
export interface AppendDraftInput {
  content: string // 这里保持 string 因为是纯文本输入
}

// 草稿纸的响应结构
export interface DraftResponse {
  success: boolean
  error?: string
  draft?: Draft
}

// 草稿纸的操作类型
export type DraftOperation = 'create' | 'update' | 'append'
