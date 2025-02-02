import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import type { CreateMindboardParams, Mindboard } from '@shared/types/mindboard'

// 获取所有思维板
export async function getAllMindboards(): Promise<Mindboard[]> {
  try {
    const mindboards = await db('mindboards').select('*').orderBy('updated_at', 'desc')
    return mindboards.map((mindboard) => ({
      ...mindboard,
      flow_data: JSON.parse(mindboard.flow_data)
    }))
  } catch (error) {
    console.error('获取所有思维板失败:', error)
    throw error
  }
}

// 创建思维板
export async function createMindboard(data: CreateMindboardParams): Promise<Mindboard> {
  try {
    const now = new Date()
    const id = uuidv4()

    // 初始化一个空的思维板
    const [mindboard] = await db('mindboards')
      .insert({
        id,
        name: data.name,
        description: data.description,
        flow_data: JSON.stringify(data.flow_data || {}), // 初始化为空对象
        preview_image: null, // 初始时不需要预览图
        is_favorite: data.is_favorite || false, // 初始化收藏状态
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

// 更新思维板名称
export async function updateMindboardName(id: string, name: string): Promise<void> {
  try {
    await db('mindboards').where({ id }).update({ name })
  } catch (error) {
    console.error('更新思维板名称失败:', error)
    throw error
  }
}

// 专门用于更新预览图的方法 - 在用户编辑并退出思维板时调用
export async function updatePreviewImage(id: string, previewImage: string): Promise<void> {
  try {
    await db('mindboards').where({ id }).update({
      preview_image: previewImage
    })
  } catch (error) {
    console.error('更新思维板预览图失败:', error)
    throw error
  }
}

// 切换思维板收藏状态
export async function toggleFavorite(id: string): Promise<void> {
  try {
    // 获取当前的收藏状态
    const mindboard = await db('mindboards').where({ id }).first()
    if (!mindboard) {
      throw new Error(`思维板不存在: ${id}`)
    }

    // 切换收藏状态
    await db('mindboards').where({ id }).update({
      is_favorite: !mindboard.is_favorite,
      updated_at: new Date()
    })
  } catch (error) {
    console.error('切换思维板收藏状态失败:', error)
    throw error
  }
}

// 获取所有收藏的思维板
export async function getFavoriteMindboards(): Promise<Mindboard[]> {
  try {
    const mindboards = await db('mindboards')
      .where({ is_favorite: true })
      .orderBy('updated_at', 'desc')
      .select('*')

    return mindboards.map((mindboard) => ({
      ...mindboard,
      flow_data: JSON.parse(mindboard.flow_data)
    }))
  } catch (error) {
    console.error('获取收藏的思维板失败:', error)
    throw error
  }
}
