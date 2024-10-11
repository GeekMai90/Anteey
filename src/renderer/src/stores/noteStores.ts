// src/stores/noteStores.ts

import { defineStore } from 'pinia'
import { Note, Whiteboard, Connection, CardBox } from '../types/Note'
import { Notes, Table, TransactionOrder, Deeplink } from '@icon-park/vue-next'
import { ref } from 'vue'
import { useUIStore } from './useUIStore'

const cardTypes = [
  { value: 'Maincard', label: '主要卡', icon: Notes },
  { value: 'Bibcard', label: '书目卡', icon: Table },
  { value: 'Indexcard', label: '索引卡', icon: TransactionOrder },
  { value: 'Hoplinkcard', label: '跳转卡', icon: Deeplink }
]

export const useNoteStore = defineStore('note', {
  state: () => ({
    // notes: [] as Note[],
    notesMap: new Map<string, Note>(), // 笔记 Map 对象，用笔记的 id 作为键，笔记对象作为值。
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

    // 确保在使用 notesMap 之前进行初始化
    initializeNotes() {
      if (!(this.notesMap instanceof Map)) {
        this.notesMap = new Map<string, Note>()
      }
    },

    // 初始化
    async initializeStore() {
      await this.fetchAllNotes()
      await this.initializeCardBoxes()
    },

    // 获取所有笔记
    async fetchAllNotes(includeDeleted: boolean = false) {
      try {
        const allNotes = await window.electronAPI.getAllNotes(includeDeleted)
        // this.notes = notes
        // 更新 notesMap
        this.notesMap = new Map(allNotes.map((note) => [note.id, note]))
        return allNotes
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

        // 存储到所有笔记 Map 中，使用 Map 来存储笔记，提高查找效率
        this.notesMap.set(id, note)

        // 设置当前笔记
        this.currentNote = note

        console.log('noteStores.ts→ 获取笔记', note)
        return note
      } catch (error) {
        console.error(`noteStores.ts→ 获取笔记失败 ${id}:`, error)
        if (error instanceof Error) {
          throw new Error(`noteStores.ts→ 获取笔记失败: ${error.message}`)
        } else {
          throw new Error('noteStores.ts→ 获取笔记失败: 未知错误')
        }
      }
    },
    // 将白板中创建的笔记添加到笔记列表中
    async addNoteToNoteList(id: string) {
      const note = await this.fetchNoteById(id)
      this.notesMap.set(note.id, note)
    },
    // 私有方法：更新本地笔记状态
    updateLocalNote(id: string, updatedNote: Note) {
      this.notesMap.set(id, updatedNote)
      if (this.currentNote && this.currentNote.id === id) {
        this.currentNote = updatedNote
      }
    },
    // 更新整个笔记或多个字段
    async updateNote(id: string, noteData: Partial<Note>): Promise<Note> {
      try {
        console.log('noteStores.ts→ 更新笔记', id, noteData)
        const serializableNoteData = JSON.parse(JSON.stringify(noteData))
        const response = await window.electronAPI.updateNote(id, serializableNoteData)
        const updatedNote = this.parseNoteContent(response)

        this.updateLocalNote(id, updatedNote)

        console.log('noteStores.ts→ 更新后的笔记', updatedNote)
        return updatedNote
      } catch (error) {
        console.error(`noteStores.ts→ 更新笔记失败 ${id}:`, error)
        throw error
      }
    },

    // 更新笔记内容
    async updateNoteContent(id: string, content: any): Promise<Note> {
      try {
        const updatedNote = await window.electronAPI.updateNoteContent(id, content)

        // 更新 notesMap
        this.updateLocalNote(id, updatedNote)
        // 仅更新 notesMap，不触发响应式更新
        // if (this.notesMap.has(id)) {
        //   const existingNote = this.notesMap.get(id)!
        //   Object.assign(existingNote, updatedNote)
        // }

        console.log('noteStores.ts→ 更新笔记内容成功', updatedNote)
        return updatedNote
      } catch (error) {
        console.error(`noteStores.ts→ 更新笔记内容失败 ${id}:`, error)
        throw error
      }
      console.log('noteStores.ts→ 更新笔记内容成功', id, content)
    },

    // 更新当前笔记（可以是部分更新）
    updateCurrentNote(noteData: Partial<Note>) {
      if (!this.currentNote) return

      const updatedNote = { ...this.currentNote, ...noteData }
      const updateMethod = 'content' in noteData ? this.updateNoteContent : this.updateNote

      updateMethod(updatedNote.id, noteData).catch((error) =>
        console.error('更新当前笔记失败:', error)
      )

      // 立即更新本地状态，以提供即时反馈
      this.updateLocalNote(updatedNote.id, updatedNote)
    },

    // 获取一些笔记
    async getNotesByIds(ids: string[]) {
      await this.fetchAllNotes()
      const notes = ids
        .map((id) => this.notesMap.get(id))
        .filter((note) => note !== undefined) as Note[]
      console.log('noteStores.ts→ 获取笔记成功', notes)
      return notes
    },

    // 创建新笔记
    async createNote() {
      console.log('noteStores.ts→ 创建新笔记')
      try {
        const newNote = await window.electronAPI.createNote()
        this.updateLocalNote(newNote.id, newNote)
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

    // 移动到回收站
    async moveToTrash(id: string) {
      console.log('noteStores.ts→ 移动到回收站:', id)
      try {
        const result = await window.electronAPI.softDeleteNote(id)
        console.log('noteStores.ts→ 移动到回收站结果:', result)
        if (result) {
          if (this.notesMap.has(id)) {
            this.notesMap.set(id, result.note as Note)
            console.log('noteStores.ts→ 更新笔记状态成功')
          } else {
            console.warn('noteStores.ts→ 笔记未找到，添加:', id)
            this.notesMap.set(id, result.note as Note)
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

        if (this.notesMap.has(id)) {
          const note = this.notesMap.get(id)!
          note.isDeleted = false
          this.notesMap.set(id, note)
          console.log(`noteStores.ts→ 从回收站恢复笔记: ${id}`)
        } else {
          console.warn(`noteStores.ts→ 笔记 ${id} 未找到，添加它`)
        }

        return result
      } catch (error) {
        console.error(`noteStores.ts→ 从回收站恢复笔记失败 ${id}:`, error)
        throw error
      }
    },
    // 获取已删除的笔记
    // async fetchDeletedNotes(): Promise<Note[]> {
    //   try {
    //     const deletedNotes = await window.electronAPI.getDeletedNotes()
    //     this.notes = deletedNotes
    //     console.log(`noteStores.ts→ 获取已删除的笔记`, deletedNotes)
    //     return deletedNotes
    //   } catch (error) {
    //     console.error('noteStores.ts→ 获取已删除的笔记失败:', error)
    //     throw error
    //   }
    // },
    // 永久删除
    async permanentlyDelete(id: string) {
      try {
        await window.electronAPI.permanentDeleteNote(id)

        if (this.notesMap.has(id)) {
          this.notesMap.delete(id)
          console.log(`noteStores.ts→ 永久删除笔记: ${id}`)
        } else {
          console.warn(`noteStores.ts→ 尝试删除不存在的笔记: ${id}`)
        }

        // 如果当前打开的笔记被删除，关闭编辑器
        if (this.currentNoteId === id) {
          this.closeNoteEditor()
        }
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
    // async updateNoteCardBox(noteId: string, newCardBoxId: string): Promise<Note | null> {
    //   console.log(`Updating note ${noteId} to card box ${newCardBoxId}`)
    //   try {
    //     await window.electronAPI.updateNoteCardBox(noteId, newCardBoxId)
    //     console.log(`noteStores.ts→ Note ${noteId} updated successfully in local store`)
    //     return this.notes.find((note) => note.id === noteId) as Note | null
    //   } catch (error) {
    //     console.error('noteStores.ts→ Error in updateNoteCardBox:', error)
    //     throw error
    //   }
    // },
    // 更新笔记的卡片盒
    async updateNoteCardBox(noteId: string, newCardBoxId: string): Promise<Note | null> {
      console.log(`noteStores.ts→ 更新笔记 ${noteId} 到卡片盒 ${newCardBoxId}`)
      try {
        const updatedNote = await window.electronAPI.updateNoteCardBox(noteId, newCardBoxId)

        if (this.notesMap.has(noteId)) {
          // 更新本地存储的笔记
          const note = this.notesMap.get(noteId)!
          note.cardBoxId = newCardBoxId
          this.notesMap.set(noteId, note)

          console.log(`noteStores.ts→ Note ${noteId} 成功更新卡片盒`)
        } else {
          console.warn(`noteStores.ts→ Note ${noteId} 未找到`)
        }
        return updatedNote
      } catch (error) {
        console.error('noteStores.ts→ 更新笔记卡片盒失败:', error)
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
    // searchNotes(query: string): Array<{
    //   id: string
    //   title: string
    //   blocks: Array<{ content: string }>
    // }> {
    //   console.log('Searching for:', query)
    //   console.log('Total notes:', this.notes.length)
    //   const lowercaseQuery = query.toLowerCase().trim()
    //   if (!lowercaseQuery) return []

    //   return this.notes.reduce(
    //     (results, note) => {
    //       const matchingBlocks: Array<{ content: string }> = []

    //       if (note.address.toLowerCase().includes(lowercaseQuery)) {
    //         matchingBlocks.push({ content: note.address })
    //       }

    //       const searchContent = (content: any) => {
    //         if (!content) return
    //         if (typeof content === 'object') {
    //           Object.values(content).forEach((value) => {
    //             if (typeof value === 'string' && value.toLowerCase().includes(lowercaseQuery)) {
    //               matchingBlocks.push({ content: value })
    //             } else if (typeof value === 'object') {
    //               searchContent(value)
    //             }
    //           })
    //         }
    //       }

    //       searchContent(note.content)

    //       note.tags.forEach((tag) => {
    //         if (tag.toLowerCase().includes(lowercaseQuery)) {
    //           matchingBlocks.push({ content: `#${tag}` })
    //         }
    //       })

    //       if (matchingBlocks.length > 0) {
    //         results.push({
    //           id: note.id,
    //           title: note.address,
    //           blocks: matchingBlocks
    //         })
    //       }

    //       return results
    //     },
    //     [] as Array<{ id: string; title: string; blocks: Array<{ content: string }> }>
    //   )
    // },
    searchNotes(query: string): Array<{
      id: string
      title: string
      blocks: Array<{ content: string }>
    }> {
      console.log('Searching for:', query)
      console.log('Total notes:', this.notesMap.size)
      const lowercaseQuery = query.toLowerCase().trim()
      if (!lowercaseQuery) return []

      return Array.from(this.notesMap.values()).reduce(
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
    addNoteToRightSidebar(noteId: string) {
      const note = this.notesMap.get(noteId)
      if (note && !this.rightSidebarNotes.some((n) => n.id === noteId)) {
        this.rightSidebarNotes.push(note)
      } else if (!note) {
        console.warn(`Note with id ${noteId} not found in notesMap`)
      }
    },
    removeNoteFromRightSidebar(noteId: string) {
      const uiStore = useUIStore()
      this.rightSidebarNotes = this.rightSidebarNotes.filter((n) => n.id !== noteId)
      if (this.rightSidebarNotes.length === 0) {
        uiStore.closeRightSidebar()
      }
    },
    clearRightSidebarNotes() {
      this.rightSidebarNotes = []
      const uiStore = useUIStore()
      uiStore.closeRightSidebar()
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
    // async addStarToNote(id: string) {
    //   try {
    //     const updatedNote = await window.electronAPI.addStarToNote(id)
    //     this.notes = this.notes.map((note) => (note.id === updatedNote.id ? updatedNote : note))
    //     console.log('noteStores.ts→ 添加星标收藏成功:', updatedNote)
    //     return updatedNote
    //   } catch (error) {
    //     console.error('noteStores.ts→ 添加星标收藏时出错:', error)
    //     throw error
    //   }
    // },
    // 添加星标收藏
    async addStarToNote(id: string) {
      try {
        const updatedNote = await window.electronAPI.addStarToNote(id)

        if (this.notesMap.has(id)) {
          this.notesMap.set(id, updatedNote)
          console.log('noteStores.ts→ 添加星标收藏成功:', updatedNote)
        } else {
          console.warn(`noteStores.ts→ 尝试为不存在的笔记添加星标: ${id}`)
          // 如果笔记不在 Map 中，我们可以选择添加它
          this.notesMap.set(id, updatedNote)
        }

        // 如果这是当前打开的笔记，更新 currentNote
        if (this.currentNote && this.currentNote.id === id) {
          this.currentNote = updatedNote
        }

        return updatedNote
      } catch (error) {
        console.error('noteStores.ts→ 添加星标收藏时出错:', error)
        throw error
      }
    },

    // 移除星标收藏
    // async removeStarFromNote(id: string) {
    //   try {
    //     const result = await window.electronAPI.removeStarFromNote(id)

    //     // 创建一个 Map 来存储更新后的笔记
    //     const updatedNotesMap = new Map(
    //       [result.updatedNote, ...result.reorderedNotes].map((note) => [note.id, note])
    //     )

    //     // 一次性更新所有笔记
    //     this.notes = this.notes.map((note) =>
    //       updatedNotesMap.has(note.id) ? updatedNotesMap.get(note.id)! : note
    //     )

    //     console.log('noteStores.ts→ 移除星标收藏成功:', result)
    //     return result
    //   } catch (error) {
    //     console.error('noteStores.ts→ 移除星标收藏时出错:', error)
    //     throw error
    //   }
    // },
    // 移除星标收藏
    async removeStarFromNote(id: string) {
      try {
        const result = await window.electronAPI.removeStarFromNote(id)

        // 更新主笔记
        if (this.notesMap.has(result.updatedNote.id)) {
          this.notesMap.set(result.updatedNote.id, result.updatedNote)
        } else {
          console.warn(`noteStores.ts→ 尝试更新不存在的笔记: ${result.updatedNote.id}`)
        }

        // 更新重新排序的笔记
        result.reorderedNotes.forEach((note) => {
          if (this.notesMap.has(note.id)) {
            this.notesMap.set(note.id, note)
          } else {
            console.warn(`noteStores.ts→ 尝试更新不存在的笔记: ${note.id}`)
          }
        })

        // 如果这是当前打开的笔记，更新 currentNote
        if (this.currentNote && this.currentNote.id === id) {
          this.currentNote = result.updatedNote
        }

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
    // async updateStarredNotesOrder(orders: { id: string; starredOrder: number }[]) {
    //   try {
    //     console.log('noteStores.ts→ 开始更新收藏笔记顺序', orders)

    //     // 乐观更新
    //     const optimisticUpdate = new Map(orders.map((order) => [order.id, order.starredOrder]))
    //     this.notes = this.notes.map((note) =>
    //       optimisticUpdate.has(note.id)
    //         ? { ...note, starredOrder: optimisticUpdate.get(note.id)! }
    //         : note
    //     )

    //     // 调用后端 API 更新顺序
    //     const result = await window.electronAPI.updateStarredNotesOrder(orders)

    //     console.log('noteStores.ts→ 收到后端返回的结果:', result)

    //     // 检查返回的结果是否为数组
    //     if (!Array.isArray(result)) {
    //       console.error('noteStores.ts→ 后端返回的数据格式不正确，预期是数组', result)
    //       this.rollbackOptimisticUpdate()
    //       return
    //     }

    //     // 如果是空数组，可能意味着没有笔记需要更新
    //     if (result.length === 0) {
    //       console.log('noteStores.ts→ 后端返回空数组，可能没有笔记需要更新')
    //       return
    //     }

    //     // 验证返回的数组是否包含有效的 Note 对象
    //     if (!this.isValidNoteArray(result)) {
    //       console.error('noteStores.ts→ 后端返回的数组包含无效的 Note 对象', result)
    //       this.rollbackOptimisticUpdate()
    //       return
    //     }

    //     const updatedNotes = result as Note[]

    //     // 创建一个 Map 来快速查找更新后的笔记
    //     const updatedNotesMap = new Map(updatedNotes.map((note) => [note.id, note]))

    //     // 更新本地状态
    //     this.notes = this.notes.map((note) => updatedNotesMap.get(note.id) || note)

    //     // 确保星标笔记保持正确的顺序
    //     // this.notes.sort((a, b) => {
    //     //   if (a.isStarred && b.isStarred) {
    //     //     return (a.starredOrder ?? 0) - (b.starredOrder ?? 0)
    //     //   }
    //     //   return 0 // 保持非星标笔记的原有顺序
    //     // })

    //     console.log('noteStores.ts→ 更新收藏笔记顺序成功', this.starredNotes)
    //   } catch (error) {
    //     console.error('noteStores.ts→ 更新收藏笔记顺序失败:', error)
    //     this.rollbackOptimisticUpdate()
    //     throw error
    //   }
    // },
    // 更新收藏笔记顺序
    async updateStarredNotesOrder(orders: { id: string; starredOrder: number }[]) {
      try {
        console.log('noteStores.ts→ 开始更新收藏笔记顺序', orders)

        // 乐观更新
        orders.forEach(({ id, starredOrder }) => {
          if (this.notesMap.has(id)) {
            const note = this.notesMap.get(id)!
            this.notesMap.set(id, { ...note, starredOrder })
          }
        })

        // 调用后端 API 更新顺序
        const result = await window.electronAPI.updateStarredNotesOrder(orders)

        console.log('noteStores.ts→ 收到后端返回的结果:', result)

        // 检查返回的结果是否为数组
        if (!Array.isArray(result)) {
          console.error('noteStores.ts→ 后端返回的数据格式不正确，预期是数组', result)
          this.rollbackOptimisticUpdate(orders)
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
          this.rollbackOptimisticUpdate(orders)
          return
        }

        const updatedNotes = result as Note[]

        // 更新本地状态
        updatedNotes.forEach((note) => {
          if (this.notesMap.has(note.id)) {
            this.notesMap.set(note.id, note)
          } else {
            console.warn(`noteStores.ts→ 尝试更新不存在的笔记: ${note.id}`)
          }
        })

        console.log('noteStores.ts→ 更新收藏笔记顺序成功', this.starredNotes)
      } catch (error) {
        console.error('noteStores.ts→ 更新收藏笔记顺序失败:', error)
        this.rollbackOptimisticUpdate(orders)
        throw error
      }
    },

    // 辅助方法：回滚乐观更新
    rollbackOptimisticUpdate(orders: { id: string; starredOrder: number }[]) {
      orders.forEach(({ id }) => {
        if (this.notesMap.has(id)) {
          const note = this.notesMap.get(id)!
          this.notesMap.set(id, { ...note, starredOrder: note.starredOrder })
        }
      })
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
    }
  },

  getters: {
    // 获取所有笔记
    allNotes(): Note[] {
      return Array.from(this.notesMap.values())
    },
    // 获取所有的文献卡片
    allBibNotes(): Note[] {
      return this.allNotes.filter((note) => note.cardType === 'Bibcard')
    },
    // 获取所有的索引卡片
    allIndexNotes(): Note[] {
      return this.allNotes.filter((note) => note.cardType === 'Indexcard')
    },
    // 获取所有的跳转卡片
    allHoplinkNotes(): Note[] {
      return this.allNotes.filter((note) => note.cardType === 'Hoplinkcard')
    },
    // 获取所有的主要卡片
    allMainNotes(): Note[] {
      return this.allNotes.filter((note) => note.cardType === 'Maincard')
    },
    // 获取笔记数量
    noteCount(): number {
      return this.allNotes.length
    },
    // 获取最后一天的笔记数量
    lastDayNoteCount(): number {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      return this.allNotes.filter(
        (note) => note.createdAt.toISOString().split('T')[0] === yesterday
      ).length
    },
    // 获取收藏的笔记
    starredNotes(): Note[] {
      return this.allNotes
        .filter((note) => note.isStarred)
        .sort((a, b) => (a.starredOrder ?? 0) - (b.starredOrder ?? 0))
    },
    // 获取笔记
    getNoteById: (state) => {
      return (id: string) => state.notesMap.get(id)
    },
    // 所有已删除的笔记
    deletedNotes(): Note[] {
      return this.allNotes.filter((note) => note.isDeleted)
    },

    getCardBoxById: (state) => {
      return (id: string) => state.cardBoxes.find((box) => box.id === id)
    },

    heatmapData(): { date: string; count: number }[] {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())

      // 将结束日期延长，例如延长30天
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() + 30) // 向后延长30天

      const data: Record<string, number> = {}

      // 初始化日期范围，包括延长的日期
      for (let d = new Date(oneYearAgo); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateString = d
          .toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
          .replace(/\//g, '-')
        data[dateString] = 0
      }

      // 统计每天的笔记数量（保持不变）
      this.allNotes.forEach((note) => {
        const noteDate = new Date(note.createdAt)
        const noteDateString = noteDate
          .toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
          .replace(/\//g, '-')
        if (noteDateString in data) {
          data[noteDateString]++
        }
      })

      console.log('Start date:', oneYearAgo.toLocaleDateString('zh-CN'))
      console.log('End date:', endDate.toLocaleDateString('zh-CN'))
      console.log('Notes count:', this.allNotes.length)
      console.log('Generated data:', data)

      // 转换为热力图所需的格式
      return Object.entries(data).map(([date, count]) => ({ date, count }))
    }
  },
  persist: true
})
