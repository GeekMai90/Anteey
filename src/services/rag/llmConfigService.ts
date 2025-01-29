import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import { DeepSeekConfig, LLMConfig, LLMModelType, SystemPromptConfig } from '@shared/types'
import { LLM_MODELS } from './llm.config'

/**
 * 数据库中LLM配置的接口定义
 * 与应用层的LLMConfig接口的区别在于deepseekConfig字段:
 * - 数据库中存储为JSON字符串
 * - 应用层使用时转换为对象
 */
interface DBLLMConfig extends Omit<LLMConfig, 'deepseekConfig'> {
  deepseekConfig: string | null
}

/**
 * LLM配置服务类
 * 负责管理所有与LLM(大语言模型)相关的配置
 * 包括：存储API密钥、模型参数、系统提示词等
 */
export class LLMConfigService {
  /**
   * 获取所有LLM配置
   * 从数据库获取所有配置并按创建时间降序排列
   * @returns Promise<LLMConfig[]> 返回配置数组，deepseekConfig已转换为对象
   */
  async getAllConfigs(): Promise<LLMConfig[]> {
    // 从数据库查询所有配置，按创建时间降序排序
    const dbConfigs = await db<DBLLMConfig>('llm_configs').select('*').orderBy('createdAt', 'desc')

    // 将数据库格式转换为应用层格式
    return dbConfigs.map((config) => ({
      ...config,
      // 如果存在deepseekConfig，将JSON字符串解析为对象
      deepseekConfig: config.deepseekConfig ? JSON.parse(config.deepseekConfig) : undefined
    }))
  }

  /**
   * 获取默认LLM配置
   * 查找标记为默认的配置项
   * @returns Promise<LLMConfig | null> 返回默认配置，如果不存在则返回null
   */
  async getDefaultConfig(): Promise<LLMConfig | null> {
    // 查询被标记为默认的配置
    const dbConfig = await db<DBLLMConfig>('llm_configs').where('isDefault', true).first()
    if (!dbConfig) return null

    // 转换为应用层格式
    return {
      ...dbConfig,
      deepseekConfig: dbConfig.deepseekConfig ? JSON.parse(dbConfig.deepseekConfig) : undefined
    }
  }

  /**
   * 添加新的LLM配置
   * @param model - 模型类型（如'deepseek-chat'）
   * @param apiKey - API密钥
   * @param deepseekConfig - DeepSeek特定的配置参数（可选）
   * @returns Promise<LLMConfig> 返回新创建的配置
   */
  async addConfig(
    model: string,
    apiKey: string,
    deepseekConfig?: DeepSeekConfig
  ): Promise<LLMConfig> {
    const now = new Date().toISOString()

    // 检查是否存在任何配置
    const result = await db('llm_configs').count('id as count').first()
    // 如果是第一个配置，则设置为默认配置
    const isFirst = result ? (result.count as number) === 0 : true

    // 生成唯一ID
    const id = uuidv4()
    // 准备配置数据
    const config: Partial<DBLLMConfig> = {
      id,
      model: model as LLMModelType,
      apiKey,
      isDefault: isFirst,
      createdAt: now,
      updatedAt: now,
      // 如果有DeepSeek配置，转换为JSON字符串存储
      deepseekConfig: deepseekConfig ? JSON.stringify(deepseekConfig) : null
    }

    // 插入新配置到数据库
    await db('llm_configs').insert(config)
    // 获取插入后的完整配置
    const dbConfig = await db<DBLLMConfig>('llm_configs').where('id', id).first()

    // 转换为应用层格式并返回
    return {
      ...dbConfig!,
      deepseekConfig: dbConfig?.deepseekConfig ? JSON.parse(dbConfig.deepseekConfig) : undefined
    }
  }

  /**
   * 更新现有的LLM配置
   * @param id - 要更新的配置ID
   * @param apiKey - 新的API密钥
   * @param deepseekConfig - 新的DeepSeek配置（可选）
   * @returns Promise<LLMConfig> 返回更新后的配置
   */
  async updateConfig(
    id: string,
    apiKey: string,
    deepseekConfig?: DeepSeekConfig
  ): Promise<LLMConfig> {
    const now = new Date().toISOString()

    // 准备更新数据
    const updateData: Partial<DBLLMConfig> = {
      apiKey,
      updatedAt: now,
      deepseekConfig: deepseekConfig ? JSON.stringify(deepseekConfig) : null
    }

    // 更新数据库中的配置
    await db('llm_configs').where('id', id).update(updateData)
    // 获取更新后的完整配置
    const dbConfig = await db<DBLLMConfig>('llm_configs').where('id', id).first()

    // 转换为应用层格式并返回
    return {
      ...dbConfig!,
      deepseekConfig: dbConfig?.deepseekConfig ? JSON.parse(dbConfig.deepseekConfig) : undefined
    }
  }

  /**
   * 删除LLM配置
   * 如果删除的是默认配置，会自动将最新的配置设为默认
   * @param id - 要删除的配置ID
   */
  async deleteConfig(id: string): Promise<void> {
    // 获取要删除的配置信息
    const config = await db<LLMConfig>('llm_configs').where('id', id).first()

    // 执行删除操作
    await db('llm_configs').where('id', id).delete()

    // 如果删除的是默认配置，需要设置新的默认配置
    if (config?.isDefault) {
      // 获取最新的配置
      const latestConfig = await db<LLMConfig>('llm_configs').orderBy('createdAt', 'desc').first()

      if (latestConfig) {
        // 将最新的配置设为默认
        await db('llm_configs').where('id', latestConfig.id).update({ isDefault: true })
      }
    }
  }

  /**
   * 设置默认LLM配置
   * @param id - 要设为默认的配置ID
   */
  async setDefault(id: string): Promise<void> {
    // 使用事务确保数据一致性
    await db.transaction(async (trx) => {
      // 先将所有配置设为非默认
      await trx('llm_configs').update({ isDefault: false })
      // 将指定配置设为默认
      await trx('llm_configs').where('id', id).update({ isDefault: true })
    })
  }

  /**
   * 验证API密钥是否有效
   * @param model - 模型类型
   * @param apiKey - 要验证的API密钥
   * @returns Promise<boolean> 返回密钥是否有效
   */
  async validateApiKey(model: LLMModelType, apiKey: string): Promise<boolean> {
    try {
      const provider = LLM_MODELS[model].provider

      // 根据不同的AI提供商执行不同的验证逻辑
      switch (provider) {
        case 'deepseek': {
          // 向DeepSeek API发送测试请求
          const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: model,
              messages: [{ role: 'user', content: 'test' }],
              max_tokens: 5
            })
          })

          return response.status === 200
        }
        default: {
          // 其他提供商暂时返回true（待实现具体验证逻辑）
          return true
        }
      }
    } catch (error) {
      console.error('API Key 验证失败:', error)
      return false
    }
  }

  /**
   * 获取系统提示词配置
   * @returns Promise<SystemPromptConfig> 返回系统提示词配置
   * @throws Error 如果配置不存在
   */
  async getSystemPrompt(): Promise<SystemPromptConfig> {
    const config = await db<SystemPromptConfig>('prompt_config').first()
    if (!config) {
      throw new Error('系统提示词配置不存在')
    }
    return config
  }

  /**
   * 更新系统提示词
   * @param systemPrompt - 新的系统提示词
   * @returns Promise<SystemPromptConfig> 返回更新后的配置
   * @throws Error 如果更新失败
   */
  async updateSystemPrompt(systemPrompt: string): Promise<SystemPromptConfig> {
    const [config] = await db<SystemPromptConfig>('prompt_config')
      .update({
        systemPrompt: systemPrompt.trim(),
        updatedAt: new Date().toISOString()
      })
      .returning('*')

    if (!config) {
      throw new Error('更新系统提示词失败')
    }

    return config
  }

  /**
   * 重置系统提示词为默认值
   * @returns Promise<SystemPromptConfig> 返回重置后的配置
   * @throws Error 如果重置失败
   */
  async resetSystemPrompt(): Promise<SystemPromptConfig> {
    // 获取当前配置
    const config = await db<SystemPromptConfig>('prompt_config').first()
    if (!config) {
      throw new Error('系统提示词配置不存在')
    }

    // 将系统提示词重置为默认值
    const [updatedConfig] = await db<SystemPromptConfig>('prompt_config')
      .update({
        systemPrompt: config.defaultSystemPrompt,
        updatedAt: new Date().toISOString()
      })
      .returning('*')

    return updatedConfig
  }
}
