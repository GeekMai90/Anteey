import { app, nativeImage, clipboard, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs/promises'

export class ImageService {
  // 上传图片
  async uploadImage(filePath: string): Promise<{ path: string }> {
    try {
      const fileName = `${Date.now()}-${path.basename(filePath)}`
      const destPath = path.join(app.getPath('userData'), 'UserData', 'images', fileName)

      await fs.mkdir(path.dirname(destPath), { recursive: true })
      await fs.copyFile(filePath, destPath)

      return { path: destPath }
    } catch (error) {
      console.error('上传图片失败:', error)
      throw error
    }
  }

  // 获取图片路径
  getImagePath(fileName: string): string {
    const fullPath = path.join(app.getPath('userData'), 'UserData', 'images', fileName)
    return `file://${fullPath}`
  }

  // 复制图片到剪贴板
  async copyImage(imageUrl: string): Promise<{ success: boolean; message: string }> {
    try {
      let filePath = imageUrl
      if (filePath.startsWith('file://')) {
        filePath = decodeURIComponent(new URL(filePath).pathname)
      } else {
        filePath = decodeURIComponent(filePath)
      }

      if (!path.isAbsolute(filePath)) {
        filePath = path.join(app.getPath('userData'), 'images', filePath)
      }

      const buffer = await fs.readFile(filePath)
      const image = nativeImage.createFromBuffer(buffer)
      clipboard.writeImage(image)

      return { success: true, message: '图片已复制到剪贴板' }
    } catch (error) {
      console.error('复制图片失败:', error)
      throw error
    }
  }

  // 下载图片
  async downloadImage(url: string, filename: string): Promise<{ path: string }> {
    const downloadPath = app.getPath('downloads')
    const filePath = path.join(downloadPath, filename)

    try {
      const { download } = await import('electron-dl')
      const win = BrowserWindow.getFocusedWindow()
      if (!win) {
        throw new Error('No focused window found')
      }
      await download(win, url, {
        directory: downloadPath,
        filename: filename,
        saveAs: true
      })
      return { path: filePath }
    } catch (error) {
      console.error('下载图片失败:', error)
      throw error
    }
  }
}
