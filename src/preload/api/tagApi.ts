import { ipcRenderer } from 'electron'
import type { Tag, TagSearchParams, IconName } from '@shared/types'

export const tagApi = {
  // 创建标签
  createTag: async ({
    name,
    color,
    icon
  }: {
    name: string
    color?: string
    icon?: IconName
  }): Promise<Tag> => {
    try {
      const result = await ipcRenderer.invoke('create-tag', { name, color, icon })
      if (!result.success) throw new Error(result.error)
      return result.tag
    } catch (error) {
      console.error('预加载脚本 → 创建标签失败:', error)
      throw error
    }
  },

  // 获取所有标签（包含使用次数）
  getAllTags: async (): Promise<Tag[]> => {
    try {
      const result = await ipcRenderer.invoke('get-all-tags')
      if (!result.success) throw new Error(result.error)
      return result.tags
    } catch (error) {
      console.error('预加载脚本 → 获取所有标签失败:', error)
      throw error
    }
  },

  // 根据ID获取标签
  getTagById: async (id: string): Promise<Tag | null> => {
    try {
      const result = await ipcRenderer.invoke('get-tag-by-id', id)
      if (!result.success) throw new Error(result.error)
      return result.tag
    } catch (error) {
      console.error('预加载脚本 → 获取标签失败:', error)
      throw error
    }
  },

  // 更新标签
  updateTag: async (id: string, updateData: Partial<Tag>): Promise<Tag> => {
    try {
      const result = await ipcRenderer.invoke('update-tag', { id, updateData })
      if (!result.success) throw new Error(result.error)
      return result.tag
    } catch (error) {
      console.error('预加载脚本 → 更新标签失败:', error)
      throw error
    }
  },

  // 删除标签
  deleteTag: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-tag', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除标签失败:', error)
      throw error
    }
  },

  // 搜索标签
  searchTags: async (query: string): Promise<Tag[]> => {
    try {
      const result = await ipcRenderer.invoke('search-tags', query)
      if (!result.success) throw new Error(result.error)
      return result.tags
    } catch (error) {
      console.error('预加载脚本 → 搜索标签失败:', error)
      throw error
    }
  },

  // 高级搜索标签
  searchTagsAdvanced: async (params: TagSearchParams): Promise<Tag[]> => {
    try {
      const result = await ipcRenderer.invoke('search-tags-advanced', params)
      if (!result.success) throw new Error(result.error)
      return result.tags
    } catch (error) {
      console.error('预加载脚本 → 高级搜索标签失败:', error)
      throw error
    }
  },

  // 更新标签置顶状态
  updateTagPinned: async (id: string, pinned: boolean, pinOrder?: number): Promise<Tag> => {
    try {
      const result = await ipcRenderer.invoke('update-tag-pinned', { id, pinned, pinOrder })
      if (!result.success) throw new Error(result.error)
      return result.tag
    } catch (error) {
      console.error('预加载脚本 → 更新标签置顶状态失败:', error)
      throw error
    }
  },

  // 更新标签置顶顺序
  updateTagPinOrder: async (id: string, pinOrder: number): Promise<Tag> => {
    try {
      const result = await ipcRenderer.invoke('update-tag-pin-order', { id, pinOrder })
      if (!result.success) throw new Error(result.error)
      return result.tag
    } catch (error) {
      console.error('预加载脚本 → 更新标签置顶顺序失败:', error)
      throw error
    }
  },

  // 获取笔记的标签
  getNoteTags: async (noteId: string): Promise<Tag[]> => {
    try {
      const result = await ipcRenderer.invoke('get-note-tags', noteId)
      if (!result.success) throw new Error(result.error)
      return result.tags
    } catch (error) {
      console.error('预加载脚本 → 获取笔记标签失败:', error)
      throw error
    }
  }
}
