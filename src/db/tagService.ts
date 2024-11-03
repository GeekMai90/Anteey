import { db } from './config'
import { Tag } from '../renderer/src/types/Note'
import { v4 as uuidv4 } from 'uuid'

// 工具函数:将数据库记录转换为 Tag 对象
function convertToTag(record: any): Tag {
  return {
    ...record,
    path: JSON.parse(record.path),
    metadata: JSON.parse(record.metadata)
  }
}

// 创建标签
export async function createTag(name: string, color?: string, icon?: string): Promise<Tag> {
  try {
    const id = uuidv4()
    const now = new Date()

    // 解析标签路径
    const path = name.split('/').filter(Boolean)

    const newTag: Tag = {
      id,
      name, // 完整的标签名
      path, // 标签路径数组
      color,
      icon,
      metadata: {
        count: 0,
        lastUsed: now
      },
      createdAt: now,
      updatedAt: now
    }

    await db('tags').insert({
      ...newTag,
      path: JSON.stringify(path),
      metadata: JSON.stringify(newTag.metadata),
      useCount: 0, // 添加使用次数初始值
      lastUsedAt: now // 添加最后使用时间
    })

    console.log('后端→ 创建标签成功:', id)
    return newTag
  } catch (error) {
    console.error('后端→ 创建标签失败:', error)
    throw error
  }
}

// 获取所有标签
export async function getAllTags(): Promise<Tag[]> {
  try {
    const tags = await db('tags').select('*').orderBy('useCount', 'desc')
    return tags.map(convertToTag)
  } catch (error) {
    console.error('后端→ 获取所有标签失败:', error)
    throw error
  }
}

// 根据ID获取标签
export async function getTagById(id: string): Promise<Tag | null> {
  try {
    const tag = await db('tags').where('id', id).first()
    return tag ? convertToTag(tag) : null
  } catch (error) {
    console.error('后端→ 获取标签失败:', error)
    throw error
  }
}

// 更新标签
export async function updateTag(id: string, updateData: Partial<Tag>): Promise<Tag> {
  try {
    // 如果更新了name,需要重新解析path
    if (updateData.name) {
      updateData.path = updateData.name.split('/').filter(Boolean)
    }

    const now = new Date()
    const dataToUpdate: any = {
      ...updateData,
      updatedAt: now
    }

    // JSON序列化需要的字段
    if (dataToUpdate.path) {
      dataToUpdate.path = JSON.stringify(dataToUpdate.path)
    }
    if (dataToUpdate.metadata) {
      dataToUpdate.metadata = JSON.stringify(dataToUpdate.metadata)
    }

    const [updatedTag] = await db('tags').where({ id }).update(dataToUpdate).returning('*')

    if (!updatedTag) {
      throw new Error(`未找到ID为 ${id} 的标签`)
    }

    return convertToTag(updatedTag)
  } catch (error) {
    console.error('后端→ 更新标签失败:', error)
    throw error
  }
}

// 删除标签
export async function deleteTag(id: string): Promise<void> {
  try {
    await db('tags').where({ id }).delete()
    console.log('后端→ 删除标签成功:', id)
  } catch (error) {
    console.error('后端→ 删除标签失败:', error)
    throw error
  }
}

// 增加标签使用次数
export async function incrementTagUseCount(id: string): Promise<void> {
  try {
    await db('tags')
      .where({ id })
      .update({
        useCount: db.raw('useCount + 1'),
        lastUsedAt: new Date()
      })
    console.log('后端→ 更新标签使用次数成功:', id)
  } catch (error) {
    console.error('后端→ 更新标签使用次数失败:', error)
    throw error
  }
}

// 搜索标签
export async function searchTags(query: string): Promise<Tag[]> {
  try {
    const tags = await db('tags')
      .where('name', 'like', `%${query}%`)
      .orderBy('useCount', 'desc')
      .limit(10)
    return tags.map(convertToTag)
  } catch (error) {
    console.error('后端→ 搜索标签失败:', error)
    throw error
  }
}
