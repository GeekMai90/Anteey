import { db } from '../../db/config'
import {
  TldrawBoard,
  CreateBoardDto,
  UpdateBoardDto,
  TldrawBoardFilter,
  TldrawBoardSort
} from '../../renderer/src/types/Tldraw'
import { v4 as uuidv4 } from 'uuid'

// 创建白板
export async function createBoard(data: CreateBoardDto): Promise<TldrawBoard> {
  try {
    const id = uuidv4()
    const now = new Date()

    const board: TldrawBoard = {
      id,
      name: data.name,
      description: data.description || '',
      parentId: data.parentId,
      isFolder: data.isFolder || false,
      sortOrder: data.sortOrder,
      isStarred: false,
      starredOrder: undefined,
      metadata: data.metadata || {
        content: null,
        camera: { x: 0, y: 0, z: 1 }
      },
      createdAt: now,
      updatedAt: now
    }

    await db('tldraw_boards').insert(board)
    return board
  } catch (error) {
    console.error('创建白板失败:', error)
    throw error
  }
}

// 更新白板
export async function updateBoard(id: string, data: UpdateBoardDto): Promise<void> {
  try {
    const updateData = {
      ...data,
      updatedAt: new Date()
    }

    await db('tldraw_boards').where({ id }).update(updateData)
  } catch (error) {
    console.error('更新白板失败:', error)
    throw error
  }
}

// 删除白板
export async function deleteBoard(id: string): Promise<void> {
  try {
    await db.transaction(async (trx) => {
      // 删除白板相关的所有数据
      await trx('tldraw_board_notes').where({ boardId: id }).delete()
      await trx('tldraw_board_states').where({ boardId: id }).delete()
      await trx('tldraw_boards').where({ id }).delete()
    })
  } catch (error) {
    console.error('删除白板失败:', error)
    throw error
  }
}

// 获取白板详情
export async function getBoardById(id: string): Promise<TldrawBoard | null> {
  try {
    const board = await db('tldraw_boards').where({ id }).first()
    return board || null
  } catch (error) {
    console.error('获取白板详情失败:', error)
    throw error
  }
}

// 获取白板列表
export async function getBoards(
  filter: TldrawBoardFilter,
  sort?: TldrawBoardSort
): Promise<TldrawBoard[]> {
  try {
    let query = db('tldraw_boards')

    if (filter.parentId !== undefined) {
      query = query.where('parentId', filter.parentId)
    }
    if (filter.isStarred !== undefined) {
      query = query.where('isStarred', filter.isStarred)
    }
    if (filter.searchText) {
      query = query.where('name', 'like', `%${filter.searchText}%`)
    }

    if (sort) {
      query = query.orderBy(sort.field, sort.order)
    } else {
      query = query.orderBy('updatedAt', 'desc')
    }

    return await query
  } catch (error) {
    console.error('获取白板列表失败:', error)
    throw error
  }
}

// 更新白板排序
export async function updateBoardsOrder(boardIds: string[]): Promise<void> {
  try {
    await db.transaction(async (trx) => {
      for (let i = 0; i < boardIds.length; i++) {
        await trx('tldraw_boards')
          .where({ id: boardIds[i] })
          .update({ sortOrder: i, updatedAt: new Date() })
      }
    })
  } catch (error) {
    console.error('更新白板排序失败:', error)
    throw error
  }
}

// 切换白板收藏状态
export async function toggleBoardStarred(id: string): Promise<void> {
  try {
    const board = await getBoardById(id)
    if (!board) throw new Error('白板不存在')

    const nextStarredOrder = board.isStarred
      ? null
      : await db('tldraw_boards')
          .where({ isStarred: true })
          .max('starredOrder as maxOrder')
          .then((result) => (result[0]?.maxOrder || 0) + 1)

    await db('tldraw_boards').where({ id }).update({
      isStarred: !board.isStarred,
      starredOrder: nextStarredOrder,
      updatedAt: new Date()
    })
  } catch (error) {
    console.error('切换白板收藏状态失败:', error)
    throw error
  }
}
