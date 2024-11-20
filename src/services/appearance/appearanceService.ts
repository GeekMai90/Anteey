import { db } from '../../db/config'

export interface AppearanceSettings {
  id: string
  uiFont: string
  editorFont: string
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
