import { ipcRenderer } from 'electron'
import type { Letter, LetterType } from '@shared/types'

export const letterApi = {
  // 创建信件
  createLetter: async (type: LetterType): Promise<Letter> => {
    try {
      const result = await ipcRenderer.invoke('create-letter', type)
      if (!result.success) throw new Error(result.error)
      return result.letter
    } catch (error) {
      console.error('预加载脚本 → 创建信件失败:', error)
      throw error
    }
  },

  // 获取信件列表
  getLetters: async (
    page: number = 1,
    limit: number = 10
  ): Promise<{ letters: Letter[]; total: number }> => {
    try {
      const result = await ipcRenderer.invoke('get-letters', { page, limit })
      if (!result.success) throw new Error(result.error)
      return {
        letters: result.letters,
        total: result.total
      }
    } catch (error) {
      console.error('预加载脚本 → 获取信件列表失败:', error)
      throw error
    }
  },

  // 获取单个信件
  getLetterById: async (id: string): Promise<Letter | null> => {
    try {
      const result = await ipcRenderer.invoke('get-letter-by-id', id)
      if (!result.success) throw new Error(result.error)
      return result.letter
    } catch (error) {
      console.error('预加载脚本 → 获取信件失败:', error)
      throw error
    }
  },

  // 更新信件阅读状态
  updateLetterReadStatus: async (id: string, readStatus: boolean): Promise<Letter> => {
    try {
      const result = await ipcRenderer.invoke('update-letter-read-status', { id, readStatus })
      if (!result.success) throw new Error(result.error)
      return result.letter
    } catch (error) {
      console.error('预加载脚本 → 更新信件阅读状态失败:', error)
      throw error
    }
  },

  // 获取最新信件
  getLatestLetter: async (): Promise<Letter | null> => {
    try {
      const result = await ipcRenderer.invoke('get-latest-letter')
      if (!result.success) throw new Error(result.error)
      return result.letter
    } catch (error) {
      console.error('预加载脚本 → 获取最新信件失败:', error)
      throw error
    }
  },

  // 获取未读信件数量
  getUnreadLettersCount: async (): Promise<number> => {
    try {
      const result = await ipcRenderer.invoke('get-unread-letters-count')
      if (!result.success) throw new Error(result.error)
      return result.count
    } catch (error) {
      console.error('预加载脚本 → 获取未读信件数量失败:', error)
      throw error
    }
  },

  // 检查今天是否已经收到过信件
  checkTodayLetter: () => ipcRenderer.invoke('letter:checkTodayLetter')
}
