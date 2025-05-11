import { ipcRenderer } from 'electron'
import {
  TabItem,
  TabItemType,
  GetTabsRequest,
  AddTabRequest,
  UpdateTabRequest,
  ReorderTabsRequest,
  TabsResponse
} from '@shared/types/tabs'

export const tabsApi = {
  /**
   * 获取标签页列表
   * @param params 查询参数
   * @returns 标签页列表和总数
   */
  getTabs: async (params?: GetTabsRequest): Promise<TabsResponse> => {
    try {
      return (await ipcRenderer.invoke('get-tabs', params)) as TabsResponse
    } catch (error) {
      console.error('预加载脚本 → 获取标签页失败:', error)
      throw error
    }
  },

  /**
   * 获取单个标签页
   * @param id 标签页ID
   * @returns 标签页对象
   */
  getTab: async (id: string): Promise<TabItem | null> => {
    try {
      return (await ipcRenderer.invoke('get-tab', id)) as TabItem | null
    } catch (error) {
      console.error(`预加载脚本 → 获取标签页 ${id} 失败:`, error)
      throw error
    }
  },

  /**
   * 添加新标签页
   * @param params 标签页参数
   * @returns 新标签页
   */
  addTab: async (params: AddTabRequest): Promise<TabItem> => {
    try {
      return (await ipcRenderer.invoke('add-tab', params)) as TabItem
    } catch (error) {
      console.error('预加载脚本 → 添加标签页失败:', error)
      throw error
    }
  },

  /**
   * 更新标签页
   * @param params 更新参数
   * @returns 更新后的标签页
   */
  updateTab: async (params: UpdateTabRequest): Promise<TabItem> => {
    try {
      return (await ipcRenderer.invoke('update-tab', params)) as TabItem
    } catch (error) {
      console.error(`预加载脚本 → 更新标签页 ${params.id} 失败:`, error)
      throw error
    }
  },

  /**
   * 删除标签页
   * @param id 标签页ID
   * @returns 操作结果
   */
  deleteTab: async (id: string): Promise<{ success: boolean }> => {
    try {
      return (await ipcRenderer.invoke('delete-tab', id)) as { success: boolean }
    } catch (error) {
      console.error(`预加载脚本 → 删除标签页 ${id} 失败:`, error)
      throw error
    }
  },

  /**
   * 更新标签页顺序
   * @param params 排序参数
   * @returns 更新后的标签页列表
   */
  reorderTabs: async (params: ReorderTabsRequest): Promise<TabItem[]> => {
    try {
      return (await ipcRenderer.invoke('reorder-tabs', params)) as TabItem[]
    } catch (error) {
      console.error('预加载脚本 → 更新标签页顺序失败:', error)
      throw error
    }
  },

  /**
   * 更新标签页访问时间
   * @param id 标签页ID
   * @returns 更新后的标签页
   */
  updateTabAccessTime: async (id: string): Promise<TabItem> => {
    try {
      return (await ipcRenderer.invoke('update-tab-access-time', id)) as TabItem
    } catch (error) {
      console.error(`预加载脚本 → 更新标签页 ${id} 访问时间失败:`, error)
      throw error
    }
  },

  /**
   * 设置标签页固定状态
   * @param id 标签页ID
   * @param isPinned 是否固定
   * @returns 更新后的标签页
   */
  pinTab: async (id: string, isPinned: boolean): Promise<TabItem> => {
    try {
      return (await ipcRenderer.invoke('pin-tab', id, isPinned)) as TabItem
    } catch (error) {
      console.error(`预加载脚本 → 设置标签页 ${id} 固定状态失败:`, error)
      throw error
    }
  },

  /**
   * 获取特定内容的标签页
   * @param contentId 内容ID
   * @param type 内容类型
   * @returns 标签页对象
   */
  getTabByContent: async (contentId: string, type: TabItemType): Promise<TabItem | null> => {
    try {
      return (await ipcRenderer.invoke('get-tab-by-content', contentId, type)) as TabItem | null
    } catch (error) {
      console.error(`预加载脚本 → 获取内容 ${contentId} 的标签页失败:`, error)
      throw error
    }
  }
}
