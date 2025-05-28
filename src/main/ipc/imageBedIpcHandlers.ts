/* eslint-disable @typescript-eslint/no-unused-vars */
import { ipcMain } from 'electron'
import {
  createImageBedConfig,
  updateImageBedConfig,
  deleteImageBedConfig,
  getImageBedConfigById,
  getAllImageBedConfigs,
  getImageBedSettings,
  updateImageBedSettings,
  getImageBedStats
} from '../../services/imageBed/imageBedService'
import {
  testOSSConnection,
  uploadImageToOSS,
  deleteImageFromOSS
} from '../../services/imageBed/AliyunOSSService'
import type { ImageBedSettings, AliyunOSSConfig, ImageBedType } from '../../shared/types/imageBed'

export function setupImageBedHandlers() {
  // 创建图床配置
  ipcMain.handle(
    'create-image-bed-config',
    async (
      _,
      config: {
        name: string
        type: ImageBedType
        enabled?: boolean
        isDefault?: boolean
        accessKeyId?: string
        accessKeySecret?: string
        bucket?: string
        region?: string
        endpoint?: string
        customDomain?: string
        pathPrefix?: string
        extraConfig?: any
      }
    ) => {
      try {
        const result = await createImageBedConfig(config)
        return { success: true, data: result }
      } catch (error) {
        console.error('主进程→ 创建图床配置失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 更新图床配置
  ipcMain.handle(
    'update-image-bed-config',
    async (
      _,
      {
        id,
        config
      }: {
        id: string
        config: {
          name?: string
          enabled?: boolean
          isDefault?: boolean
          accessKeyId?: string
          accessKeySecret?: string
          bucket?: string
          region?: string
          endpoint?: string
          customDomain?: string
          pathPrefix?: string
          extraConfig?: any
        }
      }
    ) => {
      try {
        await updateImageBedConfig(id, config)
        return { success: true }
      } catch (error) {
        console.error('主进程→ 更新图床配置失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 删除图床配置
  ipcMain.handle('delete-image-bed-config', async (_event, id: string) => {
    try {
      await deleteImageBedConfig(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除图床配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取单个图床配置
  ipcMain.handle('get-image-bed-config', async (_event, id: string) => {
    try {
      const result = await getImageBedConfigById(id)
      return { success: true, data: result }
    } catch (error) {
      console.error('主进程→ 获取图床配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取所有图床配置
  ipcMain.handle('get-all-image-bed-configs', async (_event) => {
    try {
      const result = await getAllImageBedConfigs()
      return { success: true, data: result }
    } catch (error) {
      console.error('主进程→ 获取所有图床配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取图床设置
  ipcMain.handle('get-image-bed-settings', async (_event) => {
    try {
      const result = await getImageBedSettings()
      return { success: true, data: result }
    } catch (error) {
      console.error('主进程→ 获取图床设置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新图床设置
  ipcMain.handle(
    'update-image-bed-settings',
    async (_event, settings: Partial<ImageBedSettings>) => {
      try {
        await updateImageBedSettings(settings)
        return { success: true }
      } catch (error) {
        console.error('主进程→ 更新图床设置失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取图床统计信息
  ipcMain.handle('get-image-bed-stats', async (_event) => {
    try {
      const result = await getImageBedStats()
      return { success: true, data: result }
    } catch (error) {
      console.error('主进程→ 获取图床统计信息失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 测试图床连接
  ipcMain.handle('test-image-bed-connection', async (_event, config: AliyunOSSConfig) => {
    try {
      const result = await testOSSConnection(config)
      return { success: true, data: result }
    } catch (error) {
      console.error('主进程→ 测试图床连接失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 上传图片到图床
  ipcMain.handle(
    'upload-image-to-bed',
    async (
      _,
      {
        configId,
        localPath,
        filePath
      }: {
        configId: string
        localPath: string
        filePath: string
      }
    ) => {
      try {
        const configData = await getImageBedConfigById(configId)
        if (!configData) {
          return { success: false, error: '图床配置不存在' }
        }

        if (configData.type === 'aliyun-oss') {
          // 构建OSS配置
          const ossConfig: AliyunOSSConfig = {
            enabled: configData.enabled,
            accessKeyId: configData.accessKeyId,
            accessKeySecret: configData.accessKeySecret,
            bucket: configData.bucket,
            region: configData.region,
            endpoint: configData.endpoint,
            customDomain: configData.customDomain,
            pathPrefix: configData.pathPrefix
          }

          // 从本地路径提取文件名
          const fileName = localPath.replace('app-image:///images/', '')
          const result = await uploadImageToOSS(ossConfig, filePath, fileName)
          return { success: true, data: result }
        } else {
          return { success: false, error: '不支持的图床类型' }
        }
      } catch (error) {
        console.error('主进程→ 上传图片到图床失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 从图床删除图片
  ipcMain.handle(
    'delete-image-from-bed',
    async (
      _,
      {
        configId,
        objectName
      }: {
        configId: string
        objectName: string
      }
    ) => {
      try {
        const configData = await getImageBedConfigById(configId)
        if (!configData) {
          return { success: false, error: '图床配置不存在' }
        }

        if (configData.type === 'aliyun-oss') {
          // 构建OSS配置
          const ossConfig: AliyunOSSConfig = {
            enabled: configData.enabled,
            accessKeyId: configData.accessKeyId,
            accessKeySecret: configData.accessKeySecret,
            bucket: configData.bucket,
            region: configData.region,
            endpoint: configData.endpoint,
            customDomain: configData.customDomain,
            pathPrefix: configData.pathPrefix
          }

          const result = await deleteImageFromOSS(ossConfig, objectName)
          return { success: true, data: result }
        } else {
          return { success: false, error: '不支持的图床类型' }
        }
      } catch (error) {
        console.error('主进程→ 从图床删除图片失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )
}
