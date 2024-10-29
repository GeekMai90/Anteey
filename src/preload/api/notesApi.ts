import { ipcRenderer } from 'electron'
import { Note, RelatedNotesResult } from '../../renderer/src/types/Note'
import { GetPaginatedNotesParams } from '../../db/notes'
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
  getAllNotes: async (includeDeleted: boolean): Promise<Note[]> => {
    try {
      return (await ipcRenderer.invoke('get-all-notes', includeDeleted)) as Note[]
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
  updateNoteCardBox: async (noteId: string, cardBoxId: string): Promise<Note> => {
    try {
      return (await ipcRenderer.invoke('update-note-card-box', noteId, cardBoxId)) as Note
      console.log('Preload: 更新笔记的卡片盒成功:', noteId, cardBoxId)
    } catch (error) {
      console.error('Preload: 更新笔记的卡片盒时出错:', error)
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
  // 搜索笔记
  searchNotes: async (
    query: string
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
  // 获取热力图数据
  getHeatmapData: async (): Promise<{ date: string; count: number }[]> => {
    return (await ipcRenderer.invoke('get-heatmap-data')) as { date: string; count: number }[]
  },
  // 获取笔记总数量
  getNoteCount: async (): Promise<number> => {
    return (await ipcRenderer.invoke('get-note-count')) as number
  },
  // 获取昨日笔记数量
  getLastDayNoteCount: async (): Promise<number> => {
    return (await ipcRenderer.invoke('get-last-day-note-count')) as number
  },
  // 获取相关笔记
  getRelatedNotes: async (noteId: string, limit: number): Promise<RelatedNotesResult> => {
    return await ipcRenderer.invoke('get-related-notes', { noteId, limit })
  }
}
