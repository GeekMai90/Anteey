import type {
  // 笔记相关
  Note,
  NoteReference,
  NoteVersion,
  CreateVersionParams,
  GetVersionsParams,
  GetPaginatedNotesParams,

  // 标签相关
  Tag,
  TagSearchParams,

  // 搜索相关
  SearchParams,
  TimelineQueryParams,
  TimelineQueryResult,

  // 白板相关
  Whiteboard,
  CreateWhiteboardInput,
  CreateWhiteboardNoteInput,
  WhiteboardNote,
  RootWhiteboard,
  Connection,
  WhiteboardGroup,
  ConnectionCreateData,

  // 设置相关
  UserSettings,
  UpdateUserSettings,
  AppearanceSettings,

  // 自定义过滤器
  CustomFilter,
  CreateCustomFilterInput,
  UpdateCustomFilterInput,

  // 树形结构
  LocalTreeData,
  LocalTreeWithReferencesData,
  KnowledgeTreeNode,

  // 许可相关
  License,
  ActivationResult,

  // 备份相关
  BackupSettings,
  BackupHistory,

  // 时间管理
  FutureLog,
  MonthlyLog,
  TimeBlockDay,
  TimeBlockSettings,

  // 同步相关
  SyncState,
  WebDAVConfig,
  SyncHistory,

  // 图片相关
  ImageQueryParams,
  ImageQueryResult,
  ImageInfo,

  // 闪卡相关
  FlashcardDecks,
  FlashcardStats,
  ReviewFeedback,
  CardBox,
  FlashcardSettings,

  // 学习历史相关
  StudyHistory,

  // 草稿纸相关
  Draft,
  UpdateDraftInput,
  AppendDraftInput,

  // 主题相关
  ThemeSettings,
  FavoriteGradients,
  GradientPreset
} from '@shared/types'

export interface ElectronAPI {
  note: {
    newNote: () => Promise<boolean>
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
    updateNoteCardBox: (noteId: string, cardBoxId: string) => Promise<Note>
    getStarredNotes: () => Promise<Note[]>
    updateStarredNotesOrder: (orders: { id: string; starredOrder: number }[]) => Promise<Note[]>
    addStarToNote: (id: string) => Promise<Note>
    removeStarFromNote: (id: string) => Promise<{ updatedNote: Note; reorderedNotes: Note[] }>
    getPaginatedNotes: (
      page: number,
      limit: number
    ) => Promise<{ notes: Note[]; totalCount: number }>
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
    getRandomNotes: () => Promise<Note[]>
    moveEmptyNotesToTrash: () => Promise<void>
    getAllDeletedNotes: () => Promise<Note[]>
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
    // 添加根据地址获取笔记
    getNoteByAddress: (address: string) => Promise<Note | null>
    updateNoteContent: (id: string, content: any) => Promise<Note>
    // 更新笔记标签
    updateNoteTag: (params: {
      noteId: string
      tagId: string // 改用 tagId 替代 tagName
      action: 'add' | 'remove'
    }) => Promise<void> // 不再返回整个笔记对象
  }
  whiteboard: {
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
    // 添加更新白板笔记样式的方法定义
    updateWhiteboardNoteStyle: (
      id: string,
      style: WhiteboardNote['style']
    ) => Promise<WhiteboardNote>

    // 添加更新白板笔记内容的方法定义
    updateWhiteboardNoteContent: (id: string, content: string) => Promise<WhiteboardNote>
    getWhiteboardCount: () => Promise<number>
  }
  systemMenu: {
    onMenuNewNote: (callback: () => void) => void
    onMenuExportNotes: (callback: () => void) => void
    removeAllListeners: (channel: string) => void
  }
  analytics: {
    getHeatmapData: () => Promise<{ date: string; count: number }[]>
    getNoteCount: () => Promise<number>
    getLastDayNoteCount: () => Promise<number>
    getUserUsageDays: () => Promise<number>
  }
  userSettings: {
    getUserSettings: () => Promise<UserSettings>
    updateUserSettings: (settings: UpdateUserSettings) => Promise<UserSettings>
    getUserDataPath: () => Promise<string>
    updateGlobalHotkey: (hotkey: string) => Promise<{ success: boolean; error?: string }>
    // 获取外观设置
    getAppearanceSettings: () => Promise<AppearanceSettings>
    // 更新外观设置
    updateAppearanceSettings: (settings: Partial<AppearanceSettings>) => Promise<AppearanceSettings>
    // 更新默认页面
    updateDefaultPage: (defaultPage: string) => Promise<AppearanceSettings>

    // 更新侧边栏展开状态
    updateStarredExpanded: (expanded: boolean) => Promise<AppearanceSettings>
    updateTagsExpanded: (expanded: boolean) => Promise<AppearanceSettings>
    updateRecentExpanded: (expanded: boolean) => Promise<AppearanceSettings>
    updateWhiteboardEnabled: (enabled: boolean) => Promise<AppearanceSettings>
    updateAIAssistantEnabled: (enabled: boolean) => Promise<AppearanceSettings>
  }
  tag: {
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

    // 获取笔记的标签
    getNoteTags: (noteId: string) => Promise<Tag[]>
  }
  customFilter: {
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
    updateFilterPinned: (
      id: string,
      isPinned: boolean,
      pinnedOrder?: number
    ) => Promise<CustomFilter>
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
  }

  knowledgeTree: {
    // 获取本地树数据
    getLocalTree: (noteId: string) => Promise<LocalTreeData>
    // 获取本地树数据与引用数据
    getLocalTreeWithReferences: (noteId: string) => Promise<LocalTreeWithReferencesData>
    getTopLevelNodes: () => Promise<KnowledgeTreeNode[]>
    getChildNodes: (parentAddress: string) => Promise<KnowledgeTreeNode[]>
    getChildCount: (parentAddress: string) => Promise<number>
    getNodePath: (address: string) => Promise<KnowledgeTreeNode[]>
  }

  image: {
    uploadImage: (
      filePath: string,
      noteId: string
    ) => Promise<{ path: string; isExisting: boolean }>
    getNoteImages: (noteId: string) => Promise<ImageInfo[]>
    getImagePath: (imageId: string) => Promise<string>
    copyImage: (imageId: string) => Promise<{ success: boolean; message: string }>
    downloadImage: (url: string, filename: string) => Promise<{ path: string }>
    cleanupUnusedImages: () => Promise<{ count: number; message: string }>
    removeImageFromNote: (noteId: string, imageId: string) => Promise<void>
    getImages: (params: ImageQueryParams) => Promise<ImageQueryResult>
    deleteImages: (imageIds: string[]) => Promise<{ deletedCount: number }>
    uploadImageData: (
      imageData: ArrayBuffer,
      noteId?: string
    ) => Promise<{ path: string; isExisting: boolean }>
  }

  activation: {
    getMachineId: () => Promise<string>
    activateLicense: (activationCode: string) => Promise<ActivationResult>
    checkLicense: () => Promise<License | null>
  }

  backup: {
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
    clearBackupHistory: () => Promise<void>
  }

  timeBlock: {
    getTimeBlockDay: (date: string) => Promise<TimeBlockDay>
    updateTimeBlock: (dayId: string, hour: number, content: string) => Promise<string>
    updateTimeBlockDayStatus: (
      id: string,
      data: { weather?: string; mood?: string }
    ) => Promise<void>
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
    // 搜索时光记
    searchTimeBlocks: (searchTerm: string) => Promise<
      Array<{
        date: string
        hour: number
        content: string
        id: string
      }>
    >
  }

  shell: {
    // 在浏览器中打开外部链接
    openExternal: (url: string) => Promise<void>
    // 获取资源路径
    getResourcePath: (filename: string) => Promise<string>
  }

  webDAV: {
    syncStateChanged: (callback: (state: SyncState) => void) => void
    // 测试 WebDAV 连接
    testWebDAVConnection: (config: Partial<WebDAVConfig>) => Promise<boolean>
    // 同步 WebDAV
    syncWebDAV: (type?: 'auto' | 'manual') => Promise<void>
    // 获取 WebDAV 配置
    getWebDAVConfig: () => Promise<WebDAVConfig | null>
    // 更新 WebDAV 配置
    updateWebDAVConfig: (config: Partial<WebDAVConfig>) => Promise<WebDAVConfig>
    // WebDAV 相关方法
    getWebDAVSyncHistory: () => Promise<SyncHistory[]>
    // 启动自动同步
    startWebDAVAutoSync: () => Promise<void>
  }

  flashcard: {
    // 基础操作
    convertToFlashcard: (noteId: string) => Promise<void>
    removeFlashcard: (noteId: string) => Promise<void>
    resetFlashcardProgress: (noteId: string) => Promise<void>

    // 复习相关
    updateFlashcardStatus: (params: {
      noteId: string
      feedback: ReviewFeedback
      reviewTime: number // 新增：本次复习用时（毫秒）
      isSimplified?: boolean
    }) => Promise<void>
    getDueFlashcards: (tags?: string[]) => Promise<Note[]>

    // 统计相关
    getFlashcardStats: () => Promise<FlashcardStats>
    getFlashcardDecks: () => Promise<FlashcardDecks>
    // 新增：获取学习历史数据
    getStudyHistory: (days?: number) => Promise<StudyHistory>

    // 设置相关
    getSettings: () => Promise<FlashcardSettings>
    updateSettings: (settings: Partial<FlashcardSettings>) => Promise<void>
  }

  noteVersion: {
    // 创建版本
    createNoteVersion: (params: CreateVersionParams) => Promise<NoteVersion>

    // 获取版本列表
    getNoteVersions: (params: GetVersionsParams) => Promise<NoteVersion[]>

    // 获取指定版本
    getNoteVersion: (noteId: string, versionId: string) => Promise<NoteVersion | null>

    // 恢复到指定版本
    restoreNoteVersion: (noteId: string, versionId: string) => Promise<void>

    // 获取版本总数
    getNoteVersionCount: (noteId: string) => Promise<number>

    // 获取最新版本
    getLatestVersion: (noteId: string) => Promise<NoteVersion | null>

    // 获取版本时间范围
    getVersionTimeRange: (noteId: string) => Promise<{
      earliest: Date
      latest: Date
    } | null>
  }

  drafts: {
    // 获取草稿纸内容
    getDraft: () => Promise<Draft | null>
    // 创建草稿纸
    createDraft: () => Promise<Draft>
    // 更新草稿纸内容
    updateDraft: (input: UpdateDraftInput) => Promise<Draft>
    // 追加内容到草稿纸
    appendDraft: (input: AppendDraftInput) => Promise<Draft>
  }

  // 添加主题相关的方法定义
  theme: {
    // 获取主题设置
    getThemeSettings: () => Promise<ThemeSettings>

    // 更新主题设置
    updateThemeSettings: (settings: Partial<ThemeSettings>) => Promise<ThemeSettings>

    // 获取收藏的渐变
    getFavoriteGradients: () => Promise<FavoriteGradients>

    // 添加收藏的渐变
    addFavoriteGradient: (
      gradient: GradientPreset,
      type: 'universal' | 'light' | 'dark'
    ) => Promise<FavoriteGradients>

    // 移除收藏的渐变
    removeFavoriteGradient: (
      gradient: Omit<GradientPreset, 'id'>,
      type: 'universal' | 'light' | 'dark'
    ) => Promise<FavoriteGradients>
  }

  window: {
    // 最小化窗口
    minimize: () => Promise<void>

    // 最大化/还原窗口
    maximize: () => Promise<void>

    // 关闭窗口
    close: () => Promise<void>

    // 获取窗口最大化状态
    isMaximized: () => Promise<boolean>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
