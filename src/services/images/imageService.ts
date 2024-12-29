import { app, nativeImage, clipboard, BrowserWindow, dialog } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import fsSync from 'fs'
import crypto from 'crypto'
import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import https from 'https'
import http from 'http'
import { ImageQueryParams, ImageQueryResult } from '../../renderer/src/types/Image'

export class ImageService {
  // 上传图片并保存到数据库
  async uploadImage(
    filePath: string,
    noteId?: string
  ): Promise<{ path: string; isExisting: boolean }> {
    try {
      // 1. 读取文件并计算哈希
      const fileBuffer = await fs.readFile(filePath)
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex')

      // 2. 检查是否存在相同图片
      const existingImage = await db('image_references').where({ hash }).first()

      if (existingImage) {
        // 3. 如果图片已存在且有 noteId，创建新的关联
        if (noteId) {
          await this.createImageNoteRelation(existingImage.id, noteId)
        }

        // 4. 更新最后使用时间
        await db('image_references')
          .where({ id: existingImage.id })
          .update({ lastUsed: new Date() })

        return {
          path: `app-image:///images/${path.basename(existingImage.path)}`,
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

      // 7. 如果有 noteId，创建笔记和图片的关联
      if (noteId) {
        await this.createImageNoteRelation(imageId, noteId)
      }

      return {
        path: `app-image:///images/${fileName}`,
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
      return `app-image:///images/${path.basename(image.path)}`
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

      // 构建完整的图片路径
      const imagePath = path.join(app.getPath('userData'), 'UserData', 'images', image.filename)

      try {
        const buffer = await fs.readFile(imagePath)
        const nativeImg = nativeImage.createFromBuffer(buffer)
        clipboard.writeImage(nativeImg)

        // 更新最后使用时间
        await db('image_references').where({ id: imageId }).update({ lastUsed: new Date() })

        return { success: true, message: '图片已复制到剪贴板' }
      } catch (error) {
        console.error('读取图片失败:', error)
        throw new Error('复制图片失败：无法读取图片文件')
      }
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

      // 打开保存文件对话框
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

      // 如果是本地图片（app-image:/// 开头）
      if (url.startsWith('app-image:///')) {
        const imagePath = url.replace('app-image:///', '')
        const sourcePath = path.join(app.getPath('userData'), 'UserData', imagePath)
        await fs.copyFile(sourcePath, filePath)
      } else {
        // 下载网络图片
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
            // console.log('成功删除图片文件:', image.path)

            // 删除数据库记录
            await db('image_references').where('id', imageId).delete()
            // console.log('成功删除图片数据库记录:', imageId)
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

  // 获取图片列表
  async getImages(params: ImageQueryParams): Promise<ImageQueryResult> {
    try {
      console.log('imageService → 开始获取图片列表，参数:', params)

      // 1. 构建基础查询
      const baseQuery = db('image_references as ir').select(
        'ir.id',
        'ir.filename',
        'ir.path',
        'ir.hash',
        'ir.size',
        'ir.createdAt',
        'ir.lastUsed'
      )

      // 2. 获取引用计数
      const imageRefs = await db('note_images')
        .select('imageId')
        .count('noteId as count')
        .groupBy('imageId')
      console.log('imageService → 获取到图片引用计数:', imageRefs)

      // 将引用计数转换为 Map
      const refCountMap = new Map(imageRefs.map((ref) => [ref.imageId, Number(ref.count)]))
      console.log('imageService → 引用计数 Map:', Object.fromEntries(refCountMap))

      // 3. 应用状态过滤
      if (params.status === 'orphaned') {
        const usedImageIds = Array.from(refCountMap.keys())
        baseQuery.whereNotIn('ir.id', usedImageIds)
      } else if (params.status === 'linked') {
        const usedImageIds = Array.from(refCountMap.keys())
        baseQuery.whereIn('ir.id', usedImageIds)
      }

      // 4. 应用排序
      if (params.sortBy) {
        const order = params.sortOrder || 'desc'
        baseQuery.orderBy(`ir.${params.sortBy}`, order)
      }

      // 5. 获取总数和总大小
      const [{ total, totalSize }] = await db('image_references')
        .count('* as total')
        .sum('size as totalSize')
      console.log('imageService → 总数和总大小:', { total, totalSize })

      // 6. 应用分页
      if (params.page !== undefined && params.pageSize !== undefined) {
        const offset = (params.page - 1) * params.pageSize
        baseQuery.offset(offset).limit(params.pageSize)
      }

      // 7. 执行主查询
      const rawImages = await baseQuery
      console.log('imageService → 原始图片数据:', rawImages)

      // 8. 处理结果
      const images = await Promise.all(
        rawImages.map(async (img) => {
          console.log('imageService → 处理单个图片:', img)
          const usageCount = refCountMap.get(img.id) || 0
          const isOrphan = usageCount === 0

          interface NoteRef {
            id: string
            title: string
          }

          let notes: NoteRef[] = []
          if (!isOrphan) {
            notes = await db('note_images as ni')
              .join('notes as n', 'ni.noteId', 'n.id')
              .where('ni.imageId', img.id)
              .select('n.id', db.raw("json_extract(n.metadata, '$.title') as title"))
          }

          // 直接使用数据库中的时间戳
          const createdAt = img.createdAt ? Number(img.createdAt) : null
          const lastUsed = img.lastUsed ? Number(img.lastUsed) : null
          console.log('imageService → 处理时间戳:', {
            createdAt,
            lastUsed,
            original: { createdAt: img.createdAt, lastUsed: img.lastUsed }
          })

          const processed = {
            id: img.id,
            filename: img.filename,
            path: img.path,
            hash: img.hash,
            size: Number(img.size),
            createdAt,
            lastUsed,
            isOrphan,
            usageCount,
            notes: notes.length > 0 ? notes : undefined
          }
          console.log('imageService → 处理后的图片数据:', processed)
          return processed
        })
      )

      const result = {
        images,
        total: Number(total || 0),
        totalSize: Number(totalSize || 0),
        orphanedCount: images.filter((img) => img.isOrphan).length
      }
      console.log('imageService → 最终返回数据:', result)
      return result
    } catch (error) {
      console.error('imageService → 获取图片列表失败:', error)
      throw error
    }
  }

  // 批量删除图片
  async deleteImages(imageIds: string[]): Promise<{ success: boolean; deletedCount: number }> {
    const trx = await db.transaction()
    try {
      // 1. 删除文件
      for (const id of imageIds) {
        const image = await trx('image_references').where({ id }).first()
        if (image) {
          const imagePath = path.join(app.getPath('userData'), 'UserData', 'images', image.filename)
          await fs.unlink(imagePath)
        }
      }

      // 2. 删除关联关系
      await trx('note_images').whereIn('imageId', imageIds).delete()

      // 3. 删除数据库记录
      const deletedCount = await trx('image_references').whereIn('id', imageIds).delete()

      await trx.commit()
      return { success: true, deletedCount }
    } catch (error) {
      await trx.rollback()
      console.error('删除图片失败:', error)
      throw error
    }
  }
}
