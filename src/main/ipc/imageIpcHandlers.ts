import { ipcMain } from 'electron'
import { ImageService } from '../../services/images/imageService'

const imageService = new ImageService()

export function setupImageHandlers() {
  // 上传图片
  ipcMain.handle('upload-image', async (_event, filePath: string) => {
    try {
      const result = await imageService.uploadImage(filePath)
      return { success: true, path: result.path }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 获取图片路径
  ipcMain.handle('get-image-path', (_event, fileName: string) => {
    try {
      const path = imageService.getImagePath(fileName)
      return path
    } catch (error) {
      console.error('获取图片路径失败:', error)
      throw error
    }
  })

  // 复制图片
  ipcMain.handle('copy-image', async (_event, imageUrl: string) => {
    try {
      const result = await imageService.copyImage(imageUrl)
      return result
    } catch (error) {
      return {
        success: false,
        message: '复制图片失败',
        error: String(error)
      }
    }
  })

  // 下载图片
  ipcMain.handle('download-image', async (_event, { url, filename }) => {
    try {
      const result = await imageService.downloadImage(url, filename)
      return { success: true, path: result.path }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })
}
