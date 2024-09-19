import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import path from 'path'

export type CardType = 'Maincard' | 'Bibcard' | 'Indexcard' | 'Hoplinkcard'
interface Note {
  id: string
  address: string // Zettelkasten 编码地址
  cardType: CardType // 卡片类型
  content: object // 包含标题和正文
  createdAt: Date
  updatedAt: Date
  tags: string[] // 标签列表
  linkedTo: string[]
  linkedFrom: string[]
  cardBoxId?: string
  isDeleted?: boolean
  isStarred?: boolean
}

// 定义 API 类型
export interface NotesAPI {
  getNotes: (includeDeleted: boolean) => Promise<Note[]>
  getNote: (id: string) => Promise<Note>
  // createNote: (noteData: Note) => Promise<Note>
  createNote: () => Promise<Note>
  updateNote: (id: string, noteData: Partial<Note>) => Promise<Note>
  removeNote: (id: string) => Promise<{ success: boolean }>
  addLink: (sourceNoteId: string, targetNoteId: string) => Promise<{ success: boolean }>
  removeLink: (sourceNoteId: string, targetNoteId: string) => Promise<{ success: boolean }>
  getLinkedNotes: (noteId: string) => Promise<Note[]>
  getBacklinks: (noteId: string) => Promise<Note[]>
  updateNoteCardBox: (noteId: string, newCardBoxId: string | null) => Promise<{ success: boolean }>
  toggleDeletedStatus: (id: string) => Promise<{ success: boolean }>
  toggleStarredStatus: (id: string) => Promise<{ success: boolean }>
  getStarredNotes: () => Promise<Note[]>
  moveToTrash: (id: string) => Promise<{ success: boolean; note: Note }>
  restoreFromTrash: (id: string) => Promise<{ success: boolean }>
  permanentlyDelete: (id: string) => Promise<{ success: boolean }>
  getDeletedNotes: () => Promise<Note[]>
  getNotesInCardBox: (cardBoxId: string) => Promise<Note[]>
}

// 实现 API
const notesAPI: NotesAPI = {
  getNotes: (includeDeleted) => ipcRenderer.invoke('get-notes', includeDeleted),
  getNote: (id) => ipcRenderer.invoke('get-note', id),
  // createNote: (noteData) => ipcRenderer.invoke('create-note', noteData),
  createNote: () => ipcRenderer.invoke('create-note'),
  // updateNote: (id, noteData) => ipcRenderer.invoke('update-note', id, noteData),
  // updateNote: (id: string, noteData: Partial<Note>) => {
  //   console.log('IPC updateNote called with:', id, JSON.stringify(noteData))
  //   return ipcRenderer.invoke('update-note', id, noteData)
  // },
  updateNote: async (id: string, updateData: Partial<Note>) => {
    const result = await ipcRenderer.invoke('update-note', { id, updateData })
    if (!result.success) {
      throw new Error(result.error)
    }
    return result.note
  },

  removeNote: (id) => ipcRenderer.invoke('remove-note', id),
  addLink: (sourceNoteId, targetNoteId) =>
    ipcRenderer.invoke('add-link', sourceNoteId, targetNoteId),
  removeLink: (sourceNoteId, targetNoteId) =>
    ipcRenderer.invoke('remove-link', sourceNoteId, targetNoteId),
  getLinkedNotes: (noteId) => ipcRenderer.invoke('get-linked-notes', noteId),
  getBacklinks: (noteId) => ipcRenderer.invoke('get-backlinks', noteId),
  // updateNoteCardBox: (noteId, newCardBoxId) =>
  //   ipcRenderer.invoke('update-note-card-box', noteId, newCardBoxId),
  updateNoteCardBox: (noteId: string, newCardBoxId: string | null) =>
    ipcRenderer.invoke('update-note-card-box', noteId, newCardBoxId),

  toggleDeletedStatus: (id) => ipcRenderer.invoke('toggle-deleted-status', id),
  toggleStarredStatus: (id) => ipcRenderer.invoke('toggle-starred-status', id),
  getStarredNotes: () => ipcRenderer.invoke('get-starred-notes'),
  moveToTrash: (id) => ipcRenderer.invoke('move-to-trash', id),
  restoreFromTrash: (id) => ipcRenderer.invoke('restore-from-trash', id),
  permanentlyDelete: (id) => ipcRenderer.invoke('permanently-delete', id),
  getDeletedNotes: () => ipcRenderer.invoke('get-deleted-notes'),
  getNotesInCardBox: (cardBoxId: string) => ipcRenderer.invoke('get-notes-in-card-box', cardBoxId)
}

// 定义 CardBox 类型
export interface CardBox {
  id: string
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
  noteIds: string[]
}

// 定义 CardBoxAPI 类型
export interface CardBoxAPI {
  findAll: () => Promise<CardBox[]>
  findOne: (id: string) => Promise<CardBox>
  create: (cardBoxData: Partial<CardBox>) => Promise<CardBox>
  update: (id: string, cardBoxData: Partial<CardBox>) => Promise<CardBox>
  remove: (id: string) => Promise<{ success: boolean }>
  addNote: (cardBoxId: string, noteId: string) => Promise<CardBox>
  removeNote: (cardBoxId: string, noteId: string) => Promise<CardBox>
  getNotes: (cardBoxId: string) => Promise<Note[]>
}

// 实现 CardBoxAPI
const cardBoxAPI: CardBoxAPI = {
  findAll: () => ipcRenderer.invoke('cardbox:findAll'),
  findOne: (id) => ipcRenderer.invoke('cardbox:findOne', id),
  create: (cardBoxData) => ipcRenderer.invoke('cardbox:create', cardBoxData),
  update: (id, cardBoxData) => ipcRenderer.invoke('cardbox:update', id, cardBoxData),
  remove: (id) => ipcRenderer.invoke('cardbox:remove', id),
  addNote: (cardBoxId, noteId) => ipcRenderer.invoke('cardbox:addNote', cardBoxId, noteId),
  removeNote: (cardBoxId, noteId) => ipcRenderer.invoke('cardbox:removeNote', cardBoxId, noteId),
  getNotes: (cardBoxId) => ipcRenderer.invoke('cardbox:getNotes', cardBoxId)
}

// 使用 contextBridge API 暴露 Electron API 和自定义 API
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('notesAPI', notesAPI)
    contextBridge.exposeInMainWorld('cardBoxAPI', cardBoxAPI)
    contextBridge.exposeInMainWorld('electronAPI', {
      getResourcePath: (filename: string) => path.join(process.resourcesPath, filename)
    })
    contextBridge.exposeInMainWorld('electronAPI', {
      onGlobalClick: (
        callback: (event: Electron.IpcRendererEvent, mouseEvent: MouseEvent) => void
      ) => {
        ipcRenderer.on('global-click', callback)
      },
      offGlobalClick: (
        callback: (event: Electron.IpcRendererEvent, mouseEvent: MouseEvent) => void
      ) => {
        ipcRenderer.removeListener('global-click', callback)
      }
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.notesAPI = notesAPI
  // @ts-ignore (define in dts)
  window.cardBoxAPI = cardBoxAPI
}
