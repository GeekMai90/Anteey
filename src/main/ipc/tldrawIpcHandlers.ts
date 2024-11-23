import { ipcMain } from 'electron'
import {
  createBoard,
  updateBoard,
  deleteBoard,
  getBoardById,
  getBoards,
  updateBoardsOrder,
  toggleBoardStarred
} from '../../services/tldraw/tldrawBoardService'
import { saveBoardState, getBoardState } from '../../services/tldraw/tldrawBoardStateService'
import {
  createBoardNote,
  updateBoardNote,
  deleteBoardNote,
  getBoardNotes,
  updateNotesZIndex
} from '../../services/tldraw/tldrawBoardNoteService'
import type {
  CreateBoardDto,
  UpdateBoardDto,
  TldrawBoardFilter,
  TldrawBoardSort,
  CreateBoardNoteDto,
  UpdateBoardNoteDto
} from '../../renderer/src/types/Tldraw'
import {
  TldrawSnapshot,
  Camera,
  TldrawError,
  TldrawErrorCode
} from '../../renderer/src/types/Tldraw'

export function setupTldrawHandlers() {
  // 白板基础操作
  ipcMain.handle('tldraw-create-board', async (_event, data: CreateBoardDto) => {
    try {
      const board = await createBoard(data)
      return { success: true, board }
    } catch (error) {
      console.error('主进程→ 创建白板失败:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(
    'tldraw-update-board',
    async (_event, { id, data }: { id: string; data: UpdateBoardDto }) => {
      try {
        await updateBoard(id, data)
        return { success: true }
      } catch (error) {
        console.error('主进程→ 更新白板失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  ipcMain.handle('tldraw-delete-board', async (_event, id: string) => {
    try {
      await deleteBoard(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除白板失败:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('tldraw-get-board', async (_event, id: string) => {
    try {
      const board = await getBoardById(id)
      return { success: true, board }
    } catch (error) {
      console.error('主进程→ 获取白板失败:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(
    'tldraw-get-boards',
    async (_event, { filter, sort }: { filter: TldrawBoardFilter; sort?: TldrawBoardSort }) => {
      try {
        const boards = await getBoards(filter, sort)
        return { success: true, boards }
      } catch (error) {
        console.error('主进程→ 获取白板列表失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 白板状态操作
  ipcMain.handle(
    'tldraw-save-board-state',
    async (
      _event,
      {
        boardId,
        content,
        camera
      }: {
        boardId: string
        content: TldrawSnapshot
        camera: Camera
      }
    ) => {
      try {
        await saveBoardState(boardId, content, camera)
        return { success: true }
      } catch (error) {
        console.error('主进程→ 保存白板状态失败:', error)
        if (error instanceof TldrawError) {
          return { success: false, error: error.message, code: error.code }
        }
        return {
          success: false,
          error: String(error),
          code: TldrawErrorCode.DATABASE_ERROR
        }
      }
    }
  )

  ipcMain.handle('tldraw-get-board-state', async (_event, boardId: string) => {
    try {
      const state = await getBoardState(boardId)
      return { success: true, state }
    } catch (error) {
      console.error('主进程→ 获取白板状态失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 白板笔记操作
  ipcMain.handle('tldraw-create-note', async (_event, data: CreateBoardNoteDto) => {
    try {
      const note = await createBoardNote(data)
      return { success: true, note }
    } catch (error) {
      console.error('主进程→ 创建白板笔记失败:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(
    'tldraw-update-note',
    async (_event, { id, data }: { id: string; data: UpdateBoardNoteDto }) => {
      try {
        await updateBoardNote(id, data)
        return { success: true }
      } catch (error) {
        console.error('主进程→ 更新白板笔记失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  ipcMain.handle('tldraw-delete-note', async (_event, id: string) => {
    try {
      await deleteBoardNote(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除白板笔记失败:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('tldraw-get-board-notes', async (_event, boardId: string) => {
    try {
      const notes = await getBoardNotes(boardId)
      return { success: true, notes }
    } catch (error) {
      console.error('主进程→ 获取白板笔记失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 白板排序和收藏操作
  ipcMain.handle('tldraw-update-boards-order', async (_event, boardIds: string[]) => {
    try {
      await updateBoardsOrder(boardIds)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 更新白板排序失败:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('tldraw-toggle-board-starred', async (_event, id: string) => {
    try {
      await toggleBoardStarred(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 切换白板收藏状态失败:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(
    'tldraw-update-notes-zindex',
    async (_event, notes: { id: string; zIndex: number }[]) => {
      try {
        await updateNotesZIndex(notes)
        return { success: true }
      } catch (error) {
        console.error('主进程→ 更新笔记层级失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )
}
