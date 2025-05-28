import { ipcRenderer } from 'electron'

export const imageApi = {
  // 上传图片文件
  uploadImage: async (filePath: string): Promise<string> => {
    try {
      const result = await ipcRenderer.invoke('upload-image', { filePath })
      if (!result.success) throw new Error(result.error)
      return result.path
    } catch (error) {
      console.error('预加载脚本 → 上传图片失败:', error)
      throw error
    }
  },

  // 复制图片到剪贴板
  copyImage: async (imagePath: string): Promise<{ success: boolean; message: string }> => {
    try {
      const result = await ipcRenderer.invoke('copy-image', imagePath)
      if (!result.success) throw new Error(result.error)
      return result
    } catch (error) {
      console.error('预加载脚本 → 复制图片失败:', error)
      throw error
    }
  },

  // 下载图片
  downloadImage: async (url: string, filename: string): Promise<{ path: string }> => {
    try {
      const result = await ipcRenderer.invoke('download-image', { url, filename })
      if (!result.success) throw new Error(result.error)
      return { path: result.path }
    } catch (error) {
      console.error('预加载脚本 → 下载图片失败:', error)
      throw error
    }
  },

  // 删除图片
  deleteImage: async (imagePath: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-image', imagePath)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除图片失败:', error)
      throw error
    }
  },

  // 上传图片数据（如剪贴板图片）
  uploadImageData: async (imageData: ArrayBuffer): Promise<string> => {
    try {
      const result = await ipcRenderer.invoke('upload-image-data', { imageData })
      if (!result.success) throw new Error(result.error)
      return result.path
    } catch (error) {
      console.error('预加载脚本 → 上传图片数据失败:', error)
      throw error
    }
  },

  // 获取图片真实文件路径
  getImageRealPath: async (fileName: string): Promise<string> => {
    try {
      const result = await ipcRenderer.invoke('get-image-real-path', fileName)
      if (!result.success) throw new Error(result.error)
      return result.path
    } catch (error) {
      console.error('预加载脚本 → 获取图片真实路径失败:', error)
      throw error
    }
  },

  // 检查图片是否存在
  checkImageExists: async (imagePath: string): Promise<boolean> => {
    try {
      const result = await ipcRenderer.invoke('check-image-exists', imagePath)
      return result
    } catch (error) {
      console.error('预加载脚本 → 检查图片存在性失败:', error)
      return false
    }
  }
}
