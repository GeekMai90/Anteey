import { ipcMain } from 'electron'
import { ImageService } from '../../services/images/imageService'
import type { ImageQueryParams } from '@shared/types'

const imageService = new ImageService()

export function setupImageHandlers() {
  // 上传图片
  ipcMain.handle(
    'upload-image',
    async (_event, { filePath, noteId }: { filePath: string; noteId: string }) => {
      try {
        const result = await imageService.uploadImage(filePath, noteId)
        return { success: true, ...result }
      } catch (error) {
        console.error('主进程→ 上传图片失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取笔记的所有图片
  ipcMain.handle('get-note-images', async (_event, noteId: string) => {
    try {
      const images = await imageService.getNoteImages(noteId)
      return { success: true, images }
    } catch (error) {
      console.error('主进程→ 获取笔记图片失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取图片路径
  ipcMain.handle('get-image-path', async (_event, imageId: string) => {
    try {
      const path = await imageService.getImagePath(imageId)
      return { success: true, path }
    } catch (error) {
      console.error('主进程→ 获取图片路径失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 复制图片到剪贴板
  ipcMain.handle('copy-image', async (_event, imageId: string) => {
    try {
      const result = await imageService.copyImage(imageId)
      return result
    } catch (error) {
      console.error('主进程→ 复制图片失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 下载图片
  ipcMain.handle(
    'download-image',
    async (_event, { url, filename }: { url: string; filename: string }) => {
      try {
        const result = await imageService.downloadImage(url, filename)
        return { success: true, path: result.path }
      } catch (error) {
        console.error('主进程→ 下载图片失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 清理未使用的图片
  ipcMain.handle('cleanup-unused-images', async () => {
    try {
      const count = await imageService.cleanupUnusedImages()
      return {
        success: true,
        count,
        message: `成功清理 ${count} 个未使用的图片`
      }
    } catch (error) {
      console.error('主进程→ 清理未使用图片失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 删除笔记中的图片
  ipcMain.handle(
    'remove-image-from-note',
    async (_event, { noteId, imageId }: { noteId: string; imageId: string }) => {
      try {
        await imageService.removeImageFromNote(noteId, imageId)
        return { success: true }
      } catch (error) {
        console.error('主进程→ 删除笔记图片失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取图片列表
  ipcMain.handle('get-images', async (_event, params: ImageQueryParams) => {
    try {
      console.log('ipcHandler → 接收到获取图片列表请求，参数:', params)
      const result = await imageService.getImages(params)
      console.log('ipcHandler → 从 imageService 获取到数据:', result)

      const response = {
        success: true,
        data: {
          images: result.images,
          total: result.total,
          totalSize: result.totalSize,
          orphanedCount: result.orphanedCount
        }
      }
      console.log('ipcHandler → 返回给渲染进程的数据:', response)
      return response
    } catch (error) {
      console.error('ipcHandler → 获取图片列表失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 删除图片
  ipcMain.handle('delete-images', async (_event, imageIds: string[]) => {
    try {
      const result = await imageService.deleteImages(imageIds)
      return {
        success: true,
        deletedCount: result.deletedCount
      }
    } catch (error) {
      console.error('主进程→ 删除图片失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
