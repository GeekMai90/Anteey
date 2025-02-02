import { ipcMain } from 'electron'
import {
  createMindboard,
  getMindboard,
  getAllMindboards,
  updateMindboard,
  deleteMindboard,
  updateMindboardName,
  updatePreviewImage,
  toggleFavorite,
  getFavoriteMindboards
} from '../../services/mindboard/mindboardService'
import type { Mindboard } from '@shared/types'

export function setupMindboardHandlers() {
  // 创建思维板
  ipcMain.handle(
    'create-mindboard',
    async (_event, data: Omit<Mindboard, 'id' | 'created_at' | 'updated_at'>) => {
      try {
        const mindboard = await createMindboard(data)
        return { success: true, mindboard }
      } catch (error) {
        console.error('主进程→ 创建思维板失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取所有思维板
  ipcMain.handle('get-all-mindboards', async () => {
    try {
      const mindboards = await getAllMindboards()
      return { success: true, mindboards }
    } catch (error) {
      console.error('主进程→ 获取所有思维板失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取单个思维板
  ipcMain.handle('get-mindboard', async (_event, id: string) => {
    try {
      const mindboard = await getMindboard(id)
      return { success: true, mindboard }
    } catch (error) {
      console.error('主进程→ 获取思维板失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新思维板
  ipcMain.handle(
    'update-mindboard',
    async (_event, { id, data }: { id: string; data: Partial<Mindboard> }) => {
      try {
        const mindboard = await updateMindboard(id, data)
        return { success: true, mindboard }
      } catch (error) {
        console.error('主进程→ 更新思维板失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 删除思维板
  ipcMain.handle('delete-mindboard', async (_event, id: string) => {
    try {
      await deleteMindboard(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除思维板失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新思维板名称
  ipcMain.handle(
    'update-mindboard-name',
    async (_event, { id, name }: { id: string; name: string }) => {
      try {
        await updateMindboardName(id, name)
        return { success: true }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    }
  )

  // 添加更新预览图的处理器
  ipcMain.handle(
    'update-mindboard-preview',
    async (_event, { id, previewImage }: { id: string; previewImage: string }) => {
      try {
        await updatePreviewImage(id, previewImage)
        return { success: true }
      } catch (error) {
        console.error('主进程→ 更新思维板预览图失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 切换思维板收藏状态
  ipcMain.handle('toggle-mindboard-favorite', async (_event, id: string) => {
    try {
      await toggleFavorite(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 切换思维板收藏状态失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取收藏的思维板
  ipcMain.handle('get-favorite-mindboards', async () => {
    try {
      const mindboards = await getFavoriteMindboards()
      return { success: true, mindboards }
    } catch (error) {
      console.error('主进程→ 获取收藏的思维板失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
