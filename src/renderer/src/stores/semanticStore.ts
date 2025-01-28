import { defineStore } from 'pinia'
import { ref } from 'vue'
import log from 'electron-log'

export const useSemanticStore = defineStore('semantic', () => {
  // ==================== 状态定义 ====================
  const isSearching = ref(false)
  const searchResults = ref<Array<{ noteId: string; similarity: number }>>([])
  const searchQuery = ref('')
  const searchError = ref<string | null>(null)

  // ==================== 方法定义 ====================

  // 语义搜索笔记
  const searchSimilarNotes = async (query: string, limit: number = 10) => {
    if (!query.trim()) return

    try {
      isSearching.value = true
      searchQuery.value = query
      searchError.value = null

      const results = await window.electronAPI.embedding.searchSimilarNotes(query, limit)
      searchResults.value = results

      log.info('语义搜索结果:', results)
    } catch (error) {
      log.error('语义搜索失败:', error)
      searchError.value = error instanceof Error ? error.message : '搜索失败'
      throw error
    } finally {
      isSearching.value = false
    }
  }

  // 清空搜索结果
  const clearSearch = () => {
    searchResults.value = []
    searchQuery.value = ''
    searchError.value = null
  }

  // 获取特定笔记的相似笔记
  const getSimilarNotesForNote = async (noteId: string, limit: number = 5) => {
    try {
      const results = await window.electronAPI.embedding.getSimilarNotesForNote(noteId, limit)
      return results
    } catch (error) {
      log.error('获取相似笔记失败:', error)
      throw error
    }
  }

  return {
    // 状态
    isSearching,
    searchResults,
    searchQuery,
    searchError,

    // 方法
    searchSimilarNotes,
    clearSearch,
    getSimilarNotesForNote
  }
})
