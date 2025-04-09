import { ipcMain } from 'electron'
import {
  createNote,
  getNoteById,
  updateNote,
  getAllNotes,
  softDeleteNote,
  restoreNote,
  getDeletedNotes,
  permanentDeleteNote,
  updateNoteContent,
  updateNoteCardBox,
  getStarredNotes,
  addStarToNote,
  updateStarredNotesOrder,
  removeStarFromNote,
  getPaginatedNotes,
  getDraftNotes,
  getNotesByDate,
  getNotesByOneDate,
  getAllDatesWithNotes,
  getPaginatedNotesByCardbox,
  searchNotes,
  searchNotesList,
  getRandomNotes,
  moveEmptyNotesToTrash,
  getAllDeletedNotes,
  updateNoteAddress,
  updateNoteCardType,
  getTimelineNotes,
  createNoteReference,
  deleteNoteReference,
  updateNoteTag,
  getRecentEditedNotes,
  batchMoveNotesToCardBox,
  batchUpdateNotesCardType,
  batchSoftDeleteNotes,
  toggleNoteIndex,
  getIndexedNotes,
  updateIndexOrder,
  batchAddToIndex,
  batchRemoveFromIndex,
  getIndexedNotesByLetter,
  copyNoteAddressToClipboard
} from '../../services/notes/notesService'
import type {
  GetPaginatedNotesParams,
  SearchParams,
  TimelineQueryParams,
  TimelineQueryResult
} from '@shared/types'

export function setupNotesHandlers() {
  // 获取所有已删除的笔记
  ipcMain.handle('get-all-deleted-notes', async () => {
    try {
      const result = await getAllDeletedNotes()
      return result
    } catch (error) {
      console.error('主进程 → 获取所有已删除的笔记失败:', error)
      throw error
    }
  })
  // 将空笔记移到回收站
  ipcMain.handle('move-empty-notes-to-trash', async () => {
    try {
      await moveEmptyNotesToTrash()
    } catch (error) {
      console.error('主进程 → 将空笔记移到回收站失败:', error)
      throw error
    }
  })
  // 获取随机笔记
  ipcMain.handle('get-random-notes', async () => {
    try {
      const result = await getRandomNotes()
      return result
    } catch (error) {
      console.error('主进程 → 获取随机笔记失败:', error)
      throw error
    }
  })

  // 搜索笔记列表
  ipcMain.handle('search-notes-list', async (_, query: string) => {
    return await searchNotesList(query)
  })
  // 搜索笔记
  ipcMain.handle('search-notes', async (_, query: SearchParams) => {
    return await searchNotes(query)
  })

  // 获取都有哪些日期有笔记
  ipcMain.handle('get-all-dates-with-notes', async () => {
    try {
      const result = await getAllDatesWithNotes()
      return result
    } catch (error) {
      console.error('主进程 → 获取都有哪些日期有笔记失败:', error)
      throw error
    }
  })
  // 获取某一天的笔记
  ipcMain.handle('get-notes-by-one-date', async (_event, date: string) => {
    try {
      const result = await getNotesByOneDate(date)
      console.log('主进程 → 获取某一天的笔记成功', result)
      return result
    } catch (error) {
      console.error('主进程 → 获取某一天的笔记失败:', error)
      throw error
    }
  })
  // 按日期排序获取笔记
  ipcMain.handle('get-notes-by-date', async (_event, { direction, referenceDate, limit }) => {
    try {
      const result = await getNotesByDate(direction, referenceDate, limit)
      return result
    } catch (error) {
      console.error('获取按日期排序的笔记失败:', error)
      throw error
    }
  })
  // 分页获取笔记
  ipcMain.handle('get-paginated-notes', async (_event, { page, limit }) => {
    try {
      return await getPaginatedNotes(page, limit)
    } catch (error) {
      console.error('获取分页笔记失败:', error)
      throw error
    }
  })

  // 分页获取草稿笔记
  ipcMain.handle('get-draft-notes', async (_event, { page, limit }) => {
    try {
      return await getDraftNotes(page, limit)
    } catch (error) {
      console.error('主进程 → 获取草稿笔记失败:', error)
      throw error
    }
  })

  // 更新笔记内容
  ipcMain.handle('update-note-content', async (_, id: string, content: any) => {
    try {
      const updatedNote = await updateNoteContent(id, content)
      return updatedNote
    } catch (error) {
      console.error('主进程 → 更新笔记内容时出错:', error)
      return { success: false, error: error }
    }
  })

  // 创建笔记
  ipcMain.handle('create-note', async () => {
    try {
      // console.log('主进程→ 创建笔记')
      const newNote = await createNote()
      return newNote
    } catch (error) {
      console.error('主进程→ 创建笔记失败:', error)
      throw error
    }
  })

  // 获取单个笔记
  ipcMain.handle('get-note', async (_, id: string) => {
    try {
      const note = await getNoteById(id)
      return note
    } catch (error) {
      console.error('主进程→ 获取笔记失败:', error)
      throw error
    }
  })
  // 获取所有笔记
  ipcMain.handle('get-all-notes', async () => {
    try {
      const notes = await getAllNotes()
      return notes
    } catch (error) {
      console.error('Error in get-all-notes handler:', error)
      throw error
    }
  })

  // 更新笔记
  ipcMain.handle('update-note', async (_event, { id, updateData }) => {
    console.log('主进程 → 收到更新笔记请求:', { id, updateData })

    try {
      // 数据验证
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid note ID')
      }

      if (!updateData || typeof updateData !== 'object') {
        throw new Error('Invalid update data')
      }

      // 调用服务方法更新笔记
      const updatedNote = await updateNote(id, updateData)

      console.log('主进程 → 笔记更新成功:', updatedNote)
      return { success: true, note: updatedNote }
    } catch (error) {
      console.error('主进程 → 更新笔记时出错:', error)
      return { success: false, error: error }
    }
  })

  // 软删除笔记
  ipcMain.handle('soft-delete-note', async (_event, id: string) => {
    try {
      const updatedNote = await softDeleteNote(id)
      console.log('主进程 → 软删除笔记更新后的笔记:', JSON.stringify(updatedNote))
      return updatedNote
    } catch (error) {
      console.error('主进程 → 软删除笔记时出错:', error)
      throw error
    }
  })

  // 恢复已删除的笔记
  ipcMain.handle('restore-note', async (_event, id: string) => {
    try {
      await restoreNote(id)
      return { success: true }
      console.log('主进程 → 恢复已删除的笔记成功')
    } catch (error) {
      console.error('主进程 → 恢复已删除的笔记时出错:', error)
      return { success: false, error: error }
    }
  })

  // 获取所有已删除的笔记
  ipcMain.handle('get-deleted-notes', async () => {
    try {
      const deletedNotes = await getDeletedNotes()
      return deletedNotes
    } catch (error) {
      console.error('主进程 → 获取已删除的笔记时出错:', error)
      return { success: false, error: error }
    }
  })

  // 永久删除笔记
  ipcMain.handle('permanent-delete-note', async (_event, id: string) => {
    try {
      await permanentDeleteNote(id)
      return { success: true }
      console.log('主进程 → 永久删除笔记成功', id)
    } catch (error) {
      console.error('主进程 → 永久删除笔记时出错:', error)
      return { success: false, error: error }
    }
  })

  // 添加星标收藏
  ipcMain.handle('add-star-to-note', async (_event, id: string) => {
    try {
      const updatedNote = await addStarToNote(id)
      console.log('主进程 → 添加星标收藏成功:', updatedNote)
      return updatedNote
    } catch (error) {
      console.error('主进程 → 添加星标收藏时出错:', error)
      return { success: false, error: error }
    }
  })

  // 移除星标收藏
  ipcMain.handle('remove-star-from-note', async (_event, id: string) => {
    try {
      const result = await removeStarFromNote(id)
      console.log('主进程 → 移除星标收藏成功:', result)
      return result
    } catch (error) {
      console.error('主进程 → 移除星标收藏时出错:', error)
      return { success: false, error: error }
    }
  })

  // 获取收藏的笔记
  ipcMain.handle('get-starred-notes', async () => {
    try {
      const starredNotes = await getStarredNotes()
      return starredNotes
    } catch (error) {
      console.error('主进程 → 获取收藏的笔记时出错:', error)
      return { success: false, error: error }
    }
  })

  // 更新收藏笔记的顺序
  ipcMain.handle(
    'update-starred-notes-order',
    async (_event, orders: { id: string; starredOrder: number }[]) => {
      try {
        console.log('主进程 → 更新收藏笔记顺序，原来的:', orders)
        const updatedNotes = await updateStarredNotesOrder(orders)
        console.log('主进程 → 更新收藏笔记顺序，更新后的:', updatedNotes)
        return updatedNotes
      } catch (error) {
        console.error('主进程 → 更新收藏笔记顺序时出错:', error)
        return { success: false, error: error }
      }
    }
  )
  // 更新笔记地址
  ipcMain.handle('update-note-address', async (_event, id: string, address: string) => {
    try {
      const updatedNote = await updateNoteAddress(id, address)
      return { success: true, note: updatedNote }
    } catch (error) {
      console.error('主进程 → 更新笔记地址失败:', error)
      return { success: false, error: error }
    }
  })
  // 更新笔记类型
  ipcMain.handle('update-note-card-type', async (_event, id: string, cardType: string) => {
    try {
      const updatedNote = await updateNoteCardType(id, cardType)
      return { success: true, note: updatedNote }
    } catch (error) {
      console.error('主进程 → 更新笔记类型失败:', error)
      return { success: false, error: error }
    }
  })
  // 更新笔记的卡片盒
  ipcMain.handle('update-note-card-box', async (_event, id: string, cardBoxId: string) => {
    try {
      const updatedNote = await updateNoteCardBox(id, cardBoxId)
      return { success: true, note: updatedNote }
    } catch (error) {
      console.error('主进程 → 更新笔记的卡片盒时出错:', error)
      return { success: false, error: error }
    }
  })
  // 时间线笔记查询
  ipcMain.handle(
    'get-timeline-notes',
    async (
      _event,
      params: TimelineQueryParams
    ): Promise<{
      success: boolean
      result?: TimelineQueryResult
      error?: any
    }> => {
      try {
        console.log('主进程→ 获取时间线笔记', params)
        const result = await getTimelineNotes(params)
        return { success: true, result }
      } catch (error) {
        console.error('主进程→ 获取时间线笔记失败:', error)
        return { success: false, error: error }
      }
    }
  )
  // 创建笔记引用关系
  ipcMain.handle('create-note-reference', async (_event, params) => {
    try {
      const reference = await createNoteReference(params)
      return { success: true, reference }
    } catch (error) {
      console.error('主进程→ 创建笔记引用关系失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 删除笔记引用关系
  ipcMain.handle('delete-note-reference', async (_event, params) => {
    try {
      await deleteNoteReference(params)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除笔记引用关系失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 批量移动笔记到卡片盒
  ipcMain.handle(
    'batch-move-notes-to-cardbox',
    async (_event, { noteIds, cardBoxId }: { noteIds: string[]; cardBoxId: string | null }) => {
      try {
        const updatedNotes = await batchMoveNotesToCardBox(noteIds, cardBoxId)
        return { success: true, notes: updatedNotes }
      } catch (error) {
        console.error('主进程→ 批量移动笔记到卡片盒失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 批量设置卡片类型
  ipcMain.handle(
    'batch-update-notes-card-type',
    async (_event, { noteIds, cardType }: { noteIds: string[]; cardType: string }) => {
      try {
        const updatedNotes = await batchUpdateNotesCardType(noteIds, cardType)
        return { success: true, notes: updatedNotes }
      } catch (error) {
        console.error('主进程→ 批量设置卡片类型失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 批量软删除笔记
  ipcMain.handle('batch-soft-delete-notes', async (_event, noteIds: string[]) => {
    try {
      const updatedNotes = await batchSoftDeleteNotes(noteIds)
      console.log('主进程→ 批量软删除笔记成功:', updatedNotes.length)
      return updatedNotes
    } catch (error) {
      console.error('主进程→ 批量软删除笔记失败:', error)
      throw error
    }
  })

  // 切换笔记的索引状态
  ipcMain.handle('toggle-note-index', async (_event, noteId: string) => {
    try {
      const updatedNote = await toggleNoteIndex(noteId)
      return { success: true, note: updatedNote }
    } catch (error) {
      console.error('主进程→ 切换笔记索引状态失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 获取所有索引笔记（按首字母分组）
  ipcMain.handle('get-indexed-notes', async () => {
    try {
      const groupedNotes = await getIndexedNotes()
      return { success: true, notes: groupedNotes }
    } catch (error) {
      console.error('主进程→ 获取索引笔记失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 更新索引笔记的顺序
  ipcMain.handle(
    'update-index-order',
    async (
      _event,
      updates: Array<{
        noteId: string
        firstLetter: string
        order: number
      }>
    ) => {
      try {
        const updatedNotes = await updateIndexOrder(updates)
        return { success: true, notes: updatedNotes }
      } catch (error) {
        console.error('主进程→ 更新索引笔记顺序失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )

  // 批量添加到索引
  ipcMain.handle('batch-add-to-index', async (_event, noteIds: string[]) => {
    try {
      const updatedNotes = await batchAddToIndex(noteIds)
      return { success: true, notes: updatedNotes }
    } catch (error) {
      console.error('主进程→ 批量添加到索引失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 批量移除索引
  ipcMain.handle('batch-remove-from-index', async (_event, noteIds: string[]) => {
    try {
      const updatedNotes = await batchRemoveFromIndex(noteIds)
      return { success: true, notes: updatedNotes }
    } catch (error) {
      console.error('主进程→ 批量移除索引失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 获取特定首字母的索引笔记
  ipcMain.handle('get-indexed-notes-by-letter', async (_event, letter: string) => {
    try {
      const notes = await getIndexedNotesByLetter(letter)
      return { success: true, notes }
    } catch (error) {
      console.error('主进程→ 获取特定首字母的索引笔记失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 复制笔记地址到剪贴板
  ipcMain.handle('copy-note-address', async (_event, noteId: string) => {
    try {
      const address = await copyNoteAddressToClipboard(noteId)
      return { success: true, address }
    } catch (error) {
      console.error('主进程 → 复制笔记地址到剪贴板失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })
}

// 更新笔记标签
ipcMain.handle(
  'update-note-tag',
  async (
    _event,
    params: {
      noteId: string
      tagId: string
      action: 'add' | 'remove'
    }
  ) => {
    try {
      console.log('主进程→ 更新笔记标签:', params)
      const updatedNote = await updateNoteTag(params)
      return { success: true, note: updatedNote }
    } catch (error) {
      console.error('主进程→ 更新笔记标签失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
)
// 获取卡片盒页面的分页笔记
ipcMain.handle('get-paginated-notes-by-cardbox', async (_, params: GetPaginatedNotesParams) => {
  try {
    const result = await getPaginatedNotesByCardbox(params)
    return result
  } catch (error) {
    console.error('主进程 → 获取卡片盒分页笔记失败:', error)
    throw error // 或者返回一个错误对象,以便渲染进程可以处理
  }
})
// 获取最近编辑的 10 篇笔记
ipcMain.handle('get-recent-edited-notes', async () => {
  try {
    const notes = await getRecentEditedNotes()
    return notes
  } catch (error) {
    console.error('主进程 → 获取最近编辑的笔记失败:', error)
    throw error
  }
})
