import { ipcRenderer } from 'electron'
import type { Tag } from '../../renderer/src/types/Note'

export const tagApi = {
  // 创建标签
  createTag: async ({
    name,
    color,
    icon
  }: {
    name: string
    color?: string
    icon?: string
  }): Promise<Tag> => {
    try {
      const result = await ipcRenderer.invoke('create-tag', { name, color, icon })
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.tag
    } catch (error) {
      console.error('预加载脚本 → 创建标签失败:', error)
      throw error
    }
  },

  // 获取所有标签
  getAllTags: async (): Promise<Tag[]> => {
    try {
      const result = await ipcRenderer.invoke('get-all-tags')
      if (!result.success) {
        throw new Error(result.error)
      }
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
      if (!result.success) {
        throw new Error(result.error)
      }
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
      if (!result.success) {
        throw new Error(result.error)
      }
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
      if (!result.success) {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('预加载脚本 → 删除标签失败:', error)
      throw error
    }
  },

  // 增加标签使用次数
  incrementTagUseCount: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('increment-tag-use-count', id)
      if (!result.success) {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('预加载脚本 → 增加标签使用次数失败:', error)
      throw error
    }
  },

  // 搜索标签
  searchTags: async (query: string): Promise<Tag[]> => {
    try {
      const result = await ipcRenderer.invoke('search-tags', query)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.tags
    } catch (error) {
      console.error('预加载脚本 → 搜索标签失败:', error)
      throw error
    }
  }
}
