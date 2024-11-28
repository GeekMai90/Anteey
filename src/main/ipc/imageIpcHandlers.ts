import { ipcMain } from 'electron'
import { ImageService } from '../../services/images/imageService'

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
}
