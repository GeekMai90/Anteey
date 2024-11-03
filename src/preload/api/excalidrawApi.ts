import { ipcRenderer } from 'electron'
import type { ExcalidrawDocument } from '../../renderer/src/types/Note'

export const excalidrawApi = {
  // 创建 Excalidraw 文档
  createExcalidrawDocument: async (
    noteId: string,
    data: Partial<ExcalidrawDocument>
  ): Promise<ExcalidrawDocument> => {
    try {
      console.log('预加载脚本→ 创建 Excalidraw 文档:', { noteId, data })
      const result = await ipcRenderer.invoke('create-excalidraw-document', { noteId, data })
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.document
    } catch (error) {
      console.error('预加载脚本→ 创建 Excalidraw 文档失败:', error)
      throw error
    }
  },

  // 获取 Excalidraw 文档
  getExcalidrawDocument: async (id: string): Promise<ExcalidrawDocument | null> => {
    try {
      console.log('预加载脚本→ 获取 Excalidraw 文档:', id)
      const result = await ipcRenderer.invoke('get-excalidraw-document', id)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.document
    } catch (error) {
      console.error('预加载脚本→ 获取 Excalidraw 文档失败:', error)
      throw error
    }
  },

  // 更新 Excalidraw 文档
  updateExcalidrawDocument: async (
    id: string,
    data: Partial<ExcalidrawDocument>
  ): Promise<ExcalidrawDocument> => {
    try {
      console.log('预加载脚本→ 更新 Excalidraw 文档:', { id, data })
      const result = await ipcRenderer.invoke('update-excalidraw-document', { id, data })
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.document
    } catch (error) {
      console.error('预加载脚本→ 更新 Excalidraw 文档失败:', error)
      throw error
    }
  },

  // 删除 Excalidraw 文档
  deleteExcalidrawDocument: async (id: string): Promise<void> => {
    try {
      console.log('预加载脚本→ 删除 Excalidraw 文档:', id)
      const result = await ipcRenderer.invoke('delete-excalidraw-document', id)
      if (!result.success) {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('预加载脚本→ 删除 Excalidraw 文档失败:', error)
      throw error
    }
  },

  // 获取笔记的所有 Excalidraw 文档
  getNoteExcalidrawDocuments: async (noteId: string): Promise<ExcalidrawDocument[]> => {
    try {
      console.log('预加载脚本→ 获取笔记的 Excalidraw 文档:', noteId)
      const result = await ipcRenderer.invoke('get-note-excalidraw-documents', noteId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.documents
    } catch (error) {
      console.error('预加载脚本→ 获取笔记的 Excalidraw 文档失败:', error)
      throw error
    }
  }
}
