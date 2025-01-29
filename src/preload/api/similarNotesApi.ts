import { ipcRenderer } from 'electron'

export const similarNotesApi = {
  searchSimilarNotes: async (query: string, limit: number = 10) => {
    try {
      const result = await ipcRenderer.invoke('search-similar-notes', query, limit)
      if (!result.success) throw new Error(result.error)
      return result.results
    } catch (error) {
      console.error('预加载脚本 → 搜索相似笔记失败:', error)
      throw error
    }
  },
  getSimilarNotesForNote: async (noteId: string, limit: number = 5) => {
    try {
      const result = await ipcRenderer.invoke('get-similar-notes-for-note', noteId, limit)
      if (!result.success) throw new Error(result.error)
      return result.results
    } catch (error) {
      console.error('预加载脚本 → 获取特定笔记的相似笔记失败:', error)
      throw error
    }
  }
}
