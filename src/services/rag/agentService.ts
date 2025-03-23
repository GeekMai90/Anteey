import { db } from '../../db/config'
import { Agent, CreateAgentParams, UpdateAgentParams } from '@shared/types'
import { v4 as uuidv4 } from 'uuid'

// 工具函数：将数据库记录转换为 Agent 对象
function convertToAgent(record: any): Agent {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    greeting: record.greeting,
    systemPrompt: record.systemPrompt,
    temperature: record.temperature,
    modelConfigId: record.modelConfigId,
    includeNoteContext: Boolean(record.includeNoteContext),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  }
}

// 创建 Agent
export async function createAgent(params: CreateAgentParams): Promise<Agent> {
  try {
    const id = uuidv4()
    const now = new Date()

    const newAgent = {
      id,
      name: params.name,
      description: params.description || null,
      greeting: params.greeting,
      systemPrompt: params.systemPrompt,
      temperature: params.temperature,
      modelConfigId: params.modelConfigId,
      includeNoteContext: params.includeNoteContext,
      createdAt: now,
      updatedAt: now
    }

    const [created] = await db('agents').insert(newAgent).returning('*')
    return convertToAgent(created)
  } catch (error) {
    console.error('后端→ 创建Agent失败:', error)
    throw error
  }
}

// 获取所有 Agents
export async function getAllAgents(): Promise<Agent[]> {
  try {
    const agents = await db('agents').select('*').orderBy('createdAt', 'desc')

    return agents.map(convertToAgent)
  } catch (error) {
    console.error('后端→ 获取所有Agent失败:', error)
    throw error
  }
}

// 根据ID获取 Agent
export async function getAgentById(id: string): Promise<Agent | null> {
  try {
    const agent = await db('agents').where({ id }).first()
    return agent ? convertToAgent(agent) : null
  } catch (error) {
    console.error('后端→ 获取Agent失败:', { id, error })
    throw new Error(`获取Agent失败: ${id}`)
  }
}

// 更新 Agent
export async function updateAgent(id: string, params: UpdateAgentParams): Promise<Agent> {
  try {
    const now = new Date()
    const updateData = {
      ...params,
      updatedAt: now
    }

    const [updated] = await db('agents').where({ id }).update(updateData).returning('*')

    if (!updated) {
      throw new Error(`Agent不存在: ${id}`)
    }

    return convertToAgent(updated)
  } catch (error) {
    console.error('后端→ 更新Agent失败:', { id, params, error })
    throw error
  }
}

// 删除 Agent
export async function deleteAgent(id: string): Promise<void> {
  try {
    const deleted = await db('agents').where({ id }).delete()
    if (!deleted) {
      throw new Error(`Agent不存在: ${id}`)
    }
  } catch (error) {
    console.error('后端→ 删除Agent失败:', { id, error })
    throw error
  }
}

// 获取可在笔记菜单中显示的 Agents
export async function getMenuAgents(): Promise<Agent[]> {
  try {
    const agents = await db('agents')
      .select('*')
      .where({ includeNoteContext: true })
      .orderBy('createdAt', 'desc')

    return agents.map(convertToAgent)
  } catch (error) {
    console.error('后端→ 获取菜单Agent失败:', error)
    throw error
  }
}

// 获取不在笔记菜单中显示的 Agents
export async function getNonMenuAgents(): Promise<Agent[]> {
  try {
    const agents = await db('agents')
      .select('*')
      .where({ includeNoteContext: false })
      .orderBy('createdAt', 'desc')

    return agents.map(convertToAgent)
  } catch (error) {
    console.error('后端→ 获取非菜单Agent失败:', error)
    throw error
  }
}

// 搜索 Agents
export async function searchAgents(query: string): Promise<Agent[]> {
  try {
    const agents = await db('agents')
      .select('*')
      .where('name', 'like', `%${query}%`)
      .orWhere('description', 'like', `%${query}%`)
      .orderBy('createdAt', 'desc')
      .limit(10)

    return agents.map(convertToAgent)
  } catch (error) {
    console.error('后端→ 搜索Agent失败:', { query, error })
    throw new Error('搜索Agent失败')
  }
}

// 验证 modelConfigId 是否有效
export async function validateModelConfig(modelConfigId: string): Promise<boolean> {
  try {
    const config = await db('model_configs').where({ id: modelConfigId }).first()
    return !!config
  } catch (error) {
    console.error('后端→ 验证模型配置失败:', { modelConfigId, error })
    throw error
  }
}
