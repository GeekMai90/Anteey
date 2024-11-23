import { ipcRenderer } from 'electron'
import { TldrawError, TldrawErrorCode } from '../../renderer/src/types/Tldraw'
import type {
  TldrawBoard,
  TldrawBoardState,
  TldrawBoardNote,
  CreateBoardDto,
  UpdateBoardDto,
  TldrawBoardFilter,
  TldrawBoardSort,
  CreateBoardNoteDto,
  UpdateBoardNoteDto,
  Camera,
  TldrawSnapshot
} from '../../renderer/src/types/Tldraw'

export const tldrawApi = {
  // 白板基础操作
  createTldrawBoard: async (data: CreateBoardDto): Promise<TldrawBoard> => {
    try {
      const result = await ipcRenderer.invoke('tldraw-create-board', data)
      if (!result.success) throw new Error(result.error)
      return result.board
    } catch (error) {
      console.error('预加载脚本 → 创建白板失败:', error)
      throw error
    }
  },

  updateTldrawBoard: async (id: string, data: UpdateBoardDto): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('tldraw-update-board', { id, data })
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 更新白板失败:', error)
      throw error
    }
  },

  deleteTldrawBoard: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('tldraw-delete-board', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除白板失败:', error)
      throw error
    }
  },

  getTldrawBoard: async (id: string): Promise<TldrawBoard | null> => {
    try {
      const result = await ipcRenderer.invoke('tldraw-get-board', id)
      if (!result.success) throw new Error(result.error)
      return result.board
    } catch (error) {
      console.error('预加载脚本 → 获取白板失败:', error)
      throw error
    }
  },

  getTldrawBoards: async (
    filter: TldrawBoardFilter,
    sort?: TldrawBoardSort
  ): Promise<TldrawBoard[]> => {
    try {
      const result = await ipcRenderer.invoke('tldraw-get-boards', { filter, sort })
      if (!result.success) throw new Error(result.error)
      return result.boards
    } catch (error) {
      console.error('预加载脚本 → 获取白板列表失败:', error)
      throw error
    }
  },

  // 白板状态操作
  saveTldrawBoardState: async (
    boardId: string,
    content: TldrawSnapshot,
    camera: Camera
  ): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('tldraw-save-board-state', {
        boardId,
        content,
        camera
      })
      if (!result.success) {
        if (result.code) {
          throw new TldrawError(result.code as TldrawErrorCode, result.error)
        }
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('预加载脚本 → 保存白板状态失败:', error)
      throw error
    }
  },

  getTldrawBoardState: async (boardId: string): Promise<TldrawBoardState | null> => {
    try {
      const result = await ipcRenderer.invoke('tldraw-get-board-state', boardId)
      if (!result.success) throw new Error(result.error)
      return result.state
    } catch (error) {
      console.error('预加载脚本 → 获取白板状态失败:', error)
      throw error
    }
  },

  // 白板笔记操作
  createTldrawNote: async (data: CreateBoardNoteDto): Promise<TldrawBoardNote> => {
    try {
      const result = await ipcRenderer.invoke('tldraw-create-note', data)
      if (!result.success) throw new Error(result.error)
      return result.note
    } catch (error) {
      console.error('预加载脚本 → 创建白板笔记失败:', error)
      throw error
    }
  },

  updateTldrawNote: async (id: string, data: UpdateBoardNoteDto): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('tldraw-update-note', { id, data })
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 更新白板笔记失败:', error)
      throw error
    }
  },

  deleteTldrawNote: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('tldraw-delete-note', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除白板笔记失败:', error)
      throw error
    }
  },

  getTldrawBoardNotes: async (boardId: string): Promise<TldrawBoardNote[]> => {
    try {
      const result = await ipcRenderer.invoke('tldraw-get-board-notes', boardId)
      if (!result.success) throw new Error(result.error)
      return result.notes
    } catch (error) {
      console.error('预加载脚本 → 获取白板笔记失败:', error)
      throw error
    }
  },

  // 白板排序和收藏操作
  updateTldrawBoardsOrder: async (boardIds: string[]): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('tldraw-update-boards-order', boardIds)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 更新白板排序失败:', error)
      throw error
    }
  },

  toggleTldrawBoardStarred: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('tldraw-toggle-board-starred', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 切换白板收藏状态失败:', error)
      throw error
    }
  },

  updateTldrawNotesZIndex: async (notes: { id: string; zIndex: number }[]): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('tldraw-update-notes-zindex', notes)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 更新笔记层级失败:', error)
      throw error
    }
  }
}
