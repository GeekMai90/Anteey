import { Note, CardBox } from './Note'

export interface ElectronAPI {
  createNote: () => Promise<Note>
  getNote: (id: string) => Promise<Note | undefined>
  getAllNotes: (includeDeleted: boolean) => Promise<Note[]>
  updateNote: (id: string, updatedNote: Partial<Note>) => Promise<Note>
  deleteNote: (id: string) => Promise<boolean>
  softDeleteNote: (id: string) => Promise<{ success: boolean; note: Note | null }>
  restoreNote: (id: string) => Promise<void>
  getDeletedNotes: () => Promise<Note[]>
  permanentDeleteNote: (id: string) => Promise<boolean>
  createCardBox: (name: string) => Promise<CardBox>
  getAllCardBoxes: () => Promise<CardBox[]>
  updateCardBox: (id: string, name: string) => Promise<CardBox | undefined>
  deleteCardBox: (id: string) => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
