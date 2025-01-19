import { ipcRenderer } from 'electron'
import type { ReviewResponse, Note } from '@shared/types'

export const reviewApi = {
  // 获取智能回顾数据
  getReviewData: async (): Promise<ReviewResponse> => {
    try {
      const result = await ipcRenderer.invoke('get-review-data')
      if (!result.success) throw new Error(result.error)
      return result.data
    } catch (error) {
      console.error('预加载脚本 → 获取智能回顾数据失败:', error)
      throw error
    }
  },

  // 获取单条随机笔记
  getOneRandomNote: async (): Promise<Note | null> => {
    try {
      const result = await ipcRenderer.invoke('get-one-random-note')
      if (!result.success) throw new Error(result.error)
      return result.data
    } catch (error) {
      console.error('预加载脚本 → 获取单条随机笔记失败:', error)
      throw error
    }
  }
}
