import { ipcRenderer } from 'electron'
import type {
  EdWhiteboard,
  EdWhiteboardNoteRef,
  CreateEdWhiteboardParams,
  UpdateEdWhiteboardParams,
  EdWhiteboardQueryParams,
  EdWhiteboardQueryResult,
  CreateEdWhiteboardNoteRefParams,
  UpdateEdWhiteboardNoteRefPositionParams
} from '@shared/types/edWhiteboard'

export const edWhiteboardApi = {
  // 创建白板
  createEdWhiteboard: async (params: CreateEdWhiteboardParams): Promise<EdWhiteboard> => {
    try {
      const result = await ipcRenderer.invoke('create-ed-whiteboard', params)
      if (!result.success) throw new Error(result.error)
      return result.whiteboard
    } catch (error) {
      console.error('预加载脚本 → 创建白板失败:', error)
      throw error
    }
  },

  // 获取白板列表
  getEdWhiteboards: async (params: EdWhiteboardQueryParams): Promise<EdWhiteboardQueryResult> => {
    try {
      const result = await ipcRenderer.invoke('get-ed-whiteboards', params)
      if (!result.success) throw new Error(result.error)
      return {
        total: result.total,
        items: result.items
      }
    } catch (error) {
      console.error('预加载脚本 → 获取白板列表失败:', error)
      throw error
    }
  },

  // 获取单个白板
  getEdWhiteboardById: async (id: string): Promise<EdWhiteboard | null> => {
    try {
      const result = await ipcRenderer.invoke('get-ed-whiteboard-by-id', id)
      if (!result.success) throw new Error(result.error)
      return result.whiteboard
    } catch (error) {
      console.error('预加载脚本 → 获取白板失败:', error)
      throw error
    }
  },

  // 更新白板
  updateEdWhiteboard: async (params: UpdateEdWhiteboardParams): Promise<EdWhiteboard> => {
    try {
      const result = await ipcRenderer.invoke('update-ed-whiteboard', params)
      if (!result.success) throw new Error(result.error)
      return result.whiteboard
    } catch (error) {
      console.error('预加载脚本 → 更新白板失败:', error)
      throw error
    }
  },

  // 删除白板
  deleteEdWhiteboard: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-ed-whiteboard', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除白板失败:', error)
      throw error
    }
  },

  // 创建笔记引用
  createEdWhiteboardNoteRef: async (
    params: CreateEdWhiteboardNoteRefParams
  ): Promise<EdWhiteboardNoteRef> => {
    try {
      const result = await ipcRenderer.invoke('create-ed-whiteboard-note-ref', params)
      if (!result.success) throw new Error(result.error)
      return result.noteRef
    } catch (error) {
      console.error('预加载脚本 → 创建笔记引用失败:', error)
      throw error
    }
  },

  // 更新笔记引用位置
  updateEdWhiteboardNoteRefPosition: async (
    params: UpdateEdWhiteboardNoteRefPositionParams
  ): Promise<EdWhiteboardNoteRef> => {
    try {
      const result = await ipcRenderer.invoke('update-ed-whiteboard-note-ref-position', params)
      if (!result.success) throw new Error(result.error)
      return result.noteRef
    } catch (error) {
      console.error('预加载脚本 → 更新笔记引用位置失败:', error)
      throw error
    }
  },

  // 删除笔记引用
  deleteEdWhiteboardNoteRef: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-ed-whiteboard-note-ref', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除笔记引用失败:', error)
      throw error
    }
  },

  // 获取白板中的所有笔记引用
  getEdWhiteboardNoteRefs: async (whiteboardId: string): Promise<EdWhiteboardNoteRef[]> => {
    try {
      const result = await ipcRenderer.invoke('get-ed-whiteboard-note-refs', whiteboardId)
      if (!result.success) throw new Error(result.error)
      return result.noteRefs
    } catch (error) {
      console.error('预加载脚本 → 获取白板笔记引用失败:', error)
      throw error
    }
  }
}
