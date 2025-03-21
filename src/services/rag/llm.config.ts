// 定义提供商类型
export type LLMProvider =
  | 'zhipu'
  | 'moonshot'
  | 'deepseek'
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'custom'

// 请求和响应映射函数的类型
export type RequestMapperFn = (messages: any[], parameters: any, stream: boolean) => any
export type ResponseMapperFn = (response: any) => string

// 定义模型配置接口
export interface ModelConfig {
  id: string
  name: string // 配置名称，用户自定义
  provider: LLMProvider
  modelName: string // 具体模型名称

  // API连接配置
  baseUrl: string // 基础API端点URL，不包含路径后缀
  apiKey: string // API密钥
  apiVersion?: string // API版本(可选)
  orgId?: string // 组织ID(可选)
  headers?: Record<string, string> // 自定义请求头

  // 生成参数
  parameters: {
    temperature?: number
    maxTokens?: number
    topP?: number
    topK?: number
    frequencyPenalty?: number
    presencePenalty?: number
    [key: string]: any // 其他自定义参数
  }

  // 提示词配置
  systemPrompt?: string // 系统提示词

  // 请求和响应转换
  requestMapperCode?: string // 请求映射函数的代码字符串
  responseMapperCode?: string // 响应映射函数的代码字符串

  // 元数据
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

// 提供商预设接口
export interface ProviderPreset {
  id: string
  provider: LLMProvider
  defaultBaseUrl: string // 修改为defaultBaseUrl
  requestFormat: string
  defaultModel: string
  supportedModels: string[]
  defaultParameters: Record<string, any>
  baseUrlPlaceholder: string // 修改为baseUrlPlaceholder
  apiKeyPlaceholder: string
  proxyBaseUrls?: { name: string; url: string }[] // 修改为proxyBaseUrls
  createdAt: Date
  updatedAt: Date
}

// 保留原来的LLM_MODELS常量，作为迁移参考和兼容旧版本
export const LLM_MODELS = {
  // 中国本土模型 - 通常可以直接访问
  'glm-4': {
    name: '智谱 GLM-4-Plus',
    defaultBaseURL: 'https://open.bigmodel.cn/api/paas/v4',
    pathSuffix: '/chat/completions',
    provider: 'zhipu' as LLMProvider,
    alwaysCustomizable: false
  },
  'kimi-1': {
    name: 'Moonshot Kimi',
    defaultBaseURL: 'https://api.moonshot.cn/v1',
    pathSuffix: '/chat/completions',
    provider: 'moonshot' as LLMProvider,
    alwaysCustomizable: false
  },
  'deepseek-chat': {
    name: 'DeepSeek Chat V3',
    defaultBaseURL: 'https://api.deepseek.com', // 修正DeepSeek的baseURL
    pathSuffix: '/chat/completions',
    provider: 'deepseek' as LLMProvider,
    alwaysCustomizable: false,
    defaultModel: 'deepseek-chat'
  },
  'deepseek-reasoner': {
    name: 'DeepSeek Reasoner R1',
    defaultBaseURL: 'https://api.deepseek.com', // 修正DeepSeek的baseURL
    pathSuffix: '/chat/completions',
    provider: 'deepseek' as LLMProvider,
    alwaysCustomizable: false,
    defaultModel: 'deepseek-reasoner'
  },

  // 国外模型 - 通常需要代理
  'openai-gpt4': {
    name: 'OpenAI GPT-4 系列',
    defaultBaseURL: 'https://api.openai.com/v1',
    pathSuffix: '/chat/completions',
    provider: 'openai' as LLMProvider,
    alwaysCustomizable: true,
    defaultModel: 'gpt-4-turbo',
    recommendedProxies: [
      { name: 'CloseAI', url: 'https://api.closeai-proxy.xyz/v1' },
      { name: 'API2D', url: 'https://api.api2d.net/v1' },
      { name: 'OhMyGPT', url: 'https://api.ohmygpt.com/v1' }
    ]
  },
  'openai-gpt35': {
    name: 'OpenAI GPT-3.5 系列',
    defaultBaseURL: 'https://api.openai.com/v1',
    pathSuffix: '/chat/completions',
    provider: 'openai' as LLMProvider,
    alwaysCustomizable: true,
    defaultModel: 'gpt-3.5-turbo',
    recommendedProxies: [
      { name: 'CloseAI', url: 'https://api.closeai-proxy.xyz/v1' },
      { name: 'API2D', url: 'https://api.api2d.net/v1' },
      { name: 'OhMyGPT', url: 'https://api.ohmygpt.com/v1' }
    ]
  },
  'openai-o1': {
    name: 'OpenAI O1 系列',
    defaultBaseURL: 'https://api.openai.com/v1',
    pathSuffix: '/chat/completions',
    provider: 'openai' as LLMProvider,
    alwaysCustomizable: true,
    defaultModel: 'o1',
    recommendedProxies: [
      { name: 'CloseAI', url: 'https://api.closeai-proxy.xyz/v1' },
      { name: 'API2D', url: 'https://api.api2d.net/v1' }
    ]
  },
  'claude-3': {
    name: 'Anthropic Claude 3',
    defaultBaseURL: 'https://api.anthropic.com/v1',
    pathSuffix: '/messages',
    provider: 'anthropic' as LLMProvider,
    alwaysCustomizable: true,
    defaultModel: 'claude-3-sonnet-20240229',
    recommendedProxies: [
      { name: 'CloseAI', url: 'https://api.closeai-proxy.xyz/v1' },
      { name: 'OneAPI', url: 'https://api.oneapi.pro/v1' }
    ]
  },
  gemini: {
    name: 'Google Gemini',
    defaultBaseURL: 'https://generativelanguage.googleapis.com/v1beta',
    pathSuffix: '/models',
    provider: 'gemini' as LLMProvider,
    alwaysCustomizable: true,
    defaultModel: 'gemini-1.5-pro',
    recommendedProxies: [{ name: 'OneAPI', url: 'https://api.oneapi.pro/v1beta' }]
  }
} as const

export type LLMModelType = keyof typeof LLM_MODELS

// 默认参数配置
export const DEFAULT_PARAMETERS: Record<LLMProvider, Record<string, any>> = {
  zhipu: {
    temperature: 0.7,
    maxTokens: 2000
  },
  moonshot: {
    temperature: 0.7,
    maxTokens: 2000
  },
  deepseek: {
    temperature: 0.7,
    maxTokens: 2000
  },
  openai: {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1.0,
    frequencyPenalty: 0,
    presencePenalty: 0
  },
  anthropic: {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1.0
  },
  gemini: {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.95,
    topK: 40
  },
  custom: {
    temperature: 0.7,
    maxTokens: 2000
  }
}

// 默认基础URL
export const DEFAULT_BASE_URLS: Record<LLMProvider, string> = {
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  moonshot: 'https://api.moonshot.cn/v1',
  deepseek: 'https://api.deepseek.com', // 根据DeepSeek文档修改
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  custom: ''
}

// API路径后缀
export const API_PATH_SUFFIXES: Record<LLMProvider, string> = {
  zhipu: '/chat/completions',
  moonshot: '/chat/completions',
  deepseek: '/chat/completions', // DeepSeek的路径
  openai: '/chat/completions',
  anthropic: '/messages',
  gemini: '/models',
  custom: ''
}

// 格式化完整端点URL的函数
export function getFullEndpoint(provider: LLMProvider, baseUrl?: string): string {
  const base = baseUrl || DEFAULT_BASE_URLS[provider]
  const suffix = API_PATH_SUFFIXES[provider]

  // 处理基础URL末尾的斜杠，确保不会出现双斜杠
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base

  // 处理后缀开头的斜杠，确保始终有一个斜杠
  const cleanSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`

  return `${cleanBase}${cleanSuffix}`
}

// 推荐的代理服务
export const RECOMMENDED_PROXIES: Partial<Record<LLMProvider, { name: string; url: string }[]>> = {
  openai: [
    { name: 'CloseAI', url: 'https://api.closeai-proxy.xyz/v1' },
    { name: 'API2D', url: 'https://api.api2d.net/v1' },
    { name: 'OhMyGPT', url: 'https://api.ohmygpt.com/v1' }
  ],
  anthropic: [
    { name: 'CloseAI', url: 'https://api.closeai-proxy.xyz/v1' },
    { name: 'OneAPI', url: 'https://api.oneapi.pro/v1' }
  ],
  gemini: [{ name: 'OneAPI', url: 'https://api.oneapi.pro/v1beta' }]
}

/**
 * 创建一个新的模型配置对象
 */
export function createModelConfig(
  provider: LLMProvider,
  modelName: string,
  apiKey: string,
  name?: string,
  baseUrl?: string
): Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: name || `${provider} - ${modelName}`,
    provider,
    modelName,
    baseUrl: baseUrl || DEFAULT_BASE_URLS[provider],
    apiKey,
    parameters: { ...DEFAULT_PARAMETERS[provider] },
    isDefault: false
  }
}

/**
 * 根据模型配置构建请求格式
 */
export function formatModelRequest(config: ModelConfig, messages: any[], stream = false): any {
  // 如果有自定义请求映射函数，则使用它
  if (config.requestMapperCode) {
    try {
      // eslint-disable-next-line no-new-func
      const mapper = new Function(
        'messages',
        'parameters',
        'stream',
        config.requestMapperCode
      ) as RequestMapperFn
      return mapper(messages, config.parameters, stream)
    } catch (error) {
      console.error('执行自定义请求映射函数出错:', error)
    }
  }

  // 默认格式化逻辑
  switch (config.provider) {
    case 'openai':
    case 'zhipu':
    case 'moonshot':
    case 'deepseek':
      return {
        model: config.modelName,
        messages,
        ...config.parameters,
        stream
      }

    case 'anthropic':
      return {
        model: config.modelName,
        messages,
        ...config.parameters,
        stream
      }

    case 'gemini':
      // Gemini有特殊的请求格式
      return {
        contents: messages.map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        })),
        generationConfig: {
          ...config.parameters
        },
        stream
      }

    case 'custom':
    default:
      // 默认使用类似OpenAI的格式
      return {
        model: config.modelName,
        messages,
        ...config.parameters,
        stream
      }
  }
}

/**
 * 解析模型响应
 */
export function parseModelResponse(config: ModelConfig, response: any): string {
  // 如果有自定义响应映射函数，则使用它
  if (config.responseMapperCode) {
    try {
      // eslint-disable-next-line no-new-func
      const mapper = new Function('response', config.responseMapperCode) as ResponseMapperFn
      return mapper(response)
    } catch (error) {
      console.error('执行自定义响应映射函数出错:', error)
    }
  }

  // 默认解析逻辑
  try {
    switch (config.provider) {
      case 'openai':
      case 'zhipu':
      case 'moonshot':
      case 'deepseek':
        return response.choices?.[0]?.message?.content || ''

      case 'anthropic':
        return response.content?.[0]?.text || ''

      case 'gemini':
        return response.candidates?.[0]?.content?.parts?.[0]?.text || ''

      default:
        // 尝试常见的响应格式
        return (
          response.choices?.[0]?.message?.content ||
          response.content?.[0]?.text ||
          response.candidates?.[0]?.content?.parts?.[0]?.text ||
          response.result ||
          response.output ||
          JSON.stringify(response)
        )
    }
  } catch (error) {
    console.error('解析模型响应出错:', error)
    return JSON.stringify(response)
  }
}

/**
 * 获取提供商默认模型
 */
export function getDefaultModel(provider: LLMProvider): string {
  switch (provider) {
    case 'zhipu':
      return 'glm-4'
    case 'moonshot':
      return 'moonshot-v1-8k'
    case 'deepseek':
      return 'deepseek-chat'
    case 'openai':
      return 'gpt-3.5-turbo'
    case 'anthropic':
      return 'claude-3-sonnet-20240229'
    case 'gemini':
      return 'gemini-1.5-pro'
    case 'custom':
      return ''
    default:
      return ''
  }
}

/**
 * 获取支持的模型列表
 */
export function getSupportedModels(provider: LLMProvider): string[] {
  switch (provider) {
    case 'zhipu':
      return ['glm-4', 'glm-3-turbo']
    case 'moonshot':
      return ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k']
    case 'deepseek':
      return ['deepseek-chat', 'deepseek-reasoner']
    case 'openai':
      return ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'o1', 'o1-mini']
    case 'anthropic':
      return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
    case 'gemini':
      return ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro']
    case 'custom':
    default:
      return []
  }
}
