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
      pinned: false, // 默认不置顶
      metadata: {
        count: 0,
        lastUsed: now,
        totalCount: 0
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
// 辅助函数：检查是否为子路径
function isChildPath(childPath: string[], parentPath: string[]): boolean {
  if (childPath.length <= parentPath.length) return false
  return parentPath.every((segment, index) => segment === childPath[index])
}

export async function updateTag(id: string, updateData: Partial<Tag>): Promise<Tag> {
  try {
    return await db.transaction(async (trx) => {
      // 1. 获取原标签信息
      const oldTag = await trx('tags').where({ id }).first()
      if (!oldTag) {
        throw new Error(`未找到ID为 ${id} 的标签`)
      }

      // 2. 如果更新了name,需要重新解析path并更新子标签
      if (updateData.name) {
        const oldPath = JSON.parse(oldTag.path)
        const newPath = updateData.name.split('/').filter(Boolean)
        updateData.path = newPath

        // 3. 获取所有标签
        const allTags = await trx('tags').select('*').whereNot('id', id)

        // 4. 找出并更新子标签
        for (const tag of allTags) {
          const tagPath = JSON.parse(tag.path)
          if (isChildPath(tagPath, oldPath)) {
            // 构建新的子标签路径
            const newChildPath = [...newPath, ...tagPath.slice(oldPath.length)]
            // 更新子标签的名称（保持与路径一致）
            const newChildName = newChildPath.join('/')

            await trx('tags')
              .where({ id: tag.id })
              .update({
                path: JSON.stringify(newChildPath),
                name: newChildName,
                updatedAt: new Date()
              })

            // 更新使用此子标签的笔记
            const notesWithChildTag = await trx('notes')
              .select('id', 'tags')
              .where('tags', 'like', `%${tag.name}%`)

            for (const note of notesWithChildTag) {
              const tags = JSON.parse(note.tags || '[]')
              const updatedTags = tags.map((t: string) => (t === tag.name ? newChildName : t))

              await trx('notes')
                .where({ id: note.id })
                .update({
                  tags: JSON.stringify(updatedTags),
                  updatedAt: new Date()
                })
            }
          }
        }

        // 5. 更新使用当前标签的笔记
        const notesWithTag = await trx('notes')
          .select('id', 'tags')
          .where('tags', 'like', `%${oldTag.name}%`)

        for (const note of notesWithTag) {
          const tags = JSON.parse(note.tags || '[]')
          const updatedTags = tags.map((tag: string) =>
            tag === oldTag.name ? updateData.name : tag
          )

          await trx('notes')
            .where({ id: note.id })
            .update({
              tags: JSON.stringify(updatedTags),
              updatedAt: new Date()
            })
        }
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

      // 6. 更新当前标签
      const [updatedTag] = await trx('tags').where({ id }).update(dataToUpdate).returning('*')

      if (!updatedTag) {
        throw new Error(`更新标签失败: ${id}`)
      }

      return convertToTag(updatedTag)
    })
  } catch (error) {
    console.error('后端→ 更新标签失败:', error)
    throw error
  }
}

// 删除标签
export async function deleteTag(id: string): Promise<void> {
  try {
    await db.transaction(async (trx) => {
      // 1. 获取要删除的标签及其所有子标签
      const tagToDelete = await trx('tags').where({ id }).first()
      if (!tagToDelete) {
        throw new Error(`未找到ID为 ${id} 的标签`)
      }

      // 2. 获取所有子标签
      const childTags = await trx('tags')
        .select('*')
        .where('path', 'like', `${JSON.stringify(tagToDelete.path)}%`)

      // 收集所有需要删除的标签名称
      const tagsToDelete = [tagToDelete, ...childTags]
      const tagNames = tagsToDelete.map((tag) => tag.name)

      // 3. 更新所有使用这些标签的笔记
      const notesWithTags = await trx('notes')
        .select('id', 'tags')
        .where(function () {
          tagNames.forEach((tagName) => {
            this.orWhere('tags', 'like', `%${tagName}%`)
          })
        })

      // 4. 从每个笔记中移除相关标签
      for (const note of notesWithTags) {
        const tags = JSON.parse(note.tags || '[]')
        const updatedTags = tags.filter((t: string) => !tagNames.includes(t))

        await trx('notes')
          .where({ id: note.id })
          .update({
            tags: JSON.stringify(updatedTags),
            updatedAt: new Date()
          })
      }

      // 5. 删除所有相关标签
      await trx('tags')
        .whereIn(
          'id',
          tagsToDelete.map((tag) => tag.id)
        )
        .delete()

      console.log('后端→ 删除标签及其子标签成功:', id)
    })
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

// 获取标签及其子标签的笔记总数
export async function getTagNotesCount(tagId: string): Promise<number> {
  try {
    // 获取当前标签信息
    const tag = await db('tags').where('id', tagId).first()
    if (!tag) return 0

    // 获取所有标签
    const allTags = await db('tags').select('*')
    const tagPath = JSON.parse(tag.path)

    // 找出所有子标签（路径以当前标签路径开头的标签）
    const childTags = allTags.filter((t) => {
      const currentPath = JSON.parse(t.path)
      return (
        currentPath.length > tagPath.length &&
        currentPath.slice(0, tagPath.length).join('/') === tagPath.join('/')
      )
    })

    // 获取当前标签的笔记数量
    const currentTagCount = JSON.parse(tag.metadata).count || 0

    // 获取所有子标签的笔记数量之和
    const childrenCount = childTags.reduce((sum, t) => {
      const metadata = JSON.parse(t.metadata)
      return sum + (metadata.count || 0)
    }, 0)

    return currentTagCount + childrenCount
  } catch (error) {
    console.error('后端→ 获取标签笔记数量失败:', error)
    throw error
  }
}

// 获取所有标签(带完整计数)
export async function getAllTagsWithCount(): Promise<Tag[]> {
  try {
    const tags = await db('tags').select('*').orderBy('useCount', 'desc')

    // 为每个标签获取完整的笔记数量
    const tagsWithCount = await Promise.all(
      tags.map(async (tag) => {
        const totalCount = await getTagNotesCount(tag.id)
        const convertedTag = convertToTag(tag) // 先转换为 Tag 对象
        convertedTag.metadata.totalCount = totalCount // 添加总数量
        return convertedTag
      })
    )

    // 添加排序：置顶的在前，同样置顶状态下按名称排序
    return tagsWithCount.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return a.name.localeCompare(b.name)
    })
  } catch (error) {
    console.error('后端→ 获取所有标签(带计数)失败:', error)
    throw error
  }
}

// 更新标签的笔记数量
export async function updateTagCount(
  tagId: string,
  increment: boolean = true,
  trx = db // 默认使用 db，但可以传入事务
): Promise<void> {
  try {
    const tag = await trx('tags').where('id', tagId).first()
    if (!tag) return

    const metadata = JSON.parse(tag.metadata)
    metadata.count = (metadata.count || 0) + (increment ? 1 : -1)
    metadata.lastUsed = new Date()

    await trx('tags')
      .where('id', tagId)
      .update({
        metadata: JSON.stringify(metadata),
        updatedAt: new Date()
      })

    console.log(`后端→ ${increment ? '增加' : '减少'}标签计数:`, tagId)
  } catch (error) {
    console.error('后端→ 更新标签计数失败:', error)
    throw error
  }
}

// 添加更新置顶状态的函数
export async function updateTagPinned(id: string, pinned: boolean): Promise<Tag> {
  try {
    const [updatedTag] = await db('tags')
      .where({ id })
      .update({
        pinned,
        updatedAt: new Date()
      })
      .returning('*')

    if (!updatedTag) {
      throw new Error(`更新标签失败: ${id}`)
    }

    return convertToTag(updatedTag)
  } catch (error) {
    console.error('后端→ 更新标签置顶状态失败:', error)
    throw error
  }
}
