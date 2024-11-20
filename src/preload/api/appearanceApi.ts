import { ipcRenderer } from 'electron'
import type { AppearanceSettings } from '../../services/appearance/appearanceService'

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
  }
}
