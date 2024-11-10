import { ipcRenderer } from 'electron'
import type { DictWord, WordSuggestion } from '../../db/dictionaryService'

export const dictionaryApi = {
  // 获取待处理的建议
  getPendingSuggestions: async (): Promise<WordSuggestion[]> => {
    return await ipcRenderer.invoke('dictionary:getPendingSuggestions')
  },

  // 处理单个建议
  processSuggestion: async (word: string, status: 'accepted' | 'rejected'): Promise<void> => {
    await ipcRenderer.invoke('dictionary:processSuggestion', word, status)
  },

  // 批量处理建议
  processSuggestionBatch: async (
    words: string[],
    status: 'accepted' | 'rejected'
  ): Promise<void> => {
    await ipcRenderer.invoke('dictionary:processSuggestionBatch', words, status)
  },

  // 获取词典
  getDictionary: async (): Promise<DictWord[]> => {
    return await ipcRenderer.invoke('dictionary:getDictionary')
  },

  // 清理过期数据
  cleanupDictionary: async (days: number = 30): Promise<void> => {
    await ipcRenderer.invoke('dictionary:cleanup', days)
  },

  // 获取所有词典词条
  getAllWords: async (): Promise<DictWord[]> => {
    return await ipcRenderer.invoke('dictionary:getAllWords')
  },

  // 添加自定义词条
  addWord: async (word: string): Promise<DictWord> => {
    return await ipcRenderer.invoke('dictionary:addWord', word)
  },

  // 删除词条
  deleteWord: async (word: string): Promise<void> => {
    await ipcRenderer.invoke('dictionary:deleteWord', word)
  },

  // 批量删除词条
  deleteWords: async (words: string[]): Promise<void> => {
    await ipcRenderer.invoke('dictionary:deleteWords', words)
  },

  // 搜索词条
  searchWords: async (query: string): Promise<DictWord[]> => {
    return await ipcRenderer.invoke('dictionary:searchWords', query)
  },

  // 更新词条状态
  updateWordStatus: async (word: string, enabled: boolean): Promise<void> => {
    await ipcRenderer.invoke('dictionary:updateWordStatus', word, enabled)
  }
}
