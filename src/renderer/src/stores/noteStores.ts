// src/stores/noteStores.ts

import { defineStore } from 'pinia'
import {
  Note,
  // CreateNoteDto,
  // CardBox,
  Whiteboard,
  Connection,
  parseNoteContent
} from '../types/Note'
// import electronAPI from '../axiosConfig'
import { NotesAPI } from '../../../preload'
import { CardBoxAPI } from '../../../preload'
import { Notes, Table, TransactionOrder, Deeplink } from '@icon-park/vue-next'
import { ref } from 'vue'
// import { isEqual } from 'lodash'
// 在文件顶部添加类型声明（如果还没有的话）
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
  noteIds: string[] // 添加这一行
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
    selectedCardTypes: ref<string[]>(cardTypes.map((type) => type.value))
  }),

  actions: {
    // 折叠侧边栏
    toggleSidebar() {
      this.isSidebarCollapsed = !this.isSidebarCollapsed
    },
    // 设置侧边栏折叠状态
    setIsSidebarCollapsed(value: boolean) {
      this.isSidebarCollapsed = value
    },
    // 设置当前笔记
    setCurrentNote(note: Note | null) {
      this.currentNote = note
      this.currentNoteId = note ? note.id : undefined
    },

    // 打开笔记编辑器
    openNoteEditor(noteId?: string) {
      this.currentNoteId = noteId
      this.isEditorOpen = true
    },

    // 关闭笔记编辑器
    closeNoteEditor() {
      this.isEditorOpen = false
      this.currentNoteId = undefined
    },

    // 打开搜索窗口
    openSearchModal() {
      this.isSearchModalOpen = true
    },

    // 关闭搜索窗口
    closeSearchModal() {
      this.isSearchModalOpen = false
    },

    // 初始化笔记数据
    async initializeStore() {
      await this.fetchNotes()
    },

    // 获取所有笔记
    // async fetchNotes(includeDeleted: boolean = false) {
    //   try {
    //     const notes = await window.notesAPI.getNotes(includeDeleted)
    //     this.notes = notes
    //   } catch (error) {
    //     console.error('获取笔记列表失败:', error)
    //     throw error
    //   }
    // },
    async fetchNotes(includeDeleted: boolean = false) {
      try {
        const notes = await window.notesAPI.getNotes(includeDeleted)
        this.notes = includeDeleted ? notes : notes.filter((note) => !note.isDeleted)
      } catch (error) {
        console.error('获取笔记列表失败:', error)
        throw error
      }
    },

    // 获取单个笔记
    async fetchNoteById(id: string) {
      try {
        const notes = await window.notesAPI.getNote(`/notes/${id}`)
        const fetchedNote = parseNoteContent(notes)

        const index = this.notes.findIndex((n) => n.id === id)
        if (index !== -1) {
          this.notes[index] = fetchedNote
        } else {
          this.notes.push(fetchedNote)
        }

        this.setCurrentNote(fetchedNote)
      } catch (error) {
        console.error('Error fetching note:', error)
        throw error
      }
    },

    async createNewNote() {
      try {
        const response = await window.notesAPI.createNote()
        // const newNote = parseNoteContent(response)
        console.log('创建的笔记是：', response)
        this.notes.push(response)
        return response
      } catch (error) {
        console.error('创建笔记时出错:', error)
        throw error
      }
    },
    async createAndOpenNewNote() {
      console.log('创建新笔记')
      const newNote = await this.createNewNote()
      // console.log('新建的笔记是：', newNote)
      this.openNoteEditor(newNote.id)
    },

    // 搜索笔记
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

    // 更新笔记
    async updateNote(id: string, noteData: Partial<Note>): Promise<Note> {
      try {
        // 确保只发送可序列化的数据
        const serializableNoteData = JSON.parse(JSON.stringify(noteData))
        const response = await window.notesAPI.updateNote(id, serializableNoteData)
        const updatedNote = this.parseNoteContent(response)
        const index = this.notes.findIndex((note) => note.id === id)
        if (index !== -1) {
          this.notes[index] = updatedNote
        } else {
          this.notes.push(updatedNote)
        }
        return updatedNote
      } catch (error) {
        console.error('Error updating note:', error)
        throw error
      }
    },

    // 添加一个辅助方法来解析笔记内容
    parseNoteContent(note: any): Note {
      return {
        ...note,
        content: typeof note.content === 'string' ? JSON.parse(note.content) : note.content,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt)
      }
    },

    // 初始化卡片盒数据
    async initializeCardBoxes() {
      await this.fetchCardBoxes()
    },
    // 获取所有卡片盒
    async fetchCardBoxes() {
      try {
        const cardBoxes = await window.cardBoxAPI.findAll()
        this.cardBoxes = cardBoxes.map((box) => ({
          ...box,
          noteIds: box.noteIds || [] // 确保每个 CardBox 都有 noteIds 属性
        }))
      } catch (error) {
        console.error('获取卡片盒列表时出错:', error)
        throw error
      }
    },
    // 创建新卡片盒
    async createCardBox(cardBoxData: Partial<CardBox>) {
      try {
        const newCardBox = await window.cardBoxAPI.create(cardBoxData)
        this.cardBoxes.push({
          ...newCardBox,
          noteIds: [] // 确保新创建的卡片盒有一个空的 noteIds 数组
        })
        return newCardBox
      } catch (error) {
        console.error('创建卡片盒时出错:', error)
        throw error
      }
    },

    // 更新卡片盒
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
        return updatedCardBox
      } catch (error) {
        console.error('更新卡片盒时出错:', error)
        throw error
      }
    },

    // 删除卡片盒
    async deleteCardBox(id: string) {
      try {
        const result = await window.cardBoxAPI.remove(id)
        if (result.success) {
          this.cardBoxes = this.cardBoxes.filter((box) => box.id !== id)
          await this.fetchCardBoxes()
        } else {
          console.error('删除卡片盒失败:', result)
        }
      } catch (error) {
        console.error('删除卡片盒时出错:', error)
        throw error
      }
    },
    // 在卡片盒中添加笔记
    async addNoteToCardBox(cardBoxId: string, noteId: string) {
      try {
        await window.cardBoxAPI.addNote(cardBoxId, noteId)
        const cardBox = this.cardBoxes.find((box) => box.id === cardBoxId)
        if (cardBox && !cardBox.noteIds.includes(noteId)) {
          cardBox.noteIds.push(noteId)
        }
      } catch (error) {
        console.error('向卡片盒添加笔记时出错:', error)
        throw error
      }
    },

    // 从卡片盒中移除笔记
    async removeNoteFromCardBox(cardBoxId: string, noteId: string) {
      try {
        await window.cardBoxAPI.removeNote(cardBoxId, noteId)
        const cardBox = this.cardBoxes.find((box) => box.id === cardBoxId)
        if (cardBox) {
          cardBox.noteIds = cardBox.noteIds.filter((id) => id !== noteId)
        }
      } catch (error) {
        console.error('从卡片盒移除笔记时出错:', error)
        throw error
      }
    },
    // 获取卡片盒中的所有笔记
    async getNotesInCardBox(cardBoxId: string): Promise<Note[]> {
      try {
        const notes = await window.notesAPI.getNotesInCardBox(cardBoxId)
        // 更新本地存储中的笔记
        notes.forEach((note) => {
          const index = this.notes.findIndex((n) => n.id === note.id)
          if (index !== -1) {
            this.notes[index] = note
          } else {
            this.notes.push(note)
          }
        })
        return notes
      } catch (error) {
        console.error('获取卡片盒中的笔记失败:', error)
        throw error
      }
    },

    // 更新笔记所属卡片盒
    async updateNoteCardBox(noteId: string, newCardBoxId: string | null): Promise<Note | null> {
      console.log(`Updating note ${noteId} to card box ${newCardBoxId}`)
      try {
        const response = await window.notesAPI.updateNoteCardBox(noteId, newCardBoxId)

        if (response.success) {
          // 更新本地存储中的笔记
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
    // 移动到回收站
    // async moveToTrash(id: string) {
    //   try {
    //     await window.notesAPI.moveToTrash(id)
    //     const index = this.notes.findIndex((note) => note.id === id)
    //     if (index !== -1) {
    //       this.notes[index].isDeleted = true
    //     }
    //     this.notes = this.notes.filter((note) => note.id !== id)
    //     // 如果当前编辑的笔记被移动到回收站，关闭编辑器
    //     if (this.currentNoteId === id) {
    //       this.closeNoteEditor()
    //     }
    //   } catch (error) {
    //     console.error('移动笔记到回收站失败:', error)
    //     throw error
    //   }
    // },
    // async moveToTrash(id: string) {
    //   try {
    //     await window.notesAPI.moveToTrash(id)
    //     const index = this.notes.findIndex((note) => note.id === id)
    //     if (index !== -1) {
    //       this.notes[index] = { ...this.notes[index], isDeleted: true }
    //     }
    //     // 如果当前编辑的笔记被移动到回收站，关闭编辑器
    //     if (this.currentNoteId === id) {
    //       this.closeNoteEditor()
    //     }
    //     // 触发状态更新
    //     this.notes = [...this.notes]
    //   } catch (error) {
    //     console.error('移动笔记到回收站失败:', error)
    //     throw error
    //   }
    // },
    async moveToTrash(id: string) {
      console.log('noteStore→ 开始执行moveToTrash')
      try {
        const result = await window.notesAPI.moveToTrash(id)
        console.log('noteStore→ moveToTrash API 调用结果:', result)

        if (result.success) {
          console.log('noteStore→ 移动笔记到回收站成功')
          const noteIndex = this.notes.findIndex((note) => note.id === id)
          if (noteIndex !== -1) {
            this.notes[noteIndex] = result.note
            console.log('noteStore→ 更新笔记状态成功')
          } else {
            console.warn('noteStore→ 未找到要更新的笔记，添加到列表:', id)
            this.notes.push(result.note)
          }

          if (this.currentNoteId === id) {
            this.closeNoteEditor()
            console.log('noteStore→ 关闭笔记编辑器')
          }
          return true
        } else {
          console.error('noteStore→ 移动笔记到回收站失败:', result)
          return false
        }
      } catch (error) {
        console.error('noteStore→ 移动笔记到回收站时发生错误:', error)
        return false
      }
    },

    // 从回收站恢复
    async restoreFromTrash(id: string) {
      try {
        await window.notesAPI.restoreFromTrash(id)
        const index = this.notes.findIndex((note) => note.id === id)
        if (index !== -1) {
          this.notes[index].isDeleted = false
        }
      } catch (error) {
        console.error('从回收站恢复笔记失败:', error)
        throw error
      }
    },
    // 永久删除
    async permanentlyDelete(id: string) {
      try {
        await window.notesAPI.permanentlyDelete(id)
        this.notes = this.notes.filter((note) => note.id !== id)
      } catch (error) {
        console.error('永久删除笔记失败:', error)
        throw error
      }
    },
    // 获取回收站中的笔记
    async fetchDeletedNotes(): Promise<Note[]> {
      try {
        const deletedNotes = await window.notesAPI.getDeletedNotes()
        this.notes = deletedNotes // 更新 store 的状态
        return deletedNotes // 返回获取到的数据
      } catch (error) {
        console.error('获取回收站中的笔记失败:', error)
        throw error
      }
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

    toggleCardType(type: string) {
      const index = this.selectedCardTypes.indexOf(type)
      if (index === -1) {
        this.selectedCardTypes.push(type)
      } else {
        this.selectedCardTypes.splice(index, 1)
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
    // 根据ID获取卡片盒
    getCardBoxById: (state) => {
      return (id: string) => state.cardBoxes.find((box) => box.id === id)
    },

    // 获取卡片盒中的所有笔记
    // getNotesInCardBox: (state) => {
    //   return (cardBoxId: string) => {
    //     const cardBox = state.cardBoxes.find((box) => box.id === cardBoxId)
    //     return cardBox
    //       ? (cardBox.noteIds
    //           .map((id) => state.notes.find((note) => note.id === id))
    //           .filter(Boolean) as Note[])
    //       : []
    //   }
    // },
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
