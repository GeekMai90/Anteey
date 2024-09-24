// stores/whiteboard.ts
import { defineStore } from 'pinia'
import { Whiteboard, Connection, CreateWhiteboardInput } from '../types/Note'

export const useWhiteboardStore = defineStore('whiteboard', {
  state: () => ({
    whiteboards: [] as Whiteboard[],
    connections: [] as Connection[],
    currentWhiteboardId: undefined as string | undefined,
    isLoading: false,
    error: null as string | null
  }),
  actions: {
    async createWhiteboard(input: CreateWhiteboardInput) {
      console.log('whiteboardStore→ 开始创建白板', input)
      const newWhiteboard = await window.electronAPI.createWhiteboard(input)
      if (newWhiteboard) {
        this.whiteboards.push(newWhiteboard)
        console.log('whiteboardStore→ 创建白板成功', this.whiteboards)
        return newWhiteboard
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
    }
  },
  persist: true
})
