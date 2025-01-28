import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DictWord, WordSuggestion } from '@shared/types'

export const useDictionaryStore = defineStore('dictionary', () => {
  // 状态
  const suggestions = ref<WordSuggestion[]>([])
  const dictionary = ref<DictWord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Actions
  const fetchPendingSuggestions = async (): Promise<WordSuggestion[]> => {
    try {
      loading.value = true
      error.value = null
      const result = await window.electronAPI.dictionary.getPendingSuggestions()
      suggestions.value = result
      return result
    } catch (err) {
      error.value = '获取建议失败'
      console.error('获取建议失败:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  const processSuggestion = async (
    word: string,
    status: 'accepted' | 'rejected'
  ): Promise<void> => {
    try {
      loading.value = true
      error.value = null
      await window.electronAPI.dictionary.processSuggestion(word, status)
    } catch (err) {
      error.value = '处理建议失败'
      console.error('处理建议失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }
  const processSuggestionBatch = async (
    words: string[],
    status: 'accepted' | 'rejected'
  ): Promise<void> => {
    try {
      loading.value = true
      error.value = null
      await window.electronAPI.dictionary.processSuggestionBatch(words, status)
    } catch (err) {
      error.value = '批量处理建议失败'
      console.error('批量处理建议失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchDictionary = async () => {
    try {
      loading.value = true
      error.value = null
      dictionary.value = await window.electronAPI.dictionary.getDictionary()
    } catch (err) {
      error.value = '获取词典失败'
      console.error('获取词典失败:', err)
    } finally {
      loading.value = false
    }
  }

  const cleanupDictionary = async (days: number = 30) => {
    try {
      loading.value = true
      error.value = null
      await window.electronAPI.dictionary.cleanupDictionary(days)
      // 刷新数据
      await Promise.all([fetchDictionary(), fetchPendingSuggestions()])
    } catch (err) {
      error.value = '清理词典失败'
      console.error('清理词典失败:', err)
    } finally {
      loading.value = false
    }
  }
  // 获取所有词典词条
  const fetchAllWords = async () => {
    try {
      loading.value = true
      error.value = null
      return await window.electronAPI.dictionary.getAllWords()
    } catch (err) {
      error.value = '获取词典失败'
      console.error('获取词典失败:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // 添加自定义词条
  const addWord = async (word: string) => {
    try {
      loading.value = true
      error.value = null
      await window.electronAPI.dictionary.addWord(word)
    } catch (err) {
      error.value = '添加词条失败'
      console.error('添加词条失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 删除词条
  const deleteWord = async (word: string) => {
    try {
      loading.value = true
      error.value = null
      await window.electronAPI.dictionary.deleteWord(word)
    } catch (err) {
      error.value = '删除词条失败'
      console.error('删除词条失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 批量删除词条
  const deleteWords = async (words: string[]) => {
    try {
      loading.value = true
      error.value = null
      await window.electronAPI.dictionary.deleteWords(words)
    } catch (err) {
      error.value = '批量删除词条失败'
      console.error('批量删除词条失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 搜索词条
  const searchWords = async (query: string) => {
    try {
      loading.value = true
      error.value = null
      return await window.electronAPI.dictionary.searchWords(query)
    } catch (err) {
      error.value = '搜索词条失败'
      console.error('搜索词条失败:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // 更新词条状态
  const updateWordStatus = async (word: string, enabled: boolean) => {
    try {
      loading.value = true
      error.value = null
      await window.electronAPI.dictionary.updateWordStatus(word, enabled)
    } catch (err) {
      error.value = '更新词条状态失败'
      console.error('更新词条状态失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Getters
  const pendingSuggestionsCount = () => suggestions.value.length
  const dictionaryCount = () => dictionary.value.length
  const isLoading = () => loading.value
  const getError = () => error.value

  return {
    // 状态
    suggestions,
    dictionary,
    loading,
    error,

    // Actions
    fetchPendingSuggestions,
    processSuggestion,
    processSuggestionBatch,
    fetchDictionary,
    cleanupDictionary,
    fetchAllWords,
    addWord,
    deleteWord,
    deleteWords,
    searchWords,
    updateWordStatus,

    // Getters
    pendingSuggestionsCount,
    dictionaryCount,
    isLoading,
    getError
  }
})
