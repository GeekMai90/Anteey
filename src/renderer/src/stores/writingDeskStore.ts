import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  Manuscript,
  ManuscriptCard,
  CreateManuscriptParams,
  UpdateManuscriptParams,
  PolishManuscriptParams
} from '@shared/types'

export const useWritingDeskStore = defineStore('writingDesk', () => {
  // ==================== 状态 ====================
  const manuscripts = ref<Manuscript[]>([])
  const currentManuscript = ref<(Manuscript & { cards: ManuscriptCard[] }) | null>(null)
  const isCreateModalOpen = ref(false)
  const isPolishingManuscript = ref(false)

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
      if (!result.success || !result.manuscript) {
        throw new Error(result.error || '更新文稿失败')
      }
      if (currentManuscript.value?.id === params.id) {
        await fetchManuscript(params.id)
      }
      await fetchAllManuscripts()
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
      const result = await window.electronAPI.writingDesk.deleteManuscriptCard(cardId)
      if (!result.success) {
        throw new Error(result.error || '删除卡片失败')
      }
      if (currentManuscript.value) {
        await fetchManuscript(currentManuscript.value.id)
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
  // 执行润色
  const polishManuscript = async (params: PolishManuscriptParams) => {
    try {
      isPolishingManuscript.value = true
      const result = await window.electronAPI.writingDesk.polishManuscript(params)
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

  // 获取润色历史
  const getPolishHistory = async (manuscriptId: string) => {
    try {
      const result = await window.electronAPI.writingDesk.getPolishHistory(manuscriptId)
      if (!result.success || !result.history) {
        throw new Error(result.error || '获取润色历史失败')
      }
      return result.history
    } catch (error) {
      console.error('获取润色历史失败:', error)
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
    polishManuscript,
    getPolishHistory,
    openCreateModal,
    closeCreateModal,
    loadManuscript,
    updateManuscriptCard,
    updateManuscriptCardsOrder
  }
})
