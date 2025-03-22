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
  GradientPreset,

  // 番茄钟相关
  PomodoroConfig,
  BackgroundSound,

  // 每日金句相关
  DailyQuote,
  ReviewResponse,

  // 任务相关
  Task,

  // 认证相关
  AuthState,
  ChatSession,
  RAGContext,
  RAGHistoryRecord,
  ChatMessage,
  AssistantNoteReference,
  WordSuggestion,
  DictWord,
  SystemPromptConfig,
  // 新增的类型
  ModelConfig,
  ProviderPreset,

  // 思维板相关
  Mindboard,
  IconName,
  LLMError,

  // 新增的 S3 相关类型
  S3Config,
  S3SyncHistory,
  S3SyncState,
  CloudSyncConfig,
  UpdateCloudSyncOptions,

  // Dinox 相关类型
  DinoxSyncConfig,

  // 新增的 letter 相关类型
  Letter,
  LetterType,

  // 新增的 writingDesk 相关类型
  Manuscript,
  ManuscriptCard,
  CreateManuscriptParams,
  UpdateManuscriptParams,
  PolishManuscriptParams
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
    // 获取最近编辑的 10 篇笔记
    getRecentEditedNotes: () => Promise<
      Array<{
        id: string
        address: string
        title: string
        cardType: string
      }>
    >
    // 在笔记编辑器关闭时更新向量
    updateNoteVectorOnClose: (id: string, content: object) => Promise<void>
    // 批量更新向量
    batchUpdateVectors: () => Promise<void>
    // 批量设置卡片类型
    batchUpdateNotesCardType: (noteIds: string[], cardType: string) => Promise<Note[]>
    // 批量移动笔记到卡片盒
    batchMoveNotesToCardBox: (noteIds: string[], cardBoxId: string | null) => Promise<Note[]>
    // 批量软删除笔记
    batchSoftDeleteNotes: (noteIds: string[]) => Promise<Note[]>
    // 获取草稿笔记
    getDraftNotes: (page: number, limit: number) => Promise<{ notes: Note[]; totalCount: number }>
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
    createTag: (params: { name: string; color?: string; icon?: IconName }) => Promise<Tag>
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

    // 批量为笔记添加标签
    batchAddTagToNotes: (noteIds: string[], tagId: string) => Promise<void>
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
    uploadImage: (filePath: string) => Promise<string>
    copyImage: (imageId: string) => Promise<{ success: boolean; message: string }>
    downloadImage: (url: string, filename: string) => Promise<{ path: string }>
    deleteImage: (imagePath: string) => Promise<void>
    uploadImageData: (imageData: ArrayBuffer, noteId?: string) => Promise<string>
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
    // 批量转换为闪卡
    batchConvertToFlashcards: (noteIds: string[]) => Promise<void>

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

  pomodoro: {
    // 获取今日番茄钟记录
    getTodayPomodoro: () => Promise<{
      id: string
      date: string
      count: number
      totalMinutes: number
      createdAt: Date
      updatedAt: Date
    }>

    // 更新今日番茄钟记录
    updateTodayPomodoro: (
      count: number,
      minutes: number
    ) => Promise<{
      id: string
      date: string
      count: number
      totalMinutes: number
      updatedAt: Date
    }>

    // 获取番茄钟设置
    getPomodoroSettings: () => Promise<PomodoroConfig>

    // 更新番茄钟设置
    updatePomodoroSettings: (config: Partial<PomodoroConfig>) => Promise<PomodoroConfig>

    // 获取日期范围内的番茄钟记录
    getPomodoroRecords: (
      startDate: string,
      endDate: string
    ) => Promise<
      Array<{
        id: string
        date: string
        count: number
        totalMinutes: number
        createdAt: Date
        updatedAt: Date
      }>
    >

    // 获取番茄钟统计数据
    getPomodoroStats: () => Promise<{
      totalCount: number
      totalMinutes: number
      avgDailyCount: number
      totalDays: number
    }>

    // 获取音频文件路径
    getSoundFilePath: (soundType: BackgroundSound | 'complete') => Promise<string | null>
  }

  dailyQuotes: {
    // 获取今日金句
    getTodayQuote: () => Promise<DailyQuote>

    // 添加新金句
    addQuote: (content: string, author: string) => Promise<DailyQuote>

    // 获取所有金句
    getAllQuotes: () => Promise<DailyQuote[]>

    // 删除金句
    deleteQuote: (id: string) => Promise<void>

    // 更新金句
    updateQuote: (id: string, data: { content?: string; author?: string }) => Promise<DailyQuote>
  }

  lifeGuide: {
    // 获取随机人生指南笔记
    getRandomLifeGuideNote: () => Promise<Note | null>
  }

  review: {
    // 获取智能回顾数据
    getReviewData: () => Promise<ReviewResponse>
    // 获取单条随机笔记
    getOneRandomNote: () => Promise<Note | null>
  }

  task: {
    // 获取所有任务
    getAllTasks: () => Promise<Task[]>

    // 更新任务状态
    updateTaskStatus: (noteId: string, path: string[], isChecked: boolean) => Promise<void>

    // 获取未完成的任务
    getUncompletedTasks: () => Promise<Task[]>

    // 获取已完成的任务
    getCompletedTasks: () => Promise<Task[]>

    // 按笔记分组获取任务
    getTasksByNote: () => Promise<{ [noteId: string]: Task[] }>
  }

  auth: {
    // 登录
    login: (params: { email: string; password: string }) => Promise<AuthState>

    // 登出
    logout: () => Promise<void>

    // 获取当前认证状态
    getCurrentAuthState: () => Promise<AuthState | null>

    // 刷新 token
    refreshToken: (token: string) => Promise<AuthState>

    // 验证认证状态
    verifyAuth: () => Promise<boolean>

    // 检查网络状态
    checkNetworkStatus: () => Promise<boolean>
  }

  modelConfig: {
    // 获取所有配置
    getAllConfigs: () => Promise<ModelConfig[]>

    // 获取单个配置
    getConfig: (id: string) => Promise<ModelConfig | null>

    // 获取默认配置
    getDefaultConfig: () => Promise<ModelConfig | null>

    // 添加配置
    addConfig: (config: Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ModelConfig>

    // 更新配置
    updateConfig: (
      id: string,
      updates: Partial<Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>>
    ) => Promise<ModelConfig>

    // 删除配置
    deleteConfig: (id: string) => Promise<void>

    // 设置默认配置
    setDefaultConfig: (id: string) => Promise<void>

    // 获取提供商预设
    getProviderPresets: () => Promise<ProviderPreset[]>

    // 测试模型连接
    testConnection: (
      provider: string,
      baseUrl: string,
      apiKey: string,
      modelName: string
    ) => Promise<{ valid: boolean; message?: string }>
  }

  rag: {
    retrieveContext: (params: { query: string; session?: ChatSession }) => Promise<RAGContext>

    generateAnswer: (
      query: string,
      sessionId: string | null,
      currentMessages: ChatMessage[],
      currentContexts: RAGContext[]
    ) => Promise<{
      answer: string
      context: RAGContext
      messages: ChatMessage[]
    }>

    updateRAGHistory: (params: {
      sessionId: string
      messages: ChatMessage[]
      contexts: RAGContext[]
      metadata?: any // 添加可选的元数据
    }) => Promise<void>

    updateRAGHistoryTitle: (id: string, title: string) => Promise<void>

    toggleRAGHistoryPin: (id: string) => Promise<void>

    deleteRAGHistory: (id: string) => Promise<void>

    clearAllRAGHistory: () => Promise<void>

    getRAGHistory: () => Promise<RAGHistoryRecord[]>

    getRAGHistoryDetail: (id: string) => Promise<RAGHistoryRecord | null>

    // 新增的批量操作方法
    batchGetRAGHistory: (ids: string[]) => Promise<(RAGHistoryRecord | null)[]>

    // 新增的会话管理方法
    cleanupExpiredSessions: () => Promise<void>

    // 新增的性能监控方法
    trackRAGPerformance: (
      sessionId: string,
      method: string,
      duration: number,
      options: {
        success: boolean
        error?: string
        metadata?: Record<string, any>
      }
    ) => Promise<void>

    generateAnswerWithReferences: (
      query: string,
      noteReferences: NoteReference[],
      sessionId: string | null,
      currentMessages: ChatMessage[],
      currentContexts: RAGContext[]
    ) => Promise<{
      answer: string
      context: RAGContext
      messages: ChatMessage[]
    }>

    // 修改问一问模式接口
    handleAskQuestion: (
      query: string,
      assistantNoteReferences: AssistantNoteReference[],
      sessionId: string | null,
      currentMessages: ChatMessage[],
      currentContexts: RAGContext[],
      deepseekConfig?: {
        temperature?: number
        maxTokens?: number
      }
    ) => Promise<{
      answer: string
      context: RAGContext
      messages: ChatMessage[]
      error?: LLMError // 添加错误返回
    }>

    // 修改聊一聊模式接口
    handleChat: (
      query: string,
      sessionId: string | null,
      currentMessages: ChatMessage[],
      currentContexts: RAGContext[],
      deepseekConfig?: {
        temperature?: number
        maxTokens?: number
      }
    ) => Promise<{
      answer: string
      context: RAGContext
      messages: ChatMessage[]
      error?: LLMError // 添加错误返回
    }>

    // 找一找模式
    handleFindNotes: (
      query: string,
      sessionId: string | null,
      currentMessages: ChatMessage[],
      currentContexts: RAGContext[]
    ) => Promise<{
      answer: string
      context: RAGContext
      messages: ChatMessage[]
    }>

    // 添加初始化向量化方法
    initializeEmbeddings: () => Promise<{
      total: number
      processed: number
    }>
  }

  similarNotes: {
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
  }

  dictionary: {
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
  }

  // 思维板相关 API
  mindboard: {
    // 思维板操作
    createMindboard: (
      data: Omit<Mindboard, 'id' | 'created_at' | 'updated_at'>
    ) => Promise<Mindboard>
    getAllMindboards: () => Promise<Mindboard[]>
    getMindboard: (id: string) => Promise<Mindboard>
    updateMindboard: (id: string, data: Partial<Mindboard>) => Promise<Mindboard>
    deleteMindboard: (id: string) => Promise<void>
    updateMindboardName: (id: string, name: string) => Promise<void>
    updatePreviewImage: (id: string, previewImage: string) => Promise<void>
    toggleFavorite: (id: string) => Promise<void>
    getFavoriteMindboards: () => Promise<Mindboard[]>
    getMindboardCount: () => Promise<number>
  }

  s3: {
    // 获取 S3 配置
    getConfig: () => Promise<S3Config | null>
    // 更新 S3 配置
    updateConfig: (
      config: Partial<S3Config>,
      options?: { restartSync?: boolean }
    ) => Promise<S3Config>
    // 测试 S3 连接
    testConnection: (config: Partial<S3Config>) => Promise<boolean>
    // 手动触发同步
    triggerSync: () => Promise<void>
    // 获取同步历史
    getSyncHistory: () => Promise<S3SyncHistory[]>
    // 订阅同步状态变化
    subscribeSyncState: (callback: (state: S3SyncState) => void) => Promise<void>
    // 取消订阅同步状态变化
    unsubscribeSyncState: () => Promise<void>
    // 启动自动同步
    startAutoSync: () => Promise<void>
    // 停止自动同步
    stopAutoSync: () => Promise<void>
    // 获取所有提供商配置
    getAllProviderConfigs: () => Promise<Record<string, any>>
  }

  cloudSync: {
    // 获取当前云同步配置
    getCurrentConfig: () => Promise<CloudSyncConfig | null>
    // 更新云同步配置
    updateConfig: (
      config: Partial<CloudSyncConfig>,
      options?: UpdateCloudSyncOptions
    ) => Promise<CloudSyncConfig>
    // 获取当前同步状态
    getCurrentSyncState: () => Promise<{ isSyncing: boolean }>
    // 添加同步状态事件监听
    onSyncStart: (callback: () => void) => void
    onSyncComplete: (callback: (data: { message: string }) => void) => void
    onSyncError: (callback: (data: { message: string; error: string }) => void) => void
    // 移除事件监听
    removeAllListeners: (channel: string) => void
  }

  // Dinox 同步相关 API
  dinox: {
    // 获取同步配置
    getSyncConfig: () => Promise<DinoxSyncConfig>

    // 更新同步配置
    updateSyncConfig: (updateData: Partial<DinoxSyncConfig>) => Promise<DinoxSyncConfig>

    // 执行同步
    syncNotes: () => Promise<{
      stats: {
        total: number
        added: number
        updated: number
        deleted: number
        skipped: number
      }
      message: string
    }>

    // 执行全量同步
    fullSyncNotes: () => Promise<{
      stats: {
        total: number
        added: number
        updated: number
        deleted: number
        skipped: number
      }
      message: string
    }>

    // 标记笔记为已毕业（转换为其他类型后不再更新）
    graduateNote: (dinoxNoteId: string) => Promise<void>

    // 重置同步时间（用于全量同步）
    resetSyncTime: () => Promise<void>

    // 更新自动同步设置
    updateAutoSync: (params: { autoSync: boolean; autoSyncInterval?: number }) => Promise<{
      config: DinoxSyncConfig
      message: string
    }>
  }

  letter: {
    // 创建信件
    createLetter: (type: LetterType) => Promise<Letter>

    // 获取信件列表
    getLetters: (
      page?: number,
      limit?: number
    ) => Promise<{
      letters: Letter[]
      total: number
    }>

    // 获取单个信件
    getLetterById: (id: string) => Promise<Letter | null>

    // 更新信件阅读状态
    updateLetterReadStatus: (id: string, readStatus: boolean) => Promise<Letter>

    // 获取最新信件
    getLatestLetter: () => Promise<Letter | null>

    // 获取未读信件数量
    getUnreadLettersCount: () => Promise<number>

    // 检查今天是否已经收到过信件
    checkTodayLetter: () => Promise<boolean>
  }

  export: {
    // 导出单个笔记
    exportNote: (noteId: string) => Promise<{
      filePath: string
      fileName: string
    }>

    // 批量导出所有笔记
    exportAllNotes: () => Promise<{
      filePath: string
      fileName: string
    }>
  }

  writingDesk: {
    // 文稿相关
    createManuscript: (params: CreateManuscriptParams) => Promise<{
      success: boolean
      manuscript?: Manuscript
      error?: string
    }>

    getAllManuscripts: () => Promise<{
      success: boolean
      manuscripts?: Manuscript[]
      error?: string
    }>

    getManuscript: (id: string) => Promise<{
      success: boolean
      manuscript?: Manuscript & { cards: ManuscriptCard[] }
      error?: string
    }>

    updateManuscript: (params: UpdateManuscriptParams) => Promise<{
      success: boolean
      manuscript?: Manuscript
      error?: string
    }>

    deleteManuscript: (id: string) => Promise<{
      success: boolean
      error?: string
    }>

    // 卡片相关
    addManuscriptCard: (
      manuscriptId: string,
      content: any,
      order: number,
      noteId?: string
    ) => Promise<{
      success: boolean
      card?: ManuscriptCard
      error?: string
    }>

    updateManuscriptCard: (
      cardId: string,
      content?: any,
      order?: number
    ) => Promise<{
      success: boolean
      card?: ManuscriptCard
      error?: string
    }>

    moveManuscriptCard: (
      cardId: string,
      order: number
    ) => Promise<{
      success: boolean
      card?: ManuscriptCard
      error?: string
    }>

    deleteManuscriptCard: (cardId: string) => Promise<{
      success: boolean
      error?: string
    }>

    batchAddManuscriptCards: (
      manuscriptId: string,
      cards: { noteId: string; content: any }[]
    ) => Promise<{
      success: boolean
      cards?: ManuscriptCard[]
      error?: string
    }>

    getManuscriptCards: (manuscriptId: string) => Promise<{
      success: boolean
      cards?: ManuscriptCard[]
      error?: string
    }>

    getManuscriptCard: (cardId: string) => Promise<{
      success: boolean
      card?: ManuscriptCard
      error?: string
    }>

    // AI 润色相关
    polishManuscript: (params: PolishManuscriptParams) => Promise<{
      success: boolean
      manuscript?: Manuscript
      error?: string
    }>

    getPolishHistory: (manuscriptId: string) => Promise<{
      success: boolean
      history?: any[]
      error?: string
    }>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI

    // 添加新的 API 接口
    modelConfigApi: {
      getAllConfigs: () => Promise<ModelConfig[]>
      getConfig: (id: string) => Promise<ModelConfig | null>
      getDefaultConfig: () => Promise<ModelConfig | null>
      addConfig: (
        config: Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>
      ) => Promise<ModelConfig>
      updateConfig: (
        id: string,
        updates: Partial<Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>>
      ) => Promise<ModelConfig>
      deleteConfig: (id: string) => Promise<void>
      setDefaultConfig: (id: string) => Promise<void>
      getProviderPresets: () => Promise<any[]>
      testConnection: (
        provider: string,
        baseUrl: string,
        apiKey: string,
        modelName: string
      ) => Promise<{ valid: boolean; message?: string }>
    }

    systemPromptApi: {
      getSystemPrompt: () => Promise<SystemPromptConfig>
      updateSystemPrompt: (systemPrompt: string) => Promise<SystemPromptConfig>
      resetSystemPrompt: () => Promise<SystemPromptConfig>
    }
  }
}
