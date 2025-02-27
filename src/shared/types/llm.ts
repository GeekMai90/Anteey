import { LLM_MODELS } from '@services/rag/llm.config'

export type LLMModelType = keyof typeof LLM_MODELS

// DeepSeek 配置接口
export interface DeepSeekConfig {
  temperature: number
  maxTokens: number
}

// LLM 配置接口
export interface LLMConfig {
  id: string
  model: LLMModelType // 预设模型的ID
  apiKey: string // API密钥
  isDefault: boolean // 是否为默认模型
  createdAt: string
  updatedAt: string
  // 可以添加 DeepSeek 特有的配置
  deepseekConfig?: DeepSeekConfig
}

// LLM 响应接口
export interface LLMResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

// LLM 错误接口
// export interface LLMError {
//   code: string
//   message: string
//   details?: any
// }

// 全局提示词配置接口
export interface SystemPromptConfig {
  id: string
  systemPrompt: string // 系统提示词
  defaultSystemPrompt: string // 默认系统提示词
  createdAt: string
  updatedAt: string
}
