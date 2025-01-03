import { ipcMain, globalShortcut } from 'electron'
import type { UpdateUserSettings } from '@shared/types'
import { getUserSettings, updateUserSettings } from '../../services/user/userSettings'
import { BrowserWindow } from 'electron'

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
  // 更新全局快捷键
  ipcMain.handle('update-global-hotkey', async (_event, newHotkey: string) => {
    try {
      console.log('正在注册快捷键:', newHotkey)

      // 先注销现有的快捷键
      globalShortcut.unregisterAll()

      // 如果是空字符串，表示删除快捷键
      if (!newHotkey) {
        await updateUserSettings({ globalHotkey: '' } as UpdateUserSettings)
        return { success: true }
      }

      // 验证快捷键格式
      const validFormat =
        /^(CommandOrControl|Alt|Shift)(\+(CommandOrControl|Alt|Shift))*\+[A-Z0-9]$/
      if (!validFormat.test(newHotkey)) {
        return {
          success: false,
          error: '无效的快捷键格式'
        }
      }

      // 尝试注册新的快捷键
      const success = globalShortcut.register(newHotkey, () => {
        const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
        if (win) {
          if (win.isVisible()) {
            win.hide()
          } else {
            win.show()
            win.focus()
          }
        }
      })

      if (!success) {
        return {
          success: false,
          error: '快捷键已被其他应用占用'
        }
      }

      // 保存到设置
      await updateUserSettings({
        globalHotkey: newHotkey
      } as UpdateUserSettings)

      return { success: true }
    } catch (error) {
      console.error('更新全局快捷键失败:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  })
}
