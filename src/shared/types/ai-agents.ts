import { ChatMessage, RAGContext } from './assistant'
// Agent配置接口
export interface Agent {
  id: string
  name: string
  description: string | null
  greeting: string | null
  systemPrompt: string
  temperature: number
  modelConfigId: string
  includeNoteContext: boolean
  createdAt: string
  updatedAt: string
}

// Agent创建参数接口
export interface CreateAgentParams {
  name: string
  description?: string | null
  greeting?: string | null
  systemPrompt: string
  temperature: number
  modelConfigId: string
  includeNoteContext: boolean
}

// Agent更新参数接口
export interface UpdateAgentParams {
  id: string
  name?: string
  description?: string | null
  greeting?: string | null
  systemPrompt?: string
  temperature?: number
  modelConfigId?: string
  includeNoteContext?: boolean
}

// 添加 Agent 配置类型
export interface AgentConfig {
  modelConfigId: string
  temperature: number
  systemPrompt: string
}

// 修改 Agent 聊天参数类型
export interface AgentChatParams {
  query?: string
  agentId: string
  noteId?: string
  sessionId?: string | null
  currentMessages?: ChatMessage[]
  currentContexts?: RAGContext[]
  agentConfig?: AgentConfig
}
