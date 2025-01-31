import { ipcRenderer } from 'electron'
import type { Mindboard } from '@shared/types'

export const mindboardApi = {
  // 创建思维板
  createMindboard: async (
    data: Omit<Mindboard, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Mindboard> => {
    try {
      const result = await ipcRenderer.invoke('create-mindboard', data)
      if (!result.success) throw new Error(result.error)
      return result.mindboard
    } catch (error) {
      console.error('预加载脚本 → 创建思维板失败:', error)
      throw error
    }
  },

  // 获取所有思维板
  getAllMindboards: async (): Promise<Mindboard[]> => {
    try {
      const result = await ipcRenderer.invoke('get-all-mindboards')
      if (!result.success) throw new Error(result.error)
      return result.mindboards
    } catch (error) {
      console.error('预加载脚本 → 获取所有思维板失败:', error)
      throw error
    }
  },

  // 获取单个思维板
  getMindboard: async (id: string): Promise<Mindboard> => {
    try {
      const result = await ipcRenderer.invoke('get-mindboard', id)
      if (!result.success) throw new Error(result.error)
      return result.mindboard
    } catch (error) {
      console.error('预加载脚本 → 获取思维板失败:', error)
      throw error
    }
  },

  // 更新思维板
  updateMindboard: async (id: string, data: Partial<Mindboard>): Promise<Mindboard> => {
    try {
      const result = await ipcRenderer.invoke('update-mindboard', { id, data })
      if (!result.success) throw new Error(result.error)
      return result.mindboard
    } catch (error) {
      console.error('预加载脚本 → 更新思维板失败:', error)
      throw error
    }
  },

  // 删除思维板
  deleteMindboard: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-mindboard', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除思维板失败:', error)
      throw error
    }
  },

  // 更新思维板名称
  updateMindboardName: async (id: string, name: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('update-mindboard-name', { id, name })
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 更新思维板名称失败:', error)
      throw error
    }
  }
}
