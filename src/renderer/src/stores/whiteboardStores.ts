// stores/whiteboard.ts
import { defineStore } from 'pinia'
import {
  Whiteboard,
  Connection,
  CreateWhiteboardInput,
  CreateWhiteboardNoteInput,
  Note
} from '../types/Note'
import { useNoteStore } from './noteStores'

const noteStore = useNoteStore()
export const useWhiteboardStore = defineStore('whiteboard', {
  state: () => ({
    whiteboards: [] as Whiteboard[],
    connections: [] as Connection[],
    referenceNotes: {} as Record<string, Note>, // 以笔记 id 和笔记的形式，存储在 referenceNotes 中
    currentWhiteboardId: undefined as string | undefined,
    isLoading: false,
    error: null as string | null
  }),
  actions: {
    // 获取根白板的视图状态
    async getRootWhiteboardViewState() {
      console.log('whiteboardStore→ 开始获取根白板的视图状态')
      const viewState = await window.electronAPI.getRootWhiteboardViewState()
      console.log('whiteboardStore→ 获取根白板的视图状态成功', viewState)
      return viewState
    },

    // 保存视图状态到根白板
    async saveViewStateToRootWhiteboard(scale: number, translateX: number, translateY: number) {
      console.log('whiteboardStore→ 开始保存视图状态到根白板', { scale, translateX, translateY })
      const result = await window.electronAPI.saveViewStateToRootWhiteboard(
        scale,
        translateX,
        translateY
      )
      console.log('whiteboardStore→ 保存视图状态到根白板成功', result)
      return result
    },
    // 获取根白板
    async getRootWhiteboard() {
      console.log('whiteboardStore→ 开始获取根白板')
      const rootWhiteboard = await window.electronAPI.getRootWhiteboard()
      console.log('whiteboardStore→ 获取根白板成功', rootWhiteboard)
      return rootWhiteboard
    },
    // 创建根白板
    async createRootWhiteboard() {
      console.log('whiteboardStore→ 开始创建根白板')
      const newRootWhiteboard = await window.electronAPI.createRootWhiteboard()
      console.log('whiteboardStore→ 创建根白板成功', newRootWhiteboard)
      return newRootWhiteboard
    },
    // 创建白板
    async createWhiteboard(input: CreateWhiteboardInput) {
      console.log('whiteboardStore→ 开始创建白板', input)
      const newWhiteboard = await window.electronAPI.createWhiteboard(input)
      if (newWhiteboard) {
        this.whiteboards.push(newWhiteboard)
        console.log('whiteboardStore→ 创建白板成功', this.whiteboards)
        return newWhiteboard
        await this.getTopLevelWhiteboards()
      } else {
        console.error('whiteboardStore→ 创建白板失败')
      }
    },
    async getTopLevelWhiteboards() {
      console.log('whiteboardStore→ 开始获取顶层白板')
      const whiteboards = await window.electronAPI.getTopLevelWhiteboards()
      console.log('whiteboardStore→ 获取顶层白板成功', whiteboards)
      this.whiteboards = whiteboards
      return whiteboards
    },
    async updateWhiteboardPosition(id: string, x: number, y: number) {
      console.log('whiteboardStore→ 开始更新白板位置', { id, x, y })
      const updatedWhiteboard = await window.electronAPI.updateWhiteboardPosition(id, x, y)
      console.log('whiteboardStore→ 更新白板位置成功', updatedWhiteboard)
      this.whiteboards = this.whiteboards.map((whiteboard) =>
        whiteboard.id === updatedWhiteboard.id ? updatedWhiteboard : whiteboard
      )
      return updatedWhiteboard
    },
    async createWhiteboardNote(input: CreateWhiteboardNoteInput) {
      console.log('whiteboardStore→ 开始创建白板笔记', input)
      const newWhiteboardNote = await window.electronAPI.createWhiteboardNote(input)
      console.log('whiteboardStore→ 创建白板笔记成功', newWhiteboardNote)
      return newWhiteboardNote
    },

    // 保存视图状态到白板
    async saveViewStateToWhiteboard(
      whiteboardId: string,
      scale: number,
      translateX: number,
      translateY: number
    ) {
      console.log('whiteboardStore→ 开始保存视图状态到白板', {
        whiteboardId,
        scale,
        translateX,
        translateY
      })
      const result = await window.electronAPI.saveViewStateToWhiteboard(
        whiteboardId,
        scale,
        translateX,
        translateY
      )
      console.log('whiteboardStore→ 保存视图状态到白板成功', result)
      return result
    },
    // 获取白板视图状态
    async getWhiteboardViewState(whiteboardId: string) {
      console.log('whiteboardStore→ 开始获取白板视图状态', whiteboardId)
      const viewState = await window.electronAPI.getWhiteboardViewState(whiteboardId)
      console.log('whiteboardStore→ 获取白板视图状态成功', viewState)
      return viewState
    },
    // 获取白板中的卡片数量
    async getCardCount(whiteboardId: string) {
      console.log('whiteboardStore→ 开始获取白板中的卡片数量', whiteboardId)
      const cardCount = await window.electronAPI.getCardCount(whiteboardId)
      console.log('whiteboardStore→ 获取白板中的卡片数量成功', cardCount)
      return cardCount
    },

    // 获取白板中的所有白板笔记
    async getWhiteboardNotes(whiteboardId: string) {
      try {
        console.log('whiteboardStore→ 开始获取白板中的所有白板笔记', whiteboardId)
        const whiteboardNotes = await window.electronAPI.getWhiteboardNotes(whiteboardId)
        // 先获取所有的笔记 id
        const noteIds = whiteboardNotes.map((note) => note.noteId)
        // 获取所有的笔记
        const notes = await noteStore.getNotesByIds(noteIds)
        // 以笔记 id 和笔记的形式，存储在 whiteboardNotes 中
        this.referenceNotes = Object.fromEntries(notes.map((note) => [note.id, note]))
        console.log('whiteboardStore→ 获取白板中的所有白板笔记成功', this.referenceNotes)
        return whiteboardNotes
      } catch (error) {
        console.error('whiteboardStore→ 获取白板中的所有白板笔记失败', error)
        throw error
      }
    },
    // 获取白板中的所有分组
    async getWhiteboardGroups(whiteboardId: string) {
      try {
        console.log('whiteboardStore→ 开始获取白板中的所有分组', whiteboardId)
        const whiteboardGroups = await window.electronAPI.getWhiteboardGroups(whiteboardId)
        console.log('whiteboardStore→ 获取白板中的所有分组成功', whiteboardGroups)
        return whiteboardGroups
      } catch (error) {
        console.error('whiteboardStore→ 获取白板中的所有分组失败', error)
        throw error
      }
    },
    // 获取白板中的所有连线
    async getWhiteboardConnections(whiteboardId: string) {
      try {
        console.log('whiteboardStore→ 开始获取白板中的所有连线', whiteboardId)
        const whiteboardConnections =
          await window.electronAPI.getWhiteboardConnections(whiteboardId)
        console.log('whiteboardStore→ 获取白板中的所有连线成功', whiteboardConnections)
        return whiteboardConnections
      } catch (error) {
        console.error('whiteboardStore→ 获取白板中的所有连线失败', error)
        throw error
      }
    },
    // 获取白板中的所有白板
    async getWhiteboardSubboards(whiteboardId: string) {
      try {
        console.log('whiteboardStore→ 开始获取白板中的所有白板', whiteboardId)
        const whiteboardSubboards = await window.electronAPI.getWhiteboardSubboards(whiteboardId)
        console.log('whiteboardStore→ 获取白板中的所有白板成功', whiteboardSubboards)
        return whiteboardSubboards
      } catch (error) {
        console.error('whiteboardStore→ 获取白板中的所有白板失败', error)
        throw error
      }
    },
    // 更新白板笔记的位置
    async updateWhiteboardNotePosition(id: string, x: number, y: number) {
      try {
        console.log('whiteboardStore→ 开始更新白板笔记位置', { id, x, y })
        const updatedWhiteboardNote = await window.electronAPI.updateWhiteboardNotePosition(
          id,
          x,
          y
        )
        console.log('whiteboardStore→ 更新白板笔记位置成功', updatedWhiteboardNote)
        return updatedWhiteboardNote
      } catch (error) {
        console.error('whiteboardStore→ 更新白板笔记位置失败', error)
        throw error
      }
    },
    // 更新白板笔记的大小
    async updateWhiteboardNoteSize(id: string, width: number, height: number) {
      try {
        console.log('whiteboardStore→ 开始更新白板笔记大小', { id, width, height })
        const updatedWhiteboardNote = await window.electronAPI.updateWhiteboardNoteSize(
          id,
          width,
          height
        )
        console.log('whiteboardStore→ 更新白板笔记大小成功', updatedWhiteboardNote)
        return updatedWhiteboardNote
      } catch (error) {
        console.error('whiteboardStore→ 更新白板笔记大小失败', error)
        throw error
      }
    }
  },
  getters: {
    // 获取参考笔记,传入笔记 id,返回笔记
    getReferenceNotes: (state) => {
      return (id: string) => state.referenceNotes[id]
    }
  },
  persist: true
})
