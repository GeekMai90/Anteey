import { ipcRenderer } from 'electron'
import { CardType, Note, NoteReference } from '../../renderer/src/types/Note'
import { IpcResponse } from '../../main/types/ipc'
import {
  CommonPaginationParams,
  DailyNoteStats,
  DateQueryParams,
  DateQueryResult,
  GetPaginatedNotesParams,
  PaginatedResult,
  PaginationResult,
  RandomNotesParams,
  SearchResult,
  TimelineQueryParams,
  TimelineQueryResult,
  UserUsageStats
} from '../../db/notesService'
export const notesApi = {
  // 获取所有已删除的笔记
  getDeletedNotes: async (): Promise<Note[]> => {
    try {
      const response = (await ipcRenderer.invoke('get-deleted-notes')) as IpcResponse<Note[]>
      if (!response.success) {
        throw new Error(response.error)
      }
      return response.data!
    } catch (error) {
      console.error('预加载脚本 → 获取已删除笔记失败:', error)
      throw error
    }
  },
  // 分页获取已删除的笔记
  getDeletedNotesByPage: async (
    page: number,
    pageSize: number
  ): Promise<{
    notes: Note[]
    total: number
  }> => {
    try {
      const response = (await ipcRenderer.invoke('get-deleted-notes-by-page', {
        page,
        pageSize
      })) as IpcResponse<{
        notes: Note[]
        total: number
      }>
      if (!response.success) {
        throw new Error(response.error)
      }
      return response.data!
    } catch (error) {
      console.error('预加载脚本 → 获取已删除笔记失败:', error)
      throw error
    }
  },
  // 软删除笔记
  softDeleteNote: async (id: string): Promise<Note> => {
    try {
      const response = (await ipcRenderer.invoke('soft-delete-note', id)) as IpcResponse<Note>
      if (!response.success) {
        throw new Error(response.error)
      }
      return response.data!
    } catch (error) {
      console.error('预加载脚本 → 软删除笔记失败:', error)
      throw error
    }
  },
  // 恢复已删除的笔记
  restoreNote: async (id: string): Promise<Note> => {
    try {
      const response = (await ipcRenderer.invoke('restore-note', id)) as IpcResponse<Note>
      if (!response.success) {
        throw new Error(response.error)
      }
      return response.data!
    } catch (error) {
      console.error('预加载脚本 → 恢复笔记失败:', error)
      throw error
    }
  },
  // 永久删除笔记
  permanentDeleteNote: async (id: string): Promise<void> => {
    try {
      const response = (await ipcRenderer.invoke('permanent-delete-note', id)) as IpcResponse<void>
      if (!response.success) {
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('预加载脚本 → 永久删除笔记失败:', error)
      throw error
    }
  },
  // 移动空笔记到回收站
  moveEmptyNotesToTrash: async (): Promise<void> => {
    try {
      const response = (await ipcRenderer.invoke('move-empty-notes-to-trash')) as IpcResponse<void>
      if (!response.success) {
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('预加载脚本 → 移动空笔记到回收站失败:', error)
      throw error
    }
  },
  // 创建笔记
  createNote: async (): Promise<Note> => {
    try {
      const response = (await ipcRenderer.invoke('create-note')) as IpcResponse<Note>
      if (!response.success) {
        throw new Error(response.error)
      }
      return response.data!
    } catch (error) {
      console.error('预加载脚本 → 创建笔记失败:', error)
      throw error
    }
  },
  // 更新笔记地址
  updateNoteAddress: async (id: string, address: string): Promise<void> => {
    try {
      const response = (await ipcRenderer.invoke('update-note-address', {
        id,
        address
      })) as IpcResponse<void>
      if (!response.success) {
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('预加载脚本 → 更新笔记地址失败:', error)
      throw error
    }
  },
  // 更新笔记类型
  updateNoteCardType: async (id: string, cardType: CardType): Promise<void> => {
    try {
      const response = (await ipcRenderer.invoke('update-note-card-type', {
        id,
        cardType
      })) as IpcResponse<void>
      if (!response.success) {
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('预加载脚本 → 更新笔记类型失败:', error)
      throw error
    }
  },
  // 更新笔记的卡片盒
  updateNoteCardBox: async (id: string, cardBoxId: string | null): Promise<void> => {
    try {
      const response = (await ipcRenderer.invoke('update-note-card-box', {
        id,
        cardBoxId
      })) as IpcResponse<void>
      if (!response.success) {
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('预加载脚本 → 更新笔记卡片盒失败:', error)
      throw error
    }
  },
  // 更新笔记内容
  updateNoteContent: async (id: string, content: object): Promise<void> => {
    try {
      const response = (await ipcRenderer.invoke('update-note-content', {
        id,
        content
      })) as IpcResponse<void>
      if (!response.success) {
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('预加载脚本 → 更新笔记内容失败:', error)
      throw error
    }
  },
  // 更新笔记标签
  updateNoteTags: async (id: string, tags: string[]): Promise<void> => {
    try {
      const response = (await ipcRenderer.invoke('update-note-tags', {
        id,
        tags
      })) as IpcResponse<void>
      if (!response.success) {
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('预加载脚本 → 更新笔记标签失败:', error)
      throw error
    }
  },
  // 更新笔记引用关系
  updateNoteReferences: async (
    id: string,
    references: {
      outgoing: NoteReference[]
      incoming: NoteReference[]
    }
  ): Promise<void> => {
    try {
      const response = (await ipcRenderer.invoke('update-note-references', {
        id,
        references
      })) as IpcResponse<void>
      if (!response.success) {
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('预加载脚本 → 更新笔记引用关系失败:', error)
      throw error
    }
  },
  // 更新笔记关系树
  updateNoteRelationshipTree: async (
    id: string,
    relationshipTree: {
      parents: string[]
      children: string[]
      siblings: string[]
    }
  ): Promise<void> => {
    try {
      const response = (await ipcRenderer.invoke('update-note-relationship-tree', {
        id,
        relationshipTree
      })) as IpcResponse<void>
      if (!response.success) {
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('预加载脚本 → 更新笔记关系树失败:', error)
      throw error
    }
  },
  // 更新笔记图谱数据
  updateNoteGraphData: async (
    id: string,
    graphData: {
      x: number
      y: number
    }
  ): Promise<void> => {
    try {
      const response = (await ipcRenderer.invoke('update-note-graph-data', {
        id,
        graphData
      })) as IpcResponse<void>
      if (!response.success) {
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('预加载脚本 → 更新笔记图谱数据失败:', error)
      throw error
    }
  },
  // 更新笔记父节点
  updateNoteParent: async (id: string, parentId: string | null): Promise<void> => {
    try {
      const response = (await ipcRenderer.invoke('update-note-parent', {
        id,
        parentId
      })) as IpcResponse<void>
      if (!response.success) {
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('预加载脚本 → 更新笔记父节点失败:', error)
      throw error
    }
  },
  // 更新笔记收藏状态

  updateNoteStarred: async (id: string, isStarred: boolean): Promise<boolean> => {
    try {
      const response = (await ipcRenderer.invoke('update-note-starred', {
        id,
        isStarred
      })) as IpcResponse<boolean>
      if (!response.success) {
        throw new Error(response.error)
      }
      return response.data!
    } catch (error) {
      console.error('预加载脚本 → 更新笔记收藏状态失败:', error)
      throw error
    }
  },
  // 更新收藏笔记顺序
  updateStarredNotesOrder: async (
    orders: { id: string; starredOrder: number }[]
  ): Promise<void> => {
    try {
      const response = (await ipcRenderer.invoke(
        'update-starred-notes-order',
        orders
      )) as IpcResponse<void>
      if (!response.success) {
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('预加载脚本 → 更新收藏笔记顺序失败:', error)
      throw error
    }
  },
  // 更新笔记元数据
  updateNoteMetadata: async (
    id: string,
    metadata: {
      title?: string
      summary?: string
    }
  ): Promise<void> => {
    try {
      const response = (await ipcRenderer.invoke('update-note-metadata', {
        id,
        metadata
      })) as IpcResponse<void>
      if (!response.success) {
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('预加载脚本 → 更新笔记元数据失败:', error)
      throw error
    }
  },
  // 获取单条笔记
  getNoteById: async (id: string): Promise<Note> => {
    try {
      const response = (await ipcRenderer.invoke('get-note-by-id', id)) as IpcResponse<Note>
      if (!response.success) {
        throw new Error(response.error)
      }
      return response.data!
    } catch (error) {
      console.error('预加载脚本 → 获取笔记失败:', error)
      throw error
    }
  },
  // 获取所有笔记
  getAllNotes: async (options?: {
    includeDeleted?: boolean
    orderBy?: 'createdAt' | 'updatedAt'
    order?: 'asc' | 'desc'
  }): Promise<Note[]> => {
    try {
      const response = (await ipcRenderer.invoke('get-all-notes', options)) as IpcResponse<Note[]>
      if (!response.success) {
        throw new Error(response.error)
      }
      return response.data!
    } catch (error) {
      console.error('预加载脚本 → 获取所有笔记失败:', error)
      throw error
    }
  },
  // 获取收藏的笔记
  getStarredNotes: async (): Promise<IpcResponse<Note[]>> => {
    try {
      console.log('预加载脚本 → 获取收藏笔记')
      const response = (await ipcRenderer.invoke('get-starred-notes')) as IpcResponse<Note[]>

      if (!response) {
        return {
          success: false,
          error: '获取收藏笔记失败: 无效响应'
        }
      }

      console.log('预加载脚本 → 获取收藏笔记结果:', response)
      return response
    } catch (error) {
      console.error('预加载脚本 → 获取收藏笔记失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取收藏笔记失败'
      }
    }
  },
  // 获取卡片盒分页笔记
  getPaginatedNotesByCardbox: async (params: GetPaginatedNotesParams): Promise<PaginatedResult> => {
    try {
      const response = (await ipcRenderer.invoke(
        'get-paginated-notes-by-cardbox',
        params
      )) as IpcResponse<PaginatedResult>

      if (!response.success) {
        throw new Error(response.error)
      }
      return response.data!
    } catch (error) {
      console.error('预加载脚本 → 获取分页笔记失败:', error)
      throw error
    }
  },
  // 获取时间线笔记
  getTimelineNotes: async (params: TimelineQueryParams): Promise<TimelineQueryResult> => {
    try {
      const response = (await ipcRenderer.invoke(
        'get-timeline-notes',
        params
      )) as IpcResponse<TimelineQueryResult>

      if (!response.success) {
        throw new Error(response.error)
      }
      return response.data!
    } catch (error) {
      console.error('预加载脚本 → 获取时间线笔记失败:', error)
      throw error
    }
  },
  // 获取分页笔记（通用）
  getPaginatedNotes: async (params: CommonPaginationParams): Promise<PaginationResult> => {
    try {
      const response = (await ipcRenderer.invoke(
        'get-paginated-notes',
        params
      )) as IpcResponse<PaginationResult>

      if (!response.success) {
        throw new Error(response.error)
      }
      return response.data!
    } catch (error) {
      console.error('预加载脚本 → 获取分页笔记失败:', error)
      throw error
    }
  },
  // 获取有笔记的日期
  getAllDatesWithNotes: async (params?: DateQueryParams): Promise<DateQueryResult> => {
    try {
      const response = (await ipcRenderer.invoke(
        'get-all-dates-with-notes',
        params
      )) as IpcResponse<DateQueryResult>

      if (!response.success) {
        throw new Error(response.error)
      }
      return response.data!
    } catch (error) {
      console.error('预加载脚本 → 获取有笔记的日期失败:', error)
      throw error
    }
  },
  // 获取随机笔记
  getRandomNotes: async (params?: RandomNotesParams): Promise<Note[]> => {
    try {
      const response = (await ipcRenderer.invoke('get-random-notes', params)) as IpcResponse<Note[]>

      if (!response.success) {
        throw new Error(response.error)
      }
      return response.data!
    } catch (error) {
      console.error('预加载脚本 → 获取随机笔记失败:', error)
      throw error
    }
  },
  // 获取用户使用统计
  getUserUsageStats: async (): Promise<UserUsageStats> => {
    try {
      const response = (await ipcRenderer.invoke(
        'get-user-usage-stats'
      )) as IpcResponse<UserUsageStats>

      if (!response.success) {
        throw new Error(response.error)
      }
      return response.data!
    } catch (error) {
      console.error('预加载脚本 → 获取用户使用统计失败:', error)
      throw error
    }
  },
  // 获取昨日笔记统计
  getLastDayNoteStats: async (): Promise<DailyNoteStats> => {
    try {
      const response = (await ipcRenderer.invoke(
        'get-last-day-note-stats'
      )) as IpcResponse<DailyNoteStats>

      if (!response.success) {
        throw new Error(response.error)
      }
      return response.data!
    } catch (error) {
      console.error('预加载脚本 → 获取昨日笔记统计失败:', error)
      throw error
    }
  },
  // 获取热力图数据
  getHeatmapData: async (): Promise<{ date: string; count: number }[]> => {
    try {
      const response = (await ipcRenderer.invoke('get-heatmap-data')) as IpcResponse<
        { date: string; count: number }[]
      >

      if (!response.success) {
        throw new Error(response.error)
      }
      return response.data!
    } catch (error) {
      console.error('预加载脚本 → 获取热力图数据失败:', error)
      throw error
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
    try {
      const response = (await ipcRenderer.invoke('search-notes', query)) as IpcResponse<
        SearchResult[]
      >

      if (!response.success) {
        throw new Error(response.error)
      }
      return response.data!
    } catch (error) {
      console.error('预加载脚本 → 搜索笔记失败:', error)
      throw error
    }
  },
  // 搜索笔记列表
  searchNotesList: async (query: string): Promise<Note[]> => {
    try {
      const response = (await ipcRenderer.invoke('search-notes-list', query)) as IpcResponse<Note[]>

      if (!response.success) {
        throw new Error(response.error)
      }
      return response.data!
    } catch (error) {
      console.error('预加载脚本 → 搜索笔记列表失败:', error)
      throw error
    }
  }
}
