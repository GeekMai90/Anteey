import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import {
  UserSettings,
  DBUserSettings,
  UpdateUserSettings
} from '../../renderer/src/types/UserSettings'

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
      authorName: 'AntiThink',
      authorMotto: '一起践行终身成长',
      qrcodeUrl: '',
      createdAt: now,
      updatedAt: now
    })
  }
}
