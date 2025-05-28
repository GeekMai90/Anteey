import OSS from 'ali-oss'
import { AliyunOSSConfig } from '../../shared/types/imageBed'
import fs from 'fs'

// 图片上传进度接口
export interface ImageUploadProgress {
  loaded: number
  total: number
  percent: number
}

// 图片上传结果接口（扩展自基础结果）
export interface ImageUploadResult {
  success: boolean
  url?: string
  objectName?: string
  size?: number
  error?: string
}

// OSS客户端实例缓存
let ossClient: OSS | null = null
let currentConfig: AliyunOSSConfig | null = null

/**
 * 创建OSS客户端
 */
function createOSSClient(config: AliyunOSSConfig): OSS {
  if (ossClient && currentConfig && isConfigEqual(config, currentConfig)) {
    return ossClient
  }

  const clientConfig: OSS.Options = {
    region: config.region,
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    bucket: config.bucket
  }

  // 如果有自定义endpoint，使用自定义的
  if (config.endpoint) {
    clientConfig.endpoint = config.endpoint
  }

  ossClient = new OSS(clientConfig)
  currentConfig = { ...config }

  return ossClient
}

/**
 * 比较两个配置是否相等
 */
function isConfigEqual(config1: AliyunOSSConfig, config2: AliyunOSSConfig): boolean {
  return (
    config1.accessKeyId === config2.accessKeyId &&
    config1.accessKeySecret === config2.accessKeySecret &&
    config1.bucket === config2.bucket &&
    config1.region === config2.region &&
    config1.endpoint === config2.endpoint
  )
}

/**
 * 测试OSS连接
 */
export async function testOSSConnection(
  config: AliyunOSSConfig
): Promise<{ success: boolean; message: string; latency?: number }> {
  const startTime = Date.now()

  try {
    const client = createOSSClient(config)

    // 1. 首先测试基本连接和权限
    await client.getBucketInfo(config.bucket)

    // 2. 创建一个测试图片缓冲区（1x1像素的PNG）
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    )

    // 3. 生成测试文件名
    const testFileName = `test-connection-${Date.now()}.png`
    const testObjectName = `images/${testFileName}`

    // 4. 尝试上传测试图片
    const uploadResult = await client.put(testObjectName, testImageBuffer)

    // 5. 验证上传是否成功
    if (!uploadResult.url) {
      throw new Error('上传成功但未返回URL')
    }

    // 6. 尝试删除测试图片（清理）
    try {
      await client.delete(testObjectName)
    } catch (deleteError) {
      console.warn('删除测试图片失败，但不影响连接测试结果:', deleteError)
    }

    const endTime = Date.now()
    const latency = endTime - startTime

    return {
      success: true,
      message: `连接测试成功，延迟: ${latency}ms`,
      latency
    }
  } catch (error: any) {
    console.error('OSS连接测试失败:', error)

    let message = '连接失败'
    if (error.code === 'NoSuchBucket') {
      message = 'Bucket不存在，请检查存储桶名称'
    } else if (error.code === 'InvalidAccessKeyId') {
      message = 'AccessKeyId无效，请检查访问密钥'
    } else if (error.code === 'SignatureDoesNotMatch') {
      message = 'AccessKeySecret无效，请检查访问密钥'
    } else if (error.code === 'Forbidden') {
      message = '权限不足，请检查OSS权限配置'
    } else if (error.code === 'AccessDenied') {
      message = '访问被拒绝，请检查Bucket权限'
    } else if (error.message) {
      message = `连接失败: ${error.message}`
    }

    const endTime = Date.now()
    const latency = endTime - startTime

    return {
      success: false,
      message,
      latency
    }
  }
}

/**
 * 上传图片到OSS
 */
export async function uploadImageToOSS(
  config: AliyunOSSConfig,
  localFilePath: string,
  fileName: string
): Promise<ImageUploadResult> {
  try {
    const client = createOSSClient(config)

    // 检查本地文件是否存在
    if (!fs.existsSync(localFilePath)) {
      throw new Error('本地文件不存在')
    }

    // 构建OSS对象名称，保持与本地相同的文件名
    const objectName = `images/${fileName}`

    // 上传文件
    const result = await client.put(objectName, localFilePath)

    // 构建访问URL
    let url = result.url

    // 如果配置了自定义域名，替换URL
    if (config.customDomain) {
      const urlObj = new URL(result.url)
      url = `https://${config.customDomain}${urlObj.pathname}`
    }

    return {
      success: true,
      url,
      objectName,
      size: fs.statSync(localFilePath).size
    }
  } catch (error: any) {
    console.error('OSS上传失败:', error)

    let message = '上传失败'
    if (error.code === 'NoSuchBucket') {
      message = 'Bucket不存在'
    } else if (error.code === 'AccessDenied') {
      message = '权限不足'
    } else if (error.code === 'InvalidObjectName') {
      message = '文件名无效'
    } else if (error.message) {
      message = error.message
    }

    return {
      success: false,
      error: message
    }
  }
}

/**
 * 从OSS删除图片
 */
export async function deleteImageFromOSS(
  config: AliyunOSSConfig,
  objectName: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const client = createOSSClient(config)

    await client.delete(objectName)

    return {
      success: true
    }
  } catch (error: any) {
    console.error('OSS删除失败:', error)

    let message = '删除失败'
    if (error.code === 'NoSuchKey') {
      message = '文件不存在'
    } else if (error.code === 'AccessDenied') {
      message = '权限不足'
    } else if (error.message) {
      message = error.message
    }

    return {
      success: false,
      message
    }
  }
}

/**
 * 检查OSS中的图片是否存在
 */
export async function checkImageExistsInOSS(
  config: AliyunOSSConfig,
  objectName: string
): Promise<{ exists: boolean; message?: string }> {
  try {
    const client = createOSSClient(config)

    await client.head(objectName)

    return {
      exists: true
    }
  } catch (error: any) {
    if (error.code === 'NoSuchKey') {
      return {
        exists: false
      }
    }

    console.error('OSS检查文件存在性失败:', error)
    return {
      exists: false,
      message: error.message || '检查失败'
    }
  }
}

/**
 * 获取OSS中图片的信息
 */
export async function getImageInfoFromOSS(
  config: AliyunOSSConfig,
  objectName: string
): Promise<{ success: boolean; info?: any; message?: string }> {
  try {
    const client = createOSSClient(config)

    const result = await client.head(objectName)

    const headers = result.res.headers as any
    return {
      success: true,
      info: {
        size: parseInt(headers['content-length'] || '0'),
        lastModified: headers['last-modified'],
        etag: headers.etag,
        contentType: headers['content-type']
      }
    }
  } catch (error: any) {
    console.error('OSS获取文件信息失败:', error)

    let message = '获取信息失败'
    if (error.code === 'NoSuchKey') {
      message = '文件不存在'
    } else if (error.message) {
      message = error.message
    }

    return {
      success: false,
      message
    }
  }
}

/**
 * 批量上传图片到OSS
 */
export async function batchUploadImagesToOSS(
  config: AliyunOSSConfig,
  files: Array<{ localPath: string; fileName: string }>,
  onProgress?: (current: number, total: number, currentFile: string) => void
): Promise<Array<{ fileName: string; result: ImageUploadResult }>> {
  const results: Array<{ fileName: string; result: ImageUploadResult }> = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]

    if (onProgress) {
      onProgress(i + 1, files.length, file.fileName)
    }

    const result = await uploadImageToOSS(config, file.localPath, file.fileName)
    results.push({
      fileName: file.fileName,
      result
    })

    // 如果上传失败，可以选择继续或停止
    // 这里选择继续上传其他文件
  }

  return results
}

/**
 * 清理OSS客户端缓存
 */
export function clearOSSClientCache(): void {
  ossClient = null
  currentConfig = null
}
