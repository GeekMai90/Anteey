import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import {
  EdWhiteboard,
  EdWhiteboardNoteRef,
  CreateEdWhiteboardParams,
  UpdateEdWhiteboardParams,
  EdWhiteboardQueryParams,
  EdWhiteboardQueryResult,
  CreateEdWhiteboardNoteRefParams,
  UpdateEdWhiteboardNoteRefPositionParams
} from '@shared/types/edWhiteboard'

// 创建白板
export async function createEdWhiteboard(params: CreateEdWhiteboardParams): Promise<EdWhiteboard> {
  try {
    const id = uuidv4()
    const now = new Date()

    const newWhiteboard = {
      id,
      name: params.name,
      content: '', // 初始化为空白画板
      created_at: now.getTime(),
      updated_at: now.getTime(),
      folder_id: params.folder_id || undefined,
      tags: params.tags ? JSON.stringify(params.tags) : null
    }

    await db('ed_whiteboards').insert({
      ...newWhiteboard,
      folder_id: params.folder_id || null
    })

    return {
      ...newWhiteboard,
      tags: params.tags || []
    }
  } catch (error) {
    console.error('后端→ 创建白板失败:', error)
    throw error
  }
}

// 获取白板列表
export async function getEdWhiteboards(
  params: EdWhiteboardQueryParams
): Promise<EdWhiteboardQueryResult> {
  try {
    let query = db('ed_whiteboards').select('*')

    // 添加查询条件
    if (params.folder_id) {
      query = query.where('folder_id', params.folder_id)
    }

    if (params.tags && params.tags.length > 0) {
      query = query.whereRaw('tags @> ?', [JSON.stringify(params.tags)])
    }

    if (params.keyword) {
      query = query.where('name', 'like', `%${params.keyword}%`)
    }

    // 获取总数
    const [{ count }] = await query.clone().count('* as count')

    // 添加分页
    if (params.page !== undefined && params.page_size !== undefined) {
      const offset = params.page * params.page_size
      query = query.offset(offset).limit(params.page_size)
    }

    // 按更新时间倒序排序
    query = query.orderBy('updated_at', 'desc')

    const whiteboards = await query

    return {
      total: Number(count),
      items: whiteboards.map((board) => ({
        ...board,
        tags: board.tags ? JSON.parse(board.tags) : []
      }))
    }
  } catch (error) {
    console.error('后端→ 获取白板列表失败:', error)
    throw error
  }
}

// 获取单个白板
export async function getEdWhiteboardById(id: string): Promise<EdWhiteboard | null> {
  try {
    const whiteboard = await db('ed_whiteboards').where({ id }).first()

    if (!whiteboard) {
      return null
    }

    return {
      ...whiteboard,
      tags: whiteboard.tags ? JSON.parse(whiteboard.tags) : []
    }
  } catch (error) {
    console.error('后端→ 获取白板失败:', { id, error })
    throw error
  }
}

// 更新白板
export async function updateEdWhiteboard(params: UpdateEdWhiteboardParams): Promise<EdWhiteboard> {
  try {
    const updateData: any = {
      updated_at: new Date().getTime() // 转换为时间戳
    }

    if (params.name !== undefined) updateData.name = params.name
    if (params.content !== undefined) updateData.content = params.content
    if (params.folder_id !== undefined) updateData.folder_id = params.folder_id
    if (params.tags !== undefined) updateData.tags = JSON.stringify(params.tags)

    const [updated] = await db('ed_whiteboards')
      .where({ id: params.id })
      .update(updateData)
      .returning('*')

    if (!updated) {
      throw new Error(`白板不存在: ${params.id}`)
    }

    return {
      ...updated,
      tags: updated.tags ? JSON.parse(updated.tags) : []
    }
  } catch (error) {
    console.error('后端→ 更新白板失败:', error)
    throw error
  }
}

// 删除白板
export async function deleteEdWhiteboard(id: string): Promise<void> {
  try {
    await db.transaction(async (trx) => {
      // 先删除相关的笔记引用
      await trx('ed_whiteboard_note_refs').where('whiteboard_id', id).delete()

      // 再删除白板本身
      const deleted = await trx('ed_whiteboards').where({ id }).delete()

      if (!deleted) {
        throw new Error(`白板不存在: ${id}`)
      }
    })
  } catch (error) {
    console.error('后端→ 删除白板失败:', { id, error })
    throw error
  }
}

// 创建笔记引用
export async function createEdWhiteboardNoteRef(
  params: CreateEdWhiteboardNoteRefParams
): Promise<EdWhiteboardNoteRef> {
  try {
    const newRef = {
      id: uuidv4(),
      note_id: params.note_id,
      whiteboard_id: params.whiteboard_id,
      position: JSON.stringify(params.position),
      created_at: new Date().getTime() // 转换为时间戳
    }

    await db('ed_whiteboard_note_refs').insert(newRef)

    return {
      ...newRef,
      position: params.position
    }
  } catch (error) {
    console.error('后端→ 创建笔记引用失败:', error)
    throw error
  }
}

// 更新笔记引用位置
export async function updateEdWhiteboardNoteRefPosition(
  params: UpdateEdWhiteboardNoteRefPositionParams
): Promise<EdWhiteboardNoteRef> {
  try {
    const [updated] = await db('ed_whiteboard_note_refs')
      .where({ id: params.id })
      .update({
        position: JSON.stringify(params.position)
      })
      .returning('*')

    if (!updated) {
      throw new Error(`笔记引用不存在: ${params.id}`)
    }

    return {
      ...updated,
      position: JSON.parse(updated.position)
    }
  } catch (error) {
    console.error('后端→ 更新笔记引用位置失败:', error)
    throw error
  }
}

// 删除笔记引用
export async function deleteEdWhiteboardNoteRef(id: string): Promise<void> {
  try {
    const deleted = await db('ed_whiteboard_note_refs').where({ id }).delete()

    if (!deleted) {
      throw new Error(`笔记引用不存在: ${id}`)
    }
  } catch (error) {
    console.error('后端→ 删除笔记引用失败:', { id, error })
    throw error
  }
}

// 获取白板中的所有笔记引用
export async function getEdWhiteboardNoteRefs(
  whiteboardId: string
): Promise<EdWhiteboardNoteRef[]> {
  try {
    const refs = await db('ed_whiteboard_note_refs')
      .where('whiteboard_id', whiteboardId)
      .orderBy('created_at', 'asc')

    return refs.map((ref) => ({
      ...ref,
      position: JSON.parse(ref.position)
    }))
  } catch (error) {
    console.error('后端→ 获取白板笔记引用失败:', { whiteboardId, error })
    throw error
  }
}
