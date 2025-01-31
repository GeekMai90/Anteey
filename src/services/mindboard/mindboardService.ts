import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import type { Mindboard } from '@shared/types/mindboard'

// 获取所有思维板
export async function getAllMindboards(): Promise<Mindboard[]> {
  try {
    const mindboards = await db('mindboards').select('*').orderBy('updated_at', 'desc')
    return mindboards
  } catch (error) {
    console.error('获取所有思维板失败:', error)
    throw error
  }
}

// 创建思维板
export async function createMindboard(
  data: Omit<Mindboard, 'id' | 'created_at' | 'updated_at'>
): Promise<Mindboard> {
  try {
    const now = new Date()
    const id = uuidv4()

    const [mindboard] = await db('mindboards')
      .insert({
        id,
        name: data.name,
        description: data.description,
        flow_data: JSON.stringify(data.flow_data),
        created_at: now,
        updated_at: now
      })
      .returning('*')

    return {
      ...mindboard,
      flow_data: JSON.parse(mindboard.flow_data)
    }
  } catch (error) {
    console.error('创建思维板失败:', error)
    throw error
  }
}

// 获取单个思维板
export async function getMindboard(id: string): Promise<Mindboard> {
  try {
    const mindboard = await db('mindboards').where({ id }).first()
    if (!mindboard) {
      throw new Error(`思维板不存在: ${id}`)
    }

    return {
      ...mindboard,
      flow_data: JSON.parse(mindboard.flow_data)
    }
  } catch (error) {
    console.error('获取思维板失败:', error)
    throw error
  }
}

// 更新思维板
export async function updateMindboard(id: string, data: Partial<Mindboard>): Promise<Mindboard> {
  try {
    const updateData: any = {
      ...data,
      updated_at: new Date()
    }

    if (data.flow_data) {
      updateData.flow_data = JSON.stringify(data.flow_data)
    }

    const [mindboard] = await db('mindboards').where({ id }).update(updateData).returning('*')

    return {
      ...mindboard,
      flow_data: JSON.parse(mindboard.flow_data)
    }
  } catch (error) {
    console.error('更新思维板失败:', error)
    throw error
  }
}

// 删除思维板
export async function deleteMindboard(id: string): Promise<void> {
  try {
    await db('mindboards').where({ id }).delete()
  } catch (error) {
    console.error('删除思维板失败:', error)
    throw error
  }
}

export async function updateMindboardName(id: string, name: string): Promise<void> {
  try {
    await db('mindboards').where({ id }).update({ name })
  } catch (error) {
    console.error('更新思维板名称失败:', error)
    throw error
  }
}
