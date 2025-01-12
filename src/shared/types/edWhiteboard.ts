// EdWhiteboard 的基础类型定义
export interface EdWhiteboard {
  id: string
  name: string
  content: string // excalidraw 的画板内容，JSON 字符串
  created_at: number
  updated_at: number
  folder_id?: string // 可选的文件夹归属
  tags?: string[] // 可选的标签
}

// 创建新白板的参数
export interface CreateEdWhiteboardParams {
  name: string
  folder_id?: string
  tags?: string[]
}

// 更新白板的参数
export interface UpdateEdWhiteboardParams {
  id: string
  name?: string
  content?: string
  folder_id?: string
  tags?: string[]
}

// 白板中引用的笔记
export interface EdWhiteboardNoteRef {
  id: string
  note_id: string // 引用的笔记 ID
  whiteboard_id: string // 所属白板 ID
  position: {
    // 在画板中的位置
    x: number
    y: number
  }
  created_at: number
}

// 创建笔记引用的参数
export interface CreateEdWhiteboardNoteRefParams {
  note_id: string
  whiteboard_id: string
  position: {
    x: number
    y: number
  }
}

// 更新笔记引用位置的参数
export interface UpdateEdWhiteboardNoteRefPositionParams {
  id: string
  position: {
    x: number
    y: number
  }
}

// 白板的查询参数
export interface EdWhiteboardQueryParams {
  folder_id?: string
  tags?: string[]
  keyword?: string // 支持按名称搜索
  page?: number // 分页支持
  page_size?: number
}

// 白板的查询结果
export interface EdWhiteboardQueryResult {
  total: number
  items: EdWhiteboard[]
}
