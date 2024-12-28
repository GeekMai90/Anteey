import { TagSearchParams } from '../../../services/notes/tagService'
import {
  GetPaginatedNotesParams,
  TimelineQueryParams,
  TimelineQueryResult
} from '../../../services/notes/notesService'
import { Note, CardBox, NoteReference, Tag, SearchParams } from './Note'
import {
  Whiteboard,
  CreateWhiteboardInput,
  CreateWhiteboardNoteInput,
  WhiteboardNote,
  RootWhiteboard,
  Connection,
  WhiteboardGroup,
  ConnectionCreateData
} from './Whiteboard'
import { UpdateUserSettings, UserSettings } from './UserSettings'
import { CreateCustomFilterInput, CustomFilter, UpdateCustomFilterInput } from './Filter'
import { WordSuggestion } from '../../../services/dictionary/dictionaryService'
import { DictWord } from '../../../services/dictionary/dictionaryService'
import { LocalTreeData, LocalTreeWithReferencesData } from './localTree'
import { AppearanceSettings } from '../../../services/appearance/appearanceService'
import { KnowledgeTreeNode } from './knowledgeTree'
import { ActivationResult, License } from './license'
import type { BackupSettings, BackupHistory } from './backup'
import type { FutureLog, MonthlyLog, TimeBlockDay, TimeBlockSettings } from './timeBlock'
import { SyncState, WebDAVConfig } from './WebDAV'
import { SyncHistory } from './WebDAV'

// 添加图片相关的类型定义
interface ImageInfo {
  id: string
  path: string
  filename: string
}

export interface ElectronAPI {
  createNote: () => Promise<Note>
  getNote: (id: string) => Promise<Note | undefined>
  getAllNotes: (includeDeleted: boolean) => Promise<Note[]>
  updateNote: (id: string, updatedNote: Partial<Note>) => Promise<Note>
  deleteNote: (id: string) => Promise<boolean>
  softDeleteNote: (id: string) => Promise<Note>
  restoreNote: (id: string) => Promise<void>
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
  searchNotes: (query: SearchParams) => Promise<
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

  // 筛选规则相关的方法
  // 创建自定义筛选规则
  createCustomFilter: (input: CreateCustomFilterInput) => Promise<CustomFilter>

  // 获取所有自定义筛选规则
  getAllCustomFilters: () => Promise<CustomFilter[]>

  // 根据ID获取筛选规则
  getCustomFilterById: (id: string) => Promise<CustomFilter | null>

  // 更新筛选规则
  updateCustomFilter: (id: string, updateData: UpdateCustomFilterInput) => Promise<CustomFilter>

  // 删除筛选规则
  deleteCustomFilter: (id: string) => Promise<void>

  // 更新筛选规则置顶状态
  updateFilterPinned: (id: string, isPinned: boolean, pinnedOrder?: number) => Promise<CustomFilter>

  // 应用筛选规则获取笔记
  getPaginatedNotesByFilter: (params: {
    customFilterId: string
    page: number
    limit: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }) => Promise<{
    notes: Note[]
    totalCount: number
  }>

  // 切换筛选规则的收藏状态
  toggleFilterStar: (id: string) => Promise<CustomFilter>

  // 向量搜索
  searchSimilarNotes: (
    query: string,
    limit: number
  ) => Promise<{ noteId: string; similarity: number }[]>

  // 获取特定笔记的相似笔记
  getSimilarNotesForNote: (
    noteId: string,
    limit: number
  ) => Promise<
    {
      noteId: string
      similarity: number
    }[]
  >

  // 词相关的方法
  getPendingSuggestions: () => Promise<WordSuggestion[]>
  processSuggestion: (word: string, status: 'accepted' | 'rejected') => Promise<void>
  processSuggestionBatch: (words: string[], status: 'accepted' | 'rejected') => Promise<void>
  getDictionary: () => Promise<DictWord[]>
  cleanupDictionary: (days: number) => Promise<void>
  getAllWords: () => Promise<DictWord[]>
  addWord: (word: string) => Promise<DictWord>
  deleteWord: (word: string) => Promise<void>
  deleteWords: (words: string[]) => Promise<void>
  searchWords: (query: string) => Promise<DictWord[]>
  updateWordStatus: (word: string, enabled: boolean) => Promise<void>

  // 获取最近编辑的 10 篇笔记
  getRecentEditedNotes: () => Promise<
    {
      id: string
      address: string
      title: string
      cardType: string
    }[]
  >

  // 获取本地树数据
  getLocalTree: (noteId: string) => Promise<LocalTreeData>

  // 添加根据地址获取笔记的方法定义
  getNoteByAddress: (address: string) => Promise<Note | null>

  // 获取本地树数据与引用数据
  getLocalTreeWithReferences: (noteId: string) => Promise<LocalTreeWithReferencesData>

  // 获取外观设置
  getAppearanceSettings: () => Promise<AppearanceSettings>

  // 更新外观设置
  updateAppearanceSettings: (settings: Partial<AppearanceSettings>) => Promise<AppearanceSettings>

  updateGlobalHotkey: (hotkey: string) => Promise<{ success: boolean; error?: string }>

  // 知识树相关的方法
  getTopLevelNodes: () => Promise<KnowledgeTreeNode[]>
  getChildNodes: (parentAddress: string) => Promise<KnowledgeTreeNode[]>
  getChildCount: (parentAddress: string) => Promise<number>
  getNodePath: (address: string) => Promise<KnowledgeTreeNode[]>

  // 图片相关的方法
  uploadImage: (filePath: string, noteId: string) => Promise<{ path: string; isExisting: boolean }>

  getNoteImages: (noteId: string) => Promise<ImageInfo[]>

  getImagePath: (imageId: string) => Promise<string>

  copyImage: (imageId: string) => Promise<{
    success: boolean
    message: string
  }>

  downloadImage: (url: string, filename: string) => Promise<{ path: string }>

  cleanupUnusedImages: () => Promise<{
    count: number
    message: string
  }>
  removeImageFromNote: (noteId: string, imageId: string) => Promise<void>
  // 激活相关
  getMachineId: () => Promise<string>
  activateLicense: (activationCode: string) => Promise<ActivationResult>
  checkLicense: () => Promise<License | null>

  // 备份相关API
  getBackupSettings: () => Promise<BackupSettings | null>
  updateBackupSettings: (settings: Partial<BackupSettings>) => Promise<void>
  getBackupHistory: () => Promise<BackupHistory[]>
  selectBackupDirectory: () => Promise<string | null>
  createBackup: () => Promise<{
    path: string
    fileName: string
    size: number
  }>
  selectBackupFile: () => Promise<string | null>
  restoreBackup: (backupPath: string) => Promise<boolean>
  // 时间块相关方法
  getTimeBlockDay: (date: string) => Promise<TimeBlockDay>
  updateTimeBlock: (dayId: string, hour: number, content: string) => Promise<string>
  updateTimeBlockDayStatus: (id: string, data: { weather?: string; mood?: string }) => Promise<void>
  getTimeBlockSettings: () => Promise<TimeBlockSettings>
  updateTimeBlockSettings: (settings: {
    enabled?: boolean
    startTime?: number
    endTime?: number
  }) => Promise<TimeBlockSettings>
  // 未来日志相关方法
  getFutureLog: () => Promise<FutureLog | null>
  updateFutureLog: (content: string) => Promise<string>
  // 月度日志相关方法
  getMonthlyLog: (year: number, month: number) => Promise<MonthlyLog | null>
  updateMonthlyLog: (year: number, month: number, content: string) => Promise<string>
  getYearMonthlyLogs: (year: number) => Promise<MonthlyLog[]>

  // 更新默认页面
  updateDefaultPage: (defaultPage: string) => Promise<AppearanceSettings>

  // 更新侧边栏展开状态
  updateStarredExpanded: (expanded: boolean) => Promise<AppearanceSettings>
  updateTagsExpanded: (expanded: boolean) => Promise<AppearanceSettings>
  updateRecentExpanded: (expanded: boolean) => Promise<AppearanceSettings>
  updateWhiteboardEnabled: (enabled: boolean) => Promise<AppearanceSettings>
  updateAIAssistantEnabled: (enabled: boolean) => Promise<AppearanceSettings>
  // 搜索时光记
  searchTimeBlocks: (searchTerm: string) => Promise<
    Array<{
      date: string
      hour: number
      content: string
      id: string
    }>
  >

  // 添加更新白板笔记样式的方法定义
  updateWhiteboardNoteStyle: (id: string, style: WhiteboardNote['style']) => Promise<WhiteboardNote>

  // 添加更新白板笔记内容的方法定义
  updateWhiteboardNoteContent: (id: string, content: string) => Promise<WhiteboardNote>

  // 添加 openExternal 方法的类型定义
  openExternal: (url: string) => Promise<void>

  syncStateChanged: (callback: (state: SyncState) => void) => void

  // 测试 WebDAV 连接
  testWebDAVConnection: (config: Partial<WebDAVConfig>) => Promise<boolean>

  // 同步 WebDAV
  syncWebDAV: () => Promise<void>

  // 获取 WebDAV 配置
  getWebDAVConfig: () => Promise<WebDAVConfig | null>

  // 更新 WebDAV 配置
  updateWebDAVConfig: (config: Partial<WebDAVConfig>) => Promise<WebDAVConfig>

  // WebDAV 相关方法
  getWebDAVSyncHistory: () => Promise<SyncHistory[]>
  // 启动自动同步
  startWebDAVAutoSync: () => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
