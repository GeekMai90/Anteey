// stores/whiteboard.ts
import { defineStore } from 'pinia'
import {
  Whiteboard,
  Connection,
  CreateWhiteboardInput,
  CreateWhiteboardNoteInput,
  Note,
  ConnectionCreateData,
  WhiteboardNote
} from '../types/Note'
import { useNoteStore } from './noteStores'

export const useWhiteboardStore = defineStore('whiteboard', {
  state: () => ({
    whiteboards: [] as Whiteboard[],
    connections: [] as Connection[],
    referenceNotes: {} as Record<string, Note>, // 以笔记 id 和笔记的形式，存储在 referenceNotes 中
    currentWhiteboardId: undefined as string | undefined,
    isLoading: false,
    error: null as string | null,
    whiteboardNotes: [] as WhiteboardNote[]
  }),
  actions: {
    // 初始化白板数据
    async initializeWhiteboardData(whiteboardId: string) {
      this.isLoading = true
      this.error = null
      this.currentWhiteboardId = whiteboardId

      try {
        // 假设这些是您的 API 方法
        const [whiteboardNotes, connections] = await Promise.all([
          this.getWhiteboardNotes(whiteboardId),
          this.getConnections(whiteboardId)
        ])

        this.whiteboardNotes = whiteboardNotes
        this.connections = connections
      } catch (error) {
        console.error('Failed to initialize whiteboard data:', error)
        this.error = 'Failed to load whiteboard data'
      } finally {
        this.isLoading = false
      }
    },

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
    // 获取所有顶层白板
    async getTopLevelWhiteboards() {
      console.log('whiteboardStore→ 开始获取顶层白板')
      const whiteboards = await window.electronAPI.getTopLevelWhiteboards()
      console.log('whiteboardStore→ 获取顶层白板成功', whiteboards)
      this.whiteboards = whiteboards
      return whiteboards
    },
    // 更新白板位置
    async updateWhiteboardPosition(id: string, x: number, y: number) {
      console.log('whiteboardStore→ 开始更新白板位置', { id, x, y })
      const updatedWhiteboard = await window.electronAPI.updateWhiteboardPosition(id, x, y)
      console.log('whiteboardStore→ 更新白板位置成功', updatedWhiteboard)
      this.whiteboards = this.whiteboards.map((whiteboard) =>
        whiteboard.id === updatedWhiteboard.id ? updatedWhiteboard : whiteboard
      )
      return updatedWhiteboard
    },
    // 创建白板笔记
    async createWhiteboardNote(input: CreateWhiteboardNoteInput) {
      console.log('whiteboardStore→ 开始创建白板笔记', input)
      const newWhiteboardNote = await window.electronAPI.createWhiteboardNote(input)
      const noteId = newWhiteboardNote.noteId
      await this.noteStore.addNoteToNoteList(noteId)
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
        // 将获取到的白板笔记存储在 state 中
        this.whiteboardNotes = whiteboardNotes
        // 先获取所有的笔记 id
        const noteIds = whiteboardNotes.map((note) => note.noteId)
        // 获取所有的笔记
        const notes = await this.noteStore.getNotesByIds(noteIds)
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
        // 更新 Pinia 状态
        const index = this.whiteboardNotes.findIndex((note) => note.id === id)
        if (index !== -1) {
          this.whiteboardNotes[index] = {
            ...this.whiteboardNotes[index],
            size: { width, height }
          }
        }
        console.log('whiteboardStore→ 更新白板笔记大小成功', updatedWhiteboardNote)
        return updatedWhiteboardNote
      } catch (error) {
        console.error('whiteboardStore→ 更新白板笔记大小失败', error)
        throw error
      }
    },
    // 创建连线
    async createConnection(connection: ConnectionCreateData) {
      try {
        console.log('whiteboardStore→ 开始创建连线', connection)
        const newConnection = await window.electronAPI.createConnection(connection)
        console.log('whiteboardStore→ 创建连线成功', newConnection)
        return newConnection
      } catch (error) {
        console.error('whiteboardStore→ 创建连线失败', error)
        throw error
      }
    },
    // 更新连线
    async updateConnection(connection: Connection) {
      try {
        console.log('whiteboardStore→ 开始更新连线', connection)
        const updatedConnection = await window.electronAPI.updateConnection(connection)
        console.log('whiteboardStore→ 更新连线成功', updatedConnection)
        return updatedConnection
      } catch (error) {
        console.error('whiteboardStore→ 更新连线失败', error)
        throw error
      }
    },
    // 删除连线
    async deleteConnection(id: string) {
      console.log('whiteboardStore→ 开始删除连线', id)
      try {
        await window.electronAPI.deleteConnection(id)
        console.log('whiteboardStore→ 删除连线成功')
      } catch (error) {
        console.error('whiteboardStore→ 删除连线失败', error)
        throw error
      }
    },
    // 更新连线描述
    async updateConnectionDescription(id: string, description: string) {
      try {
        console.log('whiteboardStore→ 开始更新连线描述', { id, description })
        const result = await window.electronAPI.updateConnectionDescription(id, description)
        if (result.success) {
          const updatedConnection = result.connection
          return updatedConnection
        } else {
          console.error('whiteboardStore→ 更新连线描述失败', result.error)
          throw result.error
        }
      } catch (error) {
        console.error('whiteboardStore→ 更新连线描述失败', error)
        throw error
      }
    },
    // 获取白板中的所有连线
    async getConnections(whiteboardId: string) {
      try {
        console.log('whiteboardStore→ 开始获取白板中的所有连线', whiteboardId)
        const connections = await window.electronAPI.getConnectionsByWhiteboardId(whiteboardId)
        console.log('whiteboardStore→ 获取白板中的所有连线成功', connections)
        return connections
      } catch (error) {
        console.error('whiteboardStore→ 获取白板中的所有连线失败', error)
        throw error
      }
    },
    // 删除白板笔记
    async deleteWhiteboardNote(id: string) {
      try {
        console.log('whiteboardStore→ 开始删除白板笔记', id)
        const result = await window.electronAPI.deleteWhiteboardNote(id)
        console.log('whiteboardStore→ 删除白板笔记成功', result)
        // 更新本地状态
        this.whiteboardNotes = this.whiteboardNotes.filter((note) => note.id !== id)
        // 更新连接
        this.connections = this.connections.filter(
          (conn) => conn.startItemId !== id && conn.endItemId !== id
        )
        return result
      } catch (error) {
        console.error('whiteboardStore→ 删除白板笔记失败', error)
        throw error
      }
    },
    // 更新白板笔记的自动高度
    async updateWhiteboardNoteAutoHeight(id: string, isAutoHeight: boolean) {
      try {
        console.log('whiteboardStore→ 开始更新白板笔记自动高度', { id, isAutoHeight })
        const updatedWhiteboardNote = await window.electronAPI.updateWhiteboardNoteAutoHeight(
          id,
          isAutoHeight
        )
        // 更新 Pinia 状态
        const index = this.whiteboardNotes.findIndex((note) => note.id === id)
        if (index !== -1) {
          this.whiteboardNotes[index] = {
            ...this.whiteboardNotes[index],
            isAutoHeight
          }
        }
        console.log('whiteboardStore→ 更新白板笔记自动高度成功', updatedWhiteboardNote)
        return updatedWhiteboardNote
      } catch (error) {
        console.error('whiteboardStore→ 更新白板笔记自动高度失败', error)
        throw error
      }
    },
    // 更新白板名称
    async updateWhiteboardName(id: string, name: string) {
      try {
        console.log('whiteboardStore→ 开始更新白板名称', { id, name })
        const updatedWhiteboard = await window.electronAPI.updateWhiteboardName(id, name)
        console.log('whiteboardStore→ 更新白板名称成功', updatedWhiteboard)
        return updatedWhiteboard
      } catch (error) {
        console.error('whiteboardStore→ 更新白板名称失败', error)
        throw error
      }
    },
    // 删除白板
    async deleteWhiteboard(id: string) {
      try {
        console.log('whiteboardStore→ 开始删除白板', id)
        const result = await window.electronAPI.deleteWhiteboard(id)
        this.whiteboards = this.whiteboards.filter((whiteboard) => whiteboard.id !== id)
        console.log('whiteboardStore→ 删除白板成功', result)
        return result
      } catch (error) {
        console.error('whiteboardStore→ 删除白板失败', error)
        throw error
      }
    }
  },
  getters: {
    // 所有顶层白板
    allTopLevelWhiteboards: (state) => {
      return state.whiteboards
    },
    // 获取参考笔记,传入笔记 id,返回笔记

    noteStore: () => {
      return useNoteStore()
    },
    // 获取参考笔记,传入笔记 id,返回笔记
    getReferenceNotes: (state) => {
      return (id: string) => state.referenceNotes[id]
    },
    getWhiteboardNoteById: (state) => {
      return (id: string) => state.whiteboardNotes.find((note) => note.id === id)
    },
    whiteboardCount: (state) => {
      return state.whiteboards.length
    }
  },
  persist: true
})
