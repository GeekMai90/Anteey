import log from 'electron-log'
import axios, { AxiosRequestConfig } from 'axios'
import { ModelConfigService } from './llmConfigService'
import { parseModelResponse, ModelConfig, LLMProvider } from './llm.config'

// 首先定义 Gemini 特定的参数类型
interface GeminiParameters {
  temperature: number
  maxTokens: number
  stopSequences?: string[]
  topP?: number
  topK?: number
  frequencyPenalty?: number
  presencePenalty?: number
}

// 添加消息类型定义
interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export class LLMService {
  // 模型配置服务实例
  private configService: ModelConfigService
  private abortController: AbortController | null = null

  constructor() {
    this.configService = new ModelConfigService()
  }

  // 中断当前请求
  public abortCurrentRequest() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  // 添加为类的成员方法
  private validateTemperature(temperature: number, provider: LLMProvider): number {
    // 如果是 OpenAI，支持 0-2
    if (provider === 'openai') {
      return Math.max(0, Math.min(2, temperature))
    }
    // 其他模型限制在 0-1
    return Math.max(0, Math.min(1, temperature))
  }

  /**
   * 生成LLM响应
   * @param prompt - 用户输入的提示文本
   * @param modelConfigId - 可选的配置ID，如不提供则使用默认配置
   * @param parameters - 可选的参数覆盖
   * @returns 返回LLM生成的响应文本
   */
  public async generateResponse(
    prompt: string,
    modelConfigId?: string,
    parameters?: Record<string, any>
  ): Promise<string> {
    // 记录开始时间和配置
    const startTime = Date.now()
    let config: ModelConfig | null = null

    try {
      // 如果存在旧的请求,先中断它
      if (this.abortController) {
        this.abortController.abort()
      }

      // 创建新的 AbortController
      this.abortController = new AbortController()

      // 添加详细日志
      log.info('开始获取模型配置:', {
        requestedConfigId: modelConfigId,
        hasParameters: !!parameters
      })

      // 修改这里：从 parameters 中获取 modelConfigId
      const configId = parameters?.modelConfigId || modelConfigId

      // 获取模型配置
      if (configId) {
        config = await this.configService.getConfigById(configId)
        log.info('通过ID获取的配置:', {
          configId,
          provider: config?.provider,
          modelName: config?.modelName
        })
      } else {
        config = await this.configService.getDefaultConfig()
        log.info('使用默认配置:', {
          provider: config?.provider,
          modelName: config?.modelName
        })
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

      // 构建消息数组，添加类型声明
      const messages: ChatMessage[] = []

      // 如果有系统提示词，添加到消息开头
      if (config.systemPrompt) {
        messages.push({
          role: 'system',
          content: config.systemPrompt
        })
      }

      // 添加用户消息
      messages.push({
        role: 'user',
        content: prompt
      })

      // 合并参数
      const mergedParameters = {
        temperature: 0.7,
        maxTokens: 2000,
        stopSequences: [],
        ...config.parameters,
        ...(parameters || {})
      } as GeminiParameters

      // 验证温度参数
      if (typeof mergedParameters.temperature === 'number') {
        const originalTemp = mergedParameters.temperature
        mergedParameters.temperature = this.validateTemperature(originalTemp, config.provider)

        if (originalTemp !== mergedParameters.temperature) {
          log.info('温度参数已调整:', {
            provider: config.provider,
            originalTemperature: originalTemp,
            adjustedTemperature: mergedParameters.temperature
          })
        }
      }

      // 根据不同提供商构建请求体
      let requestBody: any
      let fullEndpoint = this.getFullEndpoint(config.provider, config.baseUrl)

      if (config.provider === 'gemini') {
        // Gemini 特殊处理
        fullEndpoint = `${config.baseUrl}/v1/models/${config.modelName}:generateContent`
        if (config.apiKey) {
          fullEndpoint += `?key=${config.apiKey}`
        }

        requestBody = {
          contents: messages.map((msg) => ({
            parts: [{ text: msg.content }],
            role: this.mapRoleForGemini(msg.role)
          })),
          generationConfig: {
            temperature: Number(mergedParameters.temperature),
            maxOutputTokens: Number(mergedParameters.maxTokens),
            stopSequences: mergedParameters.stopSequences || []
          }
        }
      } else if (config.provider === 'anthropic') {
        requestBody = {
          model: config.modelName,
          messages: messages,
          max_tokens: Number(mergedParameters.maxTokens),
          temperature: Number(mergedParameters.temperature),
          stream: false
        }
      } else {
        requestBody = {
          model: config.modelName,
          messages: messages,
          temperature: Number(mergedParameters.temperature),
          max_tokens: Number(mergedParameters.maxTokens),
          stream: false
        }
      }

      // 准备请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(config)
      }

      console.log('Sending request:', {
        url: fullEndpoint,
        provider: config.provider,
        model: config.modelName,
        requestBody,
        headers: { ...headers, 'x-api-key': '***' } // 隐藏 API key
      })

      // 发送请求
      const responseStartTime = Date.now()
      const response = await axios.post(fullEndpoint, requestBody, {
        headers,
        timeout: 90000,
        signal: this.abortController?.signal
      })
      const responseDuration = Date.now() - responseStartTime

      // 记录请求统计信息
      log.info(`${config.provider.toUpperCase()} API响应:`, {
        provider: config.provider,
        model: config.modelName,
        requestDuration: `${responseDuration}ms`,
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
      // 判断是否是中断导致的错误
      if (error instanceof Error && error.name === 'AbortError') {
        throw error // 向上传递中断错误
      }

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
    } finally {
      // 请求完成后清理 controller
      this.abortController = null
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

      // 构建消息数组，添加类型声明
      const messages: ChatMessage[] = [{ role: 'user', content: prompt }]

      // 如果有系统提示词，添加到消息开头
      if (config.systemPrompt) {
        messages.unshift({ role: 'system', content: config.systemPrompt })
      }

      // 合并参数
      const mergedParameters = {
        temperature: 0.7,
        maxTokens: 2000,
        stopSequences: [], // 添加默认值
        ...config.parameters,
        ...(parameters || {})
      } as GeminiParameters

      // 验证温度参数
      if (typeof mergedParameters.temperature === 'number') {
        const originalTemp = mergedParameters.temperature
        mergedParameters.temperature = this.validateTemperature(originalTemp, config.provider)

        if (originalTemp !== mergedParameters.temperature) {
          log.info('温度参数已调整:', {
            provider: config.provider,
            originalTemperature: originalTemp,
            adjustedTemperature: mergedParameters.temperature
          })
        }
      }

      // 根据不同提供商构建请求体
      let requestBody: any
      let fullEndpoint = this.getFullEndpoint(config.provider, config.baseUrl)

      if (config.provider === 'gemini') {
        // Gemini 特殊处理
        fullEndpoint = `${config.baseUrl}/v1/models/${config.modelName}:streamGenerateContent`
        if (config.apiKey) {
          fullEndpoint += `?key=${config.apiKey}`
        }

        requestBody = {
          contents: messages.map((msg) => ({
            parts: [{ text: msg.content }],
            role: this.mapRoleForGemini(msg.role)
          })),
          generationConfig: {
            temperature: Number(mergedParameters.temperature),
            maxOutputTokens: Number(mergedParameters.maxTokens),
            stopSequences: mergedParameters.stopSequences || []
          }
        }
      } else if (config.provider === 'anthropic') {
        requestBody = {
          model: config.modelName,
          messages: messages,
          max_tokens: Number(mergedParameters.maxTokens),
          temperature: Number(mergedParameters.temperature),
          stream: true
        }
      } else {
        requestBody = {
          model: config.modelName,
          messages: messages,
          temperature: Number(mergedParameters.temperature),
          max_tokens: Number(mergedParameters.maxTokens),
          stream: true
        }
      }

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
        responseType: 'stream',
        signal: this.abortController?.signal
      }

      // 获取完整端点URL
      fullEndpoint = this.getFullEndpoint(config.provider, config.baseUrl)

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
        // Gemini 使用 URL 参数，不需要 headers
        return {
          'Content-Type': 'application/json'
        }
      default:
        return {
          'Content-Type': 'application/json',
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

    const lines = text.split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.substring(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          // 新版 Claude API 的流式响应格式
          if (parsed.type === 'message_delta' && parsed.delta?.text) {
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
      const parsed = JSON.parse(text)

      // 处理流式响应
      if (parsed.candidates && parsed.candidates[0]) {
        const candidate = parsed.candidates[0]
        if (candidate.content && candidate.content.parts) {
          const textContent = candidate.content.parts
            .filter((part: any) => part.text)
            .map((part: any) => part.text)
            .join('')
          return textContent || null
        }
      }

      return null
    } catch (e) {
      return null
    }
  }

  // 修改 getFullEndpoint 函数，确保包含 v1
  private getFullEndpoint(provider: LLMProvider, baseUrl: string): string {
    const API_PATH_SUFFIXES: Record<LLMProvider, string> = {
      zhipu: '/chat/completions',
      moonshot: '/chat/completions',
      deepseek: '/chat/completions',
      openai: '/chat/completions',
      anthropic: '/v1/messages',
      gemini: '/models',
      custom: ''
    }

    const suffix = API_PATH_SUFFIXES[provider]
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

    // 对于 anthropic，如果 baseUrl 已经包含了 /v1，就不要重复添加
    if (provider === 'anthropic') {
      if (baseUrl.includes('/v1')) {
        return `${cleanBase}/messages`
      }
      return `${cleanBase}/v1/messages`
    }

    return `${cleanBase}${suffix}`
  }

  // 添加辅助方法来映射角色
  private mapRoleForGemini(role: ChatMessage['role']): string {
    switch (role) {
      case 'system':
      case 'assistant':
        return 'model'
      case 'user':
        return 'user'
      default:
        return 'user'
    }
  }

  // 添加一个公共方法来获取 abortController
  public getAbortController(): AbortController | null {
    return this.abortController
  }
}
