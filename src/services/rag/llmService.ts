import log from 'electron-log'
import axios from 'axios'
import { LLMConfigService } from './llmConfigService'
import { LLM_MODELS } from './llm.config'
import type { LLMConfig } from '../../renderer/src/types/llm'

export class LLMService {
  private configService: LLMConfigService

  constructor() {
    this.configService = new LLMConfigService()
  }

  async generateResponse(prompt: string): Promise<string> {
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
              headers: {
                Authorization: `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
              }
            }
          )
          break

        case 'moonshot':
          response = await axios.post(
            modelConfig.baseURL,
            {
              model: 'moonshot-v1-8k', // 使用正确的模型名称
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
              temperature: 0.3 // 使用推荐的温度值
            },
            {
              headers: {
                Authorization: `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
              }
            }
          )
          break

        default:
          throw new Error(`不支持的模型提供商: ${modelConfig.provider}`)
      }

      log.info('LLM 响应数据:', response.data)

      // 根据不同提供商处理响应
      let content: string
      switch (modelConfig.provider) {
        case 'zhipu':
        case 'moonshot':
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
}
