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
  }
}
