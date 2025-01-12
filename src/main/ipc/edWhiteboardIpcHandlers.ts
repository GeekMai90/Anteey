import { ipcMain } from 'electron'
import {
  createEdWhiteboard,
  getEdWhiteboards,
  getEdWhiteboardById,
  updateEdWhiteboard,
  deleteEdWhiteboard,
  createEdWhiteboardNoteRef,
  updateEdWhiteboardNoteRefPosition,
  deleteEdWhiteboardNoteRef,
  getEdWhiteboardNoteRefs
} from '../../services/excalidraw/EdWhiteboardService'
import type {
  CreateEdWhiteboardParams,
  UpdateEdWhiteboardParams,
  EdWhiteboardQueryParams,
  CreateEdWhiteboardNoteRefParams,
  UpdateEdWhiteboardNoteRefPositionParams
} from '@shared/types/edWhiteboard'

export function setupEdWhiteboardHandlers() {
  // 创建白板
  ipcMain.handle('create-ed-whiteboard', async (_event, params: CreateEdWhiteboardParams) => {
    try {
      const whiteboard = await createEdWhiteboard(params)
      return { success: true, whiteboard }
    } catch (error) {
      console.error('主进程→ 创建白板失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取白板列表
  ipcMain.handle('get-ed-whiteboards', async (_event, params: EdWhiteboardQueryParams) => {
    try {
      const result = await getEdWhiteboards(params)
      return { success: true, ...result }
    } catch (error) {
      console.error('主进程→ 获取白板列表失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取单个白板
  ipcMain.handle('get-ed-whiteboard-by-id', async (_event, id: string) => {
    try {
      const whiteboard = await getEdWhiteboardById(id)
      return { success: true, whiteboard }
    } catch (error) {
      console.error('主进程→ 获取白板失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新白板
  ipcMain.handle('update-ed-whiteboard', async (_event, params: UpdateEdWhiteboardParams) => {
    try {
      const whiteboard = await updateEdWhiteboard(params)
      return { success: true, whiteboard }
    } catch (error) {
      console.error('主进程→ 更新白板失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 删除白板
  ipcMain.handle('delete-ed-whiteboard', async (_event, id: string) => {
    try {
      await deleteEdWhiteboard(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除白板失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 创建笔记引用
  ipcMain.handle(
    'create-ed-whiteboard-note-ref',
    async (_event, params: CreateEdWhiteboardNoteRefParams) => {
      try {
        const noteRef = await createEdWhiteboardNoteRef(params)
        return { success: true, noteRef }
      } catch (error) {
        console.error('主进程→ 创建笔记引用失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 更新笔记引用位置
  ipcMain.handle(
    'update-ed-whiteboard-note-ref-position',
    async (_event, params: UpdateEdWhiteboardNoteRefPositionParams) => {
      try {
        const noteRef = await updateEdWhiteboardNoteRefPosition(params)
        return { success: true, noteRef }
      } catch (error) {
        console.error('主进程→ 更新笔记引用位置失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 删除笔记引用
  ipcMain.handle('delete-ed-whiteboard-note-ref', async (_event, id: string) => {
    try {
      await deleteEdWhiteboardNoteRef(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除笔记引用失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取白板中的所有笔记引用
  ipcMain.handle('get-ed-whiteboard-note-refs', async (_event, whiteboardId: string) => {
    try {
      const noteRefs = await getEdWhiteboardNoteRefs(whiteboardId)
      return { success: true, noteRefs }
    } catch (error) {
      console.error('主进程→ 获取白板笔记引用失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
