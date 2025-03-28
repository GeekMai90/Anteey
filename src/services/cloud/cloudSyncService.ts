/**
 * @file cloudSyncService.ts
 * @description 云同步服务管理模块
 *
 * 主要功能：
 * 1. 云同步配置管理
 *    - 获取当前配置
 *    - 更新配置
 * 2. 同步服务控制
 *    - 启用/禁用同步服务
 *    - 管理不同类型的同步服务(S3、WebDAV)
 *
 * @author 麦先生
 * @created 2024-03-20
 */

import { db } from '../../db/config'
import { CloudSyncType, CloudSyncConfig, UpdateCloudSyncOptions } from '@shared/types'
import { s3Service } from '../s3/s3Service'
import { webdavService } from '../webdav/webdavService'

/**
 * 数据库中云同步配置记录的接口定义
 * @interface CloudSyncConfigRecord
 * @property {string} id - 配置唯一标识符
 * @property {CloudSyncType} syncType - 同步类型(none/s3/webdav)
 * @property {boolean} enabled - 是否启用同步
 * @property {Date} createdAt - 创建时间
 * @property {Date} updatedAt - 更新时间
 */
interface CloudSyncConfigRecord {
  id: string
  syncType: CloudSyncType
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * 将数据库记录转换为配置对象
 * @param {CloudSyncConfigRecord} record - 数据库记录
 * @returns {CloudSyncConfig} 转换后的配置对象
 */
function convertToConfig(record: CloudSyncConfigRecord): CloudSyncConfig {
  return {
    id: record.id,
    syncType: record.syncType,
    enabled: record.enabled,
    updatedAt: record.updatedAt
  }
}

/**
 * 获取当前云同步配置
 * @async
 * @returns {Promise<CloudSyncConfig | null>} 当前配置或 null
 * @throws {Error} 数据库操作错误
 */
export async function getCurrentConfig(): Promise<CloudSyncConfig | null> {
  try {
    // console.log('服务端→ 开始获取云同步配置')
    const config = await db('cloud_sync_config').first()
    return config ? convertToConfig(config) : null
  } catch (error) {
    console.error('获取云同步配置失败:', error)
    throw error
  }
}

/**
 * 更新云同步配置
 * @async
 * @param {Partial<CloudSyncConfig>} config - 要更新的配置
 * @param {UpdateCloudSyncOptions} [_options] - 更新选项（预留）
 * @returns {Promise<CloudSyncConfig>} 更新后的配置
 * @throws {Error} 配置更新失败时抛出错误
 */
export async function updateConfig(
  config: Partial<CloudSyncConfig>,
  options?: UpdateCloudSyncOptions
): Promise<CloudSyncConfig> {
  try {
    console.log('cloudSyncService → 开始更新云同步配置:', config, options)

    // 如果切换到 none 或者禁用同步，需要停用当前的同步服务
    if (config.syncType === 'none' || config.enabled === false) {
      // 停用所有同步服务
      await Promise.all([s3Service.disableSync(), webdavService.disableSync()])
    }

    // 更新配置
    const [updatedConfig] = await db('cloud_sync_config')
      .update({
        ...config,
        updatedAt: new Date()
      })
      .returning('*')

    if (!updatedConfig) {
      throw new Error('更新云同步配置失败')
    }

    console.log('cloudSyncService → 云同步配置更新成功:', updatedConfig)
    return convertToConfig(updatedConfig)
  } catch (error) {
    console.error('cloudSyncService → 更新云同步配置失败:', error)
    throw error
  }
}
