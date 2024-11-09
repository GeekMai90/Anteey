import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import log from 'electron-log'
import type { SearchResult, SearchOptions, EnhancedSearchResult } from '../types/semantic'

export const useSemanticStore = defineStore('semantic', () => {
  // 状态
  const isInitialized = ref(false)
  const isSearching = ref(false)
  const searchResults = ref<SearchResult[]>([])
  const error = ref<string | null>(null)
  const lastQuery = ref<string | null>(null)
  const searchMetadata = ref<EnhancedSearchResult['metadata'] | null>(null)

  // Getters
  const hasResults = computed(() => searchResults.value.length > 0)
  const isReady = computed(() => isInitialized.value && !isSearching.value)

  // Actions
  async function initialize() {
    if (isInitialized.value) return

    try {
      const success = await window.electronAPI.initializeSemantic()
      isInitialized.value = success
      log.info('SemanticStore: 语义服务初始化成功')
    } catch (err) {
      handleError('语义服务初始化失败', err)
      throw err
    }
  }

  async function clearCache() {
    try {
      const success = await window.electronAPI.clearSemanticCache()
      if (success) {
        resetState()
        log.info('SemanticStore: 缓存清理成功')
      }
    } catch (err) {
      handleError('缓存清理失败', err)
      throw err
    }
  }

  async function search(
    query: string,
    options: SearchOptions = { limit: 10 }
  ): Promise<SearchResult[]> {
    if (!isInitialized.value) {
      await initialize()
    }

    isSearching.value = true
    error.value = null
    lastQuery.value = query

    try {
      const results = await window.electronAPI.semanticSearch(query, options)
      searchResults.value = results

      log.info('SemanticStore: 搜索完成:', {
        query,
        resultCount: results.length,
        options
      })

      return results
    } catch (err) {
      handleError('搜索失败', err)
      throw err
    } finally {
      isSearching.value = false
    }
  }

  async function findSimilarNotes(
    content: any,
    options: SearchOptions = { limit: 5 }
  ): Promise<SearchResult[]> {
    if (!isInitialized.value) {
      await initialize()
    }

    try {
      const results = await window.electronAPI.findSimilarNotes(content, options)

      log.info('SemanticStore: 相似笔记查找完成:', {
        resultCount: results.length,
        options
      })

      return results
    } catch (err) {
      handleError('查找相似笔记失败', err)
      throw err
    }
  }

  async function calculateHybridSimilarity(
    content1: any,
    content2: any,
    keywords1: string[],
    keywords2: string[]
  ): Promise<number> {
    if (!isInitialized.value) {
      await initialize()
    }

    try {
      const similarity = await window.electronAPI.calculateHybridSimilarity(
        content1,
        content2,
        keywords1,
        keywords2
      )
      log.info('SemanticStore: 混合相似度计算完成:', { similarity })
      return similarity
    } catch (err) {
      handleError('计算混合相似度失败', err)
      throw err
    }
  }

  async function rebuildIndex(notes: { id: string; content: any }[]): Promise<void> {
    if (!isInitialized.value) {
      await initialize()
    }

    try {
      const success = await window.electronAPI.rebuildSemanticIndex(notes)
      if (success) {
        log.info('SemanticStore: 索引重建完成:', { noteCount: notes.length })
      }
    } catch (err) {
      handleError('重建索引失败', err)
      throw err
    }
  }

  async function clearNoteVector(noteId: string): Promise<void> {
    try {
      const success = await window.electronAPI.clearNoteVectorData(noteId)
      if (success) {
        log.info('SemanticStore: 笔记向量数据清理成功:', { noteId })
      }
    } catch (err) {
      handleError('清理笔记向量数据失败', err)
      throw err
    }
  }

  // 增强搜索
  async function enhancedSearch(
    query: string,
    options: SearchOptions = { limit: 10 }
  ): Promise<SearchResult[]> {
    if (!isInitialized.value) {
      await initialize()
    }

    isSearching.value = true
    error.value = null
    lastQuery.value = query

    try {
      const response = await window.electronAPI.enhancedSearch(query, options)
      searchResults.value = response.results
      searchMetadata.value = response.metadata

      log.info('SemanticStore: 增强搜索完成:', {
        query,
        resultCount: response.results.length,
        totalFound: response.totalFound,
        timeTaken: response.timeTaken,
        options
      })

      return response.results
    } catch (err) {
      handleError('增强搜索失败', err)
      throw err
    } finally {
      isSearching.value = false
    }
  }

  // 辅助函数
  function handleError(message: string, err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    error.value = errorMessage
    log.error(`SemanticStore: ${message}:`, err)
  }

  function resetState() {
    searchResults.value = []
    lastQuery.value = null
    searchMetadata.value = null
    error.value = null
  }

  return {
    // 状态
    isInitialized,
    isSearching,
    searchResults,
    error,
    lastQuery,
    searchMetadata,

    // Getters
    hasResults,
    isReady,

    // Actions
    initialize,
    clearCache,
    search,
    enhancedSearch,
    findSimilarNotes,
    calculateHybridSimilarity,
    rebuildIndex,
    clearNoteVector,
    resetState
  }
})
