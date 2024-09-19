// src/stores/noteStores.ts

import { defineStore } from 'pinia'
import { Note, Whiteboard, Connection, parseNoteContent } from '../types/Note'
import { NotesAPI } from '../../../preload'
import { CardBoxAPI } from '../../../preload'
import { Notes, Table, TransactionOrder, Deeplink } from '@icon-park/vue-next'
import { ref } from 'vue'

declare global {
  interface Window {
    notesAPI: NotesAPI
    cardBoxAPI: CardBoxAPI
  }
}

interface CardBox {
  id: string
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
  noteIds: string[]
}

const cardTypes = [
  { value: 'Maincard', label: '主要卡', icon: Notes },
  { value: 'Bibcard', label: '书目卡', icon: Table },
  { value: 'Indexcard', label: '索引卡', icon: TransactionOrder },
  { value: 'Hoplinkcard', label: '跳转卡', icon: Deeplink }
]

export const useNoteStore = defineStore('note', {
  state: () => ({
    notes: [] as Note[],
    cardBoxes: [] as CardBox[],
    whiteboards: [] as Whiteboard[],
    connections: [] as Connection[],
    isEditorOpen: false,
    currentNoteId: undefined as string | undefined,
    currentNote: null as Note | null,
    isSearchModalOpen: false,
    isSidebarCollapsed: false,
    isRightSidebarOpen: false,
    rightSidebarNotes: [] as Note[],
    selectedCardTypes: ref<string[]>(cardTypes.map((type) => type.value)),
    noteSaveStatus: {} as Record<string, 'idle' | 'saving' | 'saved' | 'error'>,
    currentNoteSaveStatus: 'idle' as 'idle' | 'saving' | 'saved' | 'error',
    isSettingDropdownOpen: false
  }),

  actions: {
    // UI 状态管理
    toggleSidebar() {
      this.isSidebarCollapsed = !this.isSidebarCollapsed
    },
    setIsSidebarCollapsed(value: boolean) {
      this.isSidebarCollapsed = value
    },
    setCurrentNote(note: Note | null) {
      this.currentNote = note
      this.currentNoteId = note ? note.id : undefined
    },
    openNoteEditor(noteId?: string) {
      this.currentNoteId = noteId
      this.isEditorOpen = true
    },
    closeNoteEditor() {
      this.isEditorOpen = false
      this.currentNoteId = undefined
    },
    openSearchModal() {
      this.isSearchModalOpen = true
    },
    closeSearchModal() {
      this.isSearchModalOpen = false
    },
    updateCurrentNoteSaveStatus(status: 'idle' | 'saving' | 'saved' | 'error') {
      this.currentNoteSaveStatus = status
    },
    toggleSettingDropdown() {
      this.isSettingDropdownOpen = !this.isSettingDropdownOpen
    },
    closeSettingDropdown() {
      this.isSettingDropdownOpen = false
    },

    // 初始化
    async initializeStore() {
      await this.fetchNotes()
      await this.initializeCardBoxes()
    },

    // 笔记操作
    async fetchNotes(includeDeleted: boolean = false) {
      try {
        const notes = await window.notesAPI.getNotes(includeDeleted)
        this.notes = includeDeleted ? notes : notes.filter((note) => !note.isDeleted)
        console.log(`Fetched ${this.notes.length} notes`)
      } catch (error) {
        console.error('Failed to fetch notes:', error)
        throw error
      }
    },

    async fetchNoteById(id: string) {
      try {
        const note = await window.notesAPI.getNote(id)
        const fetchedNote = parseNoteContent(note)
        const index = this.notes.findIndex((n) => n.id === id)
        if (index !== -1) {
          this.notes[index] = fetchedNote
        } else {
          this.notes.push(fetchedNote)
        }
        this.setCurrentNote(fetchedNote)
        console.log(`Fetched note: ${id}`)
        return fetchedNote
      } catch (error) {
        console.error(`Failed to fetch note ${id}:`, error)
        throw error
      }
    },

    async createNewNote() {
      try {
        const response = await window.notesAPI.createNote()
        console.log('Created new note:', response)
        this.notes.push(response)
        this.setCurrentNote(response)
        return response
      } catch (error) {
        console.error('Failed to create new note:', error)
        throw error
      }
    },

    async createAndOpenNewNote() {
      console.log('Creating and opening new note')
      const newNote = await this.createNewNote()
      this.openNoteEditor(newNote.id)
    },

    async updateNote(id: string, noteData: Partial<Note>): Promise<Note> {
      try {
        const serializableNoteData = JSON.parse(JSON.stringify(noteData))
        const response = await window.notesAPI.updateNote(id, serializableNoteData)
        const updatedNote = this.parseNoteContent(response)
        const index = this.notes.findIndex((note) => note.id === id)
        if (index !== -1) {
          this.notes[index] = updatedNote
        } else {
          this.notes.push(updatedNote)
        }
        console.log(`Updated note: ${id}`)
        return updatedNote
      } catch (error) {
        console.error(`Failed to update note ${id}:`, error)
        throw error
      }
    },

    async moveToTrash(id: string) {
      console.log('Moving note to trash:', id)
      try {
        const result = await window.notesAPI.moveToTrash(id)
        console.log('Move to trash result:', result)
        if (result.success) {
          const noteIndex = this.notes.findIndex((note) => note.id === id)
          if (noteIndex !== -1) {
            this.notes[noteIndex] = result.note
            console.log('Updated note status successfully')
          } else {
            console.warn('Note not found in local store, adding:', id)
            this.notes.push(result.note)
          }
          if (this.currentNoteId === id) {
            this.closeNoteEditor()
            console.log('Closed note editor')
          }
          return true
        } else {
          console.error('Failed to move note to trash:', result)
          return false
        }
      } catch (error) {
        console.error('Error moving note to trash:', error)
        return false
      }
    },

    async restoreFromTrash(id: string) {
      try {
        await window.notesAPI.restoreFromTrash(id)
        const index = this.notes.findIndex((note) => note.id === id)
        if (index !== -1) {
          this.notes[index].isDeleted = false
        }
        console.log(`Restored note from trash: ${id}`)
      } catch (error) {
        console.error(`Failed to restore note ${id} from trash:`, error)
        throw error
      }
    },

    async permanentlyDelete(id: string) {
      try {
        await window.notesAPI.permanentlyDelete(id)
        this.notes = this.notes.filter((note) => note.id !== id)
        console.log(`Permanently deleted note: ${id}`)
      } catch (error) {
        console.error(`Failed to permanently delete note ${id}:`, error)
        throw error
      }
    },

    async fetchDeletedNotes(): Promise<Note[]> {
      try {
        const deletedNotes = await window.notesAPI.getDeletedNotes()
        this.notes = deletedNotes
        console.log(`Fetched ${deletedNotes.length} deleted notes`)
        return deletedNotes
      } catch (error) {
        console.error('Failed to fetch deleted notes:', error)
        throw error
      }
    },

    // 卡片盒操作
    async initializeCardBoxes() {
      await this.fetchCardBoxes()
    },

    async fetchCardBoxes() {
      try {
        const cardBoxes = await window.cardBoxAPI.findAll()
        this.cardBoxes = cardBoxes.map((box) => ({
          ...box,
          noteIds: box.noteIds || []
        }))
        console.log(`Fetched ${this.cardBoxes.length} card boxes`)
      } catch (error) {
        console.error('Failed to fetch card boxes:', error)
        throw error
      }
    },

    async createCardBox(cardBoxData: Partial<CardBox>) {
      try {
        const newCardBox = await window.cardBoxAPI.create(cardBoxData)
        this.cardBoxes.push({
          ...newCardBox,
          noteIds: []
        })
        console.log(`Created new card box: ${newCardBox.id}`)
        return newCardBox
      } catch (error) {
        console.error('Failed to create card box:', error)
        throw error
      }
    },

    async updateCardBox(id: string, updatedData: Partial<CardBox>) {
      try {
        const updatedCardBox = await window.cardBoxAPI.update(id, updatedData as any)
        const index = this.cardBoxes.findIndex((box) => box.id === id)
        if (index !== -1) {
          this.cardBoxes[index] = {
            ...this.cardBoxes[index],
            ...updatedCardBox,
            noteIds: updatedCardBox.noteIds || []
          }
        }
        console.log(`Updated card box: ${id}`)
        return updatedCardBox
      } catch (error) {
        console.error(`Failed to update card box ${id}:`, error)
        throw error
      }
    },

    async deleteCardBox(id: string) {
      try {
        const result = await window.cardBoxAPI.remove(id)
        if (result.success) {
          this.cardBoxes = this.cardBoxes.filter((box) => box.id !== id)
          await this.fetchCardBoxes()
          console.log(`Deleted card box: ${id}`)
        } else {
          console.error(`Failed to delete card box ${id}:`, result)
        }
      } catch (error) {
        console.error(`Error deleting card box ${id}:`, error)
        throw error
      }
    },

    async addNoteToCardBox(cardBoxId: string, noteId: string) {
      try {
        await window.cardBoxAPI.addNote(cardBoxId, noteId)
        const cardBox = this.cardBoxes.find((box) => box.id === cardBoxId)
        if (cardBox && !cardBox.noteIds.includes(noteId)) {
          cardBox.noteIds.push(noteId)
        }
        console.log(`Added note ${noteId} to card box ${cardBoxId}`)
      } catch (error) {
        console.error(`Failed to add note ${noteId} to card box ${cardBoxId}:`, error)
        throw error
      }
    },

    async removeNoteFromCardBox(cardBoxId: string, noteId: string) {
      try {
        await window.cardBoxAPI.removeNote(cardBoxId, noteId)
        const cardBox = this.cardBoxes.find((box) => box.id === cardBoxId)
        if (cardBox) {
          cardBox.noteIds = cardBox.noteIds.filter((id) => id !== noteId)
        }
        console.log(`Removed note ${noteId} from card box ${cardBoxId}`)
      } catch (error) {
        console.error(`Failed to remove note ${noteId} from card box ${cardBoxId}:`, error)
        throw error
      }
    },

    async getNotesInCardBox(cardBoxId: string): Promise<Note[]> {
      try {
        const notes = await window.notesAPI.getNotesInCardBox(cardBoxId)
        notes.forEach((note) => {
          const index = this.notes.findIndex((n) => n.id === note.id)
          if (index !== -1) {
            this.notes[index] = note
          } else {
            this.notes.push(note)
          }
        })
        console.log(`Fetched ${notes.length} notes from card box ${cardBoxId}`)
        return notes
      } catch (error) {
        console.error(`Failed to get notes in card box ${cardBoxId}:`, error)
        throw error
      }
    },

    async updateNoteCardBox(noteId: string, newCardBoxId: string | null): Promise<Note | null> {
      console.log(`Updating note ${noteId} to card box ${newCardBoxId}`)
      try {
        const response = await window.notesAPI.updateNoteCardBox(noteId, newCardBoxId)
        if (response.success) {
          const noteIndex = this.notes.findIndex((note) => note.id === noteId)
          if (noteIndex !== -1) {
            this.notes[noteIndex] = {
              ...this.notes[noteIndex],
              cardBoxId: newCardBoxId ?? undefined
            }
            console.log(`Note ${noteId} updated successfully in local store`)
            return this.notes[noteIndex]
          } else {
            console.error(`Note ${noteId} not found in local store`)
          }
        } else {
          console.error(`Failed to update note ${noteId} in the backend:`, response)
        }
        return null
      } catch (error) {
        console.error('Error in updateNoteCardBox:', error)
        throw error
      }
    },

    // 辅助方法
    parseNoteContent(note: any): Note {
      return {
        ...note,
        content: typeof note.content === 'string' ? JSON.parse(note.content) : note.content,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt)
      }
    },

    // 搜索功能
    searchNotes(query: string): Array<{
      id: string
      title: string
      blocks: Array<{ content: string }>
    }> {
      console.log('Searching for:', query)
      console.log('Total notes:', this.notes.length)
      const lowercaseQuery = query.toLowerCase().trim()
      if (!lowercaseQuery) return []

      return this.notes.reduce(
        (results, note) => {
          const matchingBlocks: Array<{ content: string }> = []

          if (note.address.toLowerCase().includes(lowercaseQuery)) {
            matchingBlocks.push({ content: note.address })
          }

          const searchContent = (content: any) => {
            if (!content) return
            if (typeof content === 'object') {
              Object.values(content).forEach((value) => {
                if (typeof value === 'string' && value.toLowerCase().includes(lowercaseQuery)) {
                  matchingBlocks.push({ content: value })
                } else if (typeof value === 'object') {
                  searchContent(value)
                }
              })
            }
          }

          searchContent(note.content)

          note.tags.forEach((tag) => {
            if (tag.toLowerCase().includes(lowercaseQuery)) {
              matchingBlocks.push({ content: `#${tag}` })
            }
          })

          if (matchingBlocks.length > 0) {
            results.push({
              id: note.id,
              title: note.address,
              blocks: matchingBlocks
            })
          }

          return results
        },
        [] as Array<{ id: string; title: string; blocks: Array<{ content: string }> }>
      )
    },

    // 右侧边栏功能
    openRightSidebar() {
      this.isRightSidebarOpen = true
    },
    closeRightSidebar() {
      this.isRightSidebarOpen = false
    },
    addNoteToRightSidebar(noteId: string) {
      const note = this.notes.find((n) => n.id === noteId)
      if (note && !this.rightSidebarNotes.some((n) => n.id === noteId)) {
        this.rightSidebarNotes.push(note)
        this.openRightSidebar()
      }
    },
    removeNoteFromRightSidebar(noteId: string) {
      this.rightSidebarNotes = this.rightSidebarNotes.filter((n) => n.id !== noteId)
      if (this.rightSidebarNotes.length === 0) {
        this.closeRightSidebar()
      }
    },
    clearRightSidebarNotes() {
      this.rightSidebarNotes = []
      this.closeRightSidebar()
    },

    toggleCardType(type: string) {
      const index = this.selectedCardTypes.indexOf(type)
      if (index === -1) {
        this.selectedCardTypes.push(type)
      } else {
        this.selectedCardTypes.splice(index, 1)
      }
    },
    async toggleStarredStatus(id: string) {
      try {
        const updatedNote = await window.notesAPI.toggleStarredStatus(id)
        const index = this.notes.findIndex((note) => note.id === id)
        if (index !== -1) {
          this.notes[index] = this.parseNoteContent(updatedNote)
        }
        console.log(`Toggled star status for note: ${id}`)
        return updatedNote
      } catch (error) {
        console.error(`Failed to toggle star status for note ${id}:`, error)
        throw error
      }
    },

    async fetchStarredNotes() {
      try {
        const starredNotes = await window.notesAPI.getStarredNotes()
        console.log(`Fetched ${starredNotes.length} starred notes`)
        return starredNotes.map((note) => this.parseNoteContent(note))
      } catch (error) {
        console.error('Failed to fetch starred notes:', error)
        throw error
      }
    }
  },

  getters: {
    getNoteById: (state) => {
      return (id: string) => state.notes.find((note) => note.id === id)
    },

    getNoteByAddress: (state) => {
      return (address: string) => state.notes.find((note) => note.address === address)
    },

    getCardBoxById: (state) => {
      return (id: string) => state.cardBoxes.find((box) => box.id === id)
    },

    getLinkedNotes: (state) => {
      return (noteId: string) => {
        const note = state.notes.find((n) => n.id === noteId)
        return note
          ? (note.linkedTo
              .map((id) => state.notes.find((n) => n.id === id))
              .filter(Boolean) as Note[])
          : []
      }
    },

    getBacklinks: (state) => {
      return (noteId: string) => {
        return state.notes.filter((note) => note.linkedFrom.includes(noteId))
      }
    },

    getNoteWithLinks: (state) => {
      return (noteId: string) => {
        const note = state.notes.find((n) => n.id === noteId)
        if (!note) return null

        const linkedNotes = note.linkedTo
          .map((id) => state.notes.find((n) => n.id === id))
          .filter(Boolean) as Note[]
        const backlinks = state.notes.filter((n) => n.linkedFrom.includes(noteId))

        return {
          ...note,
          linkedNotes,
          backlinks
        }
      }
    },

    getNotesOnWhiteboard: (state) => {
      return (whiteboardId: string) => {
        const whiteboard = state.whiteboards.find((board) => board.id === whiteboardId)
        return whiteboard
          ? (whiteboard.notes
              .map((wbNote) => ({
                ...state.notes.find((note) => note.id === wbNote.noteId),
                position: wbNote.position
              }))
              .filter(Boolean) as (Note & {
              position: { x: number; y: number }
            })[])
          : []
      }
    },

    getConnectionsOnWhiteboard: (state) => {
      return (whiteboardId: string) =>
        state.connections.filter((conn) => conn.whiteboardId === whiteboardId)
    }
  },
  persist: true
})
