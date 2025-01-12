import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Note, ReviewState } from '@shared/types'

export const useReviewStore = defineStore('review', () => {
  // ==================== 状态 ====================
  const notes = ref<Note[]>([])
  const currentIndex = ref(0)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastRefreshDate = ref<string>('')

  // ==================== 计算属性 ====================
  const currentNote = computed<Note | null>(() => notes.value[currentIndex.value] || null)
  const remainingCount = computed(() => Math.max(notes.value.length - currentIndex.value - 1, 0))
  const hasMore = computed(() => remainingCount.value > 0)

  // ==================== 从本地存储加载状态 ====================
  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem('review-state')
      if (stored) {
        const data = JSON.parse(stored)
        const storedDate = data.lastRefreshDate
        const today = new Date().toDateString()

        // 打印调试信息
        console.log('存储的日期:', storedDate)
        console.log('今天的日期:', today)
        console.log('日期是否相同:', storedDate === today)

        if (storedDate === today && Array.isArray(data.notes) && data.notes.length > 0) {
          notes.value = data.notes
          currentIndex.value = data.currentIndex || 0
          lastRefreshDate.value = storedDate
          return true
        }
      }
      return false
    } catch (err) {
      console.error('加载回顾状态失败:', err)
      return false
    }
  }

  // 保存状态到本地存储
  const saveToStorage = () => {
    try {
      const today = new Date().toDateString()
      const data = {
        notes: notes.value,
        currentIndex: currentIndex.value,
        lastRefreshDate: today
      }
      localStorage.setItem('review-state', JSON.stringify(data))
      console.log('保存数据到本地:', data)
    } catch (err) {
      console.error('保存回顾状态失败:', err)
    }
  }

  // ==================== 状态获取 ====================
  const getState = (): ReviewState => ({
    currentIndex: currentIndex.value,
    remainingCount: remainingCount.value,
    note: currentNote.value
  })

  // ==================== 操作方法 ====================
  // 获取今日回顾笔记
  const fetchReviewNotes = async () => {
    try {
      // 先尝试从本地存储加载
      if (loadFromStorage()) {
        console.log('从本地存储加载数据成功')
        return
      }

      // 如果本地没有数据或者是新的一天，则从服务器获取
      isLoading.value = true
      error.value = null
      const response = await window.electronAPI.review.getReviewData()
      notes.value = response.notes
      currentIndex.value = 0
      lastRefreshDate.value = new Date().toDateString()

      // 保存到本地存储
      saveToStorage()
      console.log('从服务器获取新数据并保存到本地')

      return response
    } catch (err) {
      console.error('获取智能回顾数据失败:', err)
      error.value = err instanceof Error ? err.message : '获取笔记失败'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 显示下一条笔记
  const showNextNote = () => {
    if (hasMore.value) {
      currentIndex.value++
      saveToStorage() // 保存当前进度
      return true
    }
    return false
  }

  // 重置状态
  const reset = () => {
    notes.value = []
    currentIndex.value = 0
    error.value = null
    lastRefreshDate.value = ''
    localStorage.removeItem('review-state')
  }

  return {
    // 状态
    notes,
    currentIndex,
    isLoading,
    error,

    // 计算属性
    currentNote,
    remainingCount,
    hasMore,

    // 方法
    getState,
    fetchReviewNotes,
    showNextNote,
    reset
  }
})
