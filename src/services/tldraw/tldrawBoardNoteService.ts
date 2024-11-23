import { db } from '../../db/config'
import {
  TldrawBoardNote,
  CreateBoardNoteDto,
  UpdateBoardNoteDto
} from '../../renderer/src/types/Tldraw'
import { v4 as uuidv4 } from 'uuid'

// 创建白板笔记
export async function createBoardNote(data: CreateBoardNoteDto): Promise<TldrawBoardNote> {
  try {
    const id = uuidv4()
    const now = new Date()

    const note: TldrawBoardNote = {
      id,
      boardId: data.boardId,
      noteId: data.noteId,
      position: data.position,
      size: data.size,
      rotation: data.rotation || 0,
      zIndex: data.zIndex,
      isLocked: false,
      isHidden: false,
      style: {
        backgroundColor: undefined,
        borderColor: undefined,
        textColor: undefined
      },
      metadata: {
        lastSync: undefined,
        version: 1
      },
      createdAt: now,
      updatedAt: now
    }

    await db('tldraw_board_notes').insert(note)
    return note
  } catch (error) {
    console.error('创建白板笔记失败:', error)
    throw error
  }
}

// 更新白板笔记
export async function updateBoardNote(id: string, data: UpdateBoardNoteDto): Promise<void> {
  try {
    await db('tldraw_board_notes')
      .where({ id })
      .update({
        ...data,
        updatedAt: new Date()
      })
  } catch (error) {
    console.error('更新白板笔记失败:', error)
    throw error
  }
}

// 删除白板笔记
export async function deleteBoardNote(id: string): Promise<void> {
  try {
    await db('tldraw_board_notes').where({ id }).delete()
  } catch (error) {
    console.error('删除白板笔记失败:', error)
    throw error
  }
}

// 获取白板中的所有笔记
export async function getBoardNotes(boardId: string): Promise<TldrawBoardNote[]> {
  try {
    return await db('tldraw_board_notes').where({ boardId }).orderBy('zIndex', 'asc')
  } catch (error) {
    console.error('获取白板笔记失败:', error)
    throw error
  }
}

// 更新笔记层级
export async function updateNotesZIndex(notes: { id: string; zIndex: number }[]): Promise<void> {
  try {
    await db.transaction(async (trx) => {
      for (const note of notes) {
        await trx('tldraw_board_notes').where({ id: note.id }).update({
          zIndex: note.zIndex,
          updatedAt: new Date()
        })
      }
    })
  } catch (error) {
    console.error('更新笔记层级失败:', error)
    throw error
  }
}
