import { db } from '../../db/config'
import { AppearanceSettings } from '@shared/types'
import { v4 as uuidv4 } from 'uuid'
import { UserSettings, DBUserSettings, UpdateUserSettings } from '@shared/types'

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

// 更新悬浮侧边栏开关
export async function updateHoverSidebarEnabled(enabled: boolean): Promise<AppearanceSettings> {
  return updateAppearanceSettings({ enableHoverSidebar: enabled })
}

// 更新迷你侧边栏显示状态
export async function updateShowSlimSidebar(enabled: boolean): Promise<AppearanceSettings> {
  return updateAppearanceSettings({ showSlimSidebar: enabled })
}

// 将数据库结果转换为前端需要的格式
function transformDBSettings(settings: DBUserSettings): UserSettings {
  // 将时间戳转换为 ISO 字符串
  const createdAt = new Date(Number(settings.createdAt)).toISOString()
  const updatedAt = new Date(Number(settings.updatedAt)).toISOString()

  return {
    ...settings,
    createdAt,
    updatedAt
  }
}

// 获取用户设置
export async function getUserSettings(): Promise<UserSettings> {
  const settings = await db<DBUserSettings>('user_settings').orderBy('createdAt', 'desc').first()

  if (!settings) {
    throw new Error('User settings not found')
  }

  return transformDBSettings(settings)
}

// 更新用户设置
export async function updateUserSettings(settings: UpdateUserSettings): Promise<UserSettings> {
  const currentSettings = await getUserSettings()
  const now = Date.now() // 使用时间戳

  // 更新数据
  await db('user_settings')
    .where('id', currentSettings.id)
    .update({
      ...settings,
      updatedAt: now
    })

  // 查询并返回更新后的数据
  const updatedSettings = await db<DBUserSettings>('user_settings')
    .where('id', currentSettings.id)
    .first()

  if (!updatedSettings) {
    throw new Error('Failed to fetch updated settings')
  }

  return transformDBSettings(updatedSettings)
}

// 初始化默认设置
export async function initializeUserSettings(): Promise<void> {
  const exists = await db('user_settings').first()

  if (!exists) {
    const now = Date.now() // 使用时间戳
    await db('user_settings').insert({
      id: uuidv4(), // 使用固定的 ID
      authorName: 'Anteey',
      authorMotto: '一起践行终身成长',
      qrcodeUrl: '',
      createdAt: now,
      updatedAt: now
    })
  }
}
