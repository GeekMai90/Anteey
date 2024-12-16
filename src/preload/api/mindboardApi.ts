import { ipcRenderer } from 'electron'
import type {
  MindBoard,
  TextCard,
  NoteCard,
  ImageCard,
  Group,
  MindBoardConnection
} from '../../renderer/src/types/mindboard'

export const mindboardApi = {
  // 创建思维板
  createMindBoard: async (data: Partial<MindBoard>): Promise<MindBoard> => {
    try {
      const result = await ipcRenderer.invoke('create-mind-board', data)
      if (!result.success) throw new Error(result.error)
      return result.board
    } catch (error) {
      console.error('预加载脚本 → 创建思维板失败:', error)
      throw error
    }
  },

  // 获取思维板详情
  getMindBoard: async (id: string): Promise<MindBoard | null> => {
    try {
      const result = await ipcRenderer.invoke('get-mind-board', id)
      if (!result.success) throw new Error(result.error)
      return result.board
    } catch (error) {
      console.error('预加载脚本 → 获取思维板失败:', error)
      throw error
    }
  },

  // 创建元素
  createMindBoardElement: async (
    boardId: string,
    element: TextCard | NoteCard | ImageCard | Group
  ): Promise<TextCard | NoteCard | ImageCard | Group> => {
    try {
      const result = await ipcRenderer.invoke('create-mind-board-element', { boardId, element })
      if (!result.success) throw new Error(result.error)
      return result.element
    } catch (error) {
      console.error('预加载脚本 → 创建思维板元素失败:', error)
      throw error
    }
  },

  // 创建连接
  createMindBoardConnection: async (
    boardId: string,
    connection: Omit<MindBoardConnection, 'id'>
  ): Promise<MindBoardConnection> => {
    try {
      const result = await ipcRenderer.invoke('create-mind-board-connection', {
        boardId,
        connection
      })
      if (!result.success) throw new Error(result.error)
      return result.connection
    } catch (error) {
      console.error('预加载脚本 → 创建思维板连接失败:', error)
      throw error
    }
  },

  // 更新思维板
  updateMindBoard: async (id: string, updateData: Partial<MindBoard>): Promise<MindBoard> => {
    try {
      const result = await ipcRenderer.invoke('update-mind-board', { id, updateData })
      if (!result.success) throw new Error(result.error)
      return result.board
    } catch (error) {
      console.error('预加载脚本 → 更新思维板失败:', error)
      throw error
    }
  },

  // 更新元素
  updateMindBoardElement: async (
    id: string,
    updateData: Partial<TextCard | NoteCard | ImageCard | Group>
  ): Promise<TextCard | NoteCard | ImageCard | Group> => {
    try {
      const result = await ipcRenderer.invoke('update-mind-board-element', { id, updateData })
      if (!result.success) throw new Error(result.error)
      return result.element
    } catch (error) {
      console.error('预加载脚本 → 更新思维板元素失败:', error)
      throw error
    }
  },

  // 更新连接
  updateMindBoardConnection: async (
    id: string,
    updateData: Partial<MindBoardConnection>
  ): Promise<MindBoardConnection> => {
    try {
      const result = await ipcRenderer.invoke('update-mind-board-connection', { id, updateData })
      if (!result.success) throw new Error(result.error)
      return result.connection
    } catch (error) {
      console.error('预加载脚本 → 更新思维板连接失败:', error)
      throw error
    }
  },

  // 删除思维板
  deleteMindBoard: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-mind-board', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除思维板失败:', error)
      throw error
    }
  },

  // 删除元素
  deleteMindBoardElement: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-mind-board-element', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除思维板元素失败:', error)
      throw error
    }
  },

  // 删除连接
  deleteMindBoardConnection: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-mind-board-connection', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除思维板连接失败:', error)
      throw error
    }
  },

  // 获取所有思维板
  getAllMindBoards: async (): Promise<MindBoard[]> => {
    try {
      const result = await ipcRenderer.invoke('get-all-mind-boards')
      if (!result.success) throw new Error(result.error)
      return result.boards
    } catch (error) {
      console.error('预加载脚本 → 获取所有思维板失败:', error)
      throw error
    }
  }
}
