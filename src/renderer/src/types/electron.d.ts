import { TagSearchParams } from '../../../db/tagService'
import {
  GetPaginatedNotesParams,
  TimelineQueryParams,
  TimelineQueryResult
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
  NoteReference,
  Tag
} from './Note'
import { UpdateUserSettings, UserSettings } from './UserSettings'

export interface ElectronAPI {
  createNote: () => Promise<Note>
  getNote: (id: string) => Promise<Note | undefined>
  getAllNotes: (includeDeleted: boolean) => Promise<Note[]>
  updateNote: (id: string, updatedNote: Partial<Note>) => Promise<Note>
  deleteNote: (id: string) => Promise<boolean>
  softDeleteNote: (id: string) => Promise<Note>
  restoreNote: (id: string) => Promise<void>
  getDeletedNotes: () => Promise<Note[]>
  permanentDeleteNote: (id: string) => Promise<boolean>
  createCardBox: (name: string) => Promise<CardBox>
  getAllCardBoxes: () => Promise<CardBox[]>
  updateCardBox: (id: string, name: string) => Promise<CardBox | undefined>
  deleteCardBox: (id: string) => Promise<void>
  // addNoteToCardBox: (cardBoxId: string, noteId: string) => Promise<void>
  updateNoteCardBox: (noteId: string, cardBoxId: string) => Promise<Note>
  getStarredNotes: () => Promise<Note[]>
  getResourcePath: (filename: string) => Promise<string>
  updateStarredNotesOrder: (orders: { id: string; starredOrder: number }[]) => Promise<Note[]>
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
  updateNoteContent: (id: string, content: any) => Promise<Note>
  deleteWhiteboard: (id: string) => Promise<{ success: boolean; error?: string }>
  newNote: () => Promise<boolean>
  onMenuNewNote: (callback: () => void) => void
  removeAllListeners: (channel: string) => void
  onMenuExportNotes: (callback: () => void) => void
  getPaginatedNotes: (page: number, limit: number) => Promise<{ notes: Note[]; totalCount: number }>
  getNotesByDate: (
    direction: 'newer' | 'older',
    referenceDate: Date | null,
    limit: number
  ) => Promise<{ notes: Note[]; totalCount: number }>
  getNotesByOneDate: (date: string) => Promise<Note[]>
  getAllDatesWithNotes: () => Promise<string[]>
  getPaginatedNotesByCardbox: (params: GetPaginatedNotesParams) => Promise<{
    notes: Note[]
    totalCount: number
  }>
  searchNotes: (query: string) => Promise<
    Array<{
      id: string
      title: string
      blocks: Array<{ content: string }>
    }>
  >
  searchNotesList: (query: string) => Promise<Note[]>
  getHeatmapData: () => Promise<{ date: string; count: number }[]>
  getNoteCount: () => Promise<number>
  getLastDayNoteCount: () => Promise<number>
  getWhiteboardCount: () => Promise<number>
  getUserUsageDays: () => Promise<number>
  getRandomNotes: () => Promise<Note[]>
  moveEmptyNotesToTrash: () => Promise<void>
  getAllDeletedNotes: () => Promise<Note[]>
  getUserSettings: () => Promise<UserSettings>
  updateUserSettings: (settings: UpdateUserSettings) => Promise<UserSettings>
  getRelatedNotes: (noteId: string, limit: number) => Promise<RelatedNotesResult>
  getUserDataPath: () => Promise<string>
  loadEmbeddingsCache: () => Promise<Record<string, string>>
  saveEmbeddingsCache: (cacheData: Record<string, string>) => Promise<boolean>
  updateNoteAddress: (id: string, address: string) => Promise<Note>
  updateNoteCardType: (id: string, cardType: string) => Promise<Note>
  getTimelineNotes: (params: TimelineQueryParams) => Promise<TimelineQueryResult>
  createNoteReference: (params: {
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
      cardType?: string // 添加可选的 cardType 字段
      address?: string
    }
  }) => Promise<NoteReference>
  deleteNoteReference: (params: { sourceNoteId: string; targetNoteId: string }) => Promise<void>
  // 标签相关的方法
  // 创建标签
  createTag: (params: { name: string; color?: string; icon?: string }) => Promise<Tag>

  // 获取所有标签（包含使用次数）
  getAllTags: () => Promise<Tag[]>

  // 根据ID获取标签
  getTagById: (id: string) => Promise<Tag | null>

  // 更新标签
  updateTag: (id: string, updateData: Partial<Tag>) => Promise<Tag>

  // 删除标签
  deleteTag: (id: string) => Promise<void>

  // 搜索标签
  searchTags: (query: string) => Promise<Tag[]>

  // 高级搜索标签
  searchTagsAdvanced: (params: TagSearchParams) => Promise<Tag[]>

  // 更新标签置顶状态
  updateTagPinned: (id: string, pinned: boolean, pinOrder?: number) => Promise<Tag>

  // 更新标签置顶顺序
  updateTagPinOrder: (id: string, pinOrder: number) => Promise<Tag>

  // 更新笔记标签
  updateNoteTag: (params: {
    noteId: string
    tagId: string // 改用 tagId 替代 tagName
    action: 'add' | 'remove'
  }) => Promise<void> // 不再返回整个笔记对象

  // 获取笔记的标签
  getNoteTags: (noteId: string) => Promise<Tag[]>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
