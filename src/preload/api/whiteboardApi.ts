import { ipcRenderer } from 'electron'
import type { WhiteboardTextCard } from '../../renderer/src/types/Note'

export const whiteboardApi = {
  // 创建文本卡片
  createWhiteboardTextCard: async (input: {
    whiteboardId: string
    content: string
    position: { x: number; y: number }
    size: { width: number; height: number }
    zIndex: number
    style?: {
      backgroundColor?: string
      textColor?: string
      fontSize?: number
      fontFamily?: string
    }
  }): Promise<WhiteboardTextCard> => {
    try {
      const result = await ipcRenderer.invoke('create-whiteboard-text-card', input)
      if (!result.success && result.error) throw new Error(result.error)
      return result
    } catch (error) {
      console.error('预加载脚本 → 创建文本卡片失败:', error)
      throw error
    }
  },

  // 获取白板的所有文本卡片
  getWhiteboardTextCards: async (whiteboardId: string): Promise<WhiteboardTextCard[]> => {
    try {
      const result = await ipcRenderer.invoke('get-whiteboard-text-cards', whiteboardId)
      if (!result.success && result.error) throw new Error(result.error)
      return result
    } catch (error) {
      console.error('预加载脚本 → 获取白板文本卡片失败:', error)
      throw error
    }
  },

  // 更新文本卡片
  updateWhiteboardTextCard: async (
    id: string,
    updates: Partial<WhiteboardTextCard>
  ): Promise<WhiteboardTextCard> => {
    try {
      const result = await ipcRenderer.invoke('update-whiteboard-text-card', id, updates)
      if (!result.success && result.error) throw new Error(result.error)
      return result
    } catch (error) {
      console.error('预加载脚本 → 更新文本卡片失败:', error)
      throw error
    }
  },

  // 删除文本卡片
  deleteWhiteboardTextCard: async (id: string): Promise<boolean> => {
    try {
      const result = await ipcRenderer.invoke('delete-whiteboard-text-card', id)
      if (!result.success) throw new Error(result.error)
      return true
    } catch (error) {
      console.error('预加载脚本 → 删除文本卡片失败:', error)
      throw error
    }
  },

  // 批量更新文本卡片的 zIndex
  updateTextCardsZIndex: async (updates: { id: string; zIndex: number }[]): Promise<boolean> => {
    try {
      const result = await ipcRenderer.invoke('update-text-cards-zindex', updates)
      if (!result.success) throw new Error(result.error)
      return true
    } catch (error) {
      console.error('预加载脚本 → 批量更新文本卡片 zIndex 失败:', error)
      throw error
    }
  }
}
