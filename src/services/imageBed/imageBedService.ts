import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import type { ImageBedTestResult, ImageBedType } from '../../shared/types'

// ==================== 图床配置管理 ====================

/**
 * 获取所有图床配置
 */
export async function getAllImageBedConfigs(): Promise<any[]> {
  try {
    return await db('image_bed_configs').select('*').orderBy('createdAt', 'desc')
  } catch (error) {
    console.error('获取所有图床配置失败:', error)
    throw error
  }
}

/**
 * 获取启用的图床配置
 */
export async function getEnabledImageBedConfigs(): Promise<any[]> {
  try {
    return await db('image_bed_configs')
      .where('enabled', true)
      .select('*')
      .orderBy('isDefault', 'desc')
      .orderBy('createdAt', 'desc')
  } catch (error) {
    console.error('获取启用的图床配置失败:', error)
    throw error
  }
}

/**
 * 获取默认图床配置
 */
export async function getDefaultImageBedConfig(): Promise<any | null> {
  try {
    // 先查看所有配置的状态
    const allConfigs = await db('image_bed_configs').select('*')
    console.log(
      '所有图床配置:',
      allConfigs.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        enabled: c.enabled,
        isDefault: c.isDefault
      }))
    )

    const config = await db('image_bed_configs')
      .where('enabled', true)
      .where('isDefault', true)
      .first()

    console.log('找到的默认配置:', config)
    return config || null
  } catch (error) {
    console.error('获取默认图床配置失败:', error)
    throw error
  }
}

/**
 * 根据ID获取图床配置
 */
export async function getImageBedConfigById(id: string): Promise<any | null> {
  try {
    const config = await db('image_bed_configs').where('id', id).first()

    return config || null
  } catch (error) {
    console.error('根据ID获取图床配置失败:', { id, error })
    throw error
  }
}

/**
 * 创建图床配置
 */
export async function createImageBedConfig(config: {
  name: string
  type: ImageBedType
  enabled?: boolean
  isDefault?: boolean
  accessKeyId?: string
  accessKeySecret?: string
  secretId?: string
  secretKey?: string
  bucket?: string
  region?: string
  endpoint?: string
  customDomain?: string
  pathPrefix?: string
  extraConfig?: any
}): Promise<string> {
  try {
    const id = uuidv4()
    const now = new Date()

    // 如果设置为默认配置，先取消其他默认配置
    if (config.isDefault) {
      await db('image_bed_configs').update({ isDefault: false })
    }

    await db('image_bed_configs').insert({
      id,
      name: config.name,
      type: config.type,
      enabled: config.enabled ?? true,
      isDefault: config.isDefault ?? false,
      accessKeyId: config.accessKeyId || null,
      accessKeySecret: config.accessKeySecret || null,
      secretId: config.secretId || null,
      secretKey: config.secretKey || null,
      bucket: config.bucket || null,
      region: config.region || null,
      endpoint: config.endpoint || null,
      customDomain: config.customDomain || null,
      pathPrefix: config.pathPrefix || 'images/',
      extraConfig: config.extraConfig ? JSON.stringify(config.extraConfig) : null,
      createdAt: now,
      updatedAt: now,
      lastTestTime: null,
      testResult: null,
      testMessage: null
    })

    console.log('创建图床配置成功:', { id, name: config.name, type: config.type })
    return id
  } catch (error) {
    console.error('创建图床配置失败:', error)
    throw error
  }
}

/**
 * 更新图床配置
 */
export async function updateImageBedConfig(
  id: string,
  updates: {
    name?: string
    enabled?: boolean
    isDefault?: boolean
    accessKeyId?: string
    accessKeySecret?: string
    secretId?: string
    secretKey?: string
    bucket?: string
    region?: string
    endpoint?: string
    customDomain?: string
    pathPrefix?: string
    extraConfig?: any
  }
): Promise<void> {
  try {
    const now = new Date()

    // 如果设置为默认配置，先取消其他默认配置
    if (updates.isDefault) {
      await db('image_bed_configs').whereNot('id', id).update({ isDefault: false })
    }

    const updateData: any = {
      ...updates,
      updatedAt: now
    }

    // 处理 extraConfig
    if (updates.extraConfig !== undefined) {
      updateData.extraConfig = updates.extraConfig ? JSON.stringify(updates.extraConfig) : null
    }

    await db('image_bed_configs').where('id', id).update(updateData)

    console.log('更新图床配置成功:', { id })
  } catch (error) {
    console.error('更新图床配置失败:', { id, error })
    throw error
  }
}

/**
 * 删除图床配置
 */
export async function deleteImageBedConfig(id: string): Promise<void> {
  try {
    await db('image_bed_configs').where('id', id).del()

    console.log('删除图床配置成功:', { id })
  } catch (error) {
    console.error('删除图床配置失败:', { id, error })
    throw error
  }
}

/**
 * 更新配置测试结果
 */
export async function updateImageBedConfigTestResult(
  id: string,
  result: ImageBedTestResult
): Promise<void> {
  try {
    const now = new Date()

    await db('image_bed_configs').where('id', id).update({
      lastTestTime: now,
      testResult: result.success,
      testMessage: result.message,
      updatedAt: now
    })

    console.log('更新图床配置测试结果成功:', { id, success: result.success })
  } catch (error) {
    console.error('更新图床配置测试结果失败:', { id, error })
    throw error
  }
}

// ==================== 图床设置管理 ====================

/**
 * 获取图床设置
 */
export async function getImageBedSettings(): Promise<any | null> {
  try {
    const settings = await db('image_bed_settings').first()
    return settings || null
  } catch (error) {
    console.error('获取图床设置失败:', error)
    throw error
  }
}

/**
 * 更新图床设置
 */
export async function updateImageBedSettings(updates: {
  enabled?: boolean
  displayMode?: 'auto' | 'remote-first' | 'local-only'
  autoUpload?: boolean
  retryCount?: number
  retryDelay?: number
  concurrency?: number
  defaultConfigId?: string | null
}): Promise<void> {
  try {
    const now = new Date()

    const settings = await getImageBedSettings()
    if (!settings) {
      // 如果不存在设置，创建新的
      await db('image_bed_settings').insert({
        id: uuidv4(),
        enabled: updates.enabled ?? false,
        displayMode: updates.displayMode ?? 'auto',
        autoUpload: updates.autoUpload ?? true,
        retryCount: updates.retryCount ?? 3,
        retryDelay: updates.retryDelay ?? 1000,
        concurrency: updates.concurrency ?? 3,
        defaultConfigId: updates.defaultConfigId || null,
        createdAt: now,
        updatedAt: now
      })
      console.log('创建图床设置成功')
    } else {
      // 更新现有设置
      await db('image_bed_settings')
        .where('id', settings.id)
        .update({
          ...updates,
          updatedAt: now
        })
      console.log('更新图床设置成功')
    }
  } catch (error) {
    console.error('更新图床设置失败:', error)
    throw error
  }
}

/**
 * 检查图床功能是否启用
 */
export async function isImageBedEnabled(): Promise<boolean> {
  try {
    const settings = await getImageBedSettings()
    return settings?.enabled ?? false
  } catch (error) {
    console.error('检查图床功能状态失败:', error)
    return false
  }
}

/**
 * 获取默认图床配置ID
 */
export async function getDefaultImageBedConfigId(): Promise<string | null> {
  try {
    const settings = await getImageBedSettings()
    return settings?.defaultConfigId || null
  } catch (error) {
    console.error('获取默认图床配置ID失败:', error)
    return null
  }
}

// ==================== 统计信息 ====================

/**
 * 获取图床统计信息
 */
export async function getImageBedStats(): Promise<{
  totalConfigs: number
  enabledConfigs: number
  configsByType: Record<string, number>
}> {
  try {
    const totalConfigs = await db('image_bed_configs').count('* as count').first()
    const enabledConfigs = await db('image_bed_configs')
      .where('enabled', true)
      .count('* as count')
      .first()

    const configsByTypeResult = await db('image_bed_configs')
      .select('type')
      .count('* as count')
      .groupBy('type')

    const configsByType: Record<string, number> = {}
    configsByTypeResult.forEach((row: any) => {
      configsByType[row.type] = row.count
    })

    return {
      totalConfigs: (totalConfigs as any)?.count || 0,
      enabledConfigs: (enabledConfigs as any)?.count || 0,
      configsByType
    }
  } catch (error) {
    console.error('获取图床统计信息失败:', error)
    throw error
  }
}
