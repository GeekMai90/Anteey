import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { message } from '../utils/message'
import type {
  ImageBedConfig,
  ImageBedSettings,
  ImageBedTestResult,
  ImageBedUploadResult
} from '@shared/types/imageBed'

export const useImageBedStore = defineStore('imageBed', () => {
  // ==================== 状态 ====================
  const isLoading = ref(false)
  const isUploading = ref(false)
  const isTesting = ref(false)

  // 图床配置
  const configs = ref<ImageBedConfig[]>([])
  const currentConfig = ref<ImageBedConfig | null>(null)

  // 图床设置
  const settings = ref<ImageBedSettings | null>(null)

  // 上传错误记录
  const uploadErrors = ref<Record<string, string>>({})

  // ==================== 计算属性 ====================
  const isEnabled = computed(() => settings.value?.enabled ?? false)
  const hasDefaultConfig = computed(() =>
    configs.value.some((config: any) => config.isDefault && config.enabled)
  )
  const enabledConfigs = computed(() => configs.value.filter((config: any) => config.enabled))

  // ==================== 图床配置管理 ====================

  // 获取所有图床配置
  const getAllConfigs = async () => {
    try {
      isLoading.value = true
      configs.value = await window.electronAPI.imageBed.getAllImageBedConfigs()
    } catch (error) {
      console.error('获取图床配置失败:', error)
      message.error('获取图床配置失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 创建图床配置
  const createConfig = async (config: {
    name: string
    type: 'aliyun-oss' | 'tencent-cos'
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
  }) => {
    try {
      isLoading.value = true
      const configId = await window.electronAPI.imageBed.createImageBedConfig(config)
      await getAllConfigs() // 刷新配置列表
      return configId
    } catch (error) {
      console.error('创建图床配置失败:', error)
      message.error('创建图床配置失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 更新图床配置
  const updateConfig = async (
    id: string,
    config: {
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
  ) => {
    try {
      isLoading.value = true
      await window.electronAPI.imageBed.updateImageBedConfig(id, config)
      await getAllConfigs() // 刷新配置列表
    } catch (error) {
      console.error('更新图床配置失败:', error)
      message.error('更新图床配置失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 删除图床配置
  const deleteConfig = async (id: string) => {
    try {
      isLoading.value = true
      await window.electronAPI.imageBed.deleteImageBedConfig(id)
      await getAllConfigs() // 刷新配置列表
    } catch (error) {
      console.error('删除图床配置失败:', error)
      message.error('删除图床配置失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 测试图床连接
  const testConnection = async (config: ImageBedConfig): Promise<ImageBedTestResult> => {
    try {
      isTesting.value = true

      let result: ImageBedTestResult

      if (config.type === 'aliyun-oss') {
        // 构建阿里云OSS配置
        const ossConfig = {
          enabled: true,
          accessKeyId: config.accessKeyId || '',
          accessKeySecret: config.accessKeySecret || '',
          bucket: config.bucket || '',
          region: config.region || '',
          endpoint: config.endpoint,
          customDomain: config.customDomain,
          pathPrefix: config.pathPrefix
        }
        result = await window.electronAPI.imageBed.testImageBedConnection(ossConfig, config.type)
      } else if (config.type === 'tencent-cos') {
        // 构建腾讯云COS配置
        const cosConfig = {
          enabled: true,
          secretId: config.secretId || '',
          secretKey: config.secretKey || '',
          bucket: config.bucket || '',
          region: config.region || '',
          endpoint: config.endpoint,
          customDomain: config.customDomain,
          pathPrefix: config.pathPrefix
        }
        result = await window.electronAPI.imageBed.testImageBedConnection(cosConfig, config.type)
      } else {
        throw new Error('不支持的图床类型')
      }

      return result
    } catch (error) {
      console.error('测试图床连接失败:', error)
      throw error
    } finally {
      isTesting.value = false
    }
  }

  // ==================== 图床设置管理 ====================

  // 获取图床设置
  const getSettings = async () => {
    try {
      settings.value = await window.electronAPI.imageBed.getImageBedSettings()
    } catch (error) {
      console.error('获取图床设置失败:', error)
      throw error
    }
  }

  // 更新图床设置
  const updateSettings = async (newSettings: Partial<ImageBedSettings>) => {
    try {
      isLoading.value = true
      await window.electronAPI.imageBed.updateImageBedSettings(newSettings)
      await getSettings() // 刷新设置
      message.success('更新图床设置成功')
    } catch (error) {
      console.error('更新图床设置失败:', error)
      message.error('更新图床设置失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // ==================== 图片上传管理 ====================

  // 上传图片到图床（简化版本）
  const uploadImageToBed = async (
    configId: string,
    localPath: string,
    filePath: string
  ): Promise<ImageBedUploadResult> => {
    try {
      isUploading.value = true

      const result = await window.electronAPI.imageBed.uploadImageToBed(
        configId,
        localPath,
        filePath
      )

      return result
    } catch (error) {
      console.error('上传图片到图床失败:', error)
      throw error
    } finally {
      isUploading.value = false
    }
  }

  // 清除上传错误
  const clearUploadErrors = () => {
    uploadErrors.value = {}
  }

  // 标记远程图片失效
  const markRemoteImageFailed = async (remoteUrl: string, localPath: string) => {
    try {
      // 这里可以记录失效的远程图片信息
      console.log('标记远程图片失效:', {
        remoteUrl,
        localPath,
        timestamp: new Date().toISOString()
      })

      // 可以在这里添加更多的失效处理逻辑，比如：
      // 1. 记录到本地存储
      // 2. 更新映射状态
      // 3. 通知用户
    } catch (error) {
      console.error('标记远程图片失效失败:', error)
    }
  }

  // 初始化数据
  const initialize = async () => {
    try {
      await Promise.all([getAllConfigs(), getSettings()])
    } catch (error) {
      console.error('初始化图床数据失败:', error)
    }
  }

  return {
    // 状态
    isLoading,
    isUploading,
    isTesting,
    configs,
    currentConfig,
    settings,
    uploadErrors,

    // 计算属性
    isEnabled,
    hasDefaultConfig,
    enabledConfigs,

    // 配置管理
    getAllConfigs,
    createConfig,
    updateConfig,
    deleteConfig,
    testConnection,

    // 设置管理
    getSettings,
    updateSettings,

    // 上传管理
    uploadImageToBed,

    // 工具方法
    clearUploadErrors,
    markRemoteImageFailed,
    initialize
  }
})
