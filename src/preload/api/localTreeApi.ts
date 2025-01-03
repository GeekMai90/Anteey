import { ipcRenderer } from 'electron'
import type { Note, LocalTreeData, LocalTreeWithReferencesData } from '@shared/types'

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

  // 获取本地树与引用数据
  getLocalTreeWithReferences: async (noteId: string): Promise<LocalTreeWithReferencesData> => {
    try {
      const result = await ipcRenderer.invoke('get-local-tree-with-references', noteId)
      if (!result.success) throw new Error(result.error)
      return result.data
    } catch (error) {
      console.error('预加载脚本 → 获取本地树与引用数据失败:', error)
      throw error
    }
  },

  // 根据地址获取笔记
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
