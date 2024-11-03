import { ipcMain } from 'electron'
import {
  createTag,
  getAllTags,
  getTagById,
  updateTag,
  deleteTag,
  incrementTagUseCount,
  searchTags,
  getAllTagsWithCount
} from '../../db/tagService'
import type { Tag } from '../../renderer/src/types/Note'

export function setupTagHandlers() {
  // 创建标签
  ipcMain.handle(
    'create-tag',
    async (_event, { name, color, icon }: { name: string; color?: string; icon?: string }) => {
      try {
        console.log('主进程→ 创建标签:', { name, color, icon })
        const newTag = await createTag(name, color, icon)
        return { success: true, tag: newTag }
      } catch (error) {
        console.error('主进程→ 创建标签失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )

  // 获取所有标签
  ipcMain.handle('get-all-tags', async () => {
    try {
      console.log('主进程→ 获取所有标签')
      const tags = await getAllTags()
      return { success: true, tags }
    } catch (error) {
      console.error('主进程→ 获取所有标签失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 根据ID获取标签
  ipcMain.handle('get-tag-by-id', async (_event, id: string) => {
    try {
      console.log('主进程→ 获取标签:', id)
      const tag = await getTagById(id)
      return { success: true, tag }
    } catch (error) {
      console.error('主进程→ 获取标签失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 更新标签
  ipcMain.handle(
    'update-tag',
    async (_event, { id, updateData }: { id: string; updateData: Partial<Tag> }) => {
      try {
        console.log('主进程→ 更新标签:', { id, updateData })
        const updatedTag = await updateTag(id, updateData)
        return { success: true, tag: updatedTag }
      } catch (error) {
        console.error('主进程→ 更新标签失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )

  // 删除标签
  ipcMain.handle('delete-tag', async (_event, id: string) => {
    try {
      console.log('主进程→ 删除标签:', id)
      await deleteTag(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除标签失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 增加标签使用次数
  ipcMain.handle('increment-tag-use-count', async (_event, id: string) => {
    try {
      console.log('主进程→ 增加标签使用次数:', id)
      await incrementTagUseCount(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 增加标签使用次数失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 搜索标签
  ipcMain.handle('search-tags', async (_event, query: string) => {
    try {
      console.log('主进程→ 搜索标签:', query)
      const tags = await searchTags(query)
      return { success: true, tags }
    } catch (error) {
      console.error('主进程→ 搜索标签失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 获取所有标签(带完整计数)
  ipcMain.handle('get-all-tags-with-count', async () => {
    try {
      console.log('主进程→ 获取所有标签(带计数)')
      const tags = await getAllTagsWithCount()
      return { success: true, tags }
    } catch (error) {
      console.error('主进程→ 获取所有标签(带计数)失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })
}
