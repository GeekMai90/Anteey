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
} from '../../../db/notesService'
import {
  Note,
  CardBox,
  Whiteboard,
  CreateWhiteboardInput,
  CreateWhiteboardNoteInput,
  WhiteboardNote,
  RootWhiteboard,
  Connection,
  WhiteboardGroup,
  ConnectionCreateData,
  RelatedNotesResult,
  CardType,
  NoteReference
} from './Note'
import { UpdateUserSettings, UserSettings } from './UserSettings'

export interface ElectronAPI {
  // 获取所有已删除的笔记
  getDeletedNotes: () => Promise<Note[]>
  // 分页获取已删除的笔记
  getDeletedNotesByPage: (
    page: number,
    pageSize: number
  ) => Promise<{
    notes: Note[]
    total: number
  }>
  // 软删除笔记
  softDeleteNote: (id: string) => Promise<Note>
  // 恢复已删除的笔记
  restoreNote: (id: string) => Promise<Note>
  // 永久删除笔记
  permanentDeleteNote: (id: string) => Promise<boolean>
  // 移动空笔记到回收站
  moveEmptyNotesToTrash: () => Promise<void>
  // 创建笔记
  createNote: () => Promise<Note>
  // 更新笔记地址
  updateNoteAddress: (id: string, address: string) => Promise<void>
  // 更新笔记类型
  updateNoteCardType: (id: string, cardType: CardType) => Promise<void>
  // 更新笔记的卡片盒
  updateNoteCardBox: (id: string, cardBoxId: string | null) => Promise<void>
  // 更新笔记内容
  updateNoteContent: (id: string, content: object) => Promise<void>
  // 更新笔记标签
  updateNoteTags: (id: string, tags: string[]) => Promise<void>
  // 更新笔记引用关系
  updateNoteReferences: (
    id: string,
    references: {
      outgoing: NoteReference[]
      incoming: NoteReference[]
    }
  ) => Promise<void>
  // 更新笔记关系树
  updateNoteRelationshipTree: (
    id: string,
    relationshipTree: {
      parents: string[]
      children: string[]
      siblings: string[]
    }
  ) => Promise<void>
  // 更新笔记图谱数据
  updateNoteGraphData: (
    id: string,
    graphData: {
      x: number
      y: number
    }
  ) => Promise<void>
  // 更新笔记父节点
  updateNoteParent: (id: string, parentId: string | null) => Promise<void>
  // 更新笔记收藏状态
  updateNoteStarred: (id: string, isStarred: boolean) => Promise<boolean>
  // 更新收藏笔记顺序
  updateStarredNotesOrder: (orders: { id: string; starredOrder: number }[]) => Promise<void>
  // 更新笔记元数据
  updateNoteMetadata: (id: string, metadata: { title?: string; summary?: string }) => Promise<void>
  // 获取单条笔记
  getNoteById: (id: string) => Promise<Note>
  // 获取所有笔记
  getAllNotes: (options?: {
    includeDeleted?: boolean
    orderBy?: 'createdAt' | 'updatedAt'
    order?: 'asc' | 'desc'
  }) => Promise<Note[]>
  // 获取收藏的笔记
  getStarredNotes: () => Promise<{ success: boolean; data?: Note[]; error?: string }>
  // 获取分页的笔记
  getPaginatedNotesByCardbox: (params: GetPaginatedNotesParams) => Promise<PaginatedResult>
  // 获取时间线笔记
  getTimelineNotes: (params: TimelineQueryParams) => Promise<TimelineQueryResult>
  // 获取分页笔记（通用）
  getPaginatedNotes: (params: CommonPaginationParams) => Promise<PaginationResult>
  // 获取有笔记的日期
  getAllDatesWithNotes: (params?: DateQueryParams) => Promise<DateQueryResult>
  // 获取随机笔记
  getRandomNotes: (params?: RandomNotesParams) => Promise<Note[]>
  // 获取用户使用统计
  getUserUsageStats: () => Promise<UserUsageStats>
  // 获取昨日笔记统计
  getLastDayNoteStats: () => Promise<DailyNoteStats>
  // 获取热力图数据
  getHeatmapData: () => Promise<{ date: string; count: number }[]>
  // 搜索笔记
  searchNotes: (query: string) => Promise<SearchResult[]>
  // 搜索笔记列表
  searchNotesList: (query: string) => Promise<Note[]>

  updateNote: (id: string, updatedNote: Partial<Note>) => Promise<Note>
  deleteNote: (id: string) => Promise<boolean>

  createCardBox: (name: string) => Promise<CardBox>
  getAllCardBoxes: () => Promise<CardBox[]>
  updateCardBox: (id: string, name: string) => Promise<CardBox | undefined>
  deleteCardBox: (id: string) => Promise<void>

  getResourcePath: (filename: string) => Promise<string>

  addStarToNote: (id: string) => Promise<Note>
  removeStarFromNote: (id: string) => Promise<{ updatedNote: Note; reorderedNotes: Note[] }>
  createWhiteboard: (input: CreateWhiteboardInput) => Promise<Whiteboard>
  getTopLevelWhiteboards: () => Promise<Whiteboard[]>
  updateWhiteboardPosition: (id: string, x: number, y: number) => Promise<Whiteboard>
  createWhiteboardNote: (input: CreateWhiteboardNoteInput) => Promise<WhiteboardNote>
  createRootWhiteboard: () => Promise<RootWhiteboard>
  getRootWhiteboard: () => Promise<RootWhiteboard>
  saveViewStateToRootWhiteboard: (
    scale: number,
    translateX: number,
    translateY: number
  ) => Promise<boolean>
  getRootWhiteboardViewState: () => Promise<{
    scale: number
    translateX: number
    translateY: number
  }>
  saveViewStateToWhiteboard: (
    whiteboardId: string,
    scale: number,
    translateX: number,
    translateY: number
  ) => Promise<boolean>
  getWhiteboardViewState: (whiteboardId: string) => Promise<{
    scale: number
    translateX: number
    translateY: number
  }>
  getCardCount: (whiteboardId: string) => Promise<number>
  getWhiteboardNotes: (whiteboardId: string) => Promise<WhiteboardNote[]>
  getWhiteboardGroups: (whiteboardId: string) => Promise<WhiteboardGroup[]>
  getWhiteboardConnections: (whiteboardId: string) => Promise<Connection[]>
  getWhiteboardSubboards: (whiteboardId: string) => Promise<Whiteboard[]>
  updateWhiteboardNotePosition: (id: string, x: number, y: number) => Promise<WhiteboardNote>
  updateWhiteboardNoteSize: (id: string, width: number, height: number) => Promise<WhiteboardNote>
  updateConnection: (connection: Connection) => Promise<Connection>
  deleteConnection: (id: string) => Promise<void>
  getConnectionsByWhiteboardId: (whiteboardId: string) => Promise<Connection[]>
  createConnection: (connection: ConnectionCreateData) => Promise<Connection>
  updateConnectionDescription: (
    id: string,
    description: string
  ) => Promise<{
    success: boolean
    connection: Connection | null
    error: string | null
  }>
  deleteWhiteboardNote: (id: string) => Promise<boolean>
  updateWhiteboardNoteAutoHeight: (id: string, isAutoHeight: boolean) => Promise<WhiteboardNote>
  updateWhiteboardName: (id: string, name: string) => Promise<Whiteboard>

  deleteWhiteboard: (id: string) => Promise<{ success: boolean; error?: string }>
  newNote: () => Promise<boolean>
  onMenuNewNote: (callback: () => void) => void
  removeAllListeners: (channel: string) => void
  onMenuExportNotes: (callback: () => void) => void
  getNotesByDate: (
    direction: 'newer' | 'older',
    referenceDate: Date | null,
    limit: number
  ) => Promise<{ notes: Note[]; totalCount: number }>
  getNotesByOneDate: (date: string) => Promise<Note[]>

  getNoteCount: () => Promise<number>
  getLastDayNoteCount: () => Promise<number>
  getWhiteboardCount: () => Promise<number>
  getUserUsageDays: () => Promise<number>

  getAllDeletedNotes: () => Promise<Note[]>
  getUserSettings: () => Promise<UserSettings>
  updateUserSettings: (settings: UpdateUserSettings) => Promise<UserSettings>
  getRelatedNotes: (noteId: string, limit: number) => Promise<RelatedNotesResult>
  getUserDataPath: () => Promise<string>
  loadEmbeddingsCache: () => Promise<Record<string, string>>
  saveEmbeddingsCache: (cacheData: Record<string, string>) => Promise<boolean>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
