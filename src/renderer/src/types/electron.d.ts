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
  ExcalidrawDocument
} from './Note'
import { UpdateUserSettings, UserSettings } from './UserSettings'

export interface ExcalidrawAPI {
  saveExcalidrawImage: (
    imageData: string,
    filename: string
  ) => Promise<{ success: boolean; path?: string; error?: string }>
  loadExcalidrawImage: (path: string) => Promise<string>
  exportToPng: (sceneData: any) => Promise<{ success: boolean; path?: string; error?: string }>
  generateThumbnail: (sceneData: any) => Promise<string>
}

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
  createExcalidrawDocument: (params: {
    noteId: string
    data: Partial<ExcalidrawDocument>
  }) => Promise<{
    success: boolean
    document?: ExcalidrawDocument
    error?: string
  }>

  getExcalidrawDocument: (id: string) => Promise<{
    success: boolean
    document?: ExcalidrawDocument
    error?: string
  }>

  updateExcalidrawDocument: (params: { id: string; data: Partial<ExcalidrawDocument> }) => Promise<{
    success: boolean
    document?: ExcalidrawDocument
    error?: string
  }>

  deleteExcalidrawDocument: (id: string) => Promise<{
    success: boolean
    error?: string
  }>

  getNoteExcalidrawDocuments: (noteId: string) => Promise<{
    success: boolean
    documents?: ExcalidrawDocument[]
    error?: string
  }>
  excalidraw: ExcalidrawAPI
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
    // 添加 process 类型定义
    process: {
      platform: string
      versions: {
        node: string
        electron: string
      }
      env: {
        NODE_ENV?: string
        REACT_APP_BACKEND_V2_GET_URL?: string
        REACT_APP_BACKEND_V2_POST_URL?: string
        REACT_APP_LIBRARY_URL?: string
        REACT_APP_SOCKET_SERVER_URL?: string
      }
      type: 'renderer'
    }
    Buffer: {
      from: typeof Buffer.from
      isBuffer: typeof Buffer.isBuffer
    }
  }
}
