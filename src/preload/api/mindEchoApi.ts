import { ipcRenderer } from 'electron'
import type { MindEcho, MindEchoWithRelations, UpdateMindEchoParams } from '@shared/types/mind-echo'

export const mindEchoApi = {
  // 从单条AI回复创建思维共鸣
  createMindEchoFromContent: async (params: {
    noteId: string
    conversationId: string
    messageId: string
    modelConfigId?: string
  }): Promise<MindEcho> => {
    try {
      const result = await ipcRenderer.invoke('create-mind-echo-from-content', params)
      if (!result.success) throw new Error(result.error)
      return result.mindEcho
    } catch (error) {
      console.error('预加载脚本 → 创建思维共鸣失败:', error)
      throw error
    }
  },

  // 从多轮对话创建思维共鸣
  createMindEchoFromConversation: async (params: {
    noteId: string
    conversationId: string
    messageIds: string[]
    modelConfigId?: string
  }): Promise<MindEcho> => {
    try {
      const result = await ipcRenderer.invoke('create-mind-echo-from-conversation', params)
      if (!result.success) throw new Error(result.error)
      return result.mindEcho
    } catch (error) {
      console.error('预加载脚本 → 从对话创建思维共鸣失败:', error)
      throw error
    }
  },

  // 获取笔记的所有思维共鸣
  getNoteMindEchoes: async (
    noteId: string,
    includeArchived: boolean = false
  ): Promise<MindEcho[]> => {
    try {
      const result = await ipcRenderer.invoke('get-note-mind-echoes', { noteId, includeArchived })
      if (!result.success) throw new Error(result.error)
      return result.echoes
    } catch (error) {
      console.error('预加载脚本 → 获取笔记思维共鸣失败:', error)
      throw error
    }
  },

  // 获取思维共鸣详情（带关联数据）
  getMindEchoDetail: async (id: string): Promise<MindEchoWithRelations | null> => {
    try {
      const result = await ipcRenderer.invoke('get-mind-echo-detail', id)
      if (!result.success) throw new Error(result.error)
      return result.echo
    } catch (error) {
      console.error('预加载脚本 → 获取思维共鸣详情失败:', error)
      throw error
    }
  },

  // 更新思维共鸣
  updateMindEcho: async (updateData: UpdateMindEchoParams): Promise<MindEcho> => {
    try {
      const result = await ipcRenderer.invoke('update-mind-echo', { updateData })
      if (!result.success) throw new Error(result.error)
      return result.mindEcho
    } catch (error) {
      console.error('预加载脚本 → 更新思维共鸣失败:', error)
      throw error
    }
  },

  // 删除思维共鸣
  deleteMindEcho: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-mind-echo', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除思维共鸣失败:', error)
      throw error
    }
  },

  // 更新思维共鸣排序
  updateMindEchoOrder: async (id: string, newOrder: number): Promise<MindEcho> => {
    try {
      const result = await ipcRenderer.invoke('update-mind-echo-order', { id, newOrder })
      if (!result.success) throw new Error(result.error)
      return result.mindEcho
    } catch (error) {
      console.error('预加载脚本 → 更新思维共鸣排序失败:', error)
      throw error
    }
  },

  // 切换思维共鸣归档状态
  toggleMindEchoArchived: async (id: string, isArchived: boolean): Promise<MindEcho> => {
    try {
      const result = await ipcRenderer.invoke('toggle-mind-echo-archived', { id, isArchived })
      if (!result.success) throw new Error(result.error)
      return result.mindEcho
    } catch (error) {
      console.error('预加载脚本 → 更新思维共鸣归档状态失败:', error)
      throw error
    }
  },

  // 批量更新思维共鸣
  batchUpdateMindEchoes: async (ids: string[], updates: Partial<MindEcho>): Promise<MindEcho[]> => {
    try {
      const result = await ipcRenderer.invoke('batch-update-mind-echoes', { ids, updates })
      if (!result.success) throw new Error(result.error)
      return result.mindEchoes
    } catch (error) {
      console.error('预加载脚本 → 批量更新思维共鸣失败:', error)
      throw error
    }
  }
}
