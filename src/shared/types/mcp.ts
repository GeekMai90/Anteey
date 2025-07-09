// MCP API密钥类型
export interface McpApiKey {
  id: string
  name: string
  key: string
  isActive: boolean
  createdAt: Date
  lastUsedAt: Date | null
}

// MCP服务状态类型
export interface McpServiceStatus {
  isRunning: boolean
  port: number
  activeKeys: number
  totalRequests: number
  lastRequestAt: Date | null
}

// MCP搜索笔记请求参数
export interface McpSearchNotesParams {
  query: string
  limit?: number
  offset?: number
}

// MCP搜记笔记响应
export interface McpSearchNotesResponse {
  notes: Array<{
    id: string
    title: string
    content: string
    address: string
    cardType: string
    createdAt: Date
    updatedAt: Date
    tags: Array<{
      id: string
      name: string
    }>
  }>
  total: number
}

// MCP获取单个笔记响应
export interface McpGetNoteResponse {
  id: string
  title: string
  content: string
  address: string
  cardType: string
  createdAt: Date
  updatedAt: Date
  tags: Array<{
    id: string
    name: string
  }>
}
