import { ipcMain } from 'electron'
import {
  CommonPaginationParams,
  createNote,
  DailyNoteStats,
  DateQueryParams,
  DateQueryResult,
  getAllDatesWithNotes,
  getAllDeletedNotes,
  getAllNotes,
  getDeletedNotes,
  getHeatmapData,
  getLastDayNoteStats,
  getNoteById,
  getPaginatedNotes,
  getPaginatedNotesByCardbox,
  GetPaginatedNotesParams,
  getRandomNotes,
  getStarredNotes,
  getTimelineNotes,
  getUserUsageStats,
  moveEmptyNotesToTrash,
  PaginatedResult,
  PaginationResult,
  permanentDeleteNote,
  RandomNotesParams,
  restoreNote,
  softDeleteNote,
  TimelineQueryParams,
  TimelineQueryResult,
  updateNoteAddress,
  updateNoteCardBox,
  updateNoteCardType,
  updateNoteContent,
  updateNoteGraphData,
  updateNoteMetadata,
  updateNoteParent,
  updateNoteReferences,
  updateNoteRelationshipTree,
  updateNoteStarred,
  updateNoteTags,
  updateStarredNotesOrder,
  UserUsageStats,
  SearchResult,
  searchNotes,
  searchNotesList
} from '../../db/notesService'
import { IpcResponse } from '../types/ipc'
import { CardType, Note, NoteReference } from '@renderer/types/Note'

export function setupNotesHandlers() {
  // 获取所有已删除的笔记
  ipcMain.handle('get-deleted-notes', async (): Promise<IpcResponse<Note[]>> => {
    try {
      const notes = await getAllDeletedNotes()
      return { success: true, data: notes }
    } catch (error) {
      console.error('主进程 → 获取所有已删除的笔记失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取已删除笔记失败'
      }
    }
  })
  // 分页获取已删除的笔记
  ipcMain.handle(
    'get-deleted-notes-by-page',
    async (
      _,
      { page, pageSize }: { page: number; pageSize: number }
    ): Promise<
      IpcResponse<{
        notes: Note[]
        total: number
      }>
    > => {
      try {
        const result = await getDeletedNotes(page, pageSize)
        return { success: true, data: result }
      } catch (error) {
        console.error('主进程 → 获取已删除的笔记失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '获取已删除笔记失败'
        }
      }
    }
  )
  // 软删除笔记
  ipcMain.handle('soft-delete-note', async (_, id: string): Promise<IpcResponse<Note>> => {
    try {
      const updatedNote = await softDeleteNote(id)
      return {
        success: true,
        data: updatedNote
      }
    } catch (error) {
      console.error('主进程 → 软删除笔记失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '软删除笔记失败'
      }
    }
  })
  // 恢复已删除的笔记
  ipcMain.handle('restore-note', async (_, id: string): Promise<IpcResponse<Note>> => {
    try {
      const restoredNote = await restoreNote(id)
      return {
        success: true,
        data: restoredNote
      }
    } catch (error) {
      console.error('主进程 → 恢复笔记失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '恢复笔记失败'
      }
    }
  })
  // 永久删除笔记
  ipcMain.handle('permanent-delete-note', async (_, id: string): Promise<IpcResponse<void>> => {
    try {
      await permanentDeleteNote(id)
      return {
        success: true
      }
    } catch (error) {
      console.error('主进程 → 永久删除笔记失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '永久删除笔记失败'
      }
    }
  })
  // 移动空笔记到回收站
  ipcMain.handle('move-empty-notes-to-trash', async (): Promise<IpcResponse<void>> => {
    try {
      await moveEmptyNotesToTrash()
      return {
        success: true
      }
    } catch (error) {
      console.error('主进程 → 移动空笔记到回收站失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '移动空笔记到回收站失败'
      }
    }
  })
  // 创建笔记
  ipcMain.handle('create-note', async (): Promise<IpcResponse<Note>> => {
    try {
      const newNote = await createNote()
      return {
        success: true,
        data: newNote
      }
    } catch (error) {
      console.error('主进程 → 创建笔记失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建笔记失败'
      }
    }
  })
  // 更新笔记地址
  ipcMain.handle(
    'update-note-address',
    async (_, { id, address }: { id: string; address: string }): Promise<IpcResponse<void>> => {
      try {
        await updateNoteAddress(id, address)
        return {
          success: true
        }
      } catch (error) {
        console.error('主进程 → 更新笔记地址失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '更新笔记地址失败'
        }
      }
    }
  )
  // 更新笔记类型
  ipcMain.handle(
    'update-note-card-type',
    async (_, { id, cardType }: { id: string; cardType: CardType }): Promise<IpcResponse<void>> => {
      try {
        await updateNoteCardType(id, cardType)
        return {
          success: true
        }
      } catch (error) {
        console.error('主进程 → 更新笔记类型失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '更新笔记类型失败'
        }
      }
    }
  )
  // 更新笔记的卡片盒
  ipcMain.handle(
    'update-note-card-box',
    async (
      _,
      { id, cardBoxId }: { id: string; cardBoxId: string | null }
    ): Promise<IpcResponse<void>> => {
      try {
        await updateNoteCardBox(id, cardBoxId)
        return {
          success: true
        }
      } catch (error) {
        console.error('主进程 → 更新笔记卡片盒失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '更新笔记卡片盒失败'
        }
      }
    }
  )
  // 更新笔记内容
  ipcMain.handle(
    'update-note-content',
    async (_, { id, content }: { id: string; content: object }): Promise<IpcResponse<void>> => {
      try {
        await updateNoteContent(id, content)
        return {
          success: true
        }
      } catch (error) {
        console.error('主进程 → 更新笔记内容失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '更新笔记内容失败'
        }
      }
    }
  )
  // 更新笔记标签
  ipcMain.handle(
    'update-note-tags',
    async (_, { id, tags }: { id: string; tags: string[] }): Promise<IpcResponse<void>> => {
      try {
        await updateNoteTags(id, tags)
        return {
          success: true
        }
      } catch (error) {
        console.error('主进程 → 更新笔记标签失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '更新笔记标签失败'
        }
      }
    }
  )
  // 更新笔记引用关系
  ipcMain.handle(
    'update-note-references',
    async (
      _,
      {
        id,
        references
      }: {
        id: string
        references: {
          outgoing: NoteReference[]
          incoming: NoteReference[]
        }
      }
    ): Promise<IpcResponse<void>> => {
      try {
        await updateNoteReferences(id, references)
        return {
          success: true
        }
      } catch (error) {
        console.error('主进程 → 更新笔记引用关系失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '更新笔记引用关系失败'
        }
      }
    }
  )
  // 更新笔记关系树
  ipcMain.handle(
    'update-note-relationship-tree',
    async (
      _,
      {
        id,
        relationshipTree
      }: {
        id: string
        relationshipTree: {
          parents: string[]
          children: string[]
          siblings: string[]
        }
      }
    ): Promise<IpcResponse<void>> => {
      try {
        await updateNoteRelationshipTree(id, relationshipTree)
        return {
          success: true
        }
      } catch (error) {
        console.error('主进程 → 更新笔记关系树失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '更新笔记关系树失败'
        }
      }
    }
  )
  // 更新笔记图谱数据
  ipcMain.handle(
    'update-note-graph-data',
    async (
      _,
      {
        id,
        graphData
      }: {
        id: string
        graphData: {
          x: number
          y: number
        }
      }
    ): Promise<IpcResponse<void>> => {
      try {
        await updateNoteGraphData(id, graphData)
        return {
          success: true
        }
      } catch (error) {
        console.error('主进程 → 更新笔记图谱数据失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '更新笔记图谱数据失败'
        }
      }
    }
  )
  // 更新笔记父节点
  ipcMain.handle(
    'update-note-parent',
    async (
      _,
      {
        id,
        parentId
      }: {
        id: string
        parentId: string | null
      }
    ): Promise<IpcResponse<void>> => {
      try {
        await updateNoteParent(id, parentId)
        return {
          success: true
        }
      } catch (error) {
        console.error('主进程 → 更新笔记父节点失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '更新笔记父节点失败'
        }
      }
    }
  )
  // 更新笔记收藏状态
  ipcMain.handle(
    'update-note-starred',
    async (
      _,
      {
        id,
        isStarred
      }: {
        id: string
        isStarred: boolean
      }
    ): Promise<IpcResponse<boolean>> => {
      try {
        const finalStarredState = await updateNoteStarred(id, isStarred)
        return {
          success: true,
          data: finalStarredState
        }
      } catch (error) {
        console.error('主进程 → 更新笔记收藏状态失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '更新笔记收藏状态失败'
        }
      }
    }
  )
  // 更新收藏笔记顺序
  ipcMain.handle(
    'update-starred-notes-order',
    async (_, orders: { id: string; starredOrder: number }[]): Promise<IpcResponse<void>> => {
      try {
        await updateStarredNotesOrder(orders)
        return {
          success: true
        }
      } catch (error) {
        console.error('主进程 → 更新收藏笔记顺序失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '更新收藏笔记顺序失败'
        }
      }
    }
  )
  // 更新笔记元数据
  ipcMain.handle(
    'update-note-metadata',
    async (
      _,
      {
        id,
        metadata
      }: {
        id: string
        metadata: {
          title?: string
          summary?: string
        }
      }
    ): Promise<IpcResponse<void>> => {
      try {
        await updateNoteMetadata(id, metadata)
        return {
          success: true
        }
      } catch (error) {
        console.error('主进程 → 更新笔记元数据失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '更新笔记元数据失败'
        }
      }
    }
  )
  // 获取单条笔记
  ipcMain.handle('get-note-by-id', async (_, id: string): Promise<IpcResponse<Note>> => {
    try {
      const note = await getNoteById(id)
      return {
        success: true,
        data: note
      }
    } catch (error) {
      console.error('主进程 → 获取笔记失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取笔记失败'
      }
    }
  })
  // 获取所有笔记
  ipcMain.handle(
    'get-all-notes',
    async (
      _,
      options?: {
        includeDeleted?: boolean
        orderBy?: 'createdAt' | 'updatedAt'
        order?: 'asc' | 'desc'
      }
    ): Promise<IpcResponse<Note[]>> => {
      try {
        const notes = await getAllNotes(options)
        return {
          success: true,
          data: notes
        }
      } catch (error) {
        console.error('主进程 → 获取所有笔记失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '获取所有笔记失败'
        }
      }
    }
  )
  // 获取收藏的笔记
  ipcMain.handle('get-starred-notes', async (): Promise<IpcResponse<Note[]>> => {
    try {
      console.log('主进程 → 获取收藏笔记')
      const notes = await getStarredNotes()
      console.log('主进程 → 获取收藏笔记成功:', notes)
      return {
        success: true,
        data: notes
      }
    } catch (error) {
      console.error('主进程 → 获取收藏笔记失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取收藏笔记失败'
      }
    }
  })
  // 获取卡片盒分页笔记
  ipcMain.handle(
    'get-paginated-notes-by-cardbox',
    async (_, params: GetPaginatedNotesParams): Promise<IpcResponse<PaginatedResult>> => {
      try {
        const result = await getPaginatedNotesByCardbox(params)
        return {
          success: true,
          data: result
        }
      } catch (error) {
        console.error('主进程 → 获取分页笔记失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '获取分页笔记失败'
        }
      }
    }
  )
  // 获取时间线笔记
  ipcMain.handle(
    'get-timeline-notes',
    async (_, params: TimelineQueryParams): Promise<IpcResponse<TimelineQueryResult>> => {
      try {
        const result = await getTimelineNotes(params)
        return {
          success: true,
          data: result
        }
      } catch (error) {
        console.error('主进程 → 获取时间线笔记失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '获取时间线笔记失败'
        }
      }
    }
  )
  // 获取分页笔记（通用）
  ipcMain.handle(
    'get-paginated-notes',
    async (_, params: CommonPaginationParams): Promise<IpcResponse<PaginationResult>> => {
      try {
        const result = await getPaginatedNotes(params)
        return {
          success: true,
          data: result
        }
      } catch (error) {
        console.error('主进程 → 获取分页笔记失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '获取分页笔记失败'
        }
      }
    }
  )
  // 获取有笔记的日期
  ipcMain.handle(
    'get-all-dates-with-notes',
    async (_, params?: DateQueryParams): Promise<IpcResponse<DateQueryResult>> => {
      try {
        const result = await getAllDatesWithNotes(params)
        return {
          success: true,
          data: result
        }
      } catch (error) {
        console.error('主进程 → 获取有笔记的日期失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '获取有笔记的日期失败'
        }
      }
    }
  )
  // 获取随机笔记
  ipcMain.handle(
    'get-random-notes',
    async (_, params?: RandomNotesParams): Promise<IpcResponse<Note[]>> => {
      try {
        const notes = await getRandomNotes(params)
        return {
          success: true,
          data: notes
        }
      } catch (error) {
        console.error('主进程 → 获取随机笔记失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '获取随机笔记失败'
        }
      }
    }
  )
  // 获取用户使用统计
  ipcMain.handle('get-user-usage-stats', async (): Promise<IpcResponse<UserUsageStats>> => {
    try {
      const stats = await getUserUsageStats()
      return {
        success: true,
        data: stats
      }
    } catch (error) {
      console.error('主进程 → 获取用户使用统计失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取用户使用统计失败'
      }
    }
  })
  // 获取昨日笔记统计
  ipcMain.handle('get-last-day-note-stats', async (): Promise<IpcResponse<DailyNoteStats>> => {
    try {
      const stats = await getLastDayNoteStats()
      return {
        success: true,
        data: stats
      }
    } catch (error) {
      console.error('主进程 → 获取昨日笔记统计失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取昨日笔记统计失败'
      }
    }
  })
  // 获取热力图数据
  ipcMain.handle(
    'get-heatmap-data',
    async (): Promise<IpcResponse<{ date: string; count: number }[]>> => {
      try {
        const data = await getHeatmapData()
        return {
          success: true,
          data
        }
      } catch (error) {
        console.error('主进程 → 获取热力图数据失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '获取热力图数据失败'
        }
      }
    }
  )

  // 搜索笔记
  ipcMain.handle('search-notes', async (_, query: string): Promise<IpcResponse<SearchResult[]>> => {
    try {
      const results = await searchNotes(query)
      return {
        success: true,
        data: results
      }
    } catch (error) {
      console.error('主进程 → 搜索笔记失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '搜索笔记失败'
      }
    }
  })

  // 搜索笔记列表
  ipcMain.handle('search-notes-list', async (_, query: string): Promise<IpcResponse<Note[]>> => {
    try {
      const notes = await searchNotesList(query)
      return {
        success: true,
        data: notes
      }
    } catch (error) {
      console.error('主进程 → 搜索笔记列表失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '搜索笔记列表失败'
      }
    }
  })
}
