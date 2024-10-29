import { app, ipcMain, BrowserWindow, nativeImage, clipboard } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { join } from 'path'

export function setupImageHandlers() {
  // 复制图片
  ipcMain.handle('copy-image', async (_event, imageUrl: string) => {
    console.log('尝试复制图片:', imageUrl)
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
      return {
        success: false,
        message: '复制图片失败',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 下载图片
  ipcMain.handle('download-image', async (_event, { url, filename }) => {
    const win = BrowserWindow.getFocusedWindow()
    const downloadPath = app.getPath('downloads')
    const filePath = join(downloadPath, filename)

    try {
      const { download } = await import('electron-dl')
      await download(win as BrowserWindow, url, {
        directory: downloadPath,
        filename: filename,
        saveAs: true
      })
      return { success: true, message: '图片下载成功', path: filePath }
    } catch (error) {
      console.error('下载失败:', error)
      return { success: false, message: '图片下载失败', error }
    }
  })

  // 上传图片
  ipcMain.handle('upload-image', async (_event, filePath: string) => {
    try {
      const fileName = `${Date.now()}-${path.basename(filePath)}`
      const destPath = path.join(app.getPath('userData'), 'UserData', 'images', fileName)

      await fs.mkdir(path.dirname(destPath), { recursive: true })
      await fs.copyFile(filePath, destPath)

      return { success: true, path: `file://${destPath}` }
    } catch (error) {
      console.error('上传图片时出错:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取图片路径
  ipcMain.handle('get-image-path', (_event, fileName: string) => {
    const fullPath = path.join(app.getPath('userData'), 'UserData', 'images', fileName)
    return `file://${fullPath}`
  })
}
