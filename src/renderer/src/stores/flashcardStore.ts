import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Note } from '@shared/types'
import type {
  FlashcardStats,
  FlashcardDecks,
  ReviewFeedback,
  FlashcardSettings
} from '@shared/types'
import { useEventBus } from '@vueuse/core'

export const useFlashcardStore = defineStore(
  'flashcard',
  () => {
    // ==================== 状态 ====================
    const dueFlashcards = ref<Note[]>([])
    const currentFlashcard = ref<Note | null>(null)
    const stats = ref<FlashcardStats | null>(null)
    const decks = ref<FlashcardDecks | null>(null)
    const settings = ref<FlashcardSettings | null>(null)
    const isReviewModalOpen = ref(false)

    // ==================== 操作方法 ====================
    // 获取待复习的闪卡
    const fetchDueFlashcards = async (tags?: string[]) => {
      try {
        dueFlashcards.value = await window.electronAPI.flashcard.getDueFlashcards(tags)
        return dueFlashcards.value
      } catch (error) {
        console.error('获取待复习闪卡失败:', error)
        throw error
      }
    }

    // 获取闪卡统计信息
    const fetchFlashcardStats = async () => {
      try {
        stats.value = await window.electronAPI.flashcard.getFlashcardStats()
        return stats.value
      } catch (error) {
        console.error('获取闪卡统计信息失败:', error)
        throw error
      }
    }

    // 将笔记转换为闪卡
    const convertToFlashcard = async (noteId: string) => {
      try {
        await window.electronAPI.flashcard.convertToFlashcard(noteId)
        await fetchFlashcardStats()
        // 发送事件通知
        const flashcardConvertedBus = useEventBus('flashcard-converted')
        flashcardConvertedBus.emit(noteId)
      } catch (error) {
        console.error('转换闪卡失败:', error)
        throw error
      }
    }

    // 取消闪卡标记
    const removeFlashcard = async (noteId: string) => {
      try {
        await window.electronAPI.flashcard.removeFlashcard(noteId)
        await fetchFlashcardStats()
        // 发送事件通知
        const flashcardConvertedBus = useEventBus('flashcard-converted')
        flashcardConvertedBus.emit(noteId)
      } catch (error) {
        console.error('取消闪卡标记失败:', error)
        throw error
      }
    }

    // 更新闪卡复习状态
    const updateFlashcardStatus = async (
      noteId: string,
      feedback: ReviewFeedback,
      reviewTime: number,
      isSimplified?: boolean
    ) => {
      try {
        await window.electronAPI.flashcard.updateFlashcardStatus({
          noteId,
          feedback,
          reviewTime,
          isSimplified
        })

        // 只更新统计信息
        await fetchFlashcardStats()

        // 从当前复习列表中移除已复习的卡片
        const index = dueFlashcards.value.findIndex((card) => card.id === noteId)
        if (index > -1) {
          dueFlashcards.value.splice(index, 1)
        }
      } catch (error) {
        console.error('更新闪卡状态失败:', error)
        throw error
      }
    }

    // 获取闪卡卡组数据
    const fetchFlashcardDecks = async () => {
      try {
        decks.value = await window.electronAPI.flashcard.getFlashcardDecks()
        return decks.value
      } catch (error) {
        console.error('获取闪卡卡组数据失败:', error)
        throw error
      }
    }

    // 开始复习会话
    const startReviewSession = async (tags?: string[]) => {
      try {
        const cards = await window.electronAPI.flashcard.getDueFlashcards(tags)
        dueFlashcards.value = cards
        isReviewModalOpen.value = true
        return cards // 返回卡片数据
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

    // 重置闪卡进度
    const resetFlashcardProgress = async (noteId: string) => {
      try {
        await window.electronAPI.flashcard.resetFlashcardProgress(noteId)
        await fetchFlashcardStats() // 重新获取统计信息
      } catch (error) {
        console.error('重置闪卡进度失败:', error)
        throw error
      }
    }

    // 获取记忆卡设置
    const fetchSettings = async () => {
      try {
        const newSettings = await window.electronAPI.flashcard.getSettings()
        console.log('获取到的设置:', newSettings)
        settings.value = newSettings
        return settings.value
      } catch (error) {
        console.error('获取记忆卡设置失败:', error)
        throw error
      }
    }

    // 更新记忆卡设置
    const updateSettings = async (newSettings: Partial<FlashcardSettings>) => {
      try {
        await window.electronAPI.flashcard.updateSettings(newSettings)
        await fetchSettings() // 重新获取设置
      } catch (error) {
        console.error('更新记忆卡设置失败:', error)
        throw error
      }
    }

    return {
      // 状态
      dueFlashcards,
      currentFlashcard,
      stats,
      decks,
      settings,
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
      closeReviewModal,
      resetFlashcardProgress,
      fetchSettings,
      updateSettings
    }
  },
  {
    persist: {
      key: 'flashcard-settings',
      pick: ['settings'] // 只持久化 settings
    }
  }
)
