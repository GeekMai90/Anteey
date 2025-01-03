import { ipcRenderer } from 'electron'
import type { AppearanceSettings } from '@shared/types'

export const appearanceApi = {
  // 获取外观设置
  getAppearanceSettings: async (): Promise<AppearanceSettings> => {
    try {
      const result = await ipcRenderer.invoke('get-appearance-settings')
      if (!result.success) throw new Error(result.error)
      return result.settings
    } catch (error) {
      console.error('预加载脚本 → 获取外观设置失败:', error)
      throw error
    }
  },

  // 更新外观设置
  updateAppearanceSettings: async (
    settings: Partial<AppearanceSettings>
  ): Promise<AppearanceSettings> => {
    try {
      const result = await ipcRenderer.invoke('update-appearance-settings', settings)
      if (!result.success) throw new Error(result.error)
      return result.settings
    } catch (error) {
      console.error('预加载脚本 → 更新外观设置失败:', error)
      throw error
    }
  },

  // 更新默认页面
  updateDefaultPage: async (defaultPage: string): Promise<AppearanceSettings> => {
    try {
      const result = await ipcRenderer.invoke('update-default-page', defaultPage)
      if (!result.success) throw new Error(result.error)
      return result.settings
    } catch (error) {
      console.error('预加载脚本 → 更新默认页面失败:', error)
      throw error
    }
  },

  // 更新侧边栏展开状态
  updateStarredExpanded: async (expanded: boolean): Promise<AppearanceSettings> => {
    try {
      const result = await ipcRenderer.invoke('update-starred-expanded', expanded)
      if (!result.success) throw new Error(result.error)
      return result.settings
    } catch (error) {
      console.error('预加载脚本 → 更新星标展开状态失败:', error)
      throw error
    }
  },

  updateTagsExpanded: async (expanded: boolean): Promise<AppearanceSettings> => {
    try {
      const result = await ipcRenderer.invoke('update-tags-expanded', expanded)
      if (!result.success) throw new Error(result.error)
      return result.settings
    } catch (error) {
      console.error('预加载脚本 → 更新标签展开状态失败:', error)
      throw error
    }
  },

  updateRecentExpanded: async (expanded: boolean): Promise<AppearanceSettings> => {
    try {
      const result = await ipcRenderer.invoke('update-recent-expanded', expanded)
      if (!result.success) throw new Error(result.error)
      return result.settings
    } catch (error) {
      console.error('预加载脚本 → 更新最近展开状态失败:', error)
      throw error
    }
  },

  // 更新白板功能开关
  updateWhiteboardEnabled: async (enabled: boolean): Promise<AppearanceSettings> => {
    try {
      const result = await ipcRenderer.invoke('update-whiteboard-enabled', enabled)
      if (!result.success) throw new Error(result.error)
      return result.settings
    } catch (error) {
      console.error('预加载脚本 → 更新白板功能开关失败:', error)
      throw error
    }
  },

  // 更新 AI 助手功能开关
  updateAIAssistantEnabled: async (enabled: boolean): Promise<AppearanceSettings> => {
    try {
      const result = await ipcRenderer.invoke('update-ai-assistant-enabled', enabled)
      if (!result.success) throw new Error(result.error)
      return result.settings
    } catch (error) {
      console.error('预加载脚本 → 更新 AI 助手功能开关失败:', error)
      throw error
    }
  }
}
