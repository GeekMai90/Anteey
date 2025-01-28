import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import { DeepSeekConfig, LLMConfig, LLMModelType } from '@shared/types'
import { LLM_MODELS } from './llm.config'

// 数据库层的配置接口
interface DBLLMConfig extends Omit<LLMConfig, 'deepseekConfig'> {
  deepseekConfig: string | null
}

export class LLMConfigService {
  // 获取所有配置
  async getAllConfigs(): Promise<LLMConfig[]> {
    const dbConfigs = await db<DBLLMConfig>('llm_configs').select('*').orderBy('createdAt', 'desc')
    return dbConfigs.map((config) => ({
      ...config,
      deepseekConfig: config.deepseekConfig ? JSON.parse(config.deepseekConfig) : undefined
    }))
  }

  // 获取默认配置
  async getDefaultConfig(): Promise<LLMConfig | null> {
    const dbConfig = await db<DBLLMConfig>('llm_configs').where('isDefault', true).first()
    if (!dbConfig) return null

    return {
      ...dbConfig,
      deepseekConfig: dbConfig.deepseekConfig ? JSON.parse(dbConfig.deepseekConfig) : undefined
    }
  }

  // 添加新配置
  async addConfig(
    model: string,
    apiKey: string,
    deepseekConfig?: DeepSeekConfig
  ): Promise<LLMConfig> {
    const now = new Date().toISOString()

    // 检查是否存在配置
    const result = await db('llm_configs').count('id as count').first()
    const isFirst = result ? (result.count as number) === 0 : true

    const id = uuidv4()
    const config: Partial<DBLLMConfig> = {
      id,
      model: model as LLMModelType,
      apiKey,
      isDefault: isFirst, // 如果是第一个配置，设为默认
      createdAt: now,
      updatedAt: now,
      deepseekConfig: deepseekConfig ? JSON.stringify(deepseekConfig) : null
    }

    await db('llm_configs').insert(config)
    const dbConfig = await db<DBLLMConfig>('llm_configs').where('id', id).first()

    return {
      ...dbConfig!,
      deepseekConfig: dbConfig?.deepseekConfig ? JSON.parse(dbConfig.deepseekConfig) : undefined
    }
  }

  // 更新配置
  async updateConfig(
    id: string,
    apiKey: string,
    deepseekConfig?: DeepSeekConfig
  ): Promise<LLMConfig> {
    const now = new Date().toISOString()

    const updateData: Partial<DBLLMConfig> = {
      apiKey,
      updatedAt: now,
      deepseekConfig: deepseekConfig ? JSON.stringify(deepseekConfig) : null
    }

    await db('llm_configs').where('id', id).update(updateData)
    const dbConfig = await db<DBLLMConfig>('llm_configs').where('id', id).first()

    // 转换回应用层类型
    return {
      ...dbConfig!,
      deepseekConfig: dbConfig?.deepseekConfig ? JSON.parse(dbConfig.deepseekConfig) : undefined
    }
  }

  // 删除配置
  async deleteConfig(id: string): Promise<void> {
    const config = await db<LLMConfig>('llm_configs').where('id', id).first()

    await db('llm_configs').where('id', id).delete()

    // 如果删除的是默认配置，设置最新的配置为默认
    if (config?.isDefault) {
      const latestConfig = await db<LLMConfig>('llm_configs').orderBy('createdAt', 'desc').first()

      if (latestConfig) {
        await db('llm_configs').where('id', latestConfig.id).update({ isDefault: true })
      }
    }
  }

  // 设置默认配置
  async setDefault(id: string): Promise<void> {
    // 开启事务
    await db.transaction(async (trx) => {
      // 先将所有配置设为非默认
      await trx('llm_configs').update({ isDefault: false })
      // 将指定配置设为默认
      await trx('llm_configs').where('id', id).update({ isDefault: true })
    })
  }

  // 添加 API Key 验证方法
  async validateApiKey(model: LLMModelType, apiKey: string): Promise<boolean> {
    try {
      const provider = LLM_MODELS[model].provider

      // 根据不同提供商进行验证
      switch (provider) {
        case 'deepseek': {
          // DeepSeek API Key 验证
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
          // 暂时对其他提供商返回 true
          return true
        }
      }
    } catch (error) {
      console.error('API Key 验证失败:', error)
      return false
    }
  }
}
