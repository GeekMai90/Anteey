import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import {
  ModelConfig,
  ProviderPreset,
  LLMProvider,
  DEFAULT_PARAMETERS,
  DEFAULT_BASE_URLS,
  getDefaultModel
} from './llm.config'
import axios from 'axios'

/**
 * 模型配置服务类
 * 负责管理所有与LLM(大语言模型)相关的配置
 */
export class ModelConfigService {
  /**
   * 获取所有模型配置
   * @returns Promise<ModelConfig[]> 返回配置数组，按创建时间降序排列
   */
  async getAllConfigs(): Promise<ModelConfig[]> {
    try {
      const configs = await db<ModelConfig>('model_configs')
        .select('*')
        .orderBy('createdAt', 'desc')

      // 处理所有配置的参数反序列化
      return configs.map((config) => {
        if (config.parameters && typeof config.parameters === 'string') {
          try {
            config.parameters = JSON.parse(config.parameters)
          } catch (e) {
            console.error(`解析配置 ID ${config.id} 的参数 JSON 失败:`, e)
            config.parameters = { ...DEFAULT_PARAMETERS[config.provider] }
          }
        }
        return config
      })
    } catch (error) {
      console.error('获取所有模型配置失败:', error)
      throw error
    }
  }

  /**
   * 获取默认模型配置
   * @returns Promise<ModelConfig | null> 返回默认配置，如果不存在则返回null
   */
  async getDefaultConfig(): Promise<ModelConfig | null> {
    return (await db<ModelConfig>('model_configs').where('isDefault', true).first()) || null
  }

  /**
   * 根据ID获取模型配置
   * @param id - 配置ID
   * @returns Promise<ModelConfig | null> 返回查找到的配置，如果不存在则返回null
   */
  async getConfigById(id: string): Promise<ModelConfig | null> {
    try {
      const config = await db<ModelConfig>('model_configs').where('id', id).first()

      if (!config) return null

      // 反序列化参数字符串为对象
      if (config.parameters && typeof config.parameters === 'string') {
        try {
          config.parameters = JSON.parse(config.parameters)
        } catch (e) {
          console.error('解析参数 JSON 失败:', e)
          // 如果解析失败，设置一个默认参数对象
          config.parameters = { ...DEFAULT_PARAMETERS[config.provider] }
        }
      }

      return config
    } catch (error) {
      console.error('获取模型配置失败:', error)
      throw error
    }
  }

  /**
   * 根据提供商获取模型配置列表
   * @param provider - 提供商
   * @returns Promise<ModelConfig[]> 返回该提供商的所有配置
   */
  async getConfigsByProvider(provider: LLMProvider): Promise<ModelConfig[]> {
    return await db<ModelConfig>('model_configs')
      .where('provider', provider)
      .orderBy('createdAt', 'desc')
  }

  /**
   * 创建新的模型配置
   * @param config - 新的模型配置（不需要包含id、createdAt和updatedAt）
   * @returns Promise<ModelConfig> 返回创建的配置
   */
  async createConfig(
    config: Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ModelConfig> {
    try {
      // 创建一个配置对象的副本
      const configForDb: any = { ...config }

      // 序列化参数对象
      if (configForDb.parameters && typeof configForDb.parameters === 'object') {
        configForDb.parameters = JSON.stringify(configForDb.parameters)
      }

      // 设置创建和更新时间
      const now = new Date()
      const id = uuidv4()

      // 检查是否存在任何配置
      const configCount = await db('model_configs').count('id as count').first()
      const isFirst = configCount ? (configCount.count as number) === 0 : true

      // 如果是第一个配置，设为默认配置
      const isDefault = isFirst ? true : config.isDefault

      // 如果设置为默认，需要将其他配置设为非默认
      if (isDefault) {
        await db('model_configs').update({ isDefault: false })
      }

      // 执行插入操作
      await db('model_configs').insert({
        id,
        ...configForDb,
        isDefault,
        createdAt: now,
        updatedAt: now
      })

      // 获取创建的完整配置
      const newConfig = await this.getConfigById(id)
      if (!newConfig) {
        throw new Error(`无法获取新创建的配置: ${id}`)
      }
      return newConfig
    } catch (error) {
      console.error('创建模型配置失败:', error)
      throw error
    }
  }

  /**
   * 更新现有的模型配置
   * @param id - 要更新的配置ID
   * @param updates - 要更新的字段
   * @returns Promise<ModelConfig> 返回更新后的配置
   */
  async updateConfig(
    id: string,
    updates: Partial<Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<ModelConfig> {
    try {
      // 创建一个更新对象的副本
      const updatesForDb: any = { ...updates }

      // 如果更新包含参数对象，将其序列化为 JSON 字符串
      if (updatesForDb.parameters && typeof updatesForDb.parameters === 'object') {
        updatesForDb.parameters = JSON.stringify(updatesForDb.parameters)
      }

      // 执行更新操作
      await db('model_configs')
        .where('id', id)
        .update({
          ...updatesForDb,
          updatedAt: new Date()
        })

      // 获取更新后的完整配置
      const updatedConfig = await this.getConfigById(id)
      if (!updatedConfig) {
        throw new Error(`更新后无法获取配置: ${id}`)
      }
      return updatedConfig
    } catch (error) {
      console.error('更新模型配置失败:', error)
      throw error
    }
  }

  /**
   * 删除模型配置
   * @param id - 要删除的配置ID
   * @returns Promise<void>
   */
  async deleteConfig(id: string): Promise<void> {
    // 获取要删除的配置
    const config = await this.getConfigById(id)

    if (!config) return

    // 执行删除
    await db('model_configs').where('id', id).delete()

    // 如果删除的是默认配置，需要设置新的默认配置
    if (config.isDefault) {
      const latestConfig = await db<ModelConfig>('model_configs')
        .orderBy('createdAt', 'desc')
        .first()

      if (latestConfig) {
        await db('model_configs').where('id', latestConfig.id).update({ isDefault: true })
      }
    }
  }

  /**
   * 设置默认配置
   * @param id - 要设为默认的配置ID
   * @returns Promise<ModelConfig> 返回设为默认的配置
   */
  async setDefaultConfig(id: string): Promise<ModelConfig> {
    await db.transaction(async (trx) => {
      // 先将所有配置设为非默认
      await trx('model_configs').update({ isDefault: false })
      // 将指定配置设为默认
      await trx('model_configs').where('id', id).update({
        isDefault: true,
        updatedAt: new Date()
      })
    })

    return (await this.getConfigById(id)) as ModelConfig
  }

  /**
   * 获取所有预设提供商配置
   * @returns Promise<ProviderPreset[]> 返回所有提供商预设
   */
  async getAllProviderPresets(): Promise<ProviderPreset[]> {
    return await db<ProviderPreset>('provider_presets').select('*').orderBy('provider')
  }

  /**
   * 根据提供商获取预设配置
   * @param provider - 提供商
   * @returns Promise<ProviderPreset | null> 返回提供商预设，如果不存在则返回null
   */
  async getProviderPreset(provider: LLMProvider): Promise<ProviderPreset | null> {
    return (
      (await db<ProviderPreset>('provider_presets').where('provider', provider).first()) || null
    )
  }

  /**
   * 更新提供商预设
   * @param provider - 提供商
   * @param updates - 要更新的字段
   * @returns Promise<ProviderPreset> 返回更新后的预设
   */
  async updateProviderPreset(
    provider: LLMProvider,
    updates: Partial<Omit<ProviderPreset, 'id' | 'provider' | 'createdAt' | 'updatedAt'>>
  ): Promise<ProviderPreset> {
    const now = new Date()

    // 准备更新数据
    const updateData = {
      ...updates,
      updatedAt: now
    }

    // 更新预设
    await db('provider_presets').where('provider', provider).update(updateData)

    // 返回更新后的预设
    return (await this.getProviderPreset(provider)) as ProviderPreset
  }

  /**
   * 测试模型连接
   * @param provider - 提供商类型
   * @param baseUrl - 基础URL
   * @param apiKey - API密钥
   * @param modelName - 模型名称
   */
  async testConnection(
    provider: LLMProvider,
    baseUrl: string,
    apiKey: string,
    modelName: string
  ): Promise<{ valid: boolean; message?: string }> {
    try {
      // 获取完整端点
      let fullEndpoint = this.getFullEndpoint(provider, baseUrl)

      // 定义请求体类型
      interface RequestBody {
        model?: string
        messages?: Array<{ role: string; content: string }>
        temperature?: number
        max_tokens?: number
        stream?: boolean
        contents?: Array<{ parts: Array<{ text: string }> }>
        generationConfig?: {
          temperature: number
          maxOutputTokens: number
        }
      }

      // 构建基础请求体
      let requestBody: RequestBody = {
        model: modelName,
        messages: [
          {
            role: 'user',
            content: 'hi'
          }
        ],
        temperature: 0.7,
        max_tokens: 5,
        stream: false
      }

      // 根据不同提供商调整请求体和端点
      switch (provider) {
        case 'anthropic':
          requestBody = {
            model: modelName,
            messages: [
              {
                role: 'user',
                content: 'hi'
              }
            ],
            max_tokens: 5,
            temperature: 0.7,
            stream: false
          }
          break

        case 'gemini':
          // Gemini 需要特殊处理端点和请求体
          fullEndpoint = `${baseUrl}/v1/models/${modelName}:generateContent`
          if (apiKey) {
            fullEndpoint += `?key=${apiKey}`
          }
          requestBody = {
            contents: [
              {
                parts: [{ text: 'hi' }]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 5
            }
          }
          break
      }

      // 准备请求头
      let headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      // 根据提供商添加特定的 headers
      if (provider === 'anthropic') {
        headers = {
          ...headers,
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      } else if (provider !== 'gemini') {
        // Gemini 使用 URL 参数而不是 header
        headers.Authorization = `Bearer ${apiKey}`
      }

      console.log('Testing connection with:', {
        url: fullEndpoint,
        provider,
        model: modelName,
        requestBody,
        headers: { ...headers, 'x-api-key': '***' } // 日志中隐藏 API key
      })

      const response = await axios.post(fullEndpoint, requestBody, {
        headers,
        timeout: 10000
      })

      // 验证响应
      if (response.status === 200) {
        if (provider === 'anthropic') {
          const isValid =
            response.data &&
            (response.data.content ||
              response.data.messages ||
              response.data.choices ||
              response.data.candidates)
          return {
            valid: isValid,
            message: isValid ? '连接测试成功' : '响应格式不正确'
          }
        } else if (provider === 'gemini') {
          const isValid =
            response.data && (response.data.candidates || response.data.promptFeedback)
          return {
            valid: isValid,
            message: isValid ? '连接测试成功' : '响应格式不正确'
          }
        }

        return {
          valid: true,
          message: '连接测试成功'
        }
      }

      return {
        valid: false,
        message: `服务器返回了非预期的状态码: ${response.status}`
      }
    } catch (error) {
      console.error('API连接测试失败:', error)

      if (axios.isAxiosError(error)) {
        const status = error.response?.status
        const errorMessage = error.response?.data?.error?.message || error.message

        // 添加更详细的错误信息
        console.error('详细错误信息:', {
          status,
          errorMessage,
          response: error.response?.data,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers
          }
        })

        if (status === 401 || status === 403) {
          return { valid: false, message: 'API密钥无效或未授权' }
        } else if (status === 404) {
          return { valid: false, message: 'API地址无效或模型名称不正确' }
        } else if (status === 429) {
          return { valid: false, message: 'API请求超过限制，请稍后再试' }
        } else {
          return { valid: false, message: `API调用失败 (${status}): ${errorMessage}` }
        }
      }

      return {
        valid: false,
        message: `连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  // 修改 getAuthHeaders 方法
  private getAuthHeaders({
    provider,
    apiKey
  }: {
    provider: LLMProvider
    apiKey: string
  }): Record<string, string> {
    switch (provider) {
      case 'anthropic':
        return {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      case 'zhipu':
        return {
          Authorization: apiKey
        }
      case 'gemini':
        return {} // Gemini 使用 URL 参数
      default:
        return {
          Authorization: `Bearer ${apiKey}`
        }
    }
  }

  // 添加响应验证方法
  private validateResponse(data: any, provider: LLMProvider): boolean {
    try {
      switch (provider) {
        case 'openai':
        case 'moonshot':
        case 'deepseek':
          return !!data.choices && Array.isArray(data.choices)
        case 'anthropic':
          return !!data.content
        case 'zhipu':
          return !!data.choices && Array.isArray(data.choices)
        case 'gemini':
          return !!data.candidates && Array.isArray(data.candidates)
        default:
          return !!data.choices || !!data.content || !!data.candidates
      }
    } catch (error) {
      console.error('验证响应格式时出错:', error)
      return false
    }
  }

  /**
   * 创建默认模型配置对象(不保存到数据库)
   * @param provider - 提供商
   * @param apiKey - API密钥
   * @returns Promise<Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>> 返回默认配置对象
   */
  async createDefaultConfigObject(
    provider: LLMProvider,
    apiKey: string
  ): Promise<Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>> {
    // 获取提供商预设
    const preset = await this.getProviderPreset(provider)

    // 如果没有预设，使用硬编码的默认值
    const modelName = preset?.defaultModel || getDefaultModel(provider)

    // 使用 baseUrl 替代 endpoint
    const baseUrl = preset?.defaultBaseUrl || DEFAULT_BASE_URLS[provider]

    const parameters = preset?.defaultParameters
      ? JSON.parse(JSON.stringify(preset.defaultParameters))
      : { ...DEFAULT_PARAMETERS[provider] }

    return {
      name: `${provider} - ${modelName}`,
      provider,
      modelName,
      baseUrl, // 这里改为 baseUrl
      apiKey,
      parameters,
      isDefault: false
    }
  }

  /**
   * 获取系统提示词配置
   * @returns Promise<{systemPrompt: string, defaultSystemPrompt: string}> 返回系统提示词配置
   */
  async getSystemPrompt(): Promise<{ systemPrompt: string; defaultSystemPrompt: string }> {
    const config = await db('prompt_config').first()
    if (!config) {
      throw new Error('系统提示词配置不存在')
    }
    return {
      systemPrompt: config.systemPrompt,
      defaultSystemPrompt: config.defaultSystemPrompt
    }
  }

  /**
   * 更新系统提示词
   * @param systemPrompt - 新的系统提示词
   * @returns Promise<{systemPrompt: string, defaultSystemPrompt: string}> 返回更新后的配置
   */
  async updateSystemPrompt(
    systemPrompt: string
  ): Promise<{ systemPrompt: string; defaultSystemPrompt: string }> {
    const [config] = await db('prompt_config')
      .update({
        systemPrompt: systemPrompt.trim(),
        updatedAt: new Date()
      })
      .returning(['systemPrompt', 'defaultSystemPrompt'])

    if (!config) {
      throw new Error('更新系统提示词失败')
    }

    return config
  }

  /**
   * 重置系统提示词为默认值
   * @returns Promise<{systemPrompt: string, defaultSystemPrompt: string}> 返回重置后的配置
   */
  async resetSystemPrompt(): Promise<{ systemPrompt: string; defaultSystemPrompt: string }> {
    const config = await db('prompt_config').first()
    if (!config) {
      throw new Error('系统提示词配置不存在')
    }

    const [updatedConfig] = await db('prompt_config')
      .update({
        systemPrompt: config.defaultSystemPrompt,
        updatedAt: new Date()
      })
      .returning(['systemPrompt', 'defaultSystemPrompt'])

    return updatedConfig
  }

  private getFullEndpoint(provider: LLMProvider, baseUrl: string): string {
    const API_PATH_SUFFIXES: Record<LLMProvider, string> = {
      zhipu: '/chat/completions',
      moonshot: '/chat/completions',
      deepseek: '/chat/completions',
      openai: '/chat/completions',
      anthropic: '/v1/messages', // 修改为正确的 Anthropic 端点
      gemini: '/models',
      custom: ''
    }

    const suffix = API_PATH_SUFFIXES[provider]
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    const cleanSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`

    return `${cleanBase}${cleanSuffix}`
  }
}
