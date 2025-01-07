// 草稿纸数据结构
export interface Draft {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
}

// 创建草稿纸的输入
export interface CreateDraftInput {
  content: string
}

// 更新草稿纸的输入
export interface UpdateDraftInput {
  id: string
  content: string
}

// 追加内容的输入
export interface AppendDraftInput {
  id: string
  content: string
}

// 草稿纸的响应结构
export interface DraftResponse {
  success: boolean
  error?: string
  draft?: Draft
}

// 草稿纸的操作类型
export type DraftOperation = 'create' | 'update' | 'append'

// 草稿纸的 Window API 接口
export interface DraftApi {
  // 获取草稿纸内容
  getDraft: () => Promise<Draft>
  // 创建草稿纸
  createDraft: (input: CreateDraftInput) => Promise<DraftResponse>
  // 更新草稿纸内容
  updateDraft: (input: UpdateDraftInput) => Promise<DraftResponse>
  // 追加内容到草稿纸
  appendDraft: (input: AppendDraftInput) => Promise<DraftResponse>
}

// 声明全局 Window 接口
declare global {
  interface Window {
    electronAPI: {
      draft: DraftApi
    }
  }
}
