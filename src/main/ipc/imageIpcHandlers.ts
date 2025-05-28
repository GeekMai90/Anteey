import { ipcMain } from 'electron'
import { ImageService } from '../../services/images/imageService'
import {
  getImageBedSettings,
  getDefaultImageBedConfig
} from '../../services/imageBed/imageBedService'
import { uploadImageToOSS } from '../../services/imageBed/AliyunOSSService'
import type { AliyunOSSConfig } from '../../shared/types/imageBed'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'

const imageService = new ImageService()

// 异步上传图片到图床
async function uploadToImageBedAsync(localPath: string, filePath: string): Promise<void> {
  try {
    // 获取图床设置
    const settings = await getImageBedSettings()
    if (!settings?.enabled || !settings.autoUpload) {
      return
    }

    // 获取默认图床配置
    const defaultConfig = await getDefaultImageBedConfig()
    if (!defaultConfig) {
      console.warn('未找到默认图床配置')
      return
    }

    if (defaultConfig.type === 'aliyun-oss') {
      // 构建OSS配置
      const ossConfig: AliyunOSSConfig = {
        enabled: defaultConfig.enabled,
        accessKeyId: defaultConfig.accessKeyId,
        accessKeySecret: defaultConfig.accessKeySecret,
        bucket: defaultConfig.bucket,
        region: defaultConfig.region,
        endpoint: defaultConfig.endpoint,
        customDomain: defaultConfig.customDomain,
        pathPrefix: defaultConfig.pathPrefix
      }

      // 从本地路径提取文件名
      const fileName = localPath.replace('app-image:///images/', '')
      const result = await uploadImageToOSS(ossConfig, filePath, fileName)

      if (result.success) {
        console.log('图床上传成功:', result.url)
      } else {
        console.error('图床上传失败:', result.error)
      }
    }
  } catch (error) {
    console.error('异步图床上传失败:', error)
  }
}

export function setupImageHandlers() {
  // 上传图片文件（支持双存储）
  ipcMain.handle('upload-image', async (_event, { filePath }: { filePath: string }) => {
    try {
      // 1. 立即保存到本地
      const localPath = await imageService.uploadImage(filePath)

      // 2. 异步上传到图床（如果启用）
      uploadToImageBedAsync(localPath, filePath).catch((error) => {
        console.error('图床上传失败:', error)
      })

      return { success: true, path: localPath }
    } catch (error) {
      console.error('主进程→ 上传图片失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 复制图片到剪贴板
  ipcMain.handle('copy-image', async (_event, imagePath: string) => {
    try {
      const result = await imageService.copyImage(imagePath)
      return result
    } catch (error) {
      console.error('主进程→ 复制图片失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 下载图片
  ipcMain.handle(
    'download-image',
    async (_event, { url, filename }: { url: string; filename: string }) => {
      try {
        const result = await imageService.downloadImage(url, filename)
        return { success: true, path: result.path }
      } catch (error) {
        console.error('主进程→ 下载图片失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 删除图片
  ipcMain.handle('delete-image', async (_event, imagePath: string) => {
    try {
      await imageService.deleteImage(imagePath)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除图片失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 上传图片数据（如剪贴板图片，支持双存储）
  ipcMain.handle('upload-image-data', async (_event, { imageData }: { imageData: ArrayBuffer }) => {
    try {
      const localPath = await imageService.uploadImageData(imageData)

      // 对于图片数据，我们需要先保存到临时文件再上传到图床
      const fileName = localPath.replace('app-image:///images/', '')
      const tempFilePath = path.join(os.tmpdir(), fileName)
      await fs.writeFile(tempFilePath, Buffer.from(imageData))

      // 异步上传到图床
      uploadToImageBedAsync(localPath, tempFilePath).catch((error: any) => {
        console.error('图床上传失败:', error)
        // 清理临时文件
        fs.unlink(tempFilePath).catch(() => {})
      })

      return { success: true, path: localPath }
    } catch (error) {
      console.error('主进程 → 上传图片数据失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取图片真实文件路径
  ipcMain.handle('get-image-real-path', async (_event, fileName: string) => {
    try {
      const realPath = imageService.getImageRealPath(fileName)
      return { success: true, path: realPath }
    } catch (error) {
      console.error('主进程 → 获取图片真实路径失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 检查图片是否存在
  ipcMain.handle('check-image-exists', async (_event, imagePath: string) => {
    try {
      const exists = await imageService.checkImageExists(imagePath)
      return exists
    } catch (error) {
      console.error('主进程 → 检查图片存在性失败:', error)
      return false
    }
  })
}
