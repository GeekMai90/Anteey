import log from 'electron-log'
import axios, { AxiosRequestConfig } from 'axios'
import { ModelConfigService } from './llmConfigService'
import { formatModelRequest, parseModelResponse, ModelConfig, getFullEndpoint } from './llm.config'

export class LLMService {
  // 模型配置服务实例
  private configService: ModelConfigService

  constructor() {
    this.configService = new ModelConfigService()
  }

  /**
   * 生成LLM响应
   * @param prompt - 用户输入的提示文本
   * @param configId - 可选的配置ID，如不提供则使用默认配置
   * @param parameters - 可选的参数覆盖
   * @returns 返回LLM生成的响应文本
   */
  async generateResponse(
    prompt: string,
    configId?: string,
    parameters?: Record<string, any>
  ): Promise<string> {
    // 记录请求开始时间
    const startTime = Date.now()
    let config: ModelConfig | null = null
    let response: any

    try {
      // 获取模型配置
      if (configId) {
        config = await this.configService.getConfigById(configId)
      } else {
        config = await this.configService.getDefaultConfig()
      }

      if (!config) {
        throw new Error('未找到有效的模型配置，请在设置中配置模型')
      }

      // 记录请求开始的详细信息
      log.info('LLM请求开始:', {
        timestamp: new Date().toISOString(),
        promptLength: prompt.length,
        provider: config.provider,
        model: config.modelName
      })

      // 构建消息数组
      const messages = [{ role: 'user', content: prompt }]

      // 如果有系统提示词，添加到消息开头
      if (config.systemPrompt) {
        messages.unshift({ role: 'system', content: config.systemPrompt })
      }

      // 合并参数
      const mergedParameters = {
        ...config.parameters,
        ...(parameters || {})
      }

      // 使用formatModelRequest生成请求体
      const requestBody = formatModelRequest(
        {
          ...config,
          parameters: mergedParameters
        },
        messages,
        false
      )

      // 准备请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(config)
      }

      // 合并自定义请求头
      if (config.headers) {
        Object.assign(headers, config.headers)
      }

      // 准备请求配置
      const requestConfig: AxiosRequestConfig = {
        headers,
        timeout: 90000 // 默认90秒超时
      }

      // 获取完整端点URL
      const fullEndpoint = getFullEndpoint(config.provider, config.baseUrl)

      // 发送请求
      const requestStartTime = Date.now()
      response = await axios.post(fullEndpoint, requestBody, requestConfig)
      const requestDuration = Date.now() - requestStartTime

      // 记录请求统计信息
      log.info(`${config.provider.toUpperCase()} API响应:`, {
        provider: config.provider,
        model: config.modelName,
        requestDuration: `${requestDuration}ms`,
        status: response.status,
        tokenInfo: this.extractTokenInfo(response.data, config.provider),
        responseLength: response.data ? JSON.stringify(response.data).length : 0
      })

      // 使用parseModelResponse解析响应
      const content = parseModelResponse(config, response.data)

      // 记录请求完成的统计信息
      const totalDuration = Date.now() - startTime
      log.info('LLM请求完成:', {
        provider: config.provider,
        model: config.modelName,
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
          provider: config?.provider,
          model: config?.modelName,
          duration: `${duration}ms`,
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.response?.data?.error?.message || error.message,
          requestUrl: error.config?.url
        })

        // 增强错误消息
        let errorMessage = `API调用失败: ${error.message}`
        if (error.response?.data?.error?.message) {
          errorMessage = `${error.response.data.error.message}`
        }

        throw new Error(errorMessage)
      } else {
        // 处理其他类型的错误
        log.error('LLM 调用失败:', {
          provider: config?.provider,
          model: config?.modelName,
          duration: `${duration}ms`,
          error: error instanceof Error ? error.message : String(error)
        })

        throw error
      }
    }
  }

  /**
   * 流式生成LLM响应
   * @param prompt - 用户输入的提示文本
   * @param callback - 接收流式内容的回调函数
   * @param configId - 可选的配置ID，如不提供则使用默认配置
   * @param parameters - 可选的参数覆盖
   * @returns Promise<void>
   */
  async generateStreamResponse(
    prompt: string,
    callback: (content: string, done: boolean) => void,
    configId?: string,
    parameters?: Record<string, any>
  ): Promise<void> {
    // 记录请求开始时间
    const startTime = Date.now()
    let config: ModelConfig | null = null

    try {
      // 获取模型配置
      if (configId) {
        config = await this.configService.getConfigById(configId)
      } else {
        config = await this.configService.getDefaultConfig()
      }

      if (!config) {
        throw new Error('未找到有效的模型配置，请在设置中配置模型')
      }

      // 记录请求开始的详细信息
      log.info('LLM流式请求开始:', {
        timestamp: new Date().toISOString(),
        promptLength: prompt.length,
        provider: config.provider,
        model: config.modelName
      })

      // 构建消息数组
      const messages = [{ role: 'user', content: prompt }]

      // 如果有系统提示词，添加到消息开头
      if (config.systemPrompt) {
        messages.unshift({ role: 'system', content: config.systemPrompt })
      }

      // 合并参数
      const mergedParameters = {
        ...config.parameters,
        ...(parameters || {})
      }

      // 使用formatModelRequest生成请求体，启用流式响应
      const requestBody = formatModelRequest(
        {
          ...config,
          parameters: mergedParameters
        },
        messages,
        true // 启用流式
      )

      // 准备请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(config)
      }

      // 合并自定义请求头
      if (config.headers) {
        Object.assign(headers, config.headers)
      }

      // 准备请求配置
      const requestConfig: AxiosRequestConfig = {
        headers,
        timeout: 120000, // 流式响应使用更长的超时
        responseType: 'stream'
      }

      // 获取完整端点URL
      const fullEndpoint = getFullEndpoint(config.provider, config.baseUrl)

      // 发送请求
      const response = await axios.post(fullEndpoint, requestBody, requestConfig)
      const buffer = ''

      // 处理流式响应
      response.data.on('data', (chunk: Buffer) => {
        try {
          const text = chunk.toString()

          // 处理不同提供商的流式数据格式
          let content: string | null = null

          switch (config?.provider) {
            case 'openai':
              // 处理OpenAI的SSE格式
              content = this.processOpenAIStream(text, buffer)
              break

            case 'anthropic':
              // 处理Anthropic的SSE格式
              content = this.processAnthropicStream(text)
              break

            case 'gemini':
              // 处理Gemini的流式响应
              content = this.processGeminiStream(text)
              break

            default:
              // 默认处理方式，假设类似OpenAI的格式
              content = this.processOpenAIStream(text, buffer)
          }

          if (content) {
            callback(content, false)
          }
        } catch (err) {
          log.error('解析流式响应出错:', err)
        }
      })

      response.data.on('end', () => {
        // 流式响应结束
        const totalDuration = Date.now() - startTime
        log.info('LLM流式请求完成:', {
          provider: config?.provider,
          model: config?.modelName,
          totalDuration: `${totalDuration}ms`
        })

        // 通知完成
        callback('', true)
      })
    } catch (error) {
      // 错误处理和日志记录
      const duration = Date.now() - startTime
      if (axios.isAxiosError(error)) {
        log.error('LLM流式API调用失败:', {
          provider: config?.provider,
          model: config?.modelName,
          duration: `${duration}ms`,
          status: error.response?.status,
          message: error.response?.data?.error?.message || error.message
        })
      } else {
        log.error('LLM流式调用失败:', {
          provider: config?.provider,
          model: config?.modelName,
          duration: `${duration}ms`,
          error: error instanceof Error ? error.message : String(error)
        })
      }

      // 将错误传递给回调
      callback(`错误: ${error instanceof Error ? error.message : String(error)}`, true)
      throw error
    }
  }

  /**
   * 获取认证请求头
   * @param config - 模型配置
   * @returns 认证请求头对象
   */
  private getAuthHeaders(config: ModelConfig): Record<string, string> {
    switch (config.provider) {
      case 'anthropic':
        return {
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01'
        }
      case 'zhipu':
        return {
          Authorization: config.apiKey
        }
      case 'gemini':
        // Gemini可能将API密钥添加到URL中
        return {}
      case 'openai':
      case 'moonshot':
      case 'deepseek':
      default:
        return {
          Authorization: `Bearer ${config.apiKey}`
        }
    }
  }

  /**
   * 提取令牌使用信息
   * @param responseData - API响应数据
   * @param provider - 提供商
   * @returns 令牌使用信息对象
   */
  private extractTokenInfo(responseData: any, provider: string): any {
    if (!responseData) return {}

    switch (provider) {
      case 'openai':
      case 'deepseek':
      case 'moonshot':
        return responseData.usage || {}
      case 'anthropic':
        return responseData.usage || {}
      case 'gemini':
        return responseData.usageMetadata || {}
      default:
        return {}
    }
  }

  /**
   * 处理OpenAI流式响应
   * @param text - 数据块文本
   * @param buffer - 缓冲区
   * @returns 解析出的内容
   */
  private processOpenAIStream(text: string, buffer = ''): string | null {
    buffer += text

    // 查找所有完整的数据行
    const lines = buffer.split('\n')
    buffer = lines.pop() || '' // 最后一行可能不完整，保留到下一次

    // 处理所有完整的数据行
    let content = ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.substring(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          const deltaContent = parsed.choices?.[0]?.delta?.content
          if (deltaContent) {
            content += deltaContent
          }
        } catch (e) {
          // 忽略无法解析的行
        }
      }
    }

    return content || null
  }

  /**
   * 处理Anthropic流式响应
   * @param text - 数据块文本
   * @returns 解析出的内容
   */
  private processAnthropicStream(text: string): string | null {
    let content = ''

    // Anthropic的流式响应格式
    const lines = text.split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.substring(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          // Anthropic的格式与OpenAI不同
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            content += parsed.delta.text
          }
        } catch (e) {
          // 忽略无法解析的行
        }
      }
    }

    return content || null
  }

  /**
   * 处理Gemini流式响应
   * @param text - 数据块文本
   * @returns 解析出的内容
   */
  private processGeminiStream(text: string): string | null {
    try {
      // Gemini可能使用不同于SSE的流式格式
      const parsed = JSON.parse(text)

      // 尝试几种可能的路径
      return (
        parsed.candidates?.[0]?.content?.parts?.[0]?.text || parsed.text || parsed.content || null
      )
    } catch (e) {
      return null
    }
  }
}
