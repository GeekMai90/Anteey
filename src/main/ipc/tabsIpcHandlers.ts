import { ipcMain } from 'electron'
import {
  getTabs,
  getTabById,
  addTab,
  updateTab,
  deleteTab,
  reorderTabs,
  updateTabAccessTime,
  pinTab,
  getTabByContent
} from '../../services/tabs/tabsService'
import {
  AddTabRequest,
  UpdateTabRequest,
  TabItemType,
  ReorderTabsRequest
} from '@shared/types/tabs'

export function setupTabsHandlers() {
  // 获取所有标签页
  ipcMain.handle('get-tabs', async (_, params) => {
    try {
      const result = await getTabs(params)
      return result
    } catch (error) {
      console.error('主进程 → 获取标签页失败:', error)
      throw error
    }
  })

  // 获取单个标签页
  ipcMain.handle('get-tab', async (_, id: string) => {
    try {
      const tab = await getTabById(id)
      return tab
    } catch (error) {
      console.error(`主进程 → 获取标签页 ${id} 失败:`, error)
      throw error
    }
  })

  // 添加新标签页
  ipcMain.handle('add-tab', async (_, params: AddTabRequest) => {
    try {
      const newTab = await addTab(params)
      return newTab
    } catch (error) {
      console.error('主进程 → 添加标签页失败:', error)
      throw error
    }
  })

  // 更新标签页
  ipcMain.handle('update-tab', async (_, params: UpdateTabRequest) => {
    try {
      const updatedTab = await updateTab(params)
      return updatedTab
    } catch (error) {
      console.error(`主进程 → 更新标签页 ${params.id} 失败:`, error)
      throw error
    }
  })

  // 删除标签页
  ipcMain.handle('delete-tab', async (_, id: string) => {
    try {
      await deleteTab(id)
      return { success: true }
    } catch (error) {
      console.error(`主进程 → 删除标签页 ${id} 失败:`, error)
      throw error
    }
  })

  // 更新标签页顺序
  ipcMain.handle('reorder-tabs', async (_, params: ReorderTabsRequest) => {
    try {
      const tabs = await reorderTabs(params)
      return tabs
    } catch (error) {
      console.error('主进程 → 更新标签页顺序失败:', error)
      throw error
    }
  })

  // 更新标签页访问时间
  ipcMain.handle('update-tab-access-time', async (_, id: string) => {
    try {
      const tab = await updateTabAccessTime(id)
      return tab
    } catch (error) {
      console.error(`主进程 → 更新标签页 ${id} 访问时间失败:`, error)
      throw error
    }
  })

  // 设置标签页固定状态
  ipcMain.handle('pin-tab', async (_, id: string, isPinned: boolean) => {
    try {
      const tab = await pinTab(id, isPinned)
      return tab
    } catch (error) {
      console.error(`主进程 → 设置标签页 ${id} 固定状态失败:`, error)
      throw error
    }
  })

  // 获取特定内容的标签页
  ipcMain.handle('get-tab-by-content', async (_, contentId: string, type: TabItemType) => {
    try {
      const tab = await getTabByContent(contentId, type)
      return tab
    } catch (error) {
      console.error(`主进程 → 获取内容 ${contentId} 的标签页失败:`, error)
      throw error
    }
  })
}
