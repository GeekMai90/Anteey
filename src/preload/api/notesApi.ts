import { ipcRenderer } from 'electron'
import type {
  Note,
  NoteReference,
  SearchParams,
  GetPaginatedNotesParams,
  TimelineQueryParams,
  TimelineQueryResult,
  CardBox
} from '@shared/types'

export const notesApi = {
  createNote: async (): Promise<Note> => {
    try {
      return (await ipcRenderer.invoke('create-note')) as Note
    } catch (error) {
      console.error('Preload: Failed to create note:', error)
      throw error
    }
  },
  getNote: async (id: string): Promise<Note | undefined> => {
    try {
      return (await ipcRenderer.invoke('get-note', id)) as Note | undefined
    } catch (error) {
      console.error(`Preload: Failed to get note with id ${id}:`, error)
      throw error
    }
  },
  getAllNotes: async (): Promise<Note[]> => {
    try {
      return (await ipcRenderer.invoke('get-all-notes')) as Note[]
    } catch (error) {
      console.error('Preload: Failed to get all notes:', error)
      throw error
    }
  },
  updateNote: async (id: string, updateData: Partial<Note>) => {
    console.log('Preload: 正在更新笔记:', { id, updateData })
    const result = await ipcRenderer.invoke('update-note', { id, updateData })
    if (!result.success) {
      throw new Error(result.error)
    }
    console.log('Preload: 更新笔记成功:', result.note)
    return result.note
  },
  softDeleteNote: async (id: string): Promise<Note> => {
    try {
      return (await ipcRenderer.invoke('soft-delete-note', id)) as Note
    } catch (error) {
      console.error(`Preload: Failed to soft delete note with id ${id}:`, error)
      throw error
    }
  },
  restoreNote: async (id: string): Promise<void> => {
    try {
      return (await ipcRenderer.invoke('restore-note', id)) as void
    } catch (error) {
      console.error(`Preload: Failed to restore note with id ${id}:`, error)
      throw error
    }
  },
  getDeletedNotes: async (): Promise<Note[]> => {
    try {
      return (await ipcRenderer.invoke('get-deleted-notes')) as Note[]
    } catch (error) {
      console.error('Preload: Failed to get deleted notes:', error)
      throw error
    }
  },
  permanentDeleteNote: async (id: string): Promise<boolean> => {
    try {
      return (await ipcRenderer.invoke('permanent-delete-note', id)) as boolean
      console.log('Preload: 永久删除笔记成功:', id)
    } catch (error) {
      console.error(`Preload: 永久删除笔记失败: ${id}:`, error)
      throw error
    }
  },

  getStarredNotes: async (): Promise<Note[]> => {
    try {
      return (await ipcRenderer.invoke('get-starred-notes')) as Note[]
    } catch (error) {
      console.error('Preload: 获取收藏的笔记时出错:', error)
      throw error
    }
  },
  addStarToNote: async (id: string): Promise<Note> => {
    try {
      return (await ipcRenderer.invoke('add-star-to-note', id)) as Note
      console.log('Preload: 添加星标收藏成功:', id)
    } catch (error) {
      console.error('Preload: 添加星标收藏时出错:', error)
      throw error
    }
  },
  removeStarFromNote: async (
    id: string
  ): Promise<{ updatedNote: Note; reorderedNotes: Note[] }> => {
    try {
      return (await ipcRenderer.invoke('remove-star-from-note', id)) as {
        updatedNote: Note
        reorderedNotes: Note[]
      }
      console.log('Preload: 移除星标收藏成功:', id)
    } catch (error) {
      console.error('Preload: 移除星标收藏时出错:', error)
      throw error
    }
  },
  updateStarredNotesOrder: async (
    orders: { id: string; starredOrder: number }[]
  ): Promise<Note[]> => {
    try {
      return (await ipcRenderer.invoke('update-starred-notes-order', orders)) as Note[]
    } catch (error) {
      console.error('Preload: 更新收藏笔记顺序时出错:', error)
      throw error
    }
  },
  // 分页获取笔记
  getPaginatedNotes: async (
    page: number,
    limit: number
  ): Promise<{ notes: Note[]; totalCount: number }> => {
    return (await ipcRenderer.invoke('get-paginated-notes', { page, limit })) as {
      notes: Note[]
      totalCount: number
    }
  },
  // 获取草稿笔记
  getDraftNotes: async (
    page: number,
    limit: number
  ): Promise<{ notes: Note[]; totalCount: number }> => {
    try {
      return (await ipcRenderer.invoke('get-draft-notes', { page, limit })) as {
        notes: Note[]
        totalCount: number
      }
    } catch (error) {
      console.error('预加载脚本 → 获取草稿笔记失败:', error)
      throw error
    }
  },
  // 按日期排序获取笔记
  getNotesByDate: async (
    direction: 'newer' | 'older',
    referenceDate: Date | null,
    limit: number
  ): Promise<{ notes: Note[]; totalCount: number }> => {
    return (await ipcRenderer.invoke('get-notes-by-date', {
      direction,
      referenceDate,
      limit
    })) as { notes: Note[]; totalCount: number }
  },
  // 获取某一天的笔记
  getNotesByOneDate: async (date: string): Promise<Note[]> => {
    return (await ipcRenderer.invoke('get-notes-by-one-date', date)) as Note[]
  },
  // 获取都有哪些日期有笔记
  getAllDatesWithNotes: async (): Promise<string[]> => {
    return (await ipcRenderer.invoke('get-all-dates-with-notes')) as string[]
  },

  // 搜索笔记
  searchNotes: async (
    query: SearchParams
  ): Promise<
    Array<{
      id: string
      title: string
      blocks: Array<{ content: string }>
    }>
  > => {
    return (await ipcRenderer.invoke('search-notes', query)) as Array<{
      id: string
      title: string
      blocks: Array<{ content: string }>
    }>
  },
  // 搜索笔记列表
  searchNotesList: async (query: string): Promise<Note[]> => {
    return (await ipcRenderer.invoke('search-notes-list', query)) as Note[]
  },

  // 获取相关笔记
  // getRelatedNotes: async (noteId: string, limit: number): Promise<RelatedNotesResult> => {
  //   return await ipcRenderer.invoke('get-related-notes', { noteId, limit })
  // },
  // 更新笔记地址
  updateNoteAddress: async (id: string, address: string): Promise<Note> => {
    try {
      const result = await ipcRenderer.invoke('update-note-address', id, address)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.note
    } catch (error) {
      console.error('Preload: 更新笔记地址失败:', error)
      throw error
    }
  },
  // 更新笔记类型
  updateNoteCardType: async (id: string, cardType: string): Promise<Note> => {
    try {
      const result = await ipcRenderer.invoke('update-note-card-type', id, cardType)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.note
    } catch (error) {
      console.error('Preload: 更新笔记类型失败:', error)
      throw error
    }
  },
  // 更新笔记的卡片盒
  updateNoteCardBox: async (id: string, cardBoxId: string): Promise<Note> => {
    try {
      const result = await ipcRenderer.invoke('update-note-card-box', id, cardBoxId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.note
    } catch (error) {
      console.error('Preload: 更新笔记的卡片盒时出错:', error)
      throw error
    }
  },
  getTimelineNotes: async (params: TimelineQueryParams): Promise<TimelineQueryResult> => {
    try {
      const response = await ipcRenderer.invoke('get-timeline-notes', params)
      if (!response.success) {
        throw new Error(response.error)
      }
      return response.result
    } catch (error) {
      console.error('预加载脚本 → 获取时间线笔记失败:', error)
      throw error
    }
  },
  // 创建笔记引用关系
  createNoteReference: async (params: {
    sourceNoteId: string
    targetNoteId: string
    type: 'reference'
    context: {
      text: string
      position: number
    }
    metadata: {
      title: string
      preview: string
    }
  }): Promise<NoteReference> => {
    try {
      const result = await ipcRenderer.invoke('create-note-reference', params)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.reference
    } catch (error) {
      console.error('Preload: 创建笔记引用关系失败:', error)
      throw error
    }
  },
  deleteNoteReference: async (params: {
    sourceNoteId: string
    targetNoteId: string
  }): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-note-reference', params)
      if (!result.success) {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Preload: 删除笔记引用关系失败:', error)
      throw error
    }
  },
  updateNoteTag: async (params: {
    noteId: string
    tagId: string
    action: 'add' | 'remove'
  }): Promise<Note> => {
    try {
      const result = await ipcRenderer.invoke('update-note-tag', params)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.note
    } catch (error) {
      console.error('预加载脚本 → 更新笔记标签失败:', error)
      throw error
    }
  },
  // 获取卡片盒页面的分页笔记
  getPaginatedNotesByCardbox: async (
    params: GetPaginatedNotesParams
  ): Promise<{ notes: Note[]; totalCount: number }> => {
    try {
      return (await ipcRenderer.invoke('get-paginated-notes-by-cardbox', params)) as {
        notes: Note[]
        totalCount: number
      }
    } catch (error) {
      console.error('预加载脚本 → 获取卡片盒分页笔记失败:', error)
      throw error // 或者返回一个默认值,取决于您的错误处理策略
    }
  },
  // 获取最近编辑的 10 篇笔记
  getRecentEditedNotes: async (): Promise<
    {
      id: string
      address: string
      title: string
      cardType: string
    }[]
  > => {
    return (await ipcRenderer.invoke('get-recent-edited-notes')) as {
      id: string
      address: string
      title: string
      cardType: string
    }[]
  },
  createCardBox: async (name: string): Promise<CardBox> => {
    try {
      return (await ipcRenderer.invoke('create-card-box', name)) as CardBox
    } catch (error) {
      console.error('Preload: 创建卡片盒时出错:', error)
      throw error
    }
  },
  getAllCardBoxes: async (): Promise<CardBox[]> => {
    try {
      return (await ipcRenderer.invoke('get-all-card-boxes')) as CardBox[]
    } catch (error) {
      console.error('Preload: 获取所有卡片盒时出错:', error)
      throw error
    }
  },
  updateCardBox: async (id: string, name: string): Promise<CardBox | undefined> => {
    try {
      return (await ipcRenderer.invoke('update-card-box', { id, name })) as CardBox | undefined
    } catch (error) {
      console.error('Preload: 更新卡片盒时出错:', error)
      throw error
    }
  },
  deleteCardBox: async (id: string): Promise<void> => {
    try {
      return (await ipcRenderer.invoke('delete-card-box', id)) as void
    } catch (error) {
      console.error('Preload: 删除卡片盒时出错:', error)
      throw error
    }
  },

  updateNoteContent: async (id: string, content: any): Promise<Note> => {
    try {
      return (await ipcRenderer.invoke('update-note-content', id, content)) as Note
    } catch (error) {
      console.error('Preload: 更新笔记内容时出错:', error)
      throw error
    }
  },
  // 获取随机笔记
  getRandomNotes: async (): Promise<Note[]> => {
    return (await ipcRenderer.invoke('get-random-notes')) as Note[]
  },
  // 将空笔记移到回收站
  moveEmptyNotesToTrash: async (): Promise<void> => {
    await ipcRenderer.invoke('move-empty-notes-to-trash')
  },
  // 获取所有已删除的笔记
  getAllDeletedNotes: async (): Promise<Note[]> => {
    return (await ipcRenderer.invoke('get-all-deleted-notes')) as Note[]
  },

  // 批量移动笔记到卡片盒
  batchMoveNotesToCardBox: async (noteIds: string[], cardBoxId: string | null): Promise<Note[]> => {
    try {
      const result = await ipcRenderer.invoke('batch-move-notes-to-cardbox', { noteIds, cardBoxId })
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.notes
    } catch (error) {
      console.error('预加载脚本 → 批量移动笔记到卡片盒失败:', error)
      throw error
    }
  },

  // 批量设置卡片类型
  batchUpdateNotesCardType: async (noteIds: string[], cardType: string): Promise<Note[]> => {
    try {
      const result = await ipcRenderer.invoke('batch-update-notes-card-type', { noteIds, cardType })
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.notes
    } catch (error) {
      console.error('预加载脚本 → 批量设置卡片类型失败:', error)
      throw error
    }
  },

  batchSoftDeleteNotes: async (noteIds: string[]): Promise<Note[]> => {
    try {
      return (await ipcRenderer.invoke('batch-soft-delete-notes', noteIds)) as Note[]
    } catch (error) {
      console.error('预加载脚本 → 批量软删除笔记失败:', error)
      throw error
    }
  },

  // 切换笔记的索引状态
  toggleNoteIndex: async (noteId: string): Promise<Note> => {
    try {
      const result = await ipcRenderer.invoke('toggle-note-index', noteId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.note
    } catch (error) {
      console.error('预加载脚本 → 切换笔记索引状态失败:', error)
      throw error
    }
  },

  // 获取所有索引笔记（按首字母分组）
  getIndexedNotes: async (): Promise<Record<string, Note[]>> => {
    try {
      const result = await ipcRenderer.invoke('get-indexed-notes')
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.notes
    } catch (error) {
      console.error('预加载脚本 → 获取索引笔记失败:', error)
      throw error
    }
  },

  // 更新索引笔记的顺序
  updateIndexOrder: async (
    updates: Array<{
      noteId: string
      firstLetter: string
      order: number
    }>
  ): Promise<Note[]> => {
    try {
      const result = await ipcRenderer.invoke('update-index-order', updates)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.notes
    } catch (error) {
      console.error('预加载脚本 → 更新索引笔记顺序失败:', error)
      throw error
    }
  },

  // 批量添加到索引
  batchAddToIndex: async (noteIds: string[]): Promise<Note[]> => {
    try {
      const result = await ipcRenderer.invoke('batch-add-to-index', noteIds)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.notes
    } catch (error) {
      console.error('预加载脚本 → 批量添加到索引失败:', error)
      throw error
    }
  },

  // 批量移除索引
  batchRemoveFromIndex: async (noteIds: string[]): Promise<Note[]> => {
    try {
      const result = await ipcRenderer.invoke('batch-remove-from-index', noteIds)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.notes
    } catch (error) {
      console.error('预加载脚本 → 批量移除索引失败:', error)
      throw error
    }
  },

  // 获取特定首字母的索引笔记
  getIndexedNotesByLetter: async (letter: string): Promise<Note[]> => {
    try {
      const result = await ipcRenderer.invoke('get-indexed-notes-by-letter', letter)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.notes
    } catch (error) {
      console.error('预加载脚本 → 获取特定首字母的索引笔记失败:', error)
      throw error
    }
  },

  // 复制笔记地址到剪贴板
  copyNoteAddress: async (noteId: string): Promise<string> => {
    try {
      const result = await ipcRenderer.invoke('copy-note-address', noteId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.address
    } catch (error) {
      console.error('预加载脚本 → 复制笔记地址到剪贴板失败:', error)
      throw error
    }
  },

  // 获取重复地址的笔记
  getNotesByDuplicateAddress: async (): Promise<{ [key: string]: Note[] }> => {
    try {
      return (await ipcRenderer.invoke('get-notes-by-duplicate-address')) as {
        [key: string]: Note[]
      }
    } catch (error) {
      console.error('预加载脚本 → 获取重复地址笔记失败:', error)
      throw error
    }
  },

  // 获取编码地址不符合规则的笔记
  getInvalidAddressNotes: async (): Promise<Note[]> => {
    try {
      return (await ipcRenderer.invoke('get-invalid-address-notes')) as Note[]
    } catch (error) {
      console.error('预加载脚本 → 获取编码地址不符合规则的笔记失败:', error)
      throw error
    }
  },

  // 获取无编码地址的笔记
  getNotesWithoutAddress: async (): Promise<Note[]> => {
    try {
      return (await ipcRenderer.invoke('get-notes-without-address')) as Note[]
    } catch (error) {
      console.error('预加载脚本 → 获取无编码地址的笔记失败:', error)
      throw error
    }
  }
}
