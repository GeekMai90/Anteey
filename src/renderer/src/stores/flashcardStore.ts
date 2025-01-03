import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Note } from '@shared/types'
import type { FlashcardStats, FlashcardDecks, ReviewFeedback } from '@shared/types'

export const useFlashcardStore = defineStore('flashcard', () => {
  // ==================== 状态 ====================
  const dueFlashcards = ref<Note[]>([])
  const currentFlashcard = ref<Note | null>(null)
  const stats = ref<FlashcardStats | null>(null)
  const decks = ref<FlashcardDecks | null>(null)
  const isReviewModalOpen = ref(false)

  // ==================== 操作方法 ====================
  // 获取待复习的闪卡
  const fetchDueFlashcards = async (tags?: string[]) => {
    try {
      dueFlashcards.value = await window.electronAPI.getDueFlashcards(tags)
      return dueFlashcards.value
    } catch (error) {
      console.error('获取待复习闪卡失败:', error)
      throw error
    }
  }

  // 获取闪卡统计信息
  const fetchFlashcardStats = async () => {
    try {
      stats.value = await window.electronAPI.getFlashcardStats()
      return stats.value
    } catch (error) {
      console.error('获取闪卡统计信息失败:', error)
      throw error
    }
  }

  // 将笔记转换为闪卡
  const convertToFlashcard = async (noteId: string) => {
    try {
      await window.electronAPI.convertToFlashcard(noteId)
      await fetchFlashcardStats()
    } catch (error) {
      console.error('转换闪卡失败:', error)
      throw error
    }
  }

  // 取消闪卡标记
  const removeFlashcard = async (noteId: string) => {
    try {
      await window.electronAPI.removeFlashcard(noteId)
      await fetchFlashcardStats()
    } catch (error) {
      console.error('取消闪卡标记失败:', error)
      throw error
    }
  }

  // 更新闪卡复习状态
  const updateFlashcardStatus = async (noteId: string, feedback: ReviewFeedback) => {
    try {
      await window.electronAPI.updateFlashcardStatus({ noteId, feedback })
      // 更新状态
      await fetchDueFlashcards()
      await fetchFlashcardStats()

      // 从当前复习列表中移除已复习的卡片
      if (currentFlashcard.value?.id === noteId) {
        const index = dueFlashcards.value.findIndex((card) => card.id === noteId)
        if (index > -1) {
          dueFlashcards.value.splice(index, 1)
        }
        // 设置下一张卡片
        currentFlashcard.value = dueFlashcards.value[0] || null
      }
    } catch (error) {
      console.error('更新闪卡状态失败:', error)
      throw error
    }
  }

  // 获取闪卡卡组数据
  const fetchFlashcardDecks = async () => {
    try {
      decks.value = await window.electronAPI.getFlashcardDecks()
      return decks.value
    } catch (error) {
      console.error('获取闪卡卡组数据失败:', error)
      throw error
    }
  }

  // 开始复习会话
  const startReviewSession = async (tags?: string[]) => {
    try {
      const cards = await window.electronAPI.getDueFlashcards(tags)
      dueFlashcards.value = cards
      isReviewModalOpen.value = true
    } catch (error) {
      console.error('Failed to start review session:', error)
      throw error
    }
  }

  // 模态框控制
  const openReviewModal = () => (isReviewModalOpen.value = true)
  const closeReviewModal = () => {
    isReviewModalOpen.value = false
    currentFlashcard.value = null
  }

  return {
    // 状态
    dueFlashcards,
    currentFlashcard,
    stats,
    decks,
    isReviewModalOpen,

    // 方法
    fetchDueFlashcards,
    fetchFlashcardStats,
    fetchFlashcardDecks,
    convertToFlashcard,
    removeFlashcard,
    updateFlashcardStatus,
    startReviewSession,
    openReviewModal,
    closeReviewModal
  }
})
