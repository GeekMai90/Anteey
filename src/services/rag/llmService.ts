// src/services/llmService.ts
import log from 'electron-log'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

// src/services/llmService.ts
export class LLMService {
  private apiKey: string
  // 更新为最新的 API 地址
  private baseURL = 'https://open.bigmodel.cn/api/paas/v4'
  private model = 'glm-4' // 使用最新的 GLM-4 模型

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ZHIPU_API_KEY || ''
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      if (!this.apiKey) {
        throw new Error('未配置智谱 AI API Key')
      }

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          stream: false // 非流式响应
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      log.info('LLM 响应数据:', response.data)

      if (
        response.data &&
        response.data.choices &&
        response.data.choices[0] &&
        response.data.choices[0].message &&
        response.data.choices[0].message.content
      ) {
        return response.data.choices[0].message.content
      }

      throw new Error('API 响应格式异常: ' + JSON.stringify(response.data))
    } catch (error) {
      if (axios.isAxiosError(error)) {
        log.error('LLM API 调用失败:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        })
      } else {
        log.error('LLM 调用失败:', error)
      }
      throw error
    }
  }
}
