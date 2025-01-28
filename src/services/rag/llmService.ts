import log from 'electron-log'
import axios from 'axios'
import { LLMConfigService } from './llmConfigService'
import { LLM_MODELS, LLMProvider } from './llm.config'
import type { LLMConfig } from '@shared/types'

export class LLMService {
  private configService: LLMConfigService

  constructor() {
    this.configService = new LLMConfigService()
  }

  async generateResponse(
    prompt: string,
    deepseekConfig?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const startTime = Date.now()
    let config: LLMConfig | null = null
    let requestStartTime: number
    let requestDuration: number
    let response: any

    try {
      // 先获取配置
      config = await this.configService.getDefaultConfig()
      if (!config) {
        throw new Error('未配置默认的 LLM 模型，请在设置中配置')
      }

      // 记录请求开始 - 移到获取配置之后
      log.info('LLM请求开始:', {
        timestamp: new Date().toISOString(),
        promptLength: prompt.length,
        model: config.model // 现在可以安全访问 model
      })

      // 获取模型配置
      const modelConfig = LLM_MODELS[config.model]
      if (!modelConfig) {
        throw new Error(`不支持的模型类型: ${config.model}`)
      }

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
          requestStartTime = Date.now()
          response = await axios.post(
            modelConfig.baseURL,
            {
              model: config.model === 'deepseek-reasoner' ? 'deepseek-reasoner' : 'deepseek-chat',
              messages: [
                {
                  role: 'user',
                  content: prompt
                }
              ],
              stream: false,
              temperature: deepseekConfig?.temperature ?? config.deepseekConfig?.temperature ?? 0.5,
              max_tokens: deepseekConfig?.maxTokens ?? config.deepseekConfig?.maxTokens ?? 2000
            },
            {
              headers: this.getHeaders(modelConfig.provider, config.apiKey),
              timeout: 60000
            }
          )

          requestDuration = Date.now() - requestStartTime
          log.info('DeepSeek API响应:', {
            model: config.model,
            requestDuration: `${requestDuration}ms`,
            status: response.status,
            promptTokens: response.data?.usage?.prompt_tokens,
            completionTokens: response.data?.usage?.completion_tokens,
            totalTokens: response.data?.usage?.total_tokens,
            responseLength: response.data?.choices?.[0]?.message?.content?.length
          })

          if (!response.data?.choices?.[0]?.message?.content) {
            log.error('DeepSeek API 响应异常:', {
              model: config.model,
              response: response.data,
              status: response.status,
              headers: response.headers
            })
            throw new Error('API 响应格式异常: ' + JSON.stringify(response.data))
          }
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
          content = response.data.choices[0].message.content
          break

        default:
          throw new Error(`不支持的模型提供商: ${modelConfig.provider}`)
      }

      // 记录总耗时
      const totalDuration = Date.now() - startTime
      log.info('LLM请求完成:', {
        model: config.model,
        totalDuration: `${totalDuration}ms`,
        responseLength: content.length
      })

      return content
    } catch (error) {
      const duration = Date.now() - startTime
      if (axios.isAxiosError(error)) {
        log.error('LLM API 调用失败:', {
          model: config?.model,
          duration: `${duration}ms`,
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.response?.data?.error?.message || error.message
        })
      } else {
        log.error('LLM 调用失败:', {
          model: config?.model,
          duration: `${duration}ms`,
          error
        })
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
}
