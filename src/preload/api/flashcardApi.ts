import { ipcRenderer } from 'electron'
import type { Note } from '@shared/types'
import type {
  ReviewFeedback,
  FlashcardStats,
  FlashcardDecks,
  FlashcardSettings
} from '@shared/types'

export const flashcardApi = {
  // 将笔记转换为闪卡
  convertToFlashcard: async (noteId: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('convert-to-flashcard', noteId)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 转换闪卡失败:', error)
      throw error
    }
  },

  // 取消闪卡标记
  removeFlashcard: async (noteId: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('remove-flashcard', noteId)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 取消闪卡标记失败:', error)
      throw error
    }
  },

  // 更新闪卡复习状态
  updateFlashcardStatus: async (params: {
    noteId: string
    feedback: ReviewFeedback
    reviewTime: number
    isSimplified?: boolean
  }): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('update-flashcard-status', params)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 更新闪卡状态失败:', error)
      throw error
    }
  },

  // 获取待复习的闪卡
  getDueFlashcards: async (tags?: string[]): Promise<Note[]> => {
    try {
      const result = await ipcRenderer.invoke('get-due-flashcards', tags)
      if (!result.success) throw new Error(result.error)
      return result.flashcards
    } catch (error) {
      console.error('预加载脚本 → 获取待复习闪卡失败:', error)
      throw error
    }
  },

  // 获取闪卡统计信息
  getFlashcardStats: async (): Promise<FlashcardStats> => {
    try {
      const result = await ipcRenderer.invoke('get-flashcard-stats')
      if (!result.success) throw new Error(result.error)
      return result.stats
    } catch (error) {
      console.error('预加载脚本 → 获取闪卡统计信息失败:', error)
      throw error
    }
  },

  // 获取闪卡卡组数据
  getFlashcardDecks: async (): Promise<FlashcardDecks> => {
    try {
      const result = await ipcRenderer.invoke('get-flashcard-decks')
      if (!result.success) throw new Error(result.error)
      return result.decks // 从 result 中取出 decks
    } catch (error) {
      console.error('预加载脚本 → 获取闪卡卡组数据失败:', error)
      throw error
    }
  },

  // 重置闪卡进度
  resetFlashcardProgress: async (noteId: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('reset-flashcard', noteId)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 重置闪卡进度失败:', error)
      throw error
    }
  },

  // 获取记忆卡设置
  getSettings: async (): Promise<FlashcardSettings> => {
    try {
      const result = await ipcRenderer.invoke('get-flashcard-settings')
      if (!result.success) throw new Error(result.error)
      return result.settings
    } catch (error) {
      console.error('预加载脚本 → 获取记忆卡设置失败:', error)
      throw error
    }
  },

  // 更新记忆卡设置
  updateSettings: async (settings: Partial<FlashcardSettings>): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('update-flashcard-settings', settings)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 更新记忆卡设置失败:', error)
      throw error
    }
  }
}
