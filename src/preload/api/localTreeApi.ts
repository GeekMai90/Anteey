import { ipcRenderer } from 'electron'
import type { Note } from '../../renderer/src/types/Note'

interface LocalTreeData {
  current: Note
  parent: Note | null
  siblings: Note[]
  children: Note[]
}

export const localTreeApi = {
  // 获取本地树数据
  getLocalTree: async (noteId: string): Promise<LocalTreeData> => {
    try {
      const result = await ipcRenderer.invoke('get-local-tree', noteId)
      if (!result.success) throw new Error(result.error)
      return result.data
    } catch (error) {
      console.error('预加载脚本 → 获取本地树失败:', error)
      throw error
    }
  },
  getNoteByAddress: async (address: string): Promise<Note | null> => {
    try {
      const result = await ipcRenderer.invoke('get-note-by-address', address)
      if (!result.success) throw new Error(result.error)
      return result.data
    } catch (error) {
      console.error('预加载脚本 → 根据地址获取笔记失败:', error)
      throw error
    }
  }
}
