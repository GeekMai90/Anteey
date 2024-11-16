import { Component } from 'vue'

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
  sourceType: 'notes' | 'ai' | 'note_processing' // 来源类型：笔记库或AI知识库
  references?: {
    noteId: string
    address: string
    title: string
    content: object // 相关片段
    similarity: number // 相关度
    createdAt: string // 笔记创建时间
  }[]
  processingInfo?: {
    // 新增：处理信息
    actionId: string
    actionName: string
    originalNoteId: string
  }
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
  icon: Component
  mode: 'ask' | 'write' | 'think' | 'answer' | 'search' | 'chat'
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
  processingType?: 'qa' | 'note_processing' | 'chat' // 新增：处理类型
  targetNote?: {
    // 新增：目标笔记信息
    id: string
    title: string
    content: string
    metadata?: any
  }
}
// 笔记内容接口
export interface NoteContent {
  content: Array<{
    attrs: {
      text: string
    }
  }>
}

// RAG 检索结果接口
export interface RAGResult {
  noteId: string
  address: string
  title: string
  content: object
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
  title: string
  messages: ChatMessage[]
  contexts: RAGContext[]
  summary: string
  totalTokens: number
  metadata: RAGHistoryMetadata
  isPinned: boolean
  createdAt: string
  updatedAt: string
}
interface RAGHistoryMetadata {
  messageCount: number
  userMessageCount: number
  aiMessageCount: number
  averageRelevanceScore?: number
  lastContext?: RAGContext
  conversationTracker?: ConversationTracker
  currentTopicId?: string
  topicStartTime?: number
}
// export interface RAGHistoryRecord {
//   id: string
//   title?: string // 对话标题
//   messages: ChatMessage[] // 完整的对话消息数组
//   contexts: RAGContext[] // 每次对话的上下文数组
//   isPinned: boolean // 是否置顶
//   createdAt: string // 创建时间
//   updatedAt: string // 更新时间
//   summary?: string // 可选：对话摘要
//   totalTokens?: number // 可选：总 token 数
//   metadata?: {
//     messageCount: number // 消息数量
//     userMessageCount: number // 用户消息数量
//     aiMessageCount: number // AI 消息数量
//     averageRelevanceScore?: number // 平均相关度分数
//     lastContext?: RAGContext // 最后一次对话的上下文
//   }
// }

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

// 新增：对话上下文追踪接口
export interface ConversationTracker {
  topicId: string
  startTime: number
  // 文档使用追踪
  docUsage: {
    [noteId: string]: {
      usageCount: number // 在当前话题中被使用的次数
      lastUsed: number // 最后使用时间戳
      similarity: number // 最高相似度记录
    }
  }
  // 问题向量记录
  questionHistory: {
    content: string
    vector: number[]
    timestamp: number
  }[]
}

// 扩展现有的 ChatSession 接口
export interface ChatSession {
  id: string
  messages: ChatMessage[]
  currentContext?: RAGContext
  conversationTracker?: ConversationTracker // 新增：对话追踪器
  metadata: {
    startTime: string
    lastUpdateTime: string
    messageCount: number
    hasReferences: boolean
    currentTopicId?: string // 新增：当前话题ID
    topicStartTime?: number // 新增：当前话题开始时间
  }
}

// 新增：相似度配置接口
export interface SimilarityConfig {
  topicThreshold: number // 话题相似度阈值 (0.7)
  docThreshold: number // 文档相似度阈值 (0.6)
  contextWindowSize: number // 上下文窗口大小 (5)
}

// 新增：检索策略配置
export interface RetrievalConfig {
  maxDocsPerQuery: number // 每次查询最大文档数
  minSimilarity: number // 最小相似度要求
  reuseThreshold: number // 文档重用阈值
  weightDecayFactor: number // 历史文档权重衰减因子
}

// 新增：笔记处理相关接口

// 新增：笔记处理动作接口
export interface NoteAction {
  id: string
  name: string
  description: string
  icon: Component
  prompt: string
  type: 'summarize' | 'optimize' | 'expand' | 'flashcards' // 处理类型
}

// 新增：笔记处理结果接口
export interface NoteProcessingResult {
  noteId: string
  actionId: string
  result: string
  timestamp: string
}

// 新增：笔记引用接口
export interface NoteReference {
  id: string
  title: string
}
