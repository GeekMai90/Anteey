import { db } from '../../db/config'
import { Tag } from '../../renderer/src/types/Note'
import { v4 as uuidv4 } from 'uuid'

interface TagRecord {
  id: string
  name: string
  path: string // 数据库中是 JSON 字符串
  color?: string
  icon?: string
  pinned: boolean
  pinOrder?: number
  createdAt: Date
  updatedAt: Date
}

// 工具函数:将数据库记录转换为 Tag 对象
function convertToTag(record: TagRecord & { useCount?: number }): Tag {
  try {
    // 确保 path 是正确的 JSON 字符串
    const pathArray = JSON.parse(record.path)
    return {
      ...record,
      path: pathArray,
      useCount: Number(record.useCount || 0)
    }
  } catch (error) {
    console.error('解析标签路径失败:', record.path, error)
    // 如果解析失败，返回单层路径
    return {
      ...record,
      path: [record.name],
      useCount: Number(record.useCount || 0)
    }
  }
}

// 创建标签
export async function createTag(name: string, color?: string, icon?: string): Promise<Tag> {
  try {
    const id = uuidv4()
    const now = new Date()

    // 解析标签路径
    const path = name.split('/').filter(Boolean)

    const newTag = {
      id,
      name,
      path: `[${path.map((p) => `"${p}"`).join(',')}]`,
      color,
      icon,
      pinned: false,
      pinOrder: undefined,
      createdAt: now,
      updatedAt: now
    }

    await db('tags').insert(newTag)

    return {
      ...newTag,
      path: path, // 返回时转换回数组
      useCount: 0 // 新标签的使用次数为 0
    }
  } catch (error) {
    console.error('后端→ 创建标签失败:', error)
    throw error
  }
}

// 获取所有标签
export async function getAllTags(): Promise<Tag[]> {
  try {
    console.log('服务端→ 开始获取所有标签') // 直接使用 console.log 就可以了

    const query = `
      SELECT 
        t.*,
        (SELECT COUNT(*) FROM note_tags nt WHERE nt.tagId = t.id) as useCount
      FROM tags t
      ORDER BY 
        t.pinned DESC,
        t.pinOrder ASC,
        t.name ASC
    `

    console.log('执行查询:', query)

    const tags = await db.raw(query)
    console.log('查询结果:', tags)

    const result = tags.map((tag: any) => ({
      ...convertToTag(tag),
      pinned: Boolean(tag.pinned),
      useCount: Number(tag.useCount || 0)
    }))

    console.log('处理完成，标签数量:', result.length)
    return result
  } catch (error) {
    console.error('获取所有标签失败:', error)
    throw error
  }
}

// 根据ID获取标签
export async function getTagById(id: string): Promise<Tag | null> {
  try {
    const tag = await db('tags').where({ id }).first()

    return tag ? convertToTag(tag) : null
  } catch (error) {
    console.error('后端→ 获取标签失败:', { id, error })
    throw new Error(`获取标签失败: ${id}`)
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

      // 2. 如果更新了name，需要重新解析path并更新子标签
      if (updateData.name) {
        const oldPath = JSON.parse(oldTag.path)
        const newPath = updateData.name.split('/').filter(Boolean)
        updateData.path = newPath

        // 3. 获取所有子标签
        const childTags = await trx('tags')
          .select('*')
          .whereNot('id', id)
          .andWhere(function () {
            const oldPathStr = JSON.stringify(oldPath).slice(1, -1) // 移除数组括号
            // 修改这行，去掉 ::text
            this.whereRaw('path LIKE ?', [`[${oldPathStr}%`])
          })

        // 4. 更新子标签
        for (const tag of childTags) {
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
          }
        }
      }

      // 5. 准备更新数据
      const now = new Date()
      const dataToUpdate: any = {
        ...updateData,
        updatedAt: now
      }

      // 只序列化 path 字段
      if (dataToUpdate.path) {
        dataToUpdate.path = JSON.stringify(dataToUpdate.path)
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
      // 1. 获取要删除的标签
      const tagToDelete = await trx('tags').where({ id }).first()
      if (!tagToDelete) {
        throw new Error(`未找到ID为 ${id} 的标签`)
      }

      // 2. 获取所有子标签
      const childTags = await trx('tags')
        .select('*')
        .whereNot('id', id)
        .andWhere(function () {
          const pathStr = JSON.stringify(JSON.parse(tagToDelete.path)).slice(1, -1)
          this.whereRaw(`path LIKE ?`, [`[${pathStr}%`])
        })

      // 3. 收集所有需要删除的标签ID
      const tagIdsToDelete = [id, ...childTags.map((tag) => tag.id)]

      // 4. 删除标签与笔记的关联关系
      await trx('note_tags').whereIn('tagId', tagIdsToDelete).delete()

      // 5. 删除标签及其子标签
      await trx('tags').whereIn('id', tagIdsToDelete).delete()

      console.log('后端→ 删除标签及其子标签成功:', {
        mainTagId: id,
        totalDeleted: tagIdsToDelete.length
      })
    })
  } catch (error) {
    console.error('后端→ 删除标签失败:', error)
    throw error
  }
}

// 获取标签使用次数
export async function getTagUseCount(tagId: string): Promise<number> {
  const result = await db('note_tags').where('tagId', tagId).count('noteId as count').first()

  return Number(result?.count || 0)
}

// 获取标签及其子标签的笔记总数
export async function getTagNotesCount(tagId: string): Promise<{
  noteCount: number // 直接使用该标签的笔记数
  totalCount: number // 包含子标签的笔记总数
}> {
  try {
    // 1. 获取当前标签信息
    const tag = await db('tags').where('id', tagId).first()
    if (!tag) {
      throw new Error(`标签不存在: ${tagId}`)
    }

    // 2. 获取直接使用该标签的笔记数量
    const [{ noteCount }] = await db('note_tags').where('tagId', tagId).count('* as noteCount')

    // 3. 获取子标签ID列表
    const childTags = await db('tags')
      .select('id')
      .whereNot('id', tagId)
      .andWhere(function () {
        const pathStr = JSON.stringify(JSON.parse(tag.path)).slice(1, -1)
        this.whereRaw(`path LIKE ?`, [`[${pathStr}%`])
      })

    // 4. 获取包含子标签的所有笔记数量
    const [{ totalCount }] = await db('note_tags')
      .whereIn('tagId', [tagId, ...childTags.map((t) => t.id)])
      .countDistinct('noteId as totalCount')

    return {
      noteCount: Number(noteCount || 0),
      totalCount: Number(totalCount || 0)
    }
  } catch (error) {
    console.error('后端→ 获取标签笔记数量失败:', { tagId, error })
    throw new Error(`获取标签笔记数量失败: ${tagId}`)
  }
}

// 获取所有标签及其使用次数
export async function getAllTagsWithCount(): Promise<Tag[]> {
  try {
    const tags = await db('tags')
      .select(['tags.*', db.raw('COALESCE(counts.use_count, 0) as useCount')])
      .leftJoin(
        db('note_tags').select('tagId').count('* as use_count').groupBy('tagId').as('counts'),
        'tags.id',
        'counts.tagId'
      )
      .orderBy([
        { column: 'pinned', order: 'desc' },
        { column: 'pinOrder', order: 'asc' },
        { column: 'counts.use_count', order: 'desc' },
        { column: 'name', order: 'asc' }
      ])

    const result = tags.map((tag) => {
      const converted = {
        ...convertToTag(tag),
        useCount: Number(tag.useCount || 0)
      }
      return converted
    })
    return result
  } catch (error) {
    console.error('获取所有标签及其使用次数失败:', error)
    throw error
  }
}

// 更新标签置顶状态
export async function updateTagPinned(
  id: string,
  pinned: boolean,
  pinOrder?: number
): Promise<Tag> {
  try {
    const [updatedTag] = await db('tags')
      .where({ id })
      .update({
        pinned,
        pinOrder: pinned ? (pinOrder ?? null) : null, // 如果取消置顶，清除 pinOrder
        updatedAt: new Date()
      })
      .returning('*')

    if (!updatedTag) {
      throw new Error(`标签不存在: ${id}`)
    }

    return convertToTag(updatedTag)
  } catch (error) {
    console.error('后端→ 更新标签置顶状态失败:', { id, pinned, error })
    throw new Error(`更新标签置顶状态失败: ${id}`)
  }
}

// 可选：添加一个更新置顶排序的方法
export async function updateTagPinOrder(id: string, pinOrder: number): Promise<Tag> {
  try {
    const [updatedTag] = await db('tags')
      .where({ id, pinned: true }) // 只更新已置顶的标签
      .update({
        pinOrder,
        updatedAt: new Date()
      })
      .returning('*')

    if (!updatedTag) {
      throw new Error(`标签不存在或未置顶: ${id}`)
    }

    return convertToTag(updatedTag)
  } catch (error) {
    console.error('后端→ 更新标签置顶顺序失败:', { id, pinOrder, error })
    throw new Error(`更新标签置顶顺序失败: ${id}`)
  }
}

// 搜索标签
export async function searchTags(query: string): Promise<Tag[]> {
  try {
    const tags = await db('tags')
      .select(['tags.*', db.raw('COUNT(DISTINCT note_tags.noteId) as useCount')])
      .leftJoin('note_tags', 'tags.id', 'note_tags.tagId')
      .where('tags.name', 'like', `%${query}%`)
      .groupBy('tags.id')
      .orderBy([
        { column: 'pinned', order: 'desc' }, // 置顶的优先
        { column: 'useCount', order: 'desc' }, // 使用次数多的优先
        { column: 'name', order: 'asc' } // 同等条件按名称排序
      ])
      .limit(10)

    return tags.map((tag) => ({
      ...convertToTag(tag),
      useCount: Number(tag.useCount || 0)
    }))
  } catch (error) {
    console.error('后端→ 搜索标签失败:', { query, error })
    throw new Error('搜索标签失败')
  }
}

// 可选：添加高级搜索功能
export interface TagSearchParams {
  query?: string // 搜索关键词
  pinned?: boolean // 是否只搜索置顶标签
  parentPath?: string[] // 在特定路径下搜索
  limit?: number // 返回结果数量限制
  offset?: number // 分页偏移量
}

export async function searchTagsAdvanced(params: TagSearchParams): Promise<Tag[]> {
  try {
    let query = db('tags')
      .select(['tags.*', db.raw('COUNT(DISTINCT note_tags.noteId) as useCount')])
      .leftJoin('note_tags', 'tags.id', 'note_tags.tagId')

    // 添加搜索条件
    if (params.query) {
      query = query.where('tags.name', 'like', `%${params.query}%`)
    }

    if (params.pinned !== undefined) {
      query = query.where('tags.pinned', params.pinned)
    }

    if (params.parentPath) {
      const pathStr = JSON.stringify(params.parentPath).slice(1, -1)
      query = query.whereRaw(`path LIKE ?`, [`[${pathStr}%`])
    }

    // 分组和排序
    const tags = await query
      .groupBy('tags.id')
      .orderBy([
        { column: 'pinned', order: 'desc' },
        { column: 'useCount', order: 'desc' },
        { column: 'name', order: 'asc' }
      ])
      .limit(params.limit || 10)
      .offset(params.offset || 0)

    return tags.map((tag) => ({
      ...convertToTag(tag),
      useCount: Number(tag.useCount || 0)
    }))
  } catch (error) {
    console.error('后端→ 高级搜索标签失败:', { params, error })
    throw new Error('搜索标签失败')
  }
}

// 获取笔记的标签
export async function getNoteTags(noteId: string): Promise<Tag[]> {
  try {
    const tags = await db('tags')
      .select([
        'tags.*',
        db.raw('COUNT(DISTINCT all_notes.noteId) as useCount') // 添加使用次数统计
      ])
      .join('note_tags', 'tags.id', 'note_tags.tagId')
      .leftJoin('note_tags as all_notes', 'tags.id', 'all_notes.tagId') // 用于计算总使用次数
      .where('note_tags.noteId', noteId)
      .groupBy('tags.id')
      .orderBy([
        { column: 'tags.pinned', order: 'desc' },
        { column: 'tags.pinOrder', order: 'asc' },
        { column: 'tags.name', order: 'asc' }
      ])

    return tags.map((tag) => ({
      ...convertToTag(tag),
      useCount: Number(tag.useCount || 0) // 确保 useCount 是数字类型
    }))
  } catch (error) {
    console.error('后端→ 获取笔记标签失败:', { noteId, error })
    throw new Error(`获取笔记标签失败: ${noteId}`)
  }
}
