import { Note } from './Note'

export interface ElectronAPI {
  createNote: () => Promise<Note>
  getNote: (id: string) => Promise<Note | undefined>
  getAllNotes: (includeDeleted: boolean) => Promise<Note[]>
  updateNote: (id: string, updatedNote: Partial<Note>) => Promise<Note>
  deleteNote: (id: string) => Promise<boolean>
  // 主进程返回的是  { success: true, note: updatedNote }
  softDeleteNote: (id: string) => Promise<{ success: boolean; note: Note | null }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
