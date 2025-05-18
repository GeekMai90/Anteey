import { ipcRenderer } from 'electron'
import type { ThemeSettings, GradientPreset, FavoriteGradients } from '@shared/types'

export const themeApi = {
  // 获取主题设置
  getThemeSettings: async (): Promise<ThemeSettings> => {
    try {
      const result = await ipcRenderer.invoke('get-theme-settings')
      if (!result.success) throw new Error(result.error)
      return result.settings
    } catch (error) {
      console.error('预加载脚本 → 获取主题设置失败:', error)
      throw error
    }
  },

  // 更新主题设置
  updateThemeSettings: async (settings: Partial<ThemeSettings>): Promise<ThemeSettings> => {
    try {
      const result = await ipcRenderer.invoke('update-theme-settings', settings)
      if (!result.success) throw new Error(result.error)
      return result.settings
    } catch (error) {
      console.error('预加载脚本 → 更新主题设置失败:', error)
      throw error
    }
  },

  // 获取收藏的渐变
  getFavoriteGradients: async (): Promise<FavoriteGradients> => {
    try {
      const result = await ipcRenderer.invoke('get-favorite-gradients')
      if (!result.success) throw new Error(result.error)
      return result.favorites
    } catch (error) {
      console.error('预加载脚本 → 获取收藏的渐变失败:', error)
      throw error
    }
  },

  // 添加收藏的渐变
  addFavoriteGradient: async (
    gradient: GradientPreset,
    type: 'universal' | 'light' | 'dark'
  ): Promise<FavoriteGradients> => {
    try {
      const result = await ipcRenderer.invoke('add-favorite-gradient', { gradient, type })
      if (!result.success) throw new Error(result.error)
      return result.favorites
    } catch (error) {
      console.error('预加载脚本 → 添加收藏渐变失败:', error)
      throw error
    }
  },

  // 移除收藏的渐变
  removeFavoriteGradient: async (
    gradient: Omit<GradientPreset, 'id'>,
    type: 'universal' | 'light' | 'dark'
  ): Promise<FavoriteGradients> => {
    try {
      const result = await ipcRenderer.invoke('remove-favorite-gradient', { gradient, type })
      if (!result.success) throw new Error(result.error)
      return result.favorites
    } catch (error) {
      console.error('预加载脚本 → 移除收藏渐变失败:', error)
      throw error
    }
  },

  // 监听主题变更事件
  onThemeChanged: (callback: () => void) => {
    ipcRenderer.on('theme-changed', () => {
      console.log('预加载脚本 → 收到主题变更事件')
      callback()
    })
  },

  // 移除主题变更事件监听
  offThemeChanged: (callback: () => void) => {
    ipcRenderer.removeListener('theme-changed', callback)
  }
}
