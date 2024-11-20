import { ipcMain } from 'electron'
import {
  getAppearanceSettings,
  updateAppearanceSettings
} from '../../services/appearance/appearanceService'
import type { AppearanceSettings } from '../../services/appearance/appearanceService'

export function setupAppearanceHandlers() {
  // 获取外观设置
  ipcMain.handle('get-appearance-settings', async () => {
    try {
      const settings = await getAppearanceSettings()
      return { success: true, settings }
    } catch (error) {
      console.error('主进程→ 获取外观设置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新外观设置
  ipcMain.handle(
    'update-appearance-settings',
    async (_event, settings: Partial<AppearanceSettings>) => {
      try {
        const updatedSettings = await updateAppearanceSettings(settings)
        return { success: true, settings: updatedSettings }
      } catch (error) {
        console.error('主进程→ 更新外观设置失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )
}
