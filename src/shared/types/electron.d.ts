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
  SystemPromptConfig,
  // 新增的类型
  ModelConfig,
  ProviderPreset,

  // 思维板相关
  Mindboard,
  IconName,
  // LLMError,

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
  PolishManuscriptParams,

  // 新增的 AI 功能配置类型
  AIFeatureType,

  // 新增的 writingPromptTemplate 相关类型
  PromptTemplate,
  PromptTemplateType,
  CreatePromptTemplateParams,

  // 新增的 agent 相关类型
  Agent,
  CreateAgentParams,
  UpdateAgentParams,

  // AI 聊天相关类型
  ChatRequest,
  ChatResponse,
  Conversation,
  ConversationStatus,

  // 新增的 mind-echo 相关类型
  MindEcho,
  MindEchoWithRelations,
  UpdateMindEchoParams,

  // 新增的 letter 相关类型
  GetLetterConfigResult,
  UpdateLetterConfigParams,
  ConfigValidationResult,

  // Readwise 相关类型
  ReadwiseSyncConfig,
  SearchResult,

  // 命令相关类型
  Command,
  CommandGroup,
  CommandSearchResult
} from '@shared/types'

// 导入图床相关类型
import {
  ImageBedType,
  ImageBedConfig,
  ImageBedSettings,
  ImageBedStats,
  ImageBedTestResult,
  ImageBedUploadResult,
  ImageMappingInfo,
  ImageMigrationParams,
  ImageMigrationResult,
  BatchMigrationParams,
  BatchMigrationResult,
  AliyunOSSConfig,
  TencentCOSConfig
} from '@shared/types/imageBed'

// 导入标签页相关的类型
import {
  TabItem,
  TabItemType,
  GetTabsRequest,
  AddTabRequest,
  UpdateTabRequest,
  ReorderTabsRequest,
  TabsResponse
} from '@shared/types/tabs'

// 定义事件处理函数的类型
type IpcEventHandler = (event: any, data?: { type: string; data: Note }) => void

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
    searchNotes: (query: SearchParams) => Promise<SearchResult[]>
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
    // 切换笔记的索引状态
    toggleNoteIndex: (noteId: string) => Promise<Note>
    // 获取所有索引笔记（按首字母分组）
    getIndexedNotes: () => Promise<Record<string, Note[]>>
    // 更新索引笔记的顺序
    updateIndexOrder: (
      updates: Array<{
        noteId: string
        firstLetter: string
        order: number
      }>
    ) => Promise<Note[]>
    // 批量添加到索引
    batchAddToIndex: (noteIds: string[]) => Promise<Note[]>
    // 批量移除索引
    batchRemoveFromIndex: (noteIds: string[]) => Promise<Note[]>
    // 获取特定首字母的索引笔记
    getIndexedNotesByLetter: (letter: string) => Promise<Note[]>
    // 添加复制笔记地址到剪贴板的方法
    copyNoteAddress: (noteId: string) => Promise<string>
    // 添加三个新方法的类型定义
    getNotesByDuplicateAddress: () => Promise<{ [key: string]: Note[] }>
    getInvalidAddressNotes: () => Promise<Note[]>
    getNotesWithoutAddress: () => Promise<Note[]>
    // 添加合并笔记方法
    mergeNotes: (noteIds: string[]) => Promise<Note>
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
    // 更新悬浮侧边栏功能开关
    updateHoverSidebarEnabled: (enabled: boolean) => Promise<AppearanceSettings>
    // 更新迷你侧边栏显示状态
    updateShowSlimSidebar: (enabled: boolean) => Promise<AppearanceSettings>
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
    // 创建相邻笔记
    createAdjacentNote: (
      noteId: string,
      direction: 'below' | 'child'
    ) => Promise<{
      id: string
      address: string
      metadata: string
    }>
  }

  image: {
    uploadImage: (filePath: string) => Promise<string>
    copyImage: (imageId: string) => Promise<{ success: boolean; message: string }>
    downloadImage: (url: string, filename: string) => Promise<{ path: string }>
    deleteImage: (imagePath: string) => Promise<void>
    uploadImageData: (imageData: ArrayBuffer, noteId?: string) => Promise<string>
    getImageRealPath: (fileName: string) => Promise<string>
    checkImageExists: (imagePath: string) => Promise<boolean>

    // 双存储上传（本地 + 图床）
    uploadImageWithBed: (
      filePath: string,
      options?: {
        enableImageBed?: boolean
        configId?: string
      }
    ) => Promise<{
      localPath: string
      remotePath?: string
      uploadStatus: 'local' | 'uploading' | 'uploaded' | 'failed'
    }>
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
    // 强制上传到云端
    forceUploadWebDAV: () => Promise<void>
    // 从云端下载
    forceDownloadWebDAV: () => Promise<void>
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
    }) => Promise<{ noteId: string; nextReviewAt: Date }>
    getDueFlashcards: (tags?: string[]) => Promise<Note[]>
    // 根据ID获取闪卡
    getFlashcardsByIds: (noteIds: string[]) => Promise<Note[]>

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

    // 监听主题变更事件
    onThemeChanged: (callback: () => void) => void

    // 移除主题变更事件监听
    offThemeChanged: (callback: () => void) => void
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
    // 强制上传到云端
    uploadToCloud: () => Promise<void>
    // 强制从云端下载
    downloadFromCloud: () => Promise<void>
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

    // 获取来信配置
    getLetterConfig: () => Promise<GetLetterConfigResult>
    updateLetterConfig: (params: UpdateLetterConfigParams) => Promise<GetLetterConfigResult>
    resetLetterConfig: (defaultModelId: string) => Promise<GetLetterConfigResult>
    validateLetterConfig: (params: UpdateLetterConfigParams) => Promise<ConfigValidationResult>

    // 添加删除信件的方法定义
    deleteLetter: (id: string) => Promise<boolean>
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

    generateFirstDraft: (params: PolishManuscriptParams) => Promise<{
      success: boolean
      manuscript?: Manuscript
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
      history?: Array<{
        id: string
        manuscriptId: string
        polishedContent: any
        style: string
        createdAt: Date
      }>
      error?: string
    }>

    // 获取初稿历史
    getFirstDraftHistory: (manuscriptId: string) => Promise<{
      success: boolean
      history?: Array<{
        id: string
        manuscriptId: string
        firstDraftContent: any
        style: string
        createdAt: Date
      }>
      error?: string
    }>

    // 恢复初稿历史版本
    restoreFirstDraftHistory: (
      manuscriptId: string,
      historyId: string
    ) => Promise<{
      success: boolean
      manuscript?: Manuscript
      error?: string
    }>

    // 恢复终稿历史版本
    restorePolishHistory: (
      manuscriptId: string,
      historyId: string
    ) => Promise<{
      success: boolean
      manuscript?: Manuscript
      error?: string
    }>

    // 获取所有 AI 功能配置
    getAllAIConfigs: () => Promise<{
      success: boolean
      configs?: Array<{
        id: string
        featureType: AIFeatureType
        modelConfigId: string
        createdAt: Date
        updatedAt: Date
      }>
      error?: string
    }>

    // 获取指定功能的配置
    getAIConfigByFeature: (featureType: AIFeatureType) => Promise<{
      success: boolean
      config?: {
        id: string
        featureType: AIFeatureType
        modelConfigId: string
        createdAt: Date
        updatedAt: Date
      }
      error?: string
    }>

    // 更新 AI 功能配置
    updateAIConfig: (
      featureType: AIFeatureType,
      modelConfigId: string
    ) => Promise<{
      success: boolean
      config?: {
        id: string
        featureType: AIFeatureType
        modelConfigId: string
        createdAt: Date
        updatedAt: Date
      }
      error?: string
    }>

    // 导出润色后的文稿
    exportPolishedManuscript: (manuscriptId: string) => Promise<{
      success: boolean
      filePath?: string
      fileName?: string
      error?: string
    }>

    // 复制润色后的文稿到剪贴板
    copyPolishedManuscript: (manuscriptId: string) => Promise<{
      success: boolean
      message?: string
      error?: string
    }>
  }

  writingPromptTemplate: {
    // 获取指定类型的模板
    getPromptTemplateByType: (type: PromptTemplateType) => Promise<{
      success: boolean
      template?: PromptTemplate
      error?: string
    }>

    // 创建或更新模板
    upsertPromptTemplate: (params: CreatePromptTemplateParams) => Promise<{
      success: boolean
      template?: PromptTemplate
      error?: string
    }>

    // 删除模板
    deletePromptTemplate: (type: PromptTemplateType) => Promise<{
      success: boolean
      error?: string
    }>
  }

  agent: {
    // 创建 Agent
    createAgent: (params: CreateAgentParams) => Promise<Agent>

    // 获取所有 Agents
    getAllAgents: () => Promise<Agent[]>

    // 根据ID获取 Agent
    getAgentById: (id: string) => Promise<Agent | null>

    // 更新 Agent
    updateAgent: (id: string, updateData: UpdateAgentParams) => Promise<Agent>

    // 删除 Agent
    deleteAgent: (id: string) => Promise<void>

    // 搜索 Agents
    searchAgents: (query: string) => Promise<Agent[]>

    // 获取可在笔记菜单中显示的 Agents
    getMenuAgents: () => Promise<Agent[]>

    // 获取不在笔记菜单中显示的 Agents
    getNonMenuAgents: () => Promise<Agent[]>
  }

  aiChat: {
    // 发送聊天请求
    sendChatRequest: (request: ChatRequest) => Promise<ChatResponse>

    // 中断当前请求
    abortChatRequest: () => Promise<void>

    // 获取会话列表
    listConversations: (params?: {
      status?: ConversationStatus
      page?: number
      pageSize?: number
    }) => Promise<{
      conversations: Conversation[]
      total: number
    }>

    // 获取会话详情
    getConversationDetail: (id: string) => Promise<Conversation>

    // 更新会话状态
    updateConversationStatus: (id: string, status: ConversationStatus) => Promise<void>

    // 删除会话
    deleteConversation: (id: string) => Promise<void>

    // 发送流式聊天请求
    sendStreamChatRequest: (
      request: ChatRequest,
      callbacks: {
        onContent: (content: string) => void
        onDone: (messageId: string) => void
        onError: (error: string) => void
      }
    ) => Promise<void>
  }

  mindEcho: {
    // 从单条AI回复创建思维共鸣
    createMindEchoFromContent: (params: {
      noteId: string
      conversationId: string
      messageId: string
      modelConfigId?: string
    }) => Promise<MindEcho>

    // 从多轮对话创建思维共鸣
    createMindEchoFromConversation: (params: {
      noteId: string
      conversationId: string
      modelConfigId?: string
    }) => Promise<MindEcho>

    // 获取笔记的所有思维共鸣
    getNoteMindEchoes: (noteId: string, includeArchived?: boolean) => Promise<MindEcho[]>

    // 获取思维共鸣详情（带关联数据）
    getMindEchoDetail: (id: string) => Promise<MindEchoWithRelations | null>

    // 更新思维共鸣
    updateMindEcho: (updateData: UpdateMindEchoParams) => Promise<MindEcho>

    // 删除思维共鸣
    deleteMindEcho: (id: string) => Promise<void>

    // 更新思维共鸣排序
    updateMindEchoOrder: (id: string, newOrder: number) => Promise<MindEcho>

    // 切换思维共鸣归档状态
    toggleMindEchoArchived: (id: string, isArchived: boolean) => Promise<MindEcho>

    // 批量更新思维共鸣
    batchUpdateMindEchoes: (ids: string[], updates: Partial<MindEcho>) => Promise<MindEcho[]>
  }

  // Readwise 同步相关 API
  readwise: {
    // 获取同步配置
    getSyncConfig: () => Promise<ReadwiseSyncConfig>

    // 更新同步配置
    updateSyncConfig: (updateData: Partial<ReadwiseSyncConfig>) => Promise<ReadwiseSyncConfig>

    // 执行增量同步
    syncHighlights: () => Promise<{
      stats: {
        total: number
        added: number
        updated: number
        skipped: number
      }
      message: string
    }>

    // 执行全量同步
    fullSyncHighlights: () => Promise<{
      stats: {
        total: number
        added: number
        updated: number
        skipped: number
      }
      message: string
    }>

    // 更新自动同步设置
    updateAutoSync: (params: { autoSync: boolean; autoSyncInterval?: number }) => Promise<{
      config: ReadwiseSyncConfig
      message: string
    }>
  }

  events: {
    on: (channel: string, handler: IpcEventHandler) => void
    off: (channel: string, handler: IpcEventHandler) => void
  }

  noteAIProcess: {
    // 手动触发笔记的AI处理
    triggerProcessing: (noteId: string) => Promise<void>

    // 批量处理笔记
    processBatch: (limit?: number) => Promise<void>

    // 获取待处理的笔记列表
    getPendingNotes: (limit?: number) => Promise<string[]>

    // 获取笔记的AI处理状态
    getNoteAIStatus: (noteId: string) => Promise<{
      aiProcessingStatus: {
        keywords: 'pending' | 'processing' | 'completed' | 'failed'
        lastKeywordUpdateAt: Date
        error?: string
      } | null
      keywords: string[]
      suggestedTags: string[]
    }>

    // 更新AI处理使用的模型配置
    updateAIProcessModel: (modelId: string | null) => Promise<void>

    // 获取当前AI处理使用的模型配置
    getAIProcessModel: () => Promise<string | null>

    // 获取待处理的主卡片笔记列表
    getPendingMainNotes: (limit?: number) => Promise<string[]>

    // 批量处理主卡片笔记
    processMainCardBatch: (params?: { limit?: number; batchSize?: number }) => Promise<void>
  }

  // 标签页相关API
  tabs: {
    // 获取标签页列表
    getTabs: (params?: GetTabsRequest) => Promise<TabsResponse>

    // 获取单个标签页
    getTab: (id: string) => Promise<TabItem | null>

    // 添加新标签页
    addTab: (params: AddTabRequest) => Promise<TabItem>

    // 更新标签页
    updateTab: (params: UpdateTabRequest) => Promise<TabItem>

    // 删除标签页
    deleteTab: (id: string) => Promise<{ success: boolean }>

    // 更新标签页顺序
    reorderTabs: (params: ReorderTabsRequest) => Promise<TabItem[]>

    // 更新标签页访问时间
    updateTabAccessTime: (id: string) => Promise<TabItem>

    // 设置标签页固定状态
    pinTab: (id: string, isPinned: boolean) => Promise<TabItem>

    // 获取特定内容的标签页
    getTabByContent: (contentId: string, type: TabItemType) => Promise<TabItem | null>
  }

  command: {
    // 获取所有命令
    getAllCommands: () => Promise<Command[]>

    // 按类别获取命令
    getCommandsByCategory: () => Promise<CommandGroup[]>

    // 搜索命令
    searchCommands: (query: string) => Promise<CommandSearchResult>

    // 执行命令
    executeCommand: (commandId: string) => Promise<{ success: boolean; error?: string }>
  }

  customCss: {
    // 获取自定义CSS内容
    getCustomCssContent: () => Promise<string>

    // 获取自定义CSS文件路径
    getCustomCssPath: () => Promise<string>

    // 打开自定义CSS文件所在的文件夹
    openCustomCssFolder: () => Promise<{ success: boolean; error?: string }>
  }

  imageBed: {
    // 创建图床配置
    createImageBedConfig: (config: {
      name: string
      type: ImageBedType
      enabled?: boolean
      isDefault?: boolean
      accessKeyId?: string
      accessKeySecret?: string
      secretId?: string
      secretKey?: string
      bucket?: string
      region?: string
      endpoint?: string
      customDomain?: string
      pathPrefix?: string
      extraConfig?: any
    }) => Promise<string>

    // 更新图床配置
    updateImageBedConfig: (
      id: string,
      config: {
        name?: string
        enabled?: boolean
        isDefault?: boolean
        accessKeyId?: string
        accessKeySecret?: string
        secretId?: string
        secretKey?: string
        bucket?: string
        region?: string
        endpoint?: string
        customDomain?: string
        pathPrefix?: string
        extraConfig?: any
      }
    ) => Promise<void>

    // 删除图床配置
    deleteImageBedConfig: (id: string) => Promise<void>

    // 获取单个图床配置
    getImageBedConfig: (id: string) => Promise<ImageBedConfig | null>

    // 获取所有图床配置
    getAllImageBedConfigs: () => Promise<ImageBedConfig[]>

    // 获取图床设置
    getImageBedSettings: () => Promise<ImageBedSettings | null>

    // 更新图床设置
    updateImageBedSettings: (settings: Partial<ImageBedSettings>) => Promise<void>

    // 获取图床统计信息
    getImageBedStats: () => Promise<ImageBedStats>

    // 测试图床连接
    testImageBedConnection: (
      config: AliyunOSSConfig | TencentCOSConfig,
      type: ImageBedType
    ) => Promise<ImageBedTestResult>

    // 上传图片到图床
    uploadImageToBed: (
      configId: string,
      localPath: string,
      filePath: string
    ) => Promise<ImageBedUploadResult>

    // 从图床删除图片
    deleteImageFromBed: (
      configId: string,
      objectName: string
    ) => Promise<{
      success: boolean
      message?: string
    }>

    // 获取图片映射信息
    getImageMapping: (imageId: string) => Promise<ImageMappingInfo | null>

    // 获取所有图片映射
    getAllImageMappings: () => Promise<ImageMappingInfo[]>

    // 迁移单张图片到图床
    migrateImageToBed: (params: ImageMigrationParams) => Promise<ImageMigrationResult>

    // 批量迁移图片到图床
    batchMigrateImagesToBed: (params: BatchMigrationParams) => Promise<BatchMigrationResult>

    // 获取图片显示URL（智能选择本地或远程）
    getImageDisplayUrl: (localPath: string) => Promise<string>

    // 清理失效的图片映射
    cleanupImageMappings: () => Promise<{ cleaned: number }>
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

    writingPromptTemplateApi: {
      getPromptTemplateByType: (type: PromptTemplateType) => Promise<{
        success: boolean
        template?: PromptTemplate
        error?: string
      }>
      upsertPromptTemplate: (params: CreatePromptTemplateParams) => Promise<{
        success: boolean
        template?: PromptTemplate
        error?: string
      }>
      deletePromptTemplate: (type: PromptTemplateType) => Promise<{
        success: boolean
        error?: string
      }>
    }

    noteAIProcessApi: {
      // 获取待处理的主卡片笔记列表
      getPendingMainNotes: (limit?: number) => Promise<string[]>

      // 批量处理主卡片笔记
      processMainCardBatch: (params?: { limit?: number; batchSize?: number }) => Promise<void>
    }

    customCssApi: {
      // 获取自定义CSS内容
      getCustomCssContent: () => Promise<string>

      // 获取自定义CSS文件路径
      getCustomCssPath: () => Promise<string>

      // 打开自定义CSS文件所在的文件夹
      openCustomCssFolder: () => Promise<{ success: boolean; error?: string }>
    }
  }
}
