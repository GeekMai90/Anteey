import { db } from '../../db/config'
import { TldrawBoardState, Camera, TldrawSnapshot } from '../../renderer/src/types/Tldraw'

// 保存白板状态
export async function saveBoardState(
  boardId: string,
  content: TldrawSnapshot,
  camera: Camera
): Promise<void> {
  try {
    const now = new Date()
    const state: TldrawBoardState = {
      boardId,
      content,
      camera,
      createdAt: now,
      updatedAt: now
    }

    await db('tldraw_board_states')
      .insert(state)
      .onConflict('boardId')
      .merge(['content', 'camera', 'updatedAt'])
  } catch (error) {
    console.error('保存白板状态失败:', error)
    throw error
  }
}

// 获取白板状态
export async function getBoardState(boardId: string): Promise<TldrawBoardState | null> {
  try {
    const state = await db('tldraw_board_states').where({ boardId }).first()
    return state || null
  } catch (error) {
    console.error('获取白板状态失败:', error)
    throw error
  }
}
