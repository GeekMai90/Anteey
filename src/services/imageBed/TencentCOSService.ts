import COS from 'cos-nodejs-sdk-v5'
import { TencentCOSConfig } from '../../shared/types/imageBed'
import fs from 'fs'

// 图片上传进度接口
export interface ImageUploadProgress {
  loaded: number
  total: number
  percent: number
}

// 图片上传结果接口
export interface ImageUploadResult {
  success: boolean
  url?: string
  objectName?: string
  size?: number
  error?: string
}

// COS客户端实例缓存
let cosClient: COS | null = null
let currentConfig: TencentCOSConfig | null = null

/**
 * 创建COS客户端
 */
function createCOSClient(config: TencentCOSConfig): COS {
  if (cosClient && currentConfig && isConfigEqual(config, currentConfig)) {
    return cosClient
  }

  const cosOptions: any = {
    SecretId: config.secretId,
    SecretKey: config.secretKey
  }

  // 如果有自定义域名，使用自定义的
  if (config.endpoint) {
    cosOptions.Domain = config.endpoint
  }

  cosClient = new COS(cosOptions)
  currentConfig = { ...config }
  return cosClient
}

/**
 * 比较两个配置是否相等
 */
function isConfigEqual(config1: TencentCOSConfig, config2: TencentCOSConfig): boolean {
  return (
    config1.secretId === config2.secretId &&
    config1.secretKey === config2.secretKey &&
    config1.bucket === config2.bucket &&
    config1.region === config2.region &&
    config1.endpoint === config2.endpoint
  )
}

/**
 * 测试COS连接
 */
export async function testCOSConnection(
  config: TencentCOSConfig
): Promise<{ success: boolean; message: string; latency?: number }> {
  const startTime = Date.now()

  try {
    const client = createCOSClient(config)

    // 1. 首先测试基本连接和权限 - 获取存储桶信息
    await new Promise<void>((resolve, reject) => {
      client.headBucket(
        {
          Bucket: config.bucket,
          Region: config.region
        },
        (err: any) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        }
      )
    })

    // 2. 创建一个测试图片缓冲区（1x1像素的PNG）
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    )

    // 3. 生成测试文件名
    const testFileName = `test-connection-${Date.now()}.png`
    const testObjectName = `images/${testFileName}`

    // 4. 尝试上传测试图片
    const uploadResult = await new Promise<any>((resolve, reject) => {
      client.putObject(
        {
          Bucket: config.bucket,
          Region: config.region,
          Key: testObjectName,
          Body: testImageBuffer,
          ContentType: 'image/png'
        },
        (err: any, data: any) => {
          if (err) {
            reject(err)
          } else {
            resolve(data)
          }
        }
      )
    })

    // 5. 验证上传是否成功
    if (!uploadResult || uploadResult.statusCode !== 200) {
      throw new Error('上传成功但状态码异常')
    }

    // 6. 尝试删除测试图片（清理）
    try {
      await new Promise<void>((resolve, reject) => {
        client.deleteObject(
          {
            Bucket: config.bucket,
            Region: config.region,
            Key: testObjectName
          },
          (err: any) => {
            if (err) {
              reject(err)
            } else {
              resolve()
            }
          }
        )
      })
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
    console.error('COS连接测试失败:', error)

    let message = '连接失败'
    if (error.code === 'NoSuchBucket') {
      message = 'Bucket不存在，请检查存储桶名称'
    } else if (error.code === 'InvalidCredentials' || error.code === 'SignatureDoesNotMatch') {
      message = 'SecretId或SecretKey无效，请检查访问密钥'
    } else if (error.code === 'AccessDenied') {
      message = '权限不足，请检查COS权限配置'
    } else if (error.code === 'NoSuchKey') {
      message = '对象不存在'
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
 * 上传图片到COS
 */
export async function uploadImageToCOS(
  config: TencentCOSConfig,
  localFilePath: string,
  fileName: string
): Promise<ImageUploadResult> {
  try {
    const client = createCOSClient(config)

    // 检查本地文件是否存在
    if (!fs.existsSync(localFilePath)) {
      throw new Error('本地文件不存在')
    }

    // 构建COS对象名称，保持与本地相同的文件名
    const objectName = `images/${fileName}`

    // 读取文件内容
    const fileBody = fs.readFileSync(localFilePath)
    const fileStats = fs.statSync(localFilePath)

    // 上传文件
    const result = await new Promise<any>((resolve, reject) => {
      client.putObject(
        {
          Bucket: config.bucket,
          Region: config.region,
          Key: objectName,
          Body: fileBody,
          ContentType: getContentType(fileName)
        },
        (err: any, data: any) => {
          if (err) {
            reject(err)
          } else {
            resolve(data)
          }
        }
      )
    })

    // 验证上传是否成功
    if (!result || result.statusCode !== 200) {
      throw new Error('上传成功但状态码异常')
    }

    // 构建访问URL
    let url: string

    if (config.customDomain) {
      // 使用自定义域名
      url = `https://${config.customDomain}/${objectName}`
    } else {
      // 使用默认域名
      url = `https://${config.bucket}.cos.${config.region}.myqcloud.com/${objectName}`
    }

    return {
      success: true,
      url,
      objectName,
      size: fileStats.size
    }
  } catch (error: any) {
    console.error('COS上传失败:', error)

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
 * 从COS删除图片
 */
export async function deleteImageFromCOS(
  config: TencentCOSConfig,
  objectName: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const client = createCOSClient(config)

    await new Promise<void>((resolve, reject) => {
      client.deleteObject(
        {
          Bucket: config.bucket,
          Region: config.region,
          Key: objectName
        },
        (err: any) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        }
      )
    })

    return {
      success: true,
      message: '删除成功'
    }
  } catch (error: any) {
    console.error('COS删除失败:', error)

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
 * 检查图片是否存在于COS
 */
export async function checkImageExistsInCOS(
  config: TencentCOSConfig,
  objectName: string
): Promise<{ exists: boolean; message?: string }> {
  try {
    const client = createCOSClient(config)

    await new Promise<void>((resolve, reject) => {
      client.headObject(
        {
          Bucket: config.bucket,
          Region: config.region,
          Key: objectName
        },
        (err: any) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        }
      )
    })

    return {
      exists: true
    }
  } catch (error: any) {
    if (error.code === 'NoSuchKey') {
      return {
        exists: false,
        message: '文件不存在'
      }
    }

    return {
      exists: false,
      message: error.message || '检查失败'
    }
  }
}

/**
 * 获取图片信息
 */
export async function getImageInfoFromCOS(
  config: TencentCOSConfig,
  objectName: string
): Promise<{ success: boolean; info?: any; message?: string }> {
  try {
    const client = createCOSClient(config)

    const info = await new Promise<any>((resolve, reject) => {
      client.headObject(
        {
          Bucket: config.bucket,
          Region: config.region,
          Key: objectName
        },
        (err: any, data: any) => {
          if (err) {
            reject(err)
          } else {
            resolve(data)
          }
        }
      )
    })

    return {
      success: true,
      info
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || '获取信息失败'
    }
  }
}

/**
 * 批量上传图片到COS
 */
export async function batchUploadImagesToCOS(
  config: TencentCOSConfig,
  files: Array<{ localPath: string; fileName: string }>,
  onProgress?: (current: number, total: number, currentFile: string) => void
): Promise<Array<{ fileName: string; result: ImageUploadResult }>> {
  const results: Array<{ fileName: string; result: ImageUploadResult }> = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]

    if (onProgress) {
      onProgress(i + 1, files.length, file.fileName)
    }

    const result = await uploadImageToCOS(config, file.localPath, file.fileName)
    results.push({
      fileName: file.fileName,
      result
    })
  }

  return results
}

/**
 * 清除COS客户端缓存
 */
export function clearCOSClientCache(): void {
  cosClient = null
  currentConfig = null
}

/**
 * 根据文件名获取Content-Type
 */
function getContentType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'svg':
      return 'image/svg+xml'
    default:
      return 'application/octet-stream'
  }
}
