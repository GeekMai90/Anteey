import { ipcMain } from 'electron'
import {
  createCustomFilter,
  getAllCustomFilters,
  getCustomFilterById,
  updateCustomFilter,
  deleteCustomFilter,
  updateFilterPinned,
  toggleFilterStar
} from '../../services/notes/filterService'
import type {
  CreateCustomFilterInput,
  UpdateCustomFilterInput
} from '../../renderer/src/types/Filter'

export function setupFilterHandlers() {
  // 创建自定义筛选规则
  ipcMain.handle('create-custom-filter', async (_event, input: CreateCustomFilterInput) => {
    try {
      const newFilter = await createCustomFilter(input)
      return { success: true, filter: newFilter }
    } catch (error) {
      console.error('主进程→ 创建自定义筛选规则失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取所有自定义筛选规则
  ipcMain.handle('get-all-custom-filters', async () => {
    try {
      const filters = await getAllCustomFilters()
      return { success: true, filters }
    } catch (error) {
      console.error('主进程→ 获取所有自定义筛选规则失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 根据ID获取筛选规则
  ipcMain.handle('get-custom-filter-by-id', async (_event, id: string) => {
    try {
      const filter = await getCustomFilterById(id)
      return { success: true, filter }
    } catch (error) {
      console.error('主进程→ 获取筛选规则失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新筛选规则
  ipcMain.handle(
    'update-custom-filter',
    async (_event, { id, updateData }: { id: string; updateData: UpdateCustomFilterInput }) => {
      try {
        const updatedFilter = await updateCustomFilter(id, updateData)
        return { success: true, filter: updatedFilter }
      } catch (error) {
        console.error('主进程→ 更新筛选规则失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 删除筛选规则
  ipcMain.handle('delete-custom-filter', async (_event, id: string) => {
    try {
      await deleteCustomFilter(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除筛选规则失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新筛选规则置顶状态
  ipcMain.handle(
    'update-filter-pinned',
    async (
      _event,
      { id, isPinned, pinnedOrder }: { id: string; isPinned: boolean; pinnedOrder?: number }
    ) => {
      try {
        const updatedFilter = await updateFilterPinned(id, isPinned, pinnedOrder)
        return { success: true, filter: updatedFilter }
      } catch (error) {
        console.error('主进程→ 更新筛选规则置顶状态失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 切换筛选规则的收藏状态
  ipcMain.handle('toggle-filter-star', async (_event, id: string) => {
    try {
      const updatedFilter = await toggleFilterStar(id)
      return { success: true, filter: updatedFilter }
    } catch (error) {
      console.error('主进程→ 切换筛选规则收藏状态失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
