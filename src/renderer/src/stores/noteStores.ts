// src/stores/noteStores.ts

import { defineStore } from 'pinia'
import { Note, Whiteboard, Connection, CardBox } from '../types/Note'
import { Notes, Table, TransactionOrder, Deeplink } from '@icon-park/vue-next'
import { ref } from 'vue'

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
    isSettingDropdownOpen: false,
    showCardBox: false
  }),

  actions: {
    toggleCardBox() {
      this.showCardBox = !this.showCardBox
    },
    setShowCardBox(show: boolean) {
      this.showCardBox = show
    },
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
      await this.fetchAllNotes()
      await this.initializeCardBoxes()
    },

    // 获取所有笔记
    async fetchAllNotes(includeDeleted: boolean = false) {
      try {
        const notes = await window.electronAPI.getAllNotes(includeDeleted)
        this.notes = notes
      } catch (error) {
        console.error('noteStores.ts→ 获取所有笔记失败:', error)
        throw error
      }
    },
    // 获取单个笔记
    async fetchNoteById(id: string): Promise<Note> {
      try {
        const note = await window.electronAPI.getNote(id)

        if (!note) {
          throw new Error(`Note with id ${id} not found`)
        }

        // 更新 notes 数组
        const index = this.notes.findIndex((n) => n.id === id)
        if (index !== -1) {
          this.notes[index] = note
        } else {
          this.notes.push(note)
        }

        // 设置当前笔记
        this.setCurrentNote(note)

        console.log('noteStores.ts→ 获取笔记', note)
        return note
      } catch (error) {
        console.error(`Failed to fetch note ${id}:`, error)
        if (error instanceof Error) {
          throw new Error(`Failed to fetch note: ${error.message}`)
        } else {
          throw new Error('An unknown error occurred while fetching the note')
        }
      }
    },

    // 获取一些笔记
    async getNotesByIds(ids: string[]) {
      await this.fetchAllNotes()
      const notes = this.notes.filter((note) => ids.includes(note.id))
      console.log('noteStores.ts→ 获取笔记成功', notes)
      return notes
    },

    // 创建新笔记
    async createNote() {
      console.log('noteStores.ts→ 创建新笔记')
      try {
        const newNote = await window.electronAPI.createNote()
        this.notes.push(newNote)
        this.setCurrentNote(newNote)
        return newNote
      } catch (error) {
        console.error('noteStores.ts→ 创建新笔记失败:', error)
        throw error
      }
    },

    // 创建并打开新笔记
    async createAndOpenNewNote() {
      console.log('noteStores.ts→ 创建并打开新笔记')
      const newNote = await this.createNote()
      this.openNoteEditor(newNote.id)
    },

    // 更新笔记
    async updateNote(id: string, noteData: Partial<Note>): Promise<Note> {
      try {
        console.log('noteStores.ts→ 更新笔记', id, noteData)
        const serializableNoteData = JSON.parse(JSON.stringify(noteData))
        const response = await window.electronAPI.updateNote(id, serializableNoteData)
        const updatedNote = this.parseNoteContent(response)
        console.log('noteStores.ts→ 更新后的笔记', updatedNote)
        const index = this.notes.findIndex((note) => note.id === id)
        if (index !== -1) {
          this.notes[index] = updatedNote
        } else {
          this.notes.push(updatedNote)
        }
        console.log(`noteStores.ts→ 更新笔记成功 ${id}`)
        return updatedNote
      } catch (error) {
        console.error(`noteStores.ts→ 更新笔记失败 ${id}:`, error)
        throw error
      }
    },

    // 移动到回收站
    async moveToTrash(id: string) {
      console.log('noteStores.ts→ 移动到回收站:', id)
      try {
        const result = await window.electronAPI.softDeleteNote(id)
        console.log('noteStores.ts→ 移动到回收站结果:', result)
        if (result) {
          const noteIndex = this.notes.findIndex((note) => note.id === id)
          if (noteIndex !== -1) {
            this.notes[noteIndex] = result.note as Note
            console.log('noteStores.ts→ 更新笔记状态成功')
          } else {
            console.warn('noteStores.ts→ 笔记未找到，添加:', id)
            this.notes.push(result.note as Note)
          }
          if (this.currentNoteId === id) {
            this.closeNoteEditor()
            console.log('noteStores.ts→ 关闭笔记编辑器')
          }
          return true
        } else {
          console.error('noteStores.ts→ 移动笔记到回收站失败:', result)
          return false
        }
      } catch (error) {
        console.error('noteStores.ts→ 移动笔记到回收站失败:', error)
        return false
      }
    },
    // 从回收站恢复
    async restoreFromTrash(id: string) {
      try {
        const result = await window.electronAPI.restoreNote(id)
        console.log('noteStores.ts→ 从回收站恢复笔记:', result)
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
    // 获取已删除的笔记
    async fetchDeletedNotes(): Promise<Note[]> {
      try {
        const deletedNotes = await window.electronAPI.getDeletedNotes()
        this.notes = deletedNotes
        console.log(`noteStores.ts→ 获取已删除的笔记`, deletedNotes)
        return deletedNotes
      } catch (error) {
        console.error('noteStores.ts→ 获取已删除的笔记失败:', error)
        throw error
      }
    },
    // 永久删除
    async permanentlyDelete(id: string) {
      try {
        await window.electronAPI.permanentDeleteNote(id)
        this.notes = this.notes.filter((note) => note.id !== id)
        console.log(`noteStores.ts→ 永久删除笔记: ${id}`)
      } catch (error) {
        console.error(`noteStores.ts→ 永久删除笔记失败: ${id}:`, error)
        throw error
      }
    },

    // 卡片盒操作
    async initializeCardBoxes() {
      await this.fetchCardBoxes()
    },
    // 获取卡片盒
    async fetchCardBoxes() {
      try {
        const cardBoxes = await window.electronAPI.getAllCardBoxes()
        this.cardBoxes = cardBoxes.map((box) => ({
          ...box,
          noteIds: box.noteIds || []
        }))
        console.log(`noteStores.ts→ 获取卡片盒`, this.cardBoxes)
      } catch (error) {
        console.error('noteStores.ts→ 获取卡片盒失败:', error)
        throw error
      }
    },

    // 创建卡片盒
    async createCardBox(name: string) {
      try {
        const newCardBox = await window.electronAPI.createCardBox(name)
        console.log('noteStores.ts→ 创建卡片盒', newCardBox)
        this.cardBoxes.push({
          ...newCardBox,
          noteIds: []
        })
        console.log(`noteStores.ts→ 创建卡片盒成功: ${newCardBox.id}`)
        return newCardBox
      } catch (error) {
        console.error('noteStores.ts→ 创建卡片盒失败:', error)
        throw error
      }
    },
    // 更新卡片盒
    async updateCardBox(id: string, name: string) {
      try {
        const updatedCardBox = await window.electronAPI.updateCardBox(id, name)
        if (updatedCardBox) {
          const index = this.cardBoxes.findIndex((box) => box.id === id)
          if (index !== -1) {
            this.cardBoxes[index] = updatedCardBox
          }
          console.log(`noteStores.ts→ 更新卡片盒: ${id}`)
          return updatedCardBox
        } else {
          console.error(`noteStores.ts→ 更新卡片盒失败: ${id}`, updatedCardBox)
          return null
        }
      } catch (error) {
        console.error(`noteStores.ts→ 更新卡片盒失败: ${id}`, error)
        throw error
      }
    },

    // 删除卡片盒
    async deleteCardBox(id: string) {
      try {
        await window.electronAPI.deleteCardBox(id)
        this.cardBoxes = this.cardBoxes.filter((box) => box.id !== id)
        console.log(`noteStores.ts→ 删除卡片盒: ${id}`)
        await this.fetchCardBoxes()
      } catch (error) {
        console.error(`noteStores.ts→ 删除卡片盒失败: ${id}`, error)
        throw error
      }
    },

    // 更新笔记的卡片盒
    async updateNoteCardBox(noteId: string, newCardBoxId: string): Promise<Note | null> {
      console.log(`Updating note ${noteId} to card box ${newCardBoxId}`)
      try {
        await window.electronAPI.updateNoteCardBox(noteId, newCardBoxId)
        console.log(`noteStores.ts→ Note ${noteId} updated successfully in local store`)
        return this.notes.find((note) => note.id === noteId) as Note | null
      } catch (error) {
        console.error('noteStores.ts→ Error in updateNoteCardBox:', error)
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

    // 添加星标收藏
    async addStarToNote(id: string) {
      try {
        const updatedNote = await window.electronAPI.addStarToNote(id)
        this.notes = this.notes.map((note) => (note.id === updatedNote.id ? updatedNote : note))
        console.log('noteStores.ts→ 添加星标收藏成功:', updatedNote)
        return updatedNote
      } catch (error) {
        console.error('noteStores.ts→ 添加星标收藏时出错:', error)
        throw error
      }
    },

    // 移除星标收藏
    async removeStarFromNote(id: string) {
      try {
        const result = await window.electronAPI.removeStarFromNote(id)

        // 创建一个 Map 来存储更新后的笔记
        const updatedNotesMap = new Map(
          [result.updatedNote, ...result.reorderedNotes].map((note) => [note.id, note])
        )

        // 一次性更新所有笔记
        this.notes = this.notes.map((note) =>
          updatedNotesMap.has(note.id) ? updatedNotesMap.get(note.id)! : note
        )

        console.log('noteStores.ts→ 移除星标收藏成功:', result)
        return result
      } catch (error) {
        console.error('noteStores.ts→ 移除星标收藏时出错:', error)
        throw error
      }
    },

    // 获取收藏的笔记
    async fetchStarredNotes() {
      try {
        const starredNotes = await window.electronAPI.getStarredNotes()
        console.log(`noteStores.ts→ 获取收藏的笔记`, starredNotes)
        return starredNotes
      } catch (error) {
        console.error('noteStores.ts→ 获取收藏的笔记失败:', error)
        throw error
      }
    },

    // 更新收藏笔记顺序
    async updateStarredNotesOrder(orders: { id: string; starredOrder: number }[]) {
      try {
        console.log('noteStores.ts→ 开始更新收藏笔记顺序', orders)

        // 乐观更新
        const optimisticUpdate = new Map(orders.map((order) => [order.id, order.starredOrder]))
        this.notes = this.notes.map((note) =>
          optimisticUpdate.has(note.id)
            ? { ...note, starredOrder: optimisticUpdate.get(note.id)! }
            : note
        )

        // 调用后端 API 更新顺序
        const result = await window.electronAPI.updateStarredNotesOrder(orders)

        console.log('noteStores.ts→ 收到后端返回的结果:', result)

        // 检查返回的结果是否为数组
        if (!Array.isArray(result)) {
          console.error('noteStores.ts→ 后端返回的数据格式不正确，预期是数组', result)
          this.rollbackOptimisticUpdate()
          return
        }

        // 如果是空数组，可能意味着没有笔记需要更新
        if (result.length === 0) {
          console.log('noteStores.ts→ 后端返回空数组，可能没有笔记需要更新')
          return
        }

        // 验证返回的数组是否包含有效的 Note 对象
        if (!this.isValidNoteArray(result)) {
          console.error('noteStores.ts→ 后端返回的数组包含无效的 Note 对象', result)
          this.rollbackOptimisticUpdate()
          return
        }

        const updatedNotes = result as Note[]

        // 创建一个 Map 来快速查找更新后的笔记
        const updatedNotesMap = new Map(updatedNotes.map((note) => [note.id, note]))

        // 更新本地状态
        this.notes = this.notes.map((note) => updatedNotesMap.get(note.id) || note)

        // 确保星标笔记保持正确的顺序
        // this.notes.sort((a, b) => {
        //   if (a.isStarred && b.isStarred) {
        //     return (a.starredOrder ?? 0) - (b.starredOrder ?? 0)
        //   }
        //   return 0 // 保持非星标笔记的原有顺序
        // })

        console.log('noteStores.ts→ 更新收藏笔记顺序成功', this.starredNotes)
      } catch (error) {
        console.error('noteStores.ts→ 更新收藏笔记顺序失败:', error)
        this.rollbackOptimisticUpdate()
        throw error
      }
    },

    // 辅助方法：检查是否为有效的 Note 数组
    isValidNoteArray(arr: any[]): boolean {
      return arr.every(
        (item) =>
          typeof item === 'object' &&
          item !== null &&
          'id' in item &&
          'starredOrder' in item &&
          'isStarred' in item
      )
    },

    // 辅助方法：回滚乐观更新
    rollbackOptimisticUpdate() {
      this.notes = this.notes.map((note) => ({ ...note, starredOrder: note.starredOrder }))
    }
  },

  getters: {
    // 获取收藏的笔记
    starredNotes: (state) =>
      state.notes
        .filter((note) => note.isStarred)
        .sort((a, b) => (a.starredOrder ?? 0) - (b.starredOrder ?? 0)),
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
    }

    // getNotesOnWhiteboard: (state) => {
    //   return (whiteboardId: string) => {
    //     const whiteboard = state.whiteboards.find((board) => board.id === whiteboardId)
    //     return whiteboard
    //       ? (whiteboard.notes
    //           .map((wbNote) => ({
    //             ...state.notes.find((note) => note.id === wbNote.noteId),
    //             position: wbNote.position
    //           }))
    //           .filter(Boolean) as (Note & {
    //           position: { x: number; y: number }
    //         })[])
    //       : []
    //   }
    // },

    // getConnectionsOnWhiteboard: (state) => {
    //   return (whiteboardId: string) =>
    //     state.connections.filter((conn) => conn.whiteboardId === whiteboardId)
    // }
  },
  persist: true
})
