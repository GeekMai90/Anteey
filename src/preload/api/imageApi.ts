import { ipcRenderer } from 'electron'

interface ImageInfo {
  id: string
  path: string
  filename: string
}

export const imageApi = {
  // 上传图片
  uploadImage: async (
    filePath: string,
    noteId: string
  ): Promise<{ path: string; isExisting: boolean }> => {
    try {
      const result = await ipcRenderer.invoke('upload-image', { filePath, noteId })
      if (!result.success) throw new Error(result.error)
      return {
        path: result.path,
        isExisting: result.isExisting
      }
    } catch (error) {
      console.error('预加载脚本 → 上传图片失败:', error)
      throw error
    }
  },

  // 获取笔记的所有图片
  getNoteImages: async (noteId: string): Promise<ImageInfo[]> => {
    try {
      const result = await ipcRenderer.invoke('get-note-images', noteId)
      if (!result.success) throw new Error(result.error)
      return result.images
    } catch (error) {
      console.error('预加载脚本 → 获取笔记图片失败:', error)
      throw error
    }
  },

  // 获取图片路径
  getImagePath: async (imageId: string): Promise<string> => {
    try {
      const result = await ipcRenderer.invoke('get-image-path', imageId)
      if (!result.success) throw new Error(result.error)
      return result.path
    } catch (error) {
      console.error('预加载脚本 → 获取图片路径失败:', error)
      throw error
    }
  },

  // 复制图片到剪贴板
  copyImage: async (imageId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const result = await ipcRenderer.invoke('copy-image', imageId)
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

  // 清理未使用的图片
  cleanupUnusedImages: async (): Promise<{ count: number; message: string }> => {
    try {
      const result = await ipcRenderer.invoke('cleanup-unused-images')
      if (!result.success) throw new Error(result.error)
      return {
        count: result.count,
        message: result.message
      }
    } catch (error) {
      console.error('预加载脚本 → 清理未使用图片失败:', error)
      throw error
    }
  },
  // 从笔记中删除图片
  removeImageFromNote: async (noteId: string, imageId: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('remove-image-from-note', { noteId, imageId })
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除笔记图片失败:', error)
      throw error
    }
  }
}
