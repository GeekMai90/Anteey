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
// export interface RAGHistoryItem {
//   id: string
//   query: string
//   context: RAGContext
//   createdAt: string
//   updatedAt: string
// }

// RAG历史记录接口 (与数据库表对应)
// 修改 RAG历史记录接口
export interface RAGHistoryRecord {
  id: string
  title?: string // 对话标题
  messages: ChatMessage[] // 完整的对话消息数组
  contexts: RAGContext[] // 每次对话的上下文数组
  isPinned: boolean // 是否置顶
  createdAt: string // 创建时间
  updatedAt: string // 更新时间
  summary?: string // 可选：对话摘要
  totalTokens?: number // 可选：总 token 数
  metadata?: {
    messageCount: number // 消息数量
    userMessageCount: number // 用户消息数量
    aiMessageCount: number // AI 消息数量
    averageRelevanceScore?: number // 平均相关度分数
    lastContext?: RAGContext // 最后一次对话的上下文
  }
}

// 前端展示用的历史记录项
// 更新前端展示用的历史记录项
export interface ChatHistoryItem {
  id: string
  title: string // 对话标题
  summary?: string // 对话摘要
  firstMessage: string // 第一条消息内容
  messageCount: number // 消息数量
  isPinned: boolean // 置顶状态
  createdAt: string
  updatedAt: string
  lastContext?: {
    relevantDocsCount: number // 相关文档数量
    averageSimilarity: number // 平均相似度
  }
}

// 新增：对话会话接口
export interface ChatSession {
  id: string
  messages: ChatMessage[]
  currentContext?: RAGContext
  metadata: {
    startTime: string
    lastUpdateTime: string
    messageCount: number
    hasReferences: boolean
  }
}
