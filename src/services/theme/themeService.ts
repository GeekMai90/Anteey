import { db } from '../../db/config'
import type { ThemeSettings, FavoriteGradients, GradientPreset } from '@shared/types'

// 工具函数：将数据库记录转换为 ThemeSettings 对象
function convertToThemeSettings(record: any): ThemeSettings {
  return {
    ...record,
    universalGradient: record.universalGradient ? JSON.parse(record.universalGradient) : undefined,
    lightGradient: record.lightGradient ? JSON.parse(record.lightGradient) : undefined,
    darkGradient: record.darkGradient ? JSON.parse(record.darkGradient) : undefined,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt)
  }
}

// 工具函数：将数据库记录转换为 FavoriteGradients 对象
function convertToFavoriteGradients(record: any): FavoriteGradients {
  return {
    ...record,
    universalGradients: JSON.parse(record.universalGradients),
    lightGradients: JSON.parse(record.lightGradients),
    darkGradients: JSON.parse(record.darkGradients),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt)
  }
}

// 获取主题设置
export async function getThemeSettings(): Promise<ThemeSettings> {
  try {
    const settings = await db('theme_settings').first()
    if (!settings) {
      throw new Error('主题设置不存在')
    }
    return convertToThemeSettings(settings)
  } catch (error) {
    console.error('获取主题设置失败:', error)
    throw error
  }
}

// 更新主题设置
export async function updateThemeSettings(
  settings: Partial<ThemeSettings>
): Promise<ThemeSettings> {
  try {
    const dataToUpdate: Record<string, any> = {
      ...settings,
      updatedAt: new Date()
    }

    // 序列化 JSON 字段
    if (dataToUpdate.universalGradient) {
      dataToUpdate.universalGradient = JSON.stringify(dataToUpdate.universalGradient)
    }
    if (dataToUpdate.lightGradient) {
      dataToUpdate.lightGradient = JSON.stringify(dataToUpdate.lightGradient)
    }
    if (dataToUpdate.darkGradient) {
      dataToUpdate.darkGradient = JSON.stringify(dataToUpdate.darkGradient)
    }

    const [updated] = await db('theme_settings').update(dataToUpdate).returning('*')

    return convertToThemeSettings(updated)
  } catch (error) {
    console.error('更新主题设置失败:', error)
    throw error
  }
}

// 获取收藏的渐变
export async function getFavoriteGradients(): Promise<FavoriteGradients> {
  try {
    const favorites = await db('favorite_gradients').first()
    if (!favorites) {
      throw new Error('收藏的渐变不存在')
    }
    return convertToFavoriteGradients(favorites)
  } catch (error) {
    console.error('获取收藏的渐变失败:', error)
    throw error
  }
}

// 添加收藏的渐变
export async function addFavoriteGradient(
  gradient: GradientPreset,
  type: 'universal' | 'light' | 'dark'
): Promise<FavoriteGradients> {
  try {
    const favorites = await getFavoriteGradients()
    const arrayKey = `${type}Gradients` as keyof Pick<
      FavoriteGradients,
      'universalGradients' | 'lightGradients' | 'darkGradients'
    >

    // 检查是否已存在相同的渐变
    const existingGradients = favorites[arrayKey]
    const isDuplicate = existingGradients.some(
      (g) =>
        g.startColor === gradient.startColor &&
        g.endColor === gradient.endColor &&
        g.angle === gradient.angle &&
        g.noiseAmount === gradient.noiseAmount
    )

    if (isDuplicate) {
      throw new Error('该渐变已经收藏')
    }

    // 添加新渐变
    const updatedGradients = [
      ...existingGradients,
      { ...gradient, id: existingGradients.length + 1 }
    ]

    const [updated] = await db('favorite_gradients')
      .update({
        [`${type}Gradients`]: JSON.stringify(updatedGradients),
        updatedAt: new Date()
      })
      .returning('*')

    return convertToFavoriteGradients(updated)
  } catch (error) {
    console.error('添加收藏渐变失败:', error)
    throw error
  }
}

// 移除收藏的渐变
export async function removeFavoriteGradient(
  gradient: Omit<GradientPreset, 'id'>,
  type: 'universal' | 'light' | 'dark'
): Promise<FavoriteGradients> {
  try {
    const favorites = await getFavoriteGradients()
    const arrayKey = `${type}Gradients` as keyof Pick<
      FavoriteGradients,
      'universalGradients' | 'lightGradients' | 'darkGradients'
    >

    const updatedGradients = favorites[arrayKey].filter(
      (g) =>
        g.startColor !== gradient.startColor ||
        g.endColor !== gradient.endColor ||
        g.angle !== gradient.angle ||
        g.noiseAmount !== gradient.noiseAmount
    )

    const [updated] = await db('favorite_gradients')
      .update({
        [`${type}Gradients`]: JSON.stringify(updatedGradients),
        updatedAt: new Date()
      })
      .returning('*')

    return convertToFavoriteGradients(updated)
  } catch (error) {
    console.error('移除收藏渐变失败:', error)
    throw error
  }
}
