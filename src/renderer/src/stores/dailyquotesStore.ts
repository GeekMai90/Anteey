import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DailyQuote } from '@shared/types'

export const useDailyQuotesStore = defineStore('dailyQuotes', () => {
  // ==================== 状态 ====================
  const todayQuote = ref<DailyQuote | null>(null)
  const allQuotes = ref<DailyQuote[]>([])
  const isQuoteModalOpen = ref(false)

  // ==================== 操作方法 ====================
  // 获取今日金句
  const fetchTodayQuote = async () => {
    try {
      const quote = await window.electronAPI.dailyQuotes.getTodayQuote()
      todayQuote.value = quote
      return quote
    } catch (error) {
      console.error('获取今日金句失败:', error)
      throw error
    }
  }

  // 获取所有金句
  const fetchAllQuotes = async () => {
    try {
      const quotes = await window.electronAPI.dailyQuotes.getAllQuotes()
      allQuotes.value = quotes
      return quotes
    } catch (error) {
      console.error('获取所有金句失败:', error)
      throw error
    }
  }

  // 添加新金句
  const addQuote = async (content: string, author: string) => {
    try {
      const newQuote = await window.electronAPI.dailyQuotes.addQuote(content, author)
      await fetchAllQuotes()
      return newQuote
    } catch (error) {
      console.error('添加金句失败:', error)
      throw error
    }
  }

  // 更新金句
  const updateQuote = async (id: string, data: { content?: string; author?: string }) => {
    try {
      const updatedQuote = await window.electronAPI.dailyQuotes.updateQuote(id, data)
      await fetchAllQuotes()
      // 如果更新的是今日金句，也需要更新 todayQuote
      if (todayQuote.value?.id === id) {
        todayQuote.value = updatedQuote
      }
      return updatedQuote
    } catch (error) {
      console.error('更新金句失败:', error)
      throw error
    }
  }

  // 删除金句
  const deleteQuote = async (id: string) => {
    try {
      await window.electronAPI.dailyQuotes.deleteQuote(id)
      // 如果删除的是今日金句，需要清空 todayQuote
      if (todayQuote.value?.id === id) {
        todayQuote.value = null
      }
      await fetchAllQuotes()
    } catch (error) {
      console.error('删除金句失败:', error)
      throw error
    }
  }

  // 模态框控制
  const openQuoteModal = () => (isQuoteModalOpen.value = true)
  const closeQuoteModal = () => (isQuoteModalOpen.value = false)

  return {
    // 状态
    todayQuote,
    allQuotes,
    isQuoteModalOpen,

    // 方法
    fetchTodayQuote,
    fetchAllQuotes,
    addQuote,
    updateQuote,
    deleteQuote,
    openQuoteModal,
    closeQuoteModal
  }
})
