// 基础消息接口
export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

// AI 助手消息接口（扩展基础消息）
export interface AIAssistantMessage extends AssistantMessage {
  role: 'assistant'
  sourceType: 'notes' | 'ai' // 来源类型：笔记库或AI知识库
  references?: {
    noteId: string
    address: string
    title: string
    content: string // 相关片段
    similarity: number // 相关度
    createdAt: string // 笔记创建时间
  }[]
}

// 用户消息接口
export interface UserMessage extends AssistantMessage {
  role: 'user'
}

// 系统消息接口
export interface SystemMessage extends AssistantMessage {
  role: 'system'
}

// 建议操作接口
export interface Suggestion {
  id: string
  text: string
  icon: any
  mode: string
  prompt: string
  description: string
}

// 消息联合类型
export type ChatMessage = UserMessage | AIAssistantMessage | SystemMessage

// RAG 上下文接口
export interface RAGContext {
  query: string
  timestamp: string
  relevantDocs: RAGResult[]
  response?: string
}

// RAG 检索结果接口
export interface RAGResult {
  noteId: string
  address: string
  title: string
  content: string
  similarity: number
  createdAt: string
}

// RAG 历史记录项接口
export interface RAGHistoryItem {
  id: string
  query: string
  context: RAGContext
  createdAt: string
  updatedAt: string
}
