// stores/whiteboard.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Whiteboard, WhiteboardItem, Note, WhiteboardItemType } from '../types/Note'

// 白板项目（包括笔记、白板和组）
export interface WhiteboardItem {
  id: string
  type: WhiteboardItemType
  position: { x: number; y: number }
  size: { width: number; height: number }
  zIndex: number
  rotation: number
  isMinimized: boolean
  groupId?: string // 如果这个项目属于某个组，这里存储组的 ID
  // 组特定的属性
  name?: string
  items?: string[] // 仅对 type === 'group' 有效
  isCollapsed?: boolean // 仅对 type === 'group' 有效
  style?: {
    backgroundColor?: string
    borderColor?: string
  }
}

export const useWhiteboardStore = defineStore('whiteboard', {
  state: () => ({
    whiteboards: [] as Whiteboard[],
    whiteboardItems: [
      {
        id: 'item1',
        type: 'whiteboard',
        position: { x: 100, y: 150 },
        size: { width: 200, height: 150 },
        zIndex: 1000,
        rotation: 0,
        isMinimized: false,
        name: 'New Whiteboard',
        createdAt: new Date(),
        updatedAt: new Date(),
        style: {
          backgroundColor: '#f0f0f0',
          borderColor: '#cccccc'
        }
      },
      {
        id: 'group1',
        type: 'whiteboard' as WhiteboardItemType,
        position: { x: 400, y: 200 },
        size: { width: 300, height: 250 },
        zIndex: 1000,
        rotation: 0,
        isMinimized: false,
        name: 'Project Alpha',
        items: ['item2', 'item3'],
        isCollapsed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        style: {
          backgroundColor: '#e6f7ff',
          borderColor: '#91d5ff'
        }
      },
      {
        id: 'group2',
        type: 'whiteboard' as WhiteboardItemType,
        position: { x: 400, y: 200 },
        size: { width: 300, height: 250 },
        zIndex: 1000,
        rotation: 0,
        isMinimized: false,
        name: 'Project ha ha ',
        items: ['item2', 'item3'],
        isCollapsed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        style: {
          backgroundColor: '#e6f7ff',
          borderColor: '#91d5ff'
        }
      },
      {
        id: 'item4',
        type: 'whiteboard' as WhiteboardItemType,
        position: { x: 750, y: 100 },
        size: { width: 180, height: 120 },
        zIndex: 1000,
        rotation: 15,
        isMinimized: true,
        name: 'Project Beta',
        style: {
          backgroundColor: '#fff1f0',
          borderColor: '#ffa39e'
        }
      }
    ] as WhiteboardItem[]
  }),
  actions: {
    async fetchWhiteboards() {
      await new Promise((resolve) => setTimeout(resolve, 500))
      return this.whiteboards
    },
    async fetchWhiteboard(id: string) {
      await new Promise((resolve) => setTimeout(resolve, 300))
      return this.whiteboards.find((wb) => wb.id === id)
    },
    async createWhiteboard() {
      const newNotes = generateRandomNotes(3)
      const newItems = generateRandomWhiteboardItems(newNotes)
      const newWhiteboard: Whiteboard = {
        id: `wb-${Date.now()}`,
        type: 'whiteboard',
        name: 'New Whiteboard',
        createdAt: new Date(),
        updatedAt: new Date(),
        items: newItems
      }
      this.whiteboards.push(newWhiteboard)
      return newWhiteboard
    },
    async updateItemPosition(whiteboardId: string, itemId: string, x: number, y: number) {
      const whiteboard = this.whiteboards.find((wb) => wb.id === whiteboardId)
      if (whiteboard) {
        const item = whiteboard.items.find((item) => item.id === itemId)
        if (item) {
          item.position.x = x
          item.position.y = y
        }
      }
    },
    async addNoteToWhiteboard(whiteboardId: string, note: Note) {
      const whiteboard = this.whiteboards.find((wb) => wb.id === whiteboardId)
      if (whiteboard) {
        const newItem: WhiteboardItem = {
          id: `item-${Date.now()}`,
          type: 'note',
          position: { x: Math.floor(Math.random() * 800), y: Math.floor(Math.random() * 600) },
          size: { width: 200, height: 150 },
          zIndex: whiteboard.items.length,
          rotation: 0,
          isMinimized: false
        }
        whiteboard.items.push(newItem)
        return newItem
      }
    }
  }
})
