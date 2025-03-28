import { defineStore } from 'pinia'
import { ref, reactive, watch } from 'vue'
import { message } from '@renderer/utils/message'
import type {
  Letter,
  LetterType,
  GetLetterConfigResult,
  UpdateLetterConfigParams,
  ConfigValidationResult,
  LetterConfig
} from '@shared/types'

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
  const canReceiveToday = ref(true)

  // 新增：配置相关状态
  const letterConfig = ref<GetLetterConfigResult | null>(null)
  const isConfigLoading = ref(false)
  const configError = ref<string | null>(null)
  const isSaving = ref(false)
  const originalData = ref<any>(null)

  // 表单数据类型中添加 weeklyCustomPrompt
  const formData = reactive({
    recipient: '',
    sender: '',
    useNickname: true,
    dailyNotesLimit: 6,
    weeklyNotesLimit: 12,
    modelId: '',
    temperature: 0.7,
    customPrompt: '',
    weeklyCustomPrompt: '' // 新增每周来信提示词
  })

  // 修改 watch 函数
  watch(
    () => letterConfig.value,
    (newConfig) => {
      if (newConfig) {
        // 确保类型转换
        formData.dailyNotesLimit = Number(newConfig.dailyNotesLimit)
        formData.weeklyNotesLimit = Number(newConfig.weeklyNotesLimit)
        formData.temperature = Number(newConfig.temperature)
        formData.useNickname = Boolean(newConfig.useNickname)
        formData.recipient = String(newConfig.recipient)
        formData.sender = String(newConfig.sender)
        formData.modelId = String(newConfig.modelId)
        formData.customPrompt = String(newConfig.customPrompt || '')
        formData.weeklyCustomPrompt = String(newConfig.weeklyCustomPrompt || '')

        // 更新原始数据
        originalData.value = {
          dailyNotesLimit: Number(newConfig.dailyNotesLimit),
          weeklyNotesLimit: Number(newConfig.weeklyNotesLimit),
          temperature: Number(newConfig.temperature),
          useNickname: Boolean(newConfig.useNickname),
          recipient: String(newConfig.recipient),
          sender: String(newConfig.sender),
          modelId: String(newConfig.modelId),
          customPrompt: String(newConfig.customPrompt || ''),
          weeklyCustomPrompt: String(newConfig.weeklyCustomPrompt || '')
        }
      }
    }
  )

  // 修改 saveSettings 函数中的更新检查
  const batchUpdateLetterConfig = async (params: UpdateLetterConfigParams) => {
    try {
      isSaving.value = true
      const updateParams: UpdateLetterConfigParams = {}

      if (formData.customPrompt !== originalData.value.customPrompt) {
        updateParams.customPrompt = formData.customPrompt
      }

      if (formData.weeklyCustomPrompt !== originalData.value.weeklyCustomPrompt) {
        updateParams.weeklyCustomPrompt = formData.weeklyCustomPrompt
      }

      // 更新配置
      const success = await window.electronAPI.letter.updateLetterConfig(params)
      if (success) {
        message.success('保存成功')
        // 使用深拷贝更新原始数据
        originalData.value = JSON.parse(JSON.stringify(formData))
      }
      return success
    } catch (error) {
      console.error('保存配置失败:', error)
      message.error('保存失败')
      return false
    } finally {
      isSaving.value = false
    }
  }

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

  // ==================== 配置相关方法 ====================

  // 获取来信配置
  const fetchLetterConfig = async () => {
    try {
      isConfigLoading.value = true
      configError.value = null
      letterConfig.value = await window.electronAPI.letter.getLetterConfig()
    } catch (error) {
      console.error('获取来信配置失败:', error)
      configError.value = String(error)
    } finally {
      isConfigLoading.value = false
    }
  }

  // 更新来信配置
  const updateLetterConfig = async (params: UpdateLetterConfigParams) => {
    try {
      isConfigLoading.value = true
      configError.value = null
      letterConfig.value = await window.electronAPI.letter.updateLetterConfig(params)
      return true
    } catch (error) {
      console.error('更新来信配置失败:', error)
      configError.value = String(error)
      return false
    } finally {
      isConfigLoading.value = false
    }
  }

  // 重置来信配置
  const resetLetterConfig = async (defaultModelId: string) => {
    try {
      isConfigLoading.value = true
      configError.value = null
      letterConfig.value = await window.electronAPI.letter.resetLetterConfig(defaultModelId)
      return true
    } catch (error) {
      console.error('重置来信配置失败:', error)
      configError.value = String(error)
      return false
    } finally {
      isConfigLoading.value = false
    }
  }

  // 验证来信配置
  const validateLetterConfig = async (
    params: UpdateLetterConfigParams
  ): Promise<ConfigValidationResult> => {
    try {
      return await window.electronAPI.letter.validateLetterConfig(params)
    } catch (error) {
      console.error('验证来信配置失败:', error)
      return {
        isValid: false,
        errors: Object.keys(params).map((key) => ({
          field: key as keyof LetterConfig,
          message: String(error)
        }))
      }
    }
  }

  // 清除配置错误
  const clearConfigError = () => {
    configError.value = null
  }

  // 添加删除信件的方法
  const deleteLetter = async (id: string) => {
    try {
      const success = await window.electronAPI.letter.deleteLetter(id)
      if (success) {
        // 从列表中移除该信件
        letters.value = letters.value.filter((letter) => letter.id !== id)
        // 更新总数
        totalLetters.value--
        // 如果是当前打开的信件，清空当前信件
        if (currentLetter.value?.id === id) {
          currentLetter.value = null
          isLetterModalOpen.value = false
        }
        // 如果是未读信件，更新未读数量
        await fetchUnreadCount()
      }
      return success
    } catch (error) {
      console.error('删除信件失败:', error)
      throw error
    }
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
    // 新增：配置相关状态
    letterConfig,
    isConfigLoading,
    configError,
    isSaving,
    originalData,
    formData,

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
    closeLetterModal,

    // 新增：配置相关方法
    fetchLetterConfig,
    updateLetterConfig,
    resetLetterConfig,
    validateLetterConfig,
    clearConfigError,
    batchUpdateLetterConfig,

    // 添加删除信件方法到返回值中
    deleteLetter
  }
})
