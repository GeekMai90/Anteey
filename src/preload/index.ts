import { contextBridge, ipcRenderer } from 'electron'
import { Note } from '../renderer/src/types/Note'

contextBridge.exposeInMainWorld('electronAPI', {
  createNote: async (): Promise<Note> => {
    try {
      return (await ipcRenderer.invoke('create-note')) as Note
    } catch (error) {
      console.error('Preload: Failed to create note:', error)
      throw error
    }
  },
  getNote: async (id: string): Promise<Note | undefined> => {
    try {
      return (await ipcRenderer.invoke('get-note', id)) as Note | undefined
    } catch (error) {
      console.error(`Preload: Failed to get note with id ${id}:`, error)
      throw error
    }
  },
  getAllNotes: async (includeDeleted: boolean): Promise<Note[]> => {
    try {
      return (await ipcRenderer.invoke('get-all-notes', includeDeleted)) as Note[]
    } catch (error) {
      console.error('Preload: Failed to get all notes:', error)
      throw error
    }
  },
  updateNote: async (id: string, updateData: Partial<Note>) => {
    console.log('Preload: 正在更新笔记:', { id, updateData })
    const result = await ipcRenderer.invoke('update-note', { id, updateData })
    if (!result.success) {
      throw new Error(result.error)
    }
    console.log('Preload: 更新笔记成功:', result.note)
    return result.note
  },

  deleteNote: async (id: string): Promise<boolean> => {
    try {
      return (await ipcRenderer.invoke('delete-note', id)) as boolean
    } catch (error) {
      console.error(`Preload: Failed to delete note with id ${id}:`, error)
      throw error
    }
  }
})
