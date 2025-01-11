import { ipcRenderer } from 'electron'
import type { Note } from '@shared/types'

export const lifeGuideApi = {
  // 获取随机人生指南笔记
  getRandomLifeGuideNote: async (): Promise<Note | null> => {
    try {
      const result = await ipcRenderer.invoke('get-random-life-guide-note')
      if (!result.success) throw new Error(result.error)
      return result.note
    } catch (error) {
      console.error('预加载脚本 → 获取随机人生指南笔记失败:', error)
      throw error
    }
  }
}
