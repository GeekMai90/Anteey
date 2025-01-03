import { ipcMain } from 'electron'
import {
  getAppearanceSettings,
  updateAppearanceSettings,
  updateDefaultPage,
  updateStarredExpanded,
  updateTagsExpanded,
  updateRecentExpanded,
  updateWhiteboardEnabled,
  updateAIAssistantEnabled
} from '../../services/appearance/appearanceService'
import type { AppearanceSettings } from '@shared/types'

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
}
