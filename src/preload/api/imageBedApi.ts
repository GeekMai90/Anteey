import { ipcRenderer } from 'electron'
import type { ImageBedSettings, AliyunOSSConfig, ImageBedType } from '../../shared/types/imageBed'

export const imageBedApi = {
  // 创建图床配置
  createImageBedConfig: async (config: {
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
  }): Promise<string> => {
    try {
      const result = await ipcRenderer.invoke('create-image-bed-config', config)
      if (!result.success) throw new Error(result.error)
      return result.data
    } catch (error) {
      console.error('预加载脚本 → 创建图床配置失败:', error)
      throw error
    }
  },

  // 更新图床配置
  updateImageBedConfig: async (
    id: string,
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
  ): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('update-image-bed-config', { id, config })
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 更新图床配置失败:', error)
      throw error
    }
  },

  // 删除图床配置
  deleteImageBedConfig: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-image-bed-config', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除图床配置失败:', error)
      throw error
    }
  },

  // 获取单个图床配置
  getImageBedConfig: async (id: string): Promise<any> => {
    try {
      const result = await ipcRenderer.invoke('get-image-bed-config', id)
      if (!result.success) throw new Error(result.error)
      return result.data
    } catch (error) {
      console.error('预加载脚本 → 获取图床配置失败:', error)
      throw error
    }
  },

  // 获取所有图床配置
  getAllImageBedConfigs: async (): Promise<any[]> => {
    try {
      const result = await ipcRenderer.invoke('get-all-image-bed-configs')
      if (!result.success) throw new Error(result.error)
      return result.data
    } catch (error) {
      console.error('预加载脚本 → 获取所有图床配置失败:', error)
      throw error
    }
  },

  // 获取图床设置
  getImageBedSettings: async (): Promise<ImageBedSettings | null> => {
    try {
      const result = await ipcRenderer.invoke('get-image-bed-settings')
      if (!result.success) throw new Error(result.error)
      return result.data
    } catch (error) {
      console.error('预加载脚本 → 获取图床设置失败:', error)
      throw error
    }
  },

  // 更新图床设置
  updateImageBedSettings: async (settings: Partial<ImageBedSettings>): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('update-image-bed-settings', settings)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 更新图床设置失败:', error)
      throw error
    }
  },

  // 获取图床统计信息
  getImageBedStats: async (): Promise<{
    totalConfigs: number
    enabledConfigs: number
    configsByType: Record<string, number>
  }> => {
    try {
      const result = await ipcRenderer.invoke('get-image-bed-stats')
      if (!result.success) throw new Error(result.error)
      return result.data
    } catch (error) {
      console.error('预加载脚本 → 获取图床统计信息失败:', error)
      throw error
    }
  },

  // 测试图床连接
  testImageBedConnection: async (
    config: AliyunOSSConfig
  ): Promise<{
    success: boolean
    message: string
    latency?: number
  }> => {
    try {
      const result = await ipcRenderer.invoke('test-image-bed-connection', config)
      if (!result.success) throw new Error(result.error)
      return result.data
    } catch (error) {
      console.error('预加载脚本 → 测试图床连接失败:', error)
      throw error
    }
  },

  // 上传图片到图床
  uploadImageToBed: async (
    configId: string,
    localPath: string,
    filePath: string
  ): Promise<{
    success: boolean
    url?: string
    objectName?: string
    size?: number
    error?: string
  }> => {
    try {
      const result = await ipcRenderer.invoke('upload-image-to-bed', {
        configId,
        localPath,
        filePath
      })
      if (!result.success) throw new Error(result.error)
      return result.data
    } catch (error) {
      console.error('预加载脚本 → 上传图片到图床失败:', error)
      throw error
    }
  },

  // 从图床删除图片
  deleteImageFromBed: async (
    configId: string,
    objectName: string
  ): Promise<{
    success: boolean
    message?: string
  }> => {
    try {
      const result = await ipcRenderer.invoke('delete-image-from-bed', { configId, objectName })
      if (!result.success) throw new Error(result.error)
      return result.data
    } catch (error) {
      console.error('预加载脚本 → 从图床删除图片失败:', error)
      throw error
    }
  }
}
