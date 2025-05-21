import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Note } from '@shared/types'
import type {
  FlashcardStats,
  FlashcardDecks,
  ReviewFeedback,
  FlashcardSettings,
  StudyHistory
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
    const studyHistory = ref<StudyHistory | null>(null)
    const pendingFlashcards = ref<{ noteId: string; dueTime: Date }[]>([]) // 存储即将到期的卡片
    const pendingTimers = ref<number[]>([]) // 存储定时器ID

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
        // console.log('Store 从服务获取的原始统计数据:', stats.value)
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

    // 检查并添加到期的卡片到当前复习队列
    const checkAndAddDueCards = async () => {
      if (pendingFlashcards.value.length === 0 || !isReviewModalOpen.value) return

      const now = new Date()
      const dueCardIds = pendingFlashcards.value
        .filter((card) => new Date(card.dueTime) <= now)
        .map((card) => card.noteId)

      if (dueCardIds.length === 0) return

      // 从待处理列表中移除已到期的卡片
      pendingFlashcards.value = pendingFlashcards.value.filter(
        (card) => new Date(card.dueTime) > now
      )

      // 获取到期卡片的详细信息
      try {
        const dueCards = await window.electronAPI.flashcard.getFlashcardsByIds(dueCardIds)
        if (dueCards && dueCards.length > 0) {
          // 添加到当前复习队列
          dueFlashcards.value = [...dueFlashcards.value, ...dueCards]
          console.log('已将到期卡片添加到复习队列:', dueCards)
        }
      } catch (error) {
        console.error('获取到期卡片失败:', error)
      }
    }

    // 清除所有定时器
    const clearAllTimers = () => {
      pendingTimers.value.forEach((timerId) => clearTimeout(timerId))
      pendingTimers.value = []
    }

    // 更新闪卡复习状态
    const updateFlashcardStatus = async (
      noteId: string,
      feedback: ReviewFeedback,
      reviewTime: number,
      isSimplified?: boolean
    ) => {
      try {
        const result = await window.electronAPI.flashcard.updateFlashcardStatus({
          noteId,
          feedback,
          reviewTime,
          isSimplified
        })

        // 更新所有相关数据
        await Promise.all([fetchFlashcardStats(), fetchStudyHistory()])

        // 从当前复习列表中移除已复习的卡片
        const index = dueFlashcards.value.findIndex((card) => card.id === noteId)
        if (index > -1) {
          dueFlashcards.value.splice(index, 1)
        }

        // 如果卡片需要在短时间内再次复习，添加到待处理列表
        if (result && result.nextReviewAt) {
          const nextReviewTime = new Date(result.nextReviewAt)
          const now = new Date()
          const diffMinutes = (nextReviewTime.getTime() - now.getTime()) / (1000 * 60)

          // 如果复习时间在30分钟内，添加到待处理列表
          if (diffMinutes <= 30 && diffMinutes > 0) {
            pendingFlashcards.value.push({
              noteId: result.noteId,
              dueTime: nextReviewTime
            })

            // 设置定时器检查到期卡片
            const timerId = setTimeout(
              () => {
                checkAndAddDueCards()
              },
              diffMinutes * 60 * 1000
            ) as unknown as number

            pendingTimers.value.push(timerId)

            console.log(`卡片 ${result.noteId} 将在 ${diffMinutes.toFixed(1)} 分钟后再次复习`)
          }
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
        pendingFlashcards.value = [] // 清空待处理列表
        clearAllTimers() // 清除所有定时器
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
      pendingFlashcards.value = [] // 清空待处理列表
      clearAllTimers() // 清除所有定时器
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
        // console.log('获取到的设置:', newSettings)
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

    // 获取学习历史数据
    const fetchStudyHistory = async (days?: number) => {
      try {
        studyHistory.value = await window.electronAPI.flashcard.getStudyHistory(days)
        return studyHistory.value
      } catch (error) {
        console.error('获取学习历史失败:', error)
        throw error
      }
    }

    // 批量转换为闪卡
    const batchConvertToFlashcards = async (noteIds: string[]) => {
      try {
        // 将响应式数组转换为普通数组
        const plainNoteIds = Array.from(noteIds)
        await window.electronAPI.flashcard.batchConvertToFlashcards(plainNoteIds)
        await fetchFlashcardStats() // 更新统计信息
        // 发送事件通知
        const flashcardConvertedBus = useEventBus('flashcard-converted')
        flashcardConvertedBus.emit('batch')
      } catch (error) {
        console.error('批量转换闪卡失败:', error)
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
      studyHistory,
      pendingFlashcards,

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
      updateSettings,
      fetchStudyHistory,
      batchConvertToFlashcards,
      checkAndAddDueCards,
      clearAllTimers
    }
  },
  {
    persist: {
      key: 'flashcard-settings',
      pick: ['settings'] // 只持久化 settings
    }
  }
)
