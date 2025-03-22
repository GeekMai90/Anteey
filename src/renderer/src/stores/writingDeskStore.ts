import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  Manuscript,
  ManuscriptCard,
  CreateManuscriptParams,
  UpdateManuscriptParams,
  PolishManuscriptParams,
  AIFeatureType
} from '@shared/types'

export const useWritingDeskStore = defineStore('writingDesk', () => {
  // ==================== 状态 ====================
  const manuscripts = ref<Manuscript[]>([])
  const currentManuscript = ref<(Manuscript & { cards: ManuscriptCard[] }) | null>(null)
  const isCreateModalOpen = ref(false)
  const isPolishingManuscript = ref(false)
  const isGeneratingFirstDraft = ref(false)
  const firstDraftHistory = ref<
    Array<{
      id: string
      manuscriptId: string
      firstDraftContent: any
      style: string
      createdAt: Date
    }>
  >([])
  const polishHistory = ref<
    Array<{
      id: string
      manuscriptId: string
      polishedContent: any
      style: string
      createdAt: Date
    }>
  >([])
  // 添加 AI 配置相关状态
  const aiConfigs = ref<
    Array<{
      id: string
      featureType: AIFeatureType
      modelConfigId: string
      createdAt: Date
      updatedAt: Date
    }>
  >([])

  const currentFeatureConfig = ref<{
    id: string
    featureType: AIFeatureType
    modelConfigId: string
    createdAt: Date
    updatedAt: Date
  } | null>(null)
  // ==================== 操作方法 ====================
  // 获取所有文稿
  const fetchAllManuscripts = async () => {
    try {
      console.log('WritingDeskStore - 开始获取所有文稿')
      if (!window.electronAPI?.writingDesk?.getAllManuscripts) {
        console.error('WritingDeskStore - electronAPI 未正确初始化')
        return false
      }

      const result = await window.electronAPI.writingDesk.getAllManuscripts()
      console.log('WritingDeskStore - API 返回结果:', result)

      if (Array.isArray(result)) {
        manuscripts.value = result
        console.log('WritingDeskStore - 获取文稿成功, 数量:', manuscripts.value.length)
        return true
      }

      if (result && typeof result === 'object') {
        if (!result.success) {
          console.error('WritingDeskStore - 获取文稿失败:', result.error)
          return false
        }

        if (!Array.isArray(result.manuscripts)) {
          console.error('WritingDeskStore - 返回的文稿数据格式不正确:', result.manuscripts)
          return false
        }

        manuscripts.value = result.manuscripts
        console.log('WritingDeskStore - 获取文稿成功, 数量:', manuscripts.value.length)
        return true
      }

      console.error('WritingDeskStore - 返回数据格式异常:', result)
      return false
    } catch (error) {
      console.error('WritingDeskStore - 获取所有文稿失败:', error)
      return false
    }
  }

  // 获取单个文稿及其卡片
  const fetchManuscript = async (id: string) => {
    try {
      console.log('WritingDeskStore - 开始获取文稿详情, ID:', id)
      const result = await window.electronAPI.writingDesk.getManuscript(id)

      if (!result.success) {
        console.error('WritingDeskStore - 获取文稿失败:', result.error)
        return null
      }

      currentManuscript.value = result.manuscript || null
      return currentManuscript.value
    } catch (error) {
      console.error('WritingDeskStore - 获取文稿详情失败:', error)
      return null
    }
  }

  // 创建新文稿
  const createManuscript = async (params: CreateManuscriptParams) => {
    try {
      const result = await window.electronAPI.writingDesk.createManuscript(params)
      if (!result.success || !result.manuscript) {
        throw new Error(result.error || '创建文稿失败')
      }
      await fetchAllManuscripts()
      await loadManuscript(result.manuscript.id)
      return result.manuscript
    } catch (error) {
      console.error('创建文稿失败:', error)
      throw error
    }
  }

  // 更新文稿
  const updateManuscript = async (params: UpdateManuscriptParams) => {
    try {
      const result = await window.electronAPI.writingDesk.updateManuscript(params)
      if (!result.success) {
        throw new Error(result.error || '更新文稿失败')
      }

      // 更新成功后重新加载数据
      if (currentManuscript.value?.id === params.id) {
        await loadManuscript(params.id)
      }

      return result.manuscript
    } catch (error) {
      console.error('更新文稿失败:', error)
      throw error
    }
  }

  // 删除文稿
  const deleteManuscript = async (id: string) => {
    try {
      const result = await window.electronAPI.writingDesk.deleteManuscript(id)
      if (!result.success) {
        throw new Error(result.error || '删除文稿失败')
      }
      if (currentManuscript.value?.id === id) {
        currentManuscript.value = null
      }
      await fetchAllManuscripts()
    } catch (error) {
      console.error('删除文稿失败:', error)
      throw error
    }
  }

  // ==================== 卡片操作 ====================
  // 添加卡片
  const addCard = async (manuscriptId: string, content: any, order: number, noteId?: string) => {
    try {
      console.log('WritingDeskStore - 开始添加卡片')
      const result = await window.electronAPI.writingDesk.addManuscriptCard(
        manuscriptId,
        content,
        order,
        noteId
      )

      if (!result.success || !result.card) {
        throw new Error(result.error || '添加卡片失败')
      }

      // 如果是当前文稿，重新加载数据
      if (currentManuscript.value?.id === manuscriptId) {
        await loadManuscript(manuscriptId)
      }

      return result.card
    } catch (error) {
      console.error('WritingDeskStore - 添加卡片失败:', error)
      throw error
    }
  }

  // 更新卡片
  const updateCard = async (cardId: string, content?: any, order?: number) => {
    try {
      const result = await window.electronAPI.writingDesk.updateManuscriptCard(
        cardId,
        content,
        order
      )
      if (!result.success || !result.card) {
        throw new Error(result.error || '更新卡片失败')
      }
      if (currentManuscript.value) {
        await fetchManuscript(currentManuscript.value.id)
      }
      return result.card
    } catch (error) {
      console.error('更新卡片失败:', error)
      throw error
    }
  }

  // 移动卡片
  const moveCard = async (cardId: string, order: number) => {
    try {
      const result = await window.electronAPI.writingDesk.moveManuscriptCard(cardId, order)
      if (!result.success || !result.card) {
        throw new Error(result.error || '移动卡片失败')
      }
      if (currentManuscript.value) {
        await fetchManuscript(currentManuscript.value.id)
      }
      return result.card
    } catch (error) {
      console.error('移动卡片失败:', error)
      throw error
    }
  }

  // 删除卡片
  const deleteCard = async (cardId: string) => {
    try {
      // 保存当前文稿ID用于重新加载
      const currentId = currentManuscript.value?.id

      const result = await window.electronAPI.writingDesk.deleteManuscriptCard(cardId)
      if (!result.success) {
        throw new Error(result.error || '删除卡片失败')
      }

      // 如果是当前文稿的卡片，重新加载文稿数据
      if (currentId) {
        await loadManuscript(currentId)
      }
    } catch (error) {
      console.error('删除卡片失败:', error)
      throw error
    }
  }

  // 批量添加卡片
  const batchAddCards = async (manuscriptId: string, cards: { noteId: string; content: any }[]) => {
    try {
      const result = await window.electronAPI.writingDesk.batchAddManuscriptCards(
        manuscriptId,
        cards
      )
      if (!result.success || !result.cards) {
        throw new Error(result.error || '批量添加卡片失败')
      }
      if (currentManuscript.value?.id === manuscriptId) {
        await fetchManuscript(manuscriptId)
      }
      return result.cards
    } catch (error) {
      console.error('批量添加卡片失败:', error)
      throw error
    }
  }

  // ==================== AI 润色相关 ====================

  // 获取 AI 功能配置
  const fetchAllAIConfigs = async () => {
    try {
      console.log('WritingDeskStore - 开始获取所有 AI 功能配置')
      const result = await window.electronAPI.writingDesk.getAllAIConfigs()

      if (!result.success || !result.configs) {
        throw new Error(result.error || '获取 AI 功能配置失败')
      }

      aiConfigs.value = result.configs
      return result.configs
    } catch (error) {
      console.error('WritingDeskStore - 获取所有 AI 功能配置失败:', error)
      throw error
    }
  }

  const fetchAIConfigByFeature = async (featureType: AIFeatureType) => {
    try {
      console.log('WritingDeskStore - 开始获取 AI 功能配置:', featureType)
      const result = await window.electronAPI.writingDesk.getAIConfigByFeature(featureType)

      if (!result.success) {
        throw new Error(result.error || '获取 AI 功能配置失败')
      }

      if (result.config) {
        currentFeatureConfig.value = result.config
      } else {
        currentFeatureConfig.value = null
      }

      return result.config
    } catch (error) {
      console.error('WritingDeskStore - 获取 AI 功能配置失败:', error)
      throw error
    }
  }

  const updateAIConfig = async (featureType: AIFeatureType, modelConfigId: string) => {
    try {
      console.log('WritingDeskStore - 开始更新 AI 功能配置:', { featureType, modelConfigId })
      const result = await window.electronAPI.writingDesk.updateAIConfig(featureType, modelConfigId)

      if (!result.success || !result.config) {
        throw new Error(result.error || '更新 AI 功能配置失败')
      }

      // 更新本地状态
      const index = aiConfigs.value.findIndex((config) => config.featureType === featureType)
      if (index !== -1) {
        aiConfigs.value[index] = result.config
      } else {
        aiConfigs.value.push(result.config)
      }

      // 如果是当前查看的功能配置，也更新它
      if (currentFeatureConfig.value?.featureType === featureType) {
        currentFeatureConfig.value = result.config
      }

      return result.config
    } catch (error) {
      console.error('WritingDeskStore - 更新 AI 功能配置失败:', error)
      throw error
    }
  }

  // 生成初稿
  const generateFirstDraft = async (params: PolishManuscriptParams) => {
    try {
      isGeneratingFirstDraft.value = true

      // 获取初稿功能的配置
      const config = await fetchAIConfigByFeature('firstDraft')
      if (!config) {
        throw new Error('未找到初稿功能的模型配置')
      }

      const result = await window.electronAPI.writingDesk.generateFirstDraft({
        ...params,
        modelConfigId: config.modelConfigId // 使用配置的模型
      })

      if (!result.success || !result.manuscript) {
        throw new Error(result.error || '生成初稿失败')
      }

      if (currentManuscript.value?.id === params.id) {
        await fetchManuscript(params.id)
      }

      return result.manuscript
    } catch (error) {
      console.error('生成初稿失败:', error)
      throw error
    } finally {
      isGeneratingFirstDraft.value = false
    }
  }

  // 润色终稿
  const polishManuscript = async (params: PolishManuscriptParams) => {
    try {
      isPolishingManuscript.value = true

      // 获取润色功能的配置
      const config = await fetchAIConfigByFeature('polish')
      if (!config) {
        throw new Error('未找到润色功能的模型配置')
      }

      const result = await window.electronAPI.writingDesk.polishManuscript({
        ...params,
        modelConfigId: config.modelConfigId // 使用配置的模型
      })

      if (!result.success || !result.manuscript) {
        throw new Error(result.error || '润色文稿失败')
      }

      if (currentManuscript.value?.id === params.id) {
        await fetchManuscript(params.id)
      }

      return result.manuscript
    } catch (error) {
      console.error('文稿润色失败:', error)
      throw error
    } finally {
      isPolishingManuscript.value = false
    }
  }

  // 获取初稿历史
  const getFirstDraftHistory = async (manuscriptId: string) => {
    try {
      const result = await window.electronAPI.writingDesk.getFirstDraftHistory(manuscriptId)
      if (!result.success || !result.history) {
        throw new Error(result.error || '获取初稿历史失败')
      }
      firstDraftHistory.value = result.history
      return result.history
    } catch (error) {
      console.error('获取初稿历史失败:', error)
      throw error
    }
  }

  // 恢复初稿历史版本
  const restoreFirstDraftHistory = async (manuscriptId: string, historyId: string) => {
    try {
      const result = await window.electronAPI.writingDesk.restoreFirstDraftHistory(
        manuscriptId,
        historyId
      )
      if (!result.success || !result.manuscript) {
        throw new Error(result.error || '恢复初稿历史版本失败')
      }

      // 恢复成功后重新加载文稿
      if (currentManuscript.value?.id === manuscriptId) {
        await loadManuscript(manuscriptId)
      }

      return result.manuscript
    } catch (error) {
      console.error('恢复初稿历史版本失败:', error)
      throw error
    }
  }

  // 获取终稿历史
  const getPolishHistory = async (manuscriptId: string) => {
    try {
      const result = await window.electronAPI.writingDesk.getPolishHistory(manuscriptId)
      if (!result.success || !result.history) {
        throw new Error(result.error || '获取终稿历史失败')
      }
      polishHistory.value = result.history
      return result.history
    } catch (error) {
      console.error('获取终稿历史失败:', error)
      throw error
    }
  }

  // 恢复终稿历史版本
  const restorePolishHistory = async (manuscriptId: string, historyId: string) => {
    try {
      const result = await window.electronAPI.writingDesk.restorePolishHistory(
        manuscriptId,
        historyId
      )
      if (!result.success || !result.manuscript) {
        throw new Error(result.error || '恢复终稿历史版本失败')
      }

      // 恢复成功后重新加载文稿
      if (currentManuscript.value?.id === manuscriptId) {
        await loadManuscript(manuscriptId)
      }

      return result.manuscript
    } catch (error) {
      console.error('恢复终稿历史版本失败:', error)
      throw error
    }
  }

  // ==================== 模态框控制 ====================
  const openCreateModal = () => (isCreateModalOpen.value = true)
  const closeCreateModal = () => (isCreateModalOpen.value = false)

  // 加载文稿数据
  const loadManuscript = async (id: string) => {
    try {
      console.log('开始加载文稿, ID:', id, 'Type:', typeof id)

      if (!id) {
        throw new Error('无效的文稿ID')
      }

      const manuscriptId = String(id).trim()
      if (!manuscriptId) {
        throw new Error('无效的文稿ID')
      }

      console.log('调用 API 获取文稿，使用ID:', manuscriptId)
      const result = await window.electronAPI.writingDesk.getManuscript(manuscriptId)
      console.log('获取到文稿数据:', result)

      if (!result.success || !result.manuscript) {
        throw new Error(result.error || '获取文稿失败')
      }

      currentManuscript.value = result.manuscript
      return result.manuscript
    } catch (error) {
      console.error('加载文稿失败:', error)
      throw error
    }
  }

  // 更新卡片内容
  const updateManuscriptCard = async (params: {
    manuscriptId: string
    cardId: string
    content: any
  }) => {
    try {
      const result = await window.electronAPI.writingDesk.updateManuscriptCard(
        params.cardId,
        params.content
      )
      if (!result.success || !result.card) {
        throw new Error(result.error || '更新卡片内容失败')
      }
      if (currentManuscript.value?.id === params.manuscriptId) {
        await loadManuscript(params.manuscriptId)
      }
      return result.card
    } catch (error) {
      console.error('更新卡片内容失败:', error)
      throw error
    }
  }

  // 更新卡片顺序
  const updateManuscriptCardsOrder = async (params: {
    manuscriptId: string
    cards: ManuscriptCard[]
  }) => {
    try {
      // 更新每个卡片的顺序
      const updatePromises = params.cards.map((card, index) =>
        window.electronAPI.writingDesk.updateManuscriptCard(card.id, card.content, index)
      )
      await Promise.all(updatePromises)

      if (currentManuscript.value?.id === params.manuscriptId) {
        await loadManuscript(params.manuscriptId)
      }
    } catch (error) {
      console.error('更新卡片顺序失败:', error)
      throw error
    }
  }

  return {
    // 状态
    manuscripts,
    currentManuscript,
    isCreateModalOpen,
    isPolishingManuscript,
    firstDraftHistory,
    polishHistory,
    aiConfigs,
    currentFeatureConfig,

    // 方法
    fetchAllManuscripts,
    fetchManuscript,
    createManuscript,
    updateManuscript,
    deleteManuscript,
    addCard,
    updateCard,
    moveCard,
    deleteCard,
    batchAddCards,
    generateFirstDraft,
    polishManuscript,
    getFirstDraftHistory,
    restoreFirstDraftHistory,
    getPolishHistory,
    restorePolishHistory,
    openCreateModal,
    closeCreateModal,
    loadManuscript,
    updateManuscriptCard,
    updateManuscriptCardsOrder,
    fetchAllAIConfigs,
    fetchAIConfigByFeature,
    updateAIConfig
  }
})
