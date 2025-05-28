import {
  ImageMappingInfo,
  ImageBedSettings,
  ImageBedConfig,
  ImageMigrationParams,
  ImageMigrationResult,
  BatchMigrationParams,
  BatchMigrationResult
} from '../../shared/types/imageBed'
import {
  getImageBedSettings,
  updateImageBedSettings,
  getDefaultImageBedConfig
} from './imageBedService'
import {
  uploadImageToOSS,
  deleteImageFromOSS,
  testOSSConnection,
  checkImageExistsInOSS
} from './AliyunOSSService'
import path from 'path'
import fs from 'fs'

// 图片映射缓存 - 通过UUID文件名建立映射关系
const imageMappingCache = new Map<string, ImageMappingInfo>()

/**
 * 从路径中提取UUID文件名
 */
function getFileNameFromPath(imagePath: string): string {
  if (imagePath.startsWith('app-image:///images/')) {
    return imagePath.replace('app-image:///images/', '')
  }
  return path.basename(imagePath)
}

/**
 * 构建本地图片路径
 */
function buildLocalImagePath(fileName: string): string {
  return `app-image:///images/${fileName}`
}

/**
 * 获取图床设置
 */
export async function getImageBedSettingsManager(): Promise<ImageBedSettings | null> {
  try {
    return await getImageBedSettings()
  } catch (error) {
    console.error('获取图床设置失败:', error)
    return null
  }
}

/**
 * 更新图床设置
 */
export async function updateImageBedSettingsManager(
  settings: Partial<ImageBedSettings>
): Promise<boolean> {
  try {
    await updateImageBedSettings(settings)
    return true
  } catch (error) {
    console.error('更新图床设置失败:', error)
    return false
  }
}

/**
 * 获取默认图床配置
 */
export async function getImageBedConfigManager(): Promise<ImageBedConfig | null> {
  try {
    const config = await getDefaultImageBedConfig()
    if (!config) return null

    // 转换数据库配置为标准配置格式
    return config
  } catch (error) {
    console.error('获取图床配置失败:', error)
    return null
  }
}

/**
 * 测试图床连接
 */
export async function testImageBedConnection(): Promise<{
  success: boolean
  message: string
  latency?: number
}> {
  try {
    const config = await getImageBedConfigManager()
    if (!config) {
      return { success: false, message: '图床配置不存在' }
    }

    if (config.type === 'aliyun-oss') {
      return await testOSSConnection({
        enabled: config.enabled,
        accessKeyId: config.accessKeyId || '',
        accessKeySecret: config.accessKeySecret || '',
        bucket: config.bucket || '',
        region: config.region || '',
        endpoint: config.endpoint,
        customDomain: config.customDomain,
        pathPrefix: config.pathPrefix
      })
    }

    return { success: false, message: '不支持的图床类型' }
  } catch (error: any) {
    console.error('测试图床连接失败:', error)
    return { success: false, message: error.message || '连接测试失败' }
  }
}

/**
 * 获取图片映射信息（通过UUID文件名）
 */
export function getImageMappingManager(localPath: string): ImageMappingInfo | null {
  const fileName = getFileNameFromPath(localPath)
  return imageMappingCache.get(fileName) || null
}

/**
 * 设置图片映射信息（通过UUID文件名）
 */
export function setImageMappingManager(mappingInfo: ImageMappingInfo): void {
  const fileName = getFileNameFromPath(mappingInfo.localPath)
  imageMappingCache.set(fileName, mappingInfo)
}

/**
 * 删除图片映射信息（通过UUID文件名）
 */
export function deleteImageMappingManager(localPath: string): void {
  const fileName = getFileNameFromPath(localPath)
  imageMappingCache.delete(fileName)
}

/**
 * 获取图片显示URL - 智能显示逻辑
 */
export async function getImageDisplayUrl(localPath: string): Promise<string> {
  const settings = await getImageBedSettingsManager()

  // 如果图床未启用或设置为仅本地显示，返回本地路径
  if (!settings?.enabled || settings.displayMode === 'local-only') {
    return localPath
  }

  const mapping = getImageMappingManager(localPath)

  // 如果没有映射信息或远程路径，返回本地路径
  if (!mapping || !mapping.remotePath) {
    return localPath
  }

  // 根据显示模式和映射偏好决定显示哪个
  if (
    settings.displayMode === 'remote-first' ||
    (settings.displayMode === 'auto' && mapping.preferRemote)
  ) {
    return mapping.remotePath
  }

  return localPath
}

/**
 * 上传图片到图床
 */
export async function uploadImageToBed(
  localPath: string,
  localFilePath: string
): Promise<{ success: boolean; remotePath?: string; error?: string }> {
  try {
    const config = await getImageBedConfigManager()
    if (!config) {
      return { success: false, error: '图床配置不存在' }
    }

    const fileName = getFileNameFromPath(localPath)

    if (config.type === 'aliyun-oss') {
      const result = await uploadImageToOSS(
        {
          enabled: config.enabled,
          accessKeyId: config.accessKeyId || '',
          accessKeySecret: config.accessKeySecret || '',
          bucket: config.bucket || '',
          region: config.region || '',
          endpoint: config.endpoint,
          customDomain: config.customDomain,
          pathPrefix: config.pathPrefix
        },
        localFilePath,
        fileName
      )

      if (result.success && result.url) {
        // 创建映射信息
        const mappingInfo: ImageMappingInfo = {
          id: fileName.split('.')[0], // UUID部分
          localPath,
          remotePath: result.url,
          uploadStatus: 'uploaded',
          preferRemote: true,
          uploadTime: Date.now(),
          lastSyncTime: Date.now(),
          fileSize: result.size,
          mimeType: getMimeTypeFromFileName(fileName)
        }

        // 保存到内存映射
        setImageMappingManager(mappingInfo)

        return { success: true, remotePath: result.url }
      } else {
        return { success: false, error: result.error || '上传失败' }
      }
    }

    return { success: false, error: '不支持的图床类型' }
  } catch (error: any) {
    console.error('上传图片到图床失败:', error)
    return { success: false, error: error.message || '上传失败' }
  }
}

/**
 * 从图床删除图片
 */
export async function deleteImageFromBed(localPath: string): Promise<boolean> {
  try {
    const mapping = getImageMappingManager(localPath)
    if (!mapping || !mapping.remotePath) {
      return true // 如果没有远程图片，认为删除成功
    }

    const config = await getImageBedConfigManager()
    if (!config) {
      return false
    }

    const fileName = getFileNameFromPath(localPath)

    if (config.type === 'aliyun-oss') {
      const objectName = `images/${fileName}`
      const result = await deleteImageFromOSS(
        {
          enabled: config.enabled,
          accessKeyId: config.accessKeyId || '',
          accessKeySecret: config.accessKeySecret || '',
          bucket: config.bucket || '',
          region: config.region || '',
          endpoint: config.endpoint,
          customDomain: config.customDomain,
          pathPrefix: config.pathPrefix
        },
        objectName
      )

      if (result.success) {
        // 删除映射信息
        deleteImageMappingManager(localPath)
        return true
      }
    }

    return false
  } catch (error) {
    console.error('从图床删除图片失败:', error)
    return false
  }
}

/**
 * 检查远程图片是否存在
 */
export async function checkRemoteImageExists(localPath: string): Promise<boolean> {
  try {
    const mapping = getImageMappingManager(localPath)
    if (!mapping || !mapping.remotePath) {
      return false
    }

    const config = await getImageBedConfigManager()
    if (!config || config.type !== 'aliyun-oss') {
      return false
    }

    const fileName = getFileNameFromPath(localPath)
    const objectName = `images/${fileName}`

    const result = await checkImageExistsInOSS(
      {
        enabled: config.enabled,
        accessKeyId: config.accessKeyId || '',
        accessKeySecret: config.accessKeySecret || '',
        bucket: config.bucket || '',
        region: config.region || '',
        endpoint: config.endpoint,
        customDomain: config.customDomain,
        pathPrefix: config.pathPrefix
      },
      objectName
    )
    return result.exists
  } catch (error) {
    console.error('检查远程图片存在性失败:', error)
    return false
  }
}

/**
 * 迁移单张图片到图床
 */
export async function migrateImageToBed(
  params: ImageMigrationParams
): Promise<ImageMigrationResult> {
  try {
    // 构建本地路径（需要知道文件扩展名，这里假设从实际文件系统获取）
    const localPath = buildLocalImagePath(params.imageId + '.jpg') // 简化处理，实际需要检测扩展名
    const mapping = getImageMappingManager(localPath)

    // 如果已经上传且不强制重新上传，直接返回成功
    if (mapping && mapping.uploadStatus === 'uploaded' && !params.forceReupload) {
      return {
        success: true,
        imageId: params.imageId,
        remotePath: mapping.remotePath
      }
    }

    // 构建本地文件路径（需要根据实际存储位置调整）
    const localFilePath = path.join(process.cwd(), 'images', params.imageId + '.jpg')

    if (!fs.existsSync(localFilePath)) {
      return {
        success: false,
        imageId: params.imageId,
        errorMessage: '本地文件不存在'
      }
    }

    const result = await uploadImageToBed(localPath, localFilePath)

    return {
      success: result.success,
      imageId: params.imageId,
      remotePath: result.remotePath,
      errorMessage: result.error
    }
  } catch (error: any) {
    console.error('迁移图片失败:', error)
    return {
      success: false,
      imageId: params.imageId,
      errorMessage: error.message || '迁移失败'
    }
  }
}

/**
 * 批量迁移图片到图床
 */
export async function batchMigrateImagesToBed(
  params: BatchMigrationParams
): Promise<BatchMigrationResult> {
  const results: ImageMigrationResult[] = []
  const concurrency = params.concurrency || 3
  let completed = 0

  // 分批处理
  for (let i = 0; i < params.imageIds.length; i += concurrency) {
    const batch = params.imageIds.slice(i, i + concurrency)

    const batchPromises = batch.map(async (imageId) => {
      const result = await migrateImageToBed({ imageId })
      completed++

      if (params.onProgress) {
        params.onProgress(completed, params.imageIds.length, imageId)
      }

      return result
    })

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
  }

  const successful = results.filter((r) => r.success).length
  const failed = results.length - successful

  return {
    total: results.length,
    successful,
    failed,
    results
  }
}

/**
 * 获取所有已映射的图片信息
 */
export function getAllImageMappings(): ImageMappingInfo[] {
  return Array.from(imageMappingCache.values())
}

/**
 * 获取指定状态的图片映射
 */
export function getImageMappingsByStatus(
  status: 'local' | 'uploading' | 'uploaded' | 'failed'
): ImageMappingInfo[] {
  return Array.from(imageMappingCache.values()).filter((mapping) => mapping.uploadStatus === status)
}

/**
 * 获取所有需要迁移的图片（本地图片但未上传到图床的）
 */
export function getImagesToMigrate(): string[] {
  const localOnlyMappings = getImageMappingsByStatus('local')
  return localOnlyMappings.map((mapping) => getFileNameFromPath(mapping.localPath).split('.')[0])
}

/**
 * 根据文件名获取MIME类型
 */
function getMimeTypeFromFileName(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  }
  return mimeTypes[ext] || 'image/jpeg'
}

/**
 * 清理映射缓存
 */
export function clearImageMappingCache(): void {
  imageMappingCache.clear()
}

/**
 * 初始化图片映射（应用启动时调用）
 * 可以扫描本地图片目录，检查哪些图片已经上传到图床
 */
export async function initializeImageMappings(): Promise<void> {
  try {
    const settings = await getImageBedSettingsManager()
    if (!settings?.enabled) {
      return
    }

    const config = await getImageBedConfigManager()
    if (!config) {
      return
    }

    // 这里可以实现扫描本地图片目录的逻辑
    // 检查远程图床中是否存在对应的图片
    // 并建立映射关系

    console.log('图片映射初始化完成')
  } catch (error) {
    console.error('初始化图片映射失败:', error)
  }
}
