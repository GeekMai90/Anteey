export type LLMProvider = 'zhipu' | 'moonshot'

interface LLMModelConfig {
  name: string
  baseURL: string
  provider: LLMProvider
}

// 模型配置定义
export const LLM_MODELS: Record<string, LLMModelConfig> = {
  'glm-4': {
    name: '智谱 GLM-4-Plus',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    provider: 'zhipu'
  },
  'kimi-1': {
    name: 'Moonshot Kimi',
    baseURL: 'https://api.moonshot.cn/v1/chat/completions',
    provider: 'moonshot'
  }
} as const

export type LLMModelType = keyof typeof LLM_MODELS
