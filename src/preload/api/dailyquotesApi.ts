import { ipcRenderer } from 'electron'
import type { DailyQuote } from '@shared/types'

export const dailyQuotesApi = {
  // 获取今日金句
  getTodayQuote: async (): Promise<DailyQuote> => {
    try {
      const result = await ipcRenderer.invoke('get-today-quote')
      if (!result.success) throw new Error(result.error)
      return result.quote
    } catch (error) {
      console.error('预加载脚本 → 获取今日金句失败:', error)
      throw error
    }
  },

  // 添加新金句
  addQuote: async (content: string, author: string): Promise<DailyQuote> => {
    try {
      const result = await ipcRenderer.invoke('add-quote', { content, author })
      if (!result.success) throw new Error(result.error)
      return result.quote
    } catch (error) {
      console.error('预加载脚本 → 添加金句失败:', error)
      throw error
    }
  },

  // 获取所有金句
  getAllQuotes: async (): Promise<DailyQuote[]> => {
    try {
      const result = await ipcRenderer.invoke('get-all-quotes')
      if (!result.success) throw new Error(result.error)
      return result.quotes
    } catch (error) {
      console.error('预加载脚本 → 获取所有金句失败:', error)
      throw error
    }
  },

  // 删除金句
  deleteQuote: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-quote', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除金句失败:', error)
      throw error
    }
  },

  // 更新金句
  updateQuote: async (
    id: string,
    data: { content?: string; author?: string }
  ): Promise<DailyQuote> => {
    try {
      const result = await ipcRenderer.invoke('update-quote', { id, data })
      if (!result.success) throw new Error(result.error)
      return result.quote
    } catch (error) {
      console.error('预加载脚本 → 更新金句失败:', error)
      throw error
    }
  }
}
