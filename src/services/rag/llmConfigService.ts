import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import { LLMConfig, LLMModelType } from '@shared/types'

// 获取所有配置
export async function getAllConfigs(): Promise<LLMConfig[]> {
  const configs = await db<LLMConfig>('llm_configs').select('*').orderBy('createdAt', 'desc')
  return configs
}

// 获取默认配置
export async function getDefaultConfig(): Promise<LLMConfig | null> {
  const config = await db<LLMConfig>('llm_configs').where('isDefault', true).first()
  return config || null
}

// 添加新配置
export async function addConfig(model: string, apiKey: string): Promise<LLMConfig> {
  const now = new Date().toISOString()

  // 检查是否存在配置
  const result = await db('llm_configs').count('id as count').first()
  const isFirst = result ? (result.count as number) === 0 : true

  const id = uuidv4()
  const config: Partial<LLMConfig> = {
    id,
    model: model as LLMModelType,
    apiKey,
    isDefault: isFirst, // 如果是第一个配置，设为默认
    createdAt: now,
    updatedAt: now
  }

  await db('llm_configs').insert(config)
  return (await db<LLMConfig>('llm_configs').where('id', id).first())!
}

// 更新配置
export async function updateConfig(id: string, apiKey: string): Promise<LLMConfig> {
  const now = new Date().toISOString()

  await db('llm_configs').where('id', id).update({
    apiKey,
    updatedAt: now
  })

  return (await db<LLMConfig>('llm_configs').where('id', id).first())!
}

// 删除配置
export async function deleteConfig(id: string): Promise<void> {
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
export async function setDefaultConfig(id: string): Promise<void> {
  // 开启事务
  await db.transaction(async (trx) => {
    // 先将所有配置设为非默认
    await trx('llm_configs').update({ isDefault: false })
    // 将指定配置设为默认
    await trx('llm_configs').where('id', id).update({ isDefault: true })
  })
}
