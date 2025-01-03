import { ipcRenderer } from 'electron'
import type { CustomFilter, CreateCustomFilterInput, UpdateCustomFilterInput } from '@shared/types'

export const filterApi = {
  // 创建自定义筛选规则
  createCustomFilter: async (input: CreateCustomFilterInput): Promise<CustomFilter> => {
    try {
      const result = await ipcRenderer.invoke('create-custom-filter', input)
      if (!result.success) throw new Error(result.error)
      return result.filter
    } catch (error) {
      console.error('预加载脚本 → 创建自定义筛选规则失败:', error)
      throw error
    }
  },

  // 获取所有自定义筛选规则
  getAllCustomFilters: async (): Promise<CustomFilter[]> => {
    try {
      const result = await ipcRenderer.invoke('get-all-custom-filters')
      if (!result.success) throw new Error(result.error)
      return result.filters
    } catch (error) {
      console.error('预加载脚本 → 获取所有自定义筛选规则失败:', error)
      throw error
    }
  },

  // 根据ID获取筛选规则
  getCustomFilterById: async (id: string): Promise<CustomFilter | null> => {
    try {
      const result = await ipcRenderer.invoke('get-custom-filter-by-id', id)
      if (!result.success) throw new Error(result.error)
      return result.filter
    } catch (error) {
      console.error('预加载脚本 → 获取筛选规则失败:', error)
      throw error
    }
  },

  // 更新筛选规则
  updateCustomFilter: async (
    id: string,
    updateData: UpdateCustomFilterInput
  ): Promise<CustomFilter> => {
    try {
      const result = await ipcRenderer.invoke('update-custom-filter', { id, updateData })
      if (!result.success) throw new Error(result.error)
      return result.filter
    } catch (error) {
      console.error('预加载脚本 → 更新筛选规则失败:', error)
      throw error
    }
  },

  // 删除筛选规则
  deleteCustomFilter: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-custom-filter', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除筛选规则失败:', error)
      throw error
    }
  },

  // 更新筛选规则置顶状态
  updateFilterPinned: async (
    id: string,
    isPinned: boolean,
    pinnedOrder?: number
  ): Promise<CustomFilter> => {
    try {
      const result = await ipcRenderer.invoke('update-filter-pinned', {
        id,
        isPinned,
        pinnedOrder
      })
      if (!result.success) throw new Error(result.error)
      return result.filter
    } catch (error) {
      console.error('预加载脚本 → 更新筛选规则置顶状态失败:', error)
      throw error
    }
  },

  // 切换筛选规则的收藏状态
  toggleFilterStar: async (id: string): Promise<CustomFilter> => {
    try {
      const result = await ipcRenderer.invoke('toggle-filter-star', id)
      if (!result.success) throw new Error(result.error)
      return result.filter
    } catch (error) {
      console.error('预加载脚本 → 切换筛选规则收藏状态失败:', error)
      throw error
    }
  }
}
