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
      // 1. 构建完整的API端点
      let fullEndpoint = this.getFullEndpoint(provider, baseUrl)

      // 2. 构建一个简单的测试请求
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      // 添加认证头
      switch (provider) {
        case 'anthropic':
          headers['x-api-key'] = apiKey
          headers['anthropic-version'] = '2023-06-01'
          break
        case 'zhipu':
          headers['Authorization'] = apiKey
          break
        case 'gemini':
          // Gemini可能会将API密钥作为URL参数
          break
        case 'openai':
        case 'moonshot':
        case 'deepseek':
        default:
          headers['Authorization'] = `Bearer ${apiKey}`
      }

      // 3. 准备请求体 - 使用最小化的请求内容
      let requestBody: any

      switch (provider) {
        case 'openai':
        case 'zhipu':
        case 'moonshot':
        case 'deepseek':
          requestBody = {
            model: modelName,
            messages: [{ role: 'user', content: '你好' }],
            max_tokens: 5 // 限制token数量减少费用
          }
          break
        case 'anthropic':
          requestBody = {
            model: modelName,
            messages: [{ role: 'user', content: '你好' }],
            max_tokens: 5
          }
          break
        case 'gemini':
          requestBody = {
            contents: [{ role: 'user', parts: [{ text: '你好' }] }],
            generationConfig: {
              maxOutputTokens: 5
            }
          }

          // 对于Gemini，可能需要将API密钥添加到URL中
          if (!fullEndpoint.includes('key=')) {
            fullEndpoint = `${fullEndpoint}/${modelName}:generateContent?key=${apiKey}`
          }
          break
        default:
          requestBody = {
            model: modelName,
            messages: [{ role: 'user', content: '你好' }],
            max_tokens: 5
          }
      }

      // 4. 设置较短的超时，避免长时间等待
      const requestConfig = {
        headers,
        timeout: 15000 // 15秒超时
      }

      // 5. 发送实际请求并验证响应
      console.log(`测试连接到 ${provider} API:`, {
        url: fullEndpoint,
        model: modelName
      })

      const response = await axios.post(fullEndpoint, requestBody, requestConfig)

      // 6. 验证响应状态码和内容
      if (response.status >= 200 && response.status < 300) {
        // 进一步验证响应内容是否符合预期
        const hasValidContent = this.validateResponseContent(response.data, provider)

        if (hasValidContent) {
          return {
            valid: true,
            message: `成功连接到${provider}的API服务`
          }
        } else {
          return {
            valid: false,
            message: `收到响应但格式不符合预期，请检查API设置`
          }
        }
      } else {
        return {
          valid: false,
          message: `API响应状态码异常: ${response.status}`
        }
      }
    } catch (error) {
      // 7. 详细的错误信息处理
      console.error('API连接测试失败:', error)

      let errorMessage = '连接失败'

      if (axios.isAxiosError(error)) {
        // 网络错误处理
        if (!error.response) {
          if (error.code === 'ECONNREFUSED') {
            errorMessage = '无法连接到API服务器，请检查API地址是否正确'
          } else if (error.code === 'ETIMEDOUT') {
            errorMessage = '连接超时，请检查API地址或网络状态'
          } else {
            errorMessage = `网络错误: ${error.message}`
          }
        }
        // HTTP错误处理
        else {
          const status = error.response.status
          if (status === 401 || status === 403) {
            errorMessage = 'API密钥无效或未授权'
          } else if (status === 404) {
            errorMessage = 'API端点未找到，请检查API地址'
          } else if (status === 429) {
            errorMessage = 'API请求超过限制，请稍后再试'
          } else {
            errorMessage = `API错误 (${status}): ${error.response.data?.error?.message || error.message}`
          }
        }
      } else {
        errorMessage = `测试失败: ${error instanceof Error ? error.message : '未知错误'}`
      }

      return { valid: false, message: errorMessage }
    }
  }

  /**
   * 验证API响应内容
   */
  private validateResponseContent(data: any, provider: LLMProvider): boolean {
    try {
      switch (provider) {
        case 'openai':
        case 'zhipu':
        case 'moonshot':
        case 'deepseek':
          return !!data.choices && Array.isArray(data.choices)
        case 'anthropic':
          return !!data.content
        case 'gemini':
          return !!data.candidates && Array.isArray(data.candidates)
        default:
          // 通用检查：查找常见的响应字段
          return !!(
            data.choices ||
            data.content ||
            data.candidates ||
            data.output ||
            data.result ||
            data.generated_text
          )
      }
    } catch (error) {
      console.error('验证API响应内容时出错:', error)
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
    // 导入API路径配置
    const API_PATH_SUFFIXES: Record<LLMProvider, string> = {
      zhipu: '/chat/completions',
      moonshot: '/chat/completions',
      deepseek: '/chat/completions',
      openai: '/chat/completions',
      anthropic: '/messages',
      gemini: '/models',
      custom: ''
    }

    const suffix = API_PATH_SUFFIXES[provider]

    // 处理基础URL末尾的斜杠，确保不会出现双斜杠
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

    // 处理后缀开头的斜杠，确保始终有一个斜杠
    const cleanSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`

    return `${cleanBase}${cleanSuffix}`
  }
}
