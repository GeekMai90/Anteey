import log from 'electron-log'
import axios from 'axios'
import { LLMConfigService } from './llmConfigService'
import { LLM_MODELS, LLMProvider } from './llm.config'
import type { LLMConfig } from '@shared/types'

export class LLMService {
  // LLM配置服务实例
  private configService: LLMConfigService

  constructor() {
    this.configService = new LLMConfigService()
  }

  /**
   * 生成LLM响应
   * @param prompt - 用户输入的提示文本
   * @param deepseekConfig - DeepSeek模型的可选配置参数
   * @returns 返回LLM生成的响应文本
   */
  async generateResponse(
    prompt: string,
    deepseekConfig?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    // 记录请求开始时间
    const startTime = Date.now()
    let config: LLMConfig | null = null
    let requestStartTime: number
    let requestDuration: number
    let response: any

    try {
      // 获取默认LLM配置
      config = await this.configService.getDefaultConfig()
      if (!config) {
        throw new Error('未配置默认的 LLM 模型，请在设置中配置')
      }

      // 记录请求开始的详细信息
      log.info('LLM请求开始:', {
        timestamp: new Date().toISOString(),
        promptLength: prompt.length,
        model: config.model
      })

      // 获取并验证模型配置
      const modelConfig = LLM_MODELS[config.model]
      if (!modelConfig) {
        throw new Error(`不支持的模型类型: ${config.model}`)
      }

      // 根据不同的AI提供商发送对应的API请求
      switch (modelConfig.provider) {
        case 'zhipu':
          // 智谱AI的请求处理
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
          // Moonshot AI的请求处理
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
          // DeepSeek的请求处理
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

          // 记录DeepSeek API的详细响应信息
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

          // 验证DeepSeek响应格式
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

      // 统一处理不同提供商的响应格式
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

      // 记录请求完成的统计信息
      const totalDuration = Date.now() - startTime
      log.info('LLM请求完成:', {
        model: config.model,
        totalDuration: `${totalDuration}ms`,
        responseLength: content.length
      })

      return content
    } catch (error) {
      // 错误处理和日志记录
      const duration = Date.now() - startTime
      if (axios.isAxiosError(error)) {
        // 处理Axios特定的错误
        log.error('LLM API 调用失败:', {
          model: config?.model,
          duration: `${duration}ms`,
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.response?.data?.error?.message || error.message
        })
      } else {
        // 处理其他类型的错误
        log.error('LLM 调用失败:', {
          model: config?.model,
          duration: `${duration}ms`,
          error
        })
      }
      throw error
    }
  }

  /**
   * 根据不同的AI提供商生成对应的请求头
   * @param provider - AI提供商类型
   * @param apiKey - API密钥
   * @returns 返回包含认证信息的请求头对象
   */
  private getHeaders(provider: LLMProvider, apiKey: string): Record<string, string> {
    switch (provider) {
      case 'zhipu':
        // 智谱AI的认证头
        return {
          'Content-Type': 'application/json',
          Authorization: apiKey
        }
      case 'moonshot':
        // Moonshot AI的认证头
        return {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        }
      case 'deepseek':
        // DeepSeek的认证头
        return {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        }
      default:
        // 默认请求头
        return {
          'Content-Type': 'application/json'
        }
    }
  }
}
