import { Note, CardBox, Whiteboard, CreateWhiteboardInput } from './Note'

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
  // addNoteToCardBox: (cardBoxId: string, noteId: string) => Promise<void>
  updateNoteCardBox: (noteId: string, cardBoxId: string) => Promise<void>
  getStarredNotes: () => Promise<Note[]>
  getResourcePath: (filename: string) => Promise<string>
  updateStarredNotesOrder: (orders: { id: string; starredOrder: number }[]) => Promise<Note[]>
  addStarToNote: (id: string) => Promise<Note>
  removeStarFromNote: (id: string) => Promise<{ updatedNote: Note; reorderedNotes: Note[] }>
  createWhiteboard: (input: CreateWhiteboardInput) => Promise<Whiteboard>
  getTopLevelWhiteboards: () => Promise<Whiteboard[]>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
