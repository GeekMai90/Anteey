import { ipcMain } from 'electron'
import {
  createExcalidrawDocument,
  getExcalidrawDocument,
  updateExcalidrawDocument,
  deleteExcalidrawDocument,
  getNoteExcalidrawDocuments
} from '../../db/excalidrawService'

export function setupExcalidrawHandlers() {
  // 创建 Excalidraw 文档
  ipcMain.handle('create-excalidraw-document', async (_event, { noteId, data }) => {
    try {
      console.log('主进程→ 创建 Excalidraw 文档:', { noteId, data })
      const document = await createExcalidrawDocument(noteId, data)
      return { success: true, document }
    } catch (error) {
      console.error('主进程→ 创建 Excalidraw 文档失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 获取 Excalidraw 文档
  ipcMain.handle('get-excalidraw-document', async (_event, id: string) => {
    try {
      console.log('主进程→ 获取 Excalidraw 文档:', id)
      const document = await getExcalidrawDocument(id)
      return { success: true, document }
    } catch (error) {
      console.error('主进程→ 获取 Excalidraw 文档失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 更新 Excalidraw 文档
  ipcMain.handle('update-excalidraw-document', async (_event, { id, data }) => {
    try {
      console.log('主进程→ 更新 Excalidraw 文档:', { id, data })
      const document = await updateExcalidrawDocument(id, data)
      return { success: true, document }
    } catch (error) {
      console.error('主进程→ 更新 Excalidraw 文档失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 删除 Excalidraw 文档
  ipcMain.handle('delete-excalidraw-document', async (_event, id: string) => {
    try {
      console.log('主进程→ 删除 Excalidraw 文档:', id)
      await deleteExcalidrawDocument(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除 Excalidraw 文档失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 获取笔记的所有 Excalidraw 文档
  ipcMain.handle('get-note-excalidraw-documents', async (_event, noteId: string) => {
    try {
      console.log('主进程→ 获取笔记的 Excalidraw 文档:', noteId)
      const documents = await getNoteExcalidrawDocuments(noteId)
      return { success: true, documents }
    } catch (error) {
      console.error('主进程→ 获取笔记的 Excalidraw 文档失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })
}
