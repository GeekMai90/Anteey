import { LLM_MODELS } from '@services/rag/llm.config'

export type LLMModelType = keyof typeof LLM_MODELS

// 定义基本模型提供商类型
export type LLMProvider =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'deepseek'
  | 'zhipu'
  | 'moonshot'
  | 'custom'

// 核心模型配置接口 - 完全统一化
export interface ModelConfig {
  // 基本信息
  name: string // 配置名称，用户自定义
  provider: LLMProvider // 提供商类型
  modelName: string // 具体模型名称，用户自由输入

  // API连接配置
  baseUrl: string // 基础URL地址，如 https://api.deepseek.com
  apiKey: string // API密钥
  apiVersion?: string // API版本(某些服务需要)
  orgId?: string // 组织ID(某些服务需要)
  headers?: Record<string, string> // 自定义请求头

  // 生成参数
  parameters: {
    temperature?: number
    maxTokens?: number
    topP?: number
    topK?: number
    frequencyPenalty?: number
    presencePenalty?: number
    stop?: string[]
    responseFormat?: 'text' | 'json'
    seed?: number
    [key: string]: any // 支持任意其他参数
  }

  // 提示词配置
  systemPrompt?: string // 系统提示词

  // 请求格式转换
  requestMapper?: string // 存储的是函数字符串，用于转换请求格式
  responseMapper?: string // 存储的是函数字符串，用于转换响应格式

  // 元数据
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
  id: string
}

// 重新设计的LLM配置接口 - 仅作为类型别名保留
export type LLMConfig = ModelConfig

// 提供商特定的预设配置 - 仅作为工具函数的返回类型
export interface ProviderPreset {
  provider: LLMProvider
  defaultEndpoint: string
  requestFormat: 'openai' | 'anthropic' | 'gemini' | 'custom'
  defaultModel: string
  supportedModels: string[]
  defaultParameters: Record<string, any>
  endpointPlaceholder: string
  apiKeyPlaceholder: string
  proxyEndpoints?: { name: string; url: string }[]
}

// 响应接口 - 保持简洁
export interface LLMResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  metadata?: Record<string, any> // 任何其他元数据
}

// 系统提示词配置保持不变
export interface SystemPromptConfig {
  id: string
  systemPrompt: string
  defaultSystemPrompt: string
  createdAt: string
  updatedAt: string
}
