import { ipcMain } from 'electron'
import {
  getThemeSettings,
  updateThemeSettings,
  getFavoriteGradients,
  addFavoriteGradient,
  removeFavoriteGradient
} from '../../services/theme/themeService'
import type { ThemeSettings, GradientPreset } from '@shared/types'

export function setupThemeHandlers() {
  // 获取主题设置
  ipcMain.handle('get-theme-settings', async () => {
    try {
      const settings = await getThemeSettings()
      return { success: true, settings }
    } catch (error) {
      console.error('主进程→ 获取主题设置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新主题设置
  ipcMain.handle('update-theme-settings', async (_event, settings: Partial<ThemeSettings>) => {
    try {
      const updatedSettings = await updateThemeSettings(settings)
      return { success: true, settings: updatedSettings }
    } catch (error) {
      console.error('主进程→ 更新主题设置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取收藏的渐变
  ipcMain.handle('get-favorite-gradients', async () => {
    try {
      const favorites = await getFavoriteGradients()
      return { success: true, favorites }
    } catch (error) {
      console.error('主进程→ 获取收藏的渐变失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 添加收藏的渐变
  ipcMain.handle(
    'add-favorite-gradient',
    async (
      _event,
      { gradient, type }: { gradient: GradientPreset; type: 'universal' | 'light' | 'dark' }
    ) => {
      try {
        const updatedFavorites = await addFavoriteGradient(gradient, type)
        return { success: true, favorites: updatedFavorites }
      } catch (error) {
        console.error('主进程→ 添加收藏渐变失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 移除收藏的渐变
  ipcMain.handle(
    'remove-favorite-gradient',
    async (
      _event,
      {
        gradient,
        type
      }: { gradient: Omit<GradientPreset, 'id'>; type: 'universal' | 'light' | 'dark' }
    ) => {
      try {
        const updatedFavorites = await removeFavoriteGradient(gradient, type)
        return { success: true, favorites: updatedFavorites }
      } catch (error) {
        console.error('主进程→ 移除收藏渐变失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )
}
