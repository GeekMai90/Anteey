import log from 'electron-log'
import axios from 'axios'
import { LLMConfigService } from './llmConfigService'
import { LLM_MODELS, LLMModelType, LLMProvider } from './llm.config'
import type { LLMConfig, LLMResponse } from '@shared/types'

export class LLMService {
  private configService: LLMConfigService

  constructor() {
    this.configService = new LLMConfigService()
  }

  async generateResponse(
    prompt: string,
    deepseekConfig?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    let config: LLMConfig | null = null

    try {
      // 获取默认配置
      config = await this.configService.getDefaultConfig()
      if (!config) {
        throw new Error('未配置默认的 LLM 模型，请在设置中配置')
      }

      // 获取模型配置
      const modelConfig = LLM_MODELS[config.model]
      if (!modelConfig) {
        throw new Error(`不支持的模型类型: ${config.model}`)
      }

      let response
      // 根据不同提供商处理请求
      switch (modelConfig.provider) {
        case 'zhipu':
          response = await axios.post(
            modelConfig.baseURL,
            {
              model: config.model,
              messages: [
                {
                  role: 'user',
                  content: prompt
                }
              ],
              stream: false
            },
            {
              headers: this.getHeaders(modelConfig.provider, config.apiKey)
            }
          )
          break

        case 'moonshot':
          response = await axios.post(
            modelConfig.baseURL,
            {
              model: 'moonshot-v1-8k',
              messages: [
                {
                  role: 'system',
                  content:
                    '你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。'
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              temperature: 0.3
            },
            {
              headers: this.getHeaders(modelConfig.provider, config.apiKey)
            }
          )
          break

        case 'deepseek':
          response = await axios.post(
            modelConfig.baseURL,
            {
              model: config.model,
              messages: [
                {
                  role: 'user',
                  content: prompt
                }
              ],
              stream: false,
              temperature: deepseekConfig?.temperature ?? config.deepseekConfig?.temperature ?? 0.7,
              max_tokens: deepseekConfig?.maxTokens ?? config.deepseekConfig?.maxTokens ?? 2000
            },
            {
              headers: this.getHeaders(modelConfig.provider, config.apiKey)
            }
          )
          break

        default:
          throw new Error(`不支持的模型提供商: ${modelConfig.provider}`)
      }

      // 根据不同提供商处理响应
      let content: string
      switch (modelConfig.provider) {
        case 'zhipu':
        case 'moonshot':
        case 'deepseek':
          if (!response.data?.choices?.[0]?.message?.content) {
            throw new Error('API 响应格式异常: ' + JSON.stringify(response.data))
          }
          content = response.data.choices[0].message.content
          break

        default:
          throw new Error(`不支持的模型提供商: ${modelConfig.provider}`)
      }

      return content
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error?.message || error.message
        log.error('LLM API 调用失败:', {
          model: config?.model,
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: errorMessage
        })
      } else {
        log.error('LLM 调用失败:', error)
      }
      throw error
    }
  }

  // 添加 DeepSeek 的请求头处理
  private getHeaders(provider: LLMProvider, apiKey: string): Record<string, string> {
    switch (provider) {
      case 'zhipu':
        return {
          'Content-Type': 'application/json',
          Authorization: apiKey
        }
      case 'moonshot':
        return {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        }
      case 'deepseek':
        return {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        }
      default:
        return {
          'Content-Type': 'application/json'
        }
    }
  }

  // 添加 DeepSeek 的请求体处理
  private async buildRequestBody(
    messages: any[],
    model: LLMModelType,
    provider: LLMProvider
  ): Promise<any> {
    switch (provider) {
      case 'zhipu':
        // 智谱的处理逻辑...
        return {
          model,
          messages,
          stream: false
        }
      case 'moonshot':
        // Moonshot的处理逻辑...
        return {
          model,
          messages,
          stream: false
        }
      case 'deepseek':
        // DeepSeek的处理逻辑
        return {
          model,
          messages,
          stream: false,
          temperature: 0.7,
          max_tokens: 2000
        }
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  }

  // 添加 DeepSeek 的响应处理
  private parseResponse(response: any, provider: LLMProvider): LLMResponse {
    switch (provider) {
      case 'zhipu':
        // 智谱的响应处理...
        return {
          content: response.choices[0].message.content,
          usage: response.usage
        }
      case 'moonshot':
        // Moonshot的响应处理...
        return {
          content: response.choices[0].message.content,
          usage: response.usage
        }
      case 'deepseek':
        // DeepSeek的响应处理
        return {
          content: response.choices[0].message.content,
          usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0
          }
        }
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  }
}
