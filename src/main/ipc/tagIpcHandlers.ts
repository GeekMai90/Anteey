import { ipcMain } from 'electron'
import {
  createTag,
  getTagById,
  updateTag,
  deleteTag,
  searchTags,
  getAllTagsWithCount,
  updateTagPinned,
  updateTagPinOrder,
  searchTagsAdvanced,
  type TagSearchParams,
  getNoteTags
} from '../../db/tagService'
import type { Tag } from '../../renderer/src/types/Note'

export function setupTagHandlers() {
  // 创建标签
  ipcMain.handle(
    'create-tag',
    async (_event, { name, color, icon }: { name: string; color?: string; icon?: string }) => {
      try {
        const newTag = await createTag(name, color, icon)
        return { success: true, tag: newTag }
      } catch (error) {
        console.error('主进程→ 创建标签失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取所有标签（包含使用次数）
  ipcMain.handle('get-all-tags', async () => {
    console.log('主进程→ 收到获取所有标签请求')
    try {
      const tags = await getAllTagsWithCount() // 改用带计数的方法
      console.log('主进程→ 获取标签成功:', tags)
      return { success: true, tags }
    } catch (error) {
      console.error('主进程→ 获取所有标签失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 根据ID获取标签
  ipcMain.handle('get-tag-by-id', async (_event, id: string) => {
    try {
      const tag = await getTagById(id)
      return { success: true, tag }
    } catch (error) {
      console.error('主进程→ 获取标签失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新标签
  ipcMain.handle(
    'update-tag',
    async (_event, { id, updateData }: { id: string; updateData: Partial<Tag> }) => {
      try {
        const updatedTag = await updateTag(id, updateData)
        return { success: true, tag: updatedTag }
      } catch (error) {
        console.error('主进程→ 更新标签失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 删除标签
  ipcMain.handle('delete-tag', async (_event, id: string) => {
    try {
      await deleteTag(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除标签失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 搜索标签
  ipcMain.handle('search-tags', async (_event, query: string) => {
    try {
      const tags = await searchTags(query)
      return { success: true, tags }
    } catch (error) {
      console.error('主进程→ 搜索标签失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 高级搜索标签
  ipcMain.handle('search-tags-advanced', async (_event, params: TagSearchParams) => {
    try {
      const tags = await searchTagsAdvanced(params)
      return { success: true, tags }
    } catch (error) {
      console.error('主进程→ 高级搜索标签失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新标签置顶状态
  ipcMain.handle(
    'update-tag-pinned',
    async (
      _event,
      { id, pinned, pinOrder }: { id: string; pinned: boolean; pinOrder?: number }
    ) => {
      try {
        const updatedTag = await updateTagPinned(id, pinned, pinOrder)
        return { success: true, tag: updatedTag }
      } catch (error) {
        console.error('主进程→ 更新标签置顶状态失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 更新标签置顶顺序
  ipcMain.handle(
    'update-tag-pin-order',
    async (_event, { id, pinOrder }: { id: string; pinOrder: number }) => {
      try {
        const updatedTag = await updateTagPinOrder(id, pinOrder)
        return { success: true, tag: updatedTag }
      } catch (error) {
        console.error('主进程→ 更新标签置顶顺序失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取笔记的标签
  ipcMain.handle('get-note-tags', async (_event, noteId: string) => {
    try {
      const tags = await getNoteTags(noteId)
      return { success: true, tags }
    } catch (error) {
      console.error('主进程→ 获取笔记标签失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
