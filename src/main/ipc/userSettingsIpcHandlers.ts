import { ipcMain, globalShortcut } from 'electron'
import type { UpdateUserSettings } from '@shared/types'
import { BrowserWindow } from 'electron'
import {
  getUserSettings,
  updateUserSettings,
  getAppearanceSettings,
  updateAppearanceSettings,
  updateDefaultPage,
  updateStarredExpanded,
  updateTagsExpanded,
  updateRecentExpanded,
  updateWhiteboardEnabled,
  updateAIAssistantEnabled,
  updateHoverSidebarEnabled,
  updateShowSlimSidebar
} from '../../services/user/userSettingsService'
import type { AppearanceSettings } from '@shared/types'

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

  // 更新默认页面
  ipcMain.handle('update-default-page', async (_event, defaultPage: string) => {
    try {
      const updatedSettings = await updateDefaultPage(defaultPage)
      return { success: true, settings: updatedSettings }
    } catch (error) {
      console.error('主进程→ 更新默认页面失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新侧边栏展开状态
  ipcMain.handle('update-starred-expanded', async (_event, expanded: boolean) => {
    try {
      const updatedSettings = await updateStarredExpanded(expanded)
      return { success: true, settings: updatedSettings }
    } catch (error) {
      console.error('主进程→ 更新星标展开状态失败:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('update-tags-expanded', async (_event, expanded: boolean) => {
    try {
      const updatedSettings = await updateTagsExpanded(expanded)
      return { success: true, settings: updatedSettings }
    } catch (error) {
      console.error('主进程→ 更新标签展开状态失败:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('update-recent-expanded', async (_event, expanded: boolean) => {
    try {
      const updatedSettings = await updateRecentExpanded(expanded)
      return { success: true, settings: updatedSettings }
    } catch (error) {
      console.error('主进程→ 更新最近展开状态失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新白板功能开关
  ipcMain.handle('update-whiteboard-enabled', async (_event, enabled: boolean) => {
    try {
      const updatedSettings = await updateWhiteboardEnabled(enabled)
      return { success: true, settings: updatedSettings }
    } catch (error) {
      console.error('主进程→ 更新白板功能开关失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新 AI 助手功能开关
  ipcMain.handle('update-ai-assistant-enabled', async (_event, enabled: boolean) => {
    try {
      const updatedSettings = await updateAIAssistantEnabled(enabled)
      return { success: true, settings: updatedSettings }
    } catch (error) {
      console.error('主进程→ 更新 AI 助手功能开关失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新悬浮侧边栏功能开关
  ipcMain.handle('update-hover-sidebar-enabled', async (_event, enabled: boolean) => {
    try {
      const updatedSettings = await updateHoverSidebarEnabled(enabled)
      return { success: true, settings: updatedSettings }
    } catch (error) {
      console.error('主进程→ 更新悬浮侧边栏功能开关失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新迷你侧边栏显示状态
  ipcMain.handle('update-show-slim-sidebar', async (_event, enabled: boolean) => {
    try {
      const updatedSettings = await updateShowSlimSidebar(enabled)
      return { success: true, settings: updatedSettings }
    } catch (error) {
      console.error('主进程→ 更新迷你侧边栏显示状态失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
