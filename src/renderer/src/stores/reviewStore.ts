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
  const enableMarioSound = ref(true) // 默认开启音效
  const enableMarioStyle = ref(true) // 默认启用马里奥按钮样式

  // ==================== 计算属性 ====================
  const currentNote = computed<Note | null>(() => notes.value[currentIndex.value] || null)
  const remainingCount = computed(() => Math.max(notes.value.length - currentIndex.value - 1, 0))
  const hasMore = computed(() => remainingCount.value > 0)

  // ==================== 单条随机笔记相关 ====================
  const randomNote = ref<Note | null>(null)
  const isLoadingRandom = ref(false)
  const randomError = ref<string | null>(null)

  // ==================== 添加历史记录相关状态 ====================
  const MAX_HISTORY = 3 // 最多保留3条历史记录
  const reviewHistory = ref<Note[]>([])

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

  // 获取单条随机笔记
  const fetchRandomNote = async () => {
    try {
      isLoadingRandom.value = true
      randomError.value = null
      const note = await window.electronAPI.review.getOneRandomNote()
      randomNote.value = note

      if (note) {
        // 添加到历史记录
        reviewHistory.value.push(note)
        // 如果超出最大数量,移除最早的记录
        if (reviewHistory.value.length > MAX_HISTORY) {
          reviewHistory.value.shift()
        }
      }

      return note
    } catch (err) {
      console.error('获取单条随机笔记失败:', err)
      randomError.value = err instanceof Error ? err.message : '获取随机笔记失败'
      throw err
    } finally {
      isLoadingRandom.value = false
    }
  }

  // 获取上一条笔记
  const fetchPreviousNote = async () => {
    try {
      // 如果历史记录少于2条,说明没有上一条笔记
      if (reviewHistory.value.length < 2) {
        return null
      }

      // 移除当前笔记
      reviewHistory.value.pop()
      // 获取新的当前笔记(即原来的上一条笔记)
      const previousNote = reviewHistory.value[reviewHistory.value.length - 1]
      randomNote.value = previousNote

      return previousNote
    } catch (err) {
      console.error('获取上一条笔记失败:', err)
      throw err
    }
  }

  // 清空历史记录
  const clearHistory = () => {
    reviewHistory.value = []
  }

  // 更新音效状态
  const updateMarioSoundEnabled = (value: boolean) => {
    enableMarioSound.value = value
    localStorage.setItem('review-mario-sound', value.toString())
  }

  // 更新马里奥样式开关
  const updateMarioStyleEnabled = (value: boolean) => {
    enableMarioStyle.value = value
    localStorage.setItem('review-mario-style', value.toString())
  }

  // 初始化马里奥相关设置
  const initializeMarioSettings = () => {
    const savedSound = localStorage.getItem('review-mario-sound')
    if (savedSound !== null) {
      enableMarioSound.value = savedSound === 'true'
    }
    const savedStyle = localStorage.getItem('review-mario-style')
    if (savedStyle !== null) {
      enableMarioStyle.value = savedStyle === 'true'
    }
  }

  // 在初始化时读取设置
  initializeMarioSettings()

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
    reset,

    // 单条随机笔记相关
    randomNote,
    isLoadingRandom,
    randomError,
    fetchRandomNote,
    fetchPreviousNote,
    clearHistory,

    // 历史记录
    reviewHistory: computed(() => reviewHistory.value),
    enableMarioSound: computed(() => enableMarioSound.value),
    updateMarioSoundEnabled,
    enableMarioStyle: computed(() => enableMarioStyle.value),
    updateMarioStyleEnabled
  }
})
