import { ipcRenderer } from 'electron'
import type { Draft, UpdateDraftInput, AppendDraftInput } from '@shared/types'

export const draftsApi = {
  // 获取草稿纸内容
  getDraft: async (): Promise<Draft | null> => {
    try {
      const result = await ipcRenderer.invoke('get-draft')
      if (!result.success) throw new Error(result.error)
      return result.draft
    } catch (error) {
      console.error('预加载脚本 → 获取草稿纸内容失败:', error)
      throw error
    }
  },

  // 创建草稿纸
  createDraft: async (): Promise<Draft> => {
    try {
      const result = await ipcRenderer.invoke('create-draft')
      if (!result.success) throw new Error(result.error)
      return result.draft
    } catch (error) {
      console.error('预加载脚本 → 创建草稿纸失败:', error)
      throw error
    }
  },

  // 更新草稿纸内容
  updateDraft: async (input: UpdateDraftInput): Promise<Draft> => {
    try {
      const result = await ipcRenderer.invoke('update-draft', input)
      if (!result.success) throw new Error(result.error)
      return result.draft
    } catch (error) {
      console.error('预加载脚本 → 更新草稿纸内容失败:', error)
      throw error
    }
  },

  // 追加内容到草稿纸
  appendDraft: async (input: AppendDraftInput): Promise<Draft> => {
    try {
      const result = await ipcRenderer.invoke('append-draft', input)
      if (!result.success) throw new Error(result.error)
      return result.draft
    } catch (error) {
      console.error('预加载脚本 → 追加内容到草稿纸失败:', error)
      throw error
    }
  }
}
