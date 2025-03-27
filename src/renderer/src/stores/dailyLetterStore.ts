import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Letter, LetterType } from '@shared/types'

export const useDailyLetterStore = defineStore('dailyLetter', () => {
  // ==================== 状态 ====================
  // 动画相关状态
  const isAnimating = ref(false)
  const isBicycleAnimating = ref(false)
  const isMailboxShaking = ref(false)

  // 信件相关状态
  const letters = ref<Letter[]>([])
  const currentLetter = ref<Letter | null>(null)
  const totalLetters = ref(0)
  const unreadCount = ref(0)
  const isLetterModalOpen = ref(false)

  // 添加新的状态
  const canReceiveToday = ref(true)

  // ==================== 动画控制方法 ====================
  const startAnimation = () => {
    endAnimation()
    console.log('开始整体动画')
    isAnimating.value = true
    isBicycleAnimating.value = true
    isMailboxShaking.value = false
  }

  const startMailboxShake = () => {
    console.log('开始邮箱抖动')
    isAnimating.value = true
    isBicycleAnimating.value = false
    isMailboxShaking.value = true
  }

  const endAnimation = () => {
    console.log('结束整体动画')
    isAnimating.value = false
    isBicycleAnimating.value = false
    isMailboxShaking.value = false
  }

  // ==================== 信件操作方法 ====================
  // 添加新的方法来检查今天是否可以接收信件
  const checkTodayLetter = async () => {
    try {
      const hasReceived = await window.electronAPI.letter.checkTodayLetter()
      canReceiveToday.value = !hasReceived
      return !hasReceived
      // return true
    } catch (error) {
      console.error('检查今日信件状态失败:', error)
      throw error
    }
  }

  // 修改 createLetter 方法
  const createLetter = async (type: LetterType) => {
    try {
      if (type === 'daily' && !canReceiveToday.value) {
        throw new Error('今天已经收到过信件了')
      }
      const letter = await window.electronAPI.letter.createLetter(type)
      await fetchLetters()
      if (type === 'daily') {
        canReceiveToday.value = false
      }
      return letter
    } catch (error) {
      console.error('创建信件失败:', error)
      throw error
    }
  }

  // 获取信件列表
  const fetchLetters = async (page: number = 1, limit: number = 10) => {
    try {
      const result = await window.electronAPI.letter.getLetters(page, limit)
      letters.value = result.letters
      totalLetters.value = result.total
      return result
    } catch (error) {
      console.error('获取信件列表失败:', error)
      throw error
    }
  }

  // 获取单个信件
  const getLetterById = async (id: string) => {
    try {
      const letter = await window.electronAPI.letter.getLetterById(id)
      if (letter) {
        currentLetter.value = letter
      }
      return letter
    } catch (error) {
      console.error('获取信件失败:', error)
      throw error
    }
  }

  // 更新信件阅读状态
  const updateLetterReadStatus = async (id: string, readStatus: boolean) => {
    try {
      const updatedLetter = await window.electronAPI.letter.updateLetterReadStatus(id, readStatus)
      // 更新本地状态
      if (currentLetter.value?.id === id) {
        currentLetter.value = updatedLetter
      }
      // 更新列表中的信件状态
      const index = letters.value.findIndex((letter) => letter.id === id)
      if (index !== -1) {
        letters.value[index] = updatedLetter
      }
      // 更新未读数量
      await fetchUnreadCount()
      return updatedLetter
    } catch (error) {
      console.error('更新信件阅读状态失败:', error)
      throw error
    }
  }

  // 获取最新信件
  const getLatestLetter = async () => {
    try {
      const letter = await window.electronAPI.letter.getLatestLetter()
      if (letter) {
        currentLetter.value = letter
      }
      return letter
    } catch (error) {
      console.error('获取最新信件失败:', error)
      throw error
    }
  }

  // 获取未读信件数量
  const fetchUnreadCount = async () => {
    try {
      unreadCount.value = await window.electronAPI.letter.getUnreadLettersCount()
      return unreadCount.value
    } catch (error) {
      console.error('获取未读信件数量失败:', error)
      throw error
    }
  }

  // 模态框控制
  const openLetterModal = () => (isLetterModalOpen.value = true)
  const closeLetterModal = () => {
    isLetterModalOpen.value = false
    currentLetter.value = null
  }

  return {
    // 状态
    isAnimating,
    isBicycleAnimating,
    isMailboxShaking,
    letters,
    currentLetter,
    totalLetters,
    unreadCount,
    isLetterModalOpen,
    canReceiveToday,

    // 动画方法
    startAnimation,
    startMailboxShake,
    endAnimation,

    // 信件操作方法
    createLetter,
    fetchLetters,
    getLetterById,
    updateLetterReadStatus,
    getLatestLetter,
    fetchUnreadCount,
    checkTodayLetter,

    // 模态框控制
    openLetterModal,
    closeLetterModal
  }
})
