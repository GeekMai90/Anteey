import { ipcMain } from 'electron'
import { ImageService } from '../../services/images/imageService'

const imageService = new ImageService()

export function setupImageHandlers() {
  // 上传图片文件
  ipcMain.handle('upload-image', async (_event, { filePath }: { filePath: string }) => {
    try {
      const imagePath = await imageService.uploadImage(filePath)
      return { success: true, path: imagePath }
    } catch (error) {
      console.error('主进程→ 上传图片失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 复制图片到剪贴板
  ipcMain.handle('copy-image', async (_event, imagePath: string) => {
    try {
      const result = await imageService.copyImage(imagePath)
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

  // 删除图片
  ipcMain.handle('delete-image', async (_event, imagePath: string) => {
    try {
      await imageService.deleteImage(imagePath)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除图片失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 上传图片数据（如剪贴板图片）
  ipcMain.handle('upload-image-data', async (_event, { imageData }: { imageData: ArrayBuffer }) => {
    try {
      const imagePath = await imageService.uploadImageData(imageData)
      return { success: true, path: imagePath }
    } catch (error) {
      console.error('主进程 → 上传图片数据失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
