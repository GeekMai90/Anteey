import { ipcRenderer } from 'electron'

export const imageApi = {
  // 上传图片
  uploadImage: async (
    filePath: string
  ): Promise<{ success: boolean; path?: string; error?: string }> => {
    try {
      const result = await ipcRenderer.invoke('upload-image', filePath)
      if (result.success && result.path && !result.path.startsWith('file://')) {
        result.path = `file://${result.path}`
      }
      return result
    } catch (error) {
      console.error('预加载脚本 → 上传图片失败:', error)
      throw error
    }
  },

  // 获取图片路径
  getImagePath: async (relativePath: string): Promise<string> => {
    try {
      const imagePath = await ipcRenderer.invoke('get-image-path', relativePath)
      if (typeof imagePath !== 'string') {
        throw new Error('Invalid image path returned')
      }
      return imagePath.startsWith('file://') ? imagePath : `file://${imagePath}`
    } catch (error) {
      console.error('预加载脚本 → 获取图片路径失败:', error)
      throw error
    }
  },

  // 复制图片
  copyImage: async (
    imageUrl: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      return await ipcRenderer.invoke('copy-image', imageUrl)
    } catch (error) {
      console.error('预加载脚本 → 复制图片失败:', error)
      throw error
    }
  },

  // 下载图片
  downloadImage: async (
    url: string,
    filename: string
  ): Promise<{ success: boolean; path?: string; error?: string }> => {
    try {
      return await ipcRenderer.invoke('download-image', { url, filename })
    } catch (error) {
      console.error('预加载脚本 → 下载图片失败:', error)
      throw error
    }
  }
}
