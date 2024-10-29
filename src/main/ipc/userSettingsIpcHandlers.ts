import { ipcMain } from 'electron'
import { UpdateUserSettings } from '../../renderer/src/types/UserSettings'
import { getUserSettings, updateUserSettings } from '../../db/userSettings'

export function setupUserSettingsHandlers() {
  // 更新用户设置
  ipcMain.handle('update-user-settings', async (_, settings: UpdateUserSettings) => {
    try {
      const updatedSettings = await updateUserSettings(settings)
      return updatedSettings
    } catch (error) {
      console.error('主进程 → 更新用户设置失败:', error)
      throw error
    }
  })
  // 获取用户设置
  ipcMain.handle('get-user-settings', async () => {
    try {
      const settings = await getUserSettings()
      return settings
    } catch (error) {
      console.error('主进程 → 获取用户设置失败:', error)
      throw error
    }
  })
}
