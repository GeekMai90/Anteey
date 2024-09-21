import { Note } from './Note'

export interface ElectronAPI {
  createNote: () => Promise<Note>
  getNote: (id: string) => Promise<Note | undefined>
  getAllNotes: (includeDeleted: boolean) => Promise<Note[]>
  updateNote: (id: string, updatedNote: Partial<Note>) => Promise<Note>
  deleteNote: (id: string) => Promise<boolean>
  softDeleteNote: (id: string) => Promise<{ success: boolean; note: Note | null }>
  restoreNote: (id: string) => Promise<void>
  getDeletedNotes: () => Promise<Note[]>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
