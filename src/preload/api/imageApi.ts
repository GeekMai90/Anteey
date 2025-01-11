import { ipcRenderer } from 'electron'
import type { ImageQueryParams, ImageQueryResult, ImageWithStatus } from '@shared/types'

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
  },

  // 获取图片列表
  getImages: async (params: ImageQueryParams): Promise<ImageQueryResult> => {
    try {
      console.log('imageApi → 开始调用 IPC 获取图片列表，参数:', params)
      const result = await ipcRenderer.invoke('get-images', params)
      console.log('imageApi → IPC 返回原始数据:', result)

      if (!result.success) {
        console.error('imageApi → IPC 调用失败:', result.error)
        throw new Error(result.error)
      }

      // 确保返回的数据符合 ImageQueryResult 类型
      const { images, total, totalSize, orphanedCount } = result.data
      console.log('imageApi → 解构后的数据:', { images, total, totalSize, orphanedCount })

      const processedImages = images.map((img: ImageWithStatus) => {
        console.log('imageApi → 处理单个图片数据:', img)
        const processed = {
          ...img,
          createdAt: Number(img.createdAt),
          lastUsed: Number(img.lastUsed)
        }
        console.log('imageApi → 处理后的图片数据:', processed)
        return processed
      })

      const response = {
        images: processedImages,
        total,
        totalSize,
        orphanedCount
      }
      console.log('imageApi → 最终返回数据:', response)
      return response
    } catch (error) {
      console.error('imageApi → 获取图片列表失败:', error)
      throw error
    }
  },

  // 删除图片
  deleteImages: async (imageIds: string[]): Promise<{ deletedCount: number }> => {
    try {
      const result = await ipcRenderer.invoke('delete-images', imageIds)
      if (!result.success) {
        throw new Error(result.error)
      }
      return { deletedCount: result.deletedCount }
    } catch (error) {
      console.error('预加载脚本 → 删除图片失败:', error)
      throw error
    }
  },

  // 上传图片数据
  uploadImageData: async (
    imageData: ArrayBuffer,
    noteId?: string
  ): Promise<{ path: string; isExisting: boolean }> => {
    try {
      const result = await ipcRenderer.invoke('upload-image-data', { imageData, noteId })
      if (!result.success) throw new Error(result.error)
      return {
        path: result.path,
        isExisting: result.isExisting
      }
    } catch (error) {
      console.error('预加载脚本 → 上传图片数据失败:', error)
      throw error
    }
  }
}
