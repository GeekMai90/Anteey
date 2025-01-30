import { app, nativeImage, clipboard, BrowserWindow, dialog, shell } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import fsSync from 'fs'
import { v4 as uuidv4 } from 'uuid'
import https from 'https'
import http from 'http'

export class ImageService {
  private getImagesDir(): string {
    return path.join(app.getPath('userData'), 'UserData', 'images')
  }

  // 上传图片
  async uploadImage(filePath: string): Promise<string> {
    try {
      // 1. 生成唯一文件名
      const imageId = uuidv4()
      const extension = path.extname(filePath)
      const fileName = `${imageId}${extension}`
      const destPath = path.join(this.getImagesDir(), fileName)

      // 2. 确保目标目录存在
      await fs.mkdir(this.getImagesDir(), { recursive: true })

      // 3. 复制文件
      await fs.copyFile(filePath, destPath)

      // 4. 返回图片访问路径
      return `app-image:///images/${fileName}`
    } catch (error) {
      console.error('上传图片失败:', error)
      throw error
    }
  }

  // 上传图片数据
  async uploadImageData(imageData: ArrayBuffer): Promise<string> {
    try {
      // 1. 将 ArrayBuffer 转换为 Buffer
      const buffer = Buffer.from(imageData)

      // 2. 生成唯一文件名
      const imageId = uuidv4()
      const fileName = `${imageId}.png`
      const destPath = path.join(this.getImagesDir(), fileName)

      // 3. 确保目标目录存在
      await fs.mkdir(this.getImagesDir(), { recursive: true })

      // 4. 写入文件
      await fs.writeFile(destPath, buffer)

      // 5. 返回图片访问路径
      return `app-image:///images/${fileName}`
    } catch (error) {
      console.error('上传图片数据失败:', error)
      throw error
    }
  }

  // 删除图片
  async deleteImage(imagePath: string): Promise<void> {
    try {
      // 从 app-image:///images/xxx.png 格式转换为实际文件路径
      const fileName = imagePath.replace('app-image:///images/', '')
      const fullPath = path.join(this.getImagesDir(), fileName)

      // 检查文件是否存在
      const exists = await fs
        .access(fullPath)
        .then(() => true)
        .catch(() => false)
      if (!exists) {
        throw new Error('图片文件不存在')
      }

      // 将文件移动到回收站
      await shell.trashItem(fullPath)
    } catch (error) {
      console.error('删除图片失败:', error)
      throw error
    }
  }

  // 复制图片到剪贴板
  async copyImage(imagePath: string): Promise<{ success: boolean; message: string }> {
    try {
      const fileName = imagePath.replace('app-image:///images/', '')
      const fullPath = path.join(this.getImagesDir(), fileName)

      const buffer = await fs.readFile(fullPath)
      const nativeImg = nativeImage.createFromBuffer(buffer)
      clipboard.writeImage(nativeImg)

      return { success: true, message: '图片已复制到剪贴板' }
    } catch (error) {
      console.error('复制图片失败:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : '复制图片失败'
      }
    }
  }

  // 下载图片
  async downloadImage(url: string, filename: string): Promise<{ path: string }> {
    try {
      const win = BrowserWindow.getFocusedWindow()
      if (!win) {
        throw new Error('No focused window found')
      }

      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        defaultPath: path.join(app.getPath('downloads'), filename),
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (canceled || !filePath) {
        throw new Error('User cancelled download')
      }

      if (url.startsWith('app-image:///')) {
        const fileName = url.replace('app-image:///images/', '')
        const sourcePath = path.join(this.getImagesDir(), fileName)
        await fs.copyFile(sourcePath, filePath)
      } else {
        await this.downloadFile(url, filePath)
      }

      return { path: filePath }
    } catch (error) {
      console.error('下载图片失败:', error)
      throw error
    }
  }

  // 下载文件的辅助方法
  private downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http

      protocol
        .get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download: ${response.statusCode}`))
            return
          }

          const file = fsSync.createWriteStream(destPath)
          response.pipe(file)

          file.on('finish', () => {
            file.close()
            resolve()
          })

          file.on('error', async (err) => {
            try {
              await fs.unlink(destPath)
            } catch (unlinkError) {
              console.error('Failed to delete incomplete file:', unlinkError)
            }
            reject(err)
          })
        })
        .on('error', reject)
    })
  }
}
