import { app, nativeImage, clipboard, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import crypto from 'crypto'
import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'

export class ImageService {
  // 上传图片并保存到数据库
  async uploadImage(
    filePath: string,
    noteId: string
  ): Promise<{ path: string; isExisting: boolean }> {
    try {
      // 1. 读取文件并计算哈希
      const fileBuffer = await fs.readFile(filePath)
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex')

      // 2. 检查是否存在相同图片
      const existingImage = await db('image_references').where({ hash }).first()

      if (existingImage) {
        // 3. 如果图片已存在，创建新的关联
        await this.createImageNoteRelation(existingImage.id, noteId)

        // 4. 更新最后使用时间
        await db('image_references')
          .where({ id: existingImage.id })
          .update({ lastUsed: new Date() })

        return {
          path: `file://${existingImage.path.replace(/\\/g, '/')}`,
          isExisting: true
        }
      }

      // 5. 保存新图片
      const imageId = uuidv4()
      const fileName = `${imageId}-${path.basename(filePath)}`
      const destPath = path.join(app.getPath('userData'), 'UserData', 'images', fileName)

      await fs.mkdir(path.dirname(destPath), { recursive: true })
      await fs.copyFile(filePath, destPath)

      // 6. 保存图片信息到数据库

      await db('image_references').insert({
        id: imageId,
        path: destPath,
        filename: fileName,
        hash,
        size: fileBuffer.length,
        createdAt: new Date(),
        lastUsed: new Date()
      })

      // 7. 创建笔记和图片的关联
      await this.createImageNoteRelation(imageId, noteId)

      return {
        path: `file://${destPath.replace(/\\/g, '/')}`,
        isExisting: false
      }
    } catch (error) {
      console.error('上传图片失败:', error)
      throw error
    }
  }

  // 创建笔记和图片的关联
  private async createImageNoteRelation(imageId: string, noteId: string): Promise<void> {
    try {
      // 先检查是否已存在关联
      const existingRelation = await db('note_images')
        .where({
          noteId,
          imageId
        })
        .first()

      // 如果不存在关联，才创建新的关联
      if (!existingRelation) {
        await db('note_images').insert({
          noteId,
          imageId,
          createdAt: new Date()
        })
      }
      // 如果已存在关联，则不做任何操作
    } catch (error) {
      console.error('创建图片关联失败:', error)
      throw error
    }
  }

  // 获取笔记的所有图片
  async getNoteImages(
    noteId: string
  ): Promise<Array<{ id: string; path: string; filename: string }>> {
    try {
      const images = await db('image_references as ir')
        .join('note_images as ni', 'ir.id', 'ni.imageId')
        .where('ni.noteId', noteId)
        .select('ir.id', 'ir.path', 'ir.filename')
        .orderBy('ni.createdAt', 'desc')

      return images
    } catch (error) {
      console.error('获取笔记图片失败:', error)
      throw error
    }
  }

  // 获取图片路径
  async getImagePath(imageId: string): Promise<string> {
    try {
      const image = await db('image_references').where({ id: imageId }).first()

      if (!image) {
        throw new Error('图片不存在')
      }

      return `file://${image.path}`
    } catch (error) {
      console.error('获取图片路径失败:', error)
      throw error
    }
  }

  // 复制图片到剪贴板
  async copyImage(imageId: string): Promise<{ success: boolean; message: string }> {
    try {
      const image = await db('image_references').where({ id: imageId }).first()

      if (!image) {
        throw new Error('图片不存在')
      }

      const buffer = await fs.readFile(image.path)
      const nativeImg = nativeImage.createFromBuffer(buffer)
      clipboard.writeImage(nativeImg)

      // 更新最后使用时间
      await db('image_references').where({ id: imageId }).update({ lastUsed: new Date() })

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

  // 清理未使用的图片
  // async cleanupUnusedImages(): Promise<number> {
  //   try {
  //     const unusedImages = await db('image_references as ir')
  //       .leftJoin('note_images as ni', 'ir.id', 'ni.imageId')
  //       .whereNull('ni.noteId')
  //       .select('ir.*')

  //     for (const image of unusedImages) {
  //       try {
  //         await fs.unlink(image.path) // 删除物理文件
  //         await db('image_references').where('id', image.id).delete()
  //       } catch (error) {
  //         console.error(`清理图片失败: ${image.path}`, error)
  //       }
  //     }

  //     return unusedImages.length
  //   } catch (error) {
  //     console.error('清理未使用图片失败:', error)
  //     throw error
  //   }
  // }
  async cleanupUnusedImages(): Promise<{ deleted: number; errors: string[] }> {
    try {
      console.log('开始清理未使用的图片')
      const errors: string[] = []

      // 1. 获取所有未被引用的图片记录
      const unusedImages = await db('image_references as ir')
        .leftJoin('note_images as ni', 'ir.id', 'ni.imageId')
        .whereNull('ni.noteId')
        .select('ir.*')

      console.log(`找到 ${unusedImages.length} 个未使用的图片`)

      // 2. 删除这些图片的文件和数据库记录
      let deletedCount = 0
      for (const image of unusedImages) {
        try {
          // 删除物理文件
          await fs.unlink(image.path)
          // 删除数据库记录
          await db('image_references').where('id', image.id).delete()
          deletedCount++
          console.log(`成功删除图片: ${image.filename}`)
        } catch (error: unknown) {
          const errorMsg = `清理图片失败 ${image.filename}: ${(error as Error).message}`
          console.error(errorMsg)
          errors.push(errorMsg)
        }
      }

      // 3. 清理 images 目录中的孤立文件（数据库中没有记录的文件）
      const imagesDir = path.join(app.getPath('userData'), 'UserData', 'images')
      const files = await fs.readdir(imagesDir)

      // 获取数据库中所有图片的文件名
      const dbImages = await db('image_references').select('filename')
      const dbFilenames = new Set(dbImages.map((img) => img.filename))

      // 删除不在数据库中的文件
      for (const file of files) {
        if (!dbFilenames.has(file)) {
          try {
            await fs.unlink(path.join(imagesDir, file))
            deletedCount++
            console.log(`删除孤立文件: ${file}`)
          } catch (error: unknown) {
            const errorMsg = `删除孤立文件失败 ${file}: ${(error as Error).message}`
            console.error(errorMsg)
            errors.push(errorMsg)
          }
        }
      }

      return {
        deleted: deletedCount,
        errors
      }
    } catch (error) {
      console.error('清理未使用图片失败:', error)
      throw error
    }
  }

  // 删除笔记和图片的关联
  // async removeImageFromNote(noteId: string, imageId: string): Promise<void> {
  //   try {
  //     // 修改 SQL 查询的写法，使用对象形式传递参数
  //     await db('note_images')
  //       .where({
  //         noteId: noteId,
  //         imageId: imageId
  //       })
  //       .delete()

  //     // 检查这个图片是否还被其他笔记引用
  //     const result = await db('note_images').where({ imageId }).count('* as count').first()

  //     // 确保 result 存在且有 count 属性
  //     if (result && result.count === 0) {
  //       await this.cleanupUnusedImages()
  //     }
  //   } catch (error) {
  //     console.error('删除图片关联失败:', error)
  //     throw error
  //   }
  // }
  // async removeImageFromNote(noteId: string, imageId: string): Promise<void> {
  //   try {
  //     // 添加参数验证
  //     if (!noteId || !imageId) {
  //       console.error('参数无效:', { noteId, imageId })
  //       throw new Error('Invalid parameters: noteId and imageId are required')
  //     }

  //     console.log('开始删除图片关联:', { noteId, imageId }) // 添加日志

  //     // 先检查关联是否存在
  //     const existingRelation = await db('note_images')
  //       .where({
  //         noteId: noteId,
  //         imageId: imageId
  //       })
  //       .first()

  //     if (!existingRelation) {
  //       console.log('关联记录不存在:', { noteId, imageId })
  //       return
  //     }

  //     // 删除关联
  //     const deleteResult = await db('note_images')
  //       .where({
  //         noteId: noteId,
  //         imageId: imageId
  //       })
  //       .delete()

  //     console.log('删除关联结果:', { deleteResult }) // 添加日志

  //     // 检查这个图片是否还被其他笔记引用
  //     const result = await db('note_images').where({ imageId }).count('* as count').first()

  //     console.log('引用计数结果:', result) // 添加日志

  //     // 确保 result 存在且有 count 属性
  //     if (result && Number(result.count) === 0) {
  //       console.log('开始清理未使用的图片') // 添加日志
  //       await this.cleanupUnusedImages()
  //     }

  //     return
  //   } catch (error) {
  //     console.error('删除图片关联失败:', error)
  //     throw error
  //   }
  // }

  async removeImageFromNote(noteId: string, imageId: string): Promise<void> {
    try {
      // 添加参数验证
      if (!noteId || !imageId) {
        console.error('参数无效:', { noteId, imageId })
        throw new Error('Invalid parameters: noteId and imageId are required')
      }

      console.log('开始删除图片关联:', { noteId, imageId })

      // 先检查关联是否存在
      const existingRelation = await db('note_images')
        .where({
          noteId: noteId,
          imageId: imageId
        })
        .first()

      if (!existingRelation) {
        console.log('关联记录不存在:', { noteId, imageId })
        return
      }

      // 删除关联
      const deleteResult = await db('note_images')
        .where({
          noteId: noteId,
          imageId: imageId
        })
        .delete()

      console.log('删除关联结果:', { deleteResult })

      // 检查这个图片是否还被其他笔记引用
      const result = await db('note_images').where({ imageId }).count('* as count').first()

      console.log('引用计数结果:', result)

      // 如果没有其他引用，删除图片文件和数据库记录
      if (result && Number(result.count) === 0) {
        console.log('图片无其他引用，准备删除文件')

        // 获取图片信息
        const image = await db('image_references').where({ id: imageId }).first()

        if (image) {
          try {
            // 删除物理文件
            await fs.unlink(image.path)
            console.log('成功删除图片文件:', image.path)

            // 删除数据库记录
            await db('image_references').where('id', imageId).delete()
            console.log('成功删除图片数据库记录:', imageId)
          } catch (error) {
            console.error(`删除图片文件失败: ${image.path}`, error)
            throw error
          }
        } else {
          console.log('未找到图片记录:', imageId)
        }
      } else {
        console.log('图片仍有其他引用，保留文件')
      }

      return
    } catch (error) {
      console.error('删除图片关联失败:', error)
      throw error
    }
  }
}
