import { db } from '../../db/config'

export interface AppearanceSettings {
  id: string
  uiFont: string
  editorFont: string
  defaultPage: string
  starredExpanded: boolean
  tagsExpanded: boolean
  recentExpanded: boolean
  enableWhiteboard: boolean
  enableAIAssistant: boolean
  createdAt: Date
  updatedAt: Date
}

// 获取外观设置
export async function getAppearanceSettings(): Promise<AppearanceSettings> {
  try {
    const settings = await db('appearance_settings').first()
    return settings
  } catch (error) {
    console.error('后端→ 获取外观设置失败:', error)
    throw error
  }
}

// 更新外观设置
export async function updateAppearanceSettings(
  settings: Partial<AppearanceSettings>
): Promise<AppearanceSettings> {
  try {
    const [updatedSettings] = await db('appearance_settings')
      .update({
        ...settings,
        updatedAt: new Date()
      })
      .returning('*')

    return updatedSettings
  } catch (error) {
    console.error('后端→ 更新外观设置失败:', error)
    throw error
  }
}

// 更新默认页面设置
export async function updateDefaultPage(defaultPage: string): Promise<AppearanceSettings> {
  return updateAppearanceSettings({ defaultPage })
}

// 更新侧边栏展开状态
export async function updateStarredExpanded(expanded: boolean): Promise<AppearanceSettings> {
  return updateAppearanceSettings({ starredExpanded: expanded })
}

export async function updateTagsExpanded(expanded: boolean): Promise<AppearanceSettings> {
  return updateAppearanceSettings({ tagsExpanded: expanded })
}

export async function updateRecentExpanded(expanded: boolean): Promise<AppearanceSettings> {
  return updateAppearanceSettings({ recentExpanded: expanded })
}

// 添加新的更新函数
export async function updateWhiteboardEnabled(enabled: boolean): Promise<AppearanceSettings> {
  return updateAppearanceSettings({ enableWhiteboard: enabled })
}

export async function updateAIAssistantEnabled(enabled: boolean): Promise<AppearanceSettings> {
  return updateAppearanceSettings({ enableAIAssistant: enabled })
}
