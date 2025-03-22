import { ipcRenderer } from 'electron'
import type {
  Manuscript,
  ManuscriptCard,
  CreateManuscriptParams,
  UpdateManuscriptParams,
  PolishManuscriptParams,
  AIFeatureType
} from '@shared/types'

export const writingDeskApi = {
  // 文稿相关
  createManuscript: async (params: CreateManuscriptParams): Promise<Manuscript> => {
    try {
      const result = await ipcRenderer.invoke('create-manuscript', params)
      if (!result.success) throw new Error(result.error)
      return result
    } catch (error) {
      console.error('预加载脚本 → 创建文稿失败:', error)
      throw error
    }
  },

  getAllManuscripts: async (): Promise<Manuscript[]> => {
    try {
      const result = await ipcRenderer.invoke('get-all-manuscripts')
      if (!result.success) throw new Error(result.error)
      return result.manuscripts
    } catch (error) {
      console.error('预加载脚本 → 获取所有文稿失败:', error)
      throw error
    }
  },

  getManuscript: async (
    id: string
  ): Promise<{
    success: boolean
    manuscript?: Manuscript & { cards: ManuscriptCard[] }
    error?: string
  }> => {
    try {
      console.log('预加载脚本 → 准备获取文稿，ID:', id)
      const result = await ipcRenderer.invoke('get-manuscript', id)
      return result // 直接返回主进程的结果，保持包装对象形式
    } catch (error) {
      console.error('预加载脚本 → 获取文稿失败:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  },

  updateManuscript: async (params: UpdateManuscriptParams): Promise<Manuscript> => {
    try {
      const result = await ipcRenderer.invoke('update-manuscript', params)
      if (!result.success) throw new Error(result.error)
      return result
    } catch (error) {
      console.error('预加载脚本 → 更新文稿失败:', error)
      throw error
    }
  },

  deleteManuscript: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-manuscript', id)
      if (!result.success) throw new Error(result.error)
      return result
    } catch (error) {
      console.error('预加载脚本 → 删除文稿失败:', error)
      throw error
    }
  },

  // 卡片相关
  addManuscriptCard: async (
    manuscriptId: string,
    content: any,
    order: number,
    noteId?: string
  ): Promise<{
    success: boolean
    card?: ManuscriptCard
    error?: string
  }> => {
    try {
      console.log('预加载脚本 → 准备添加卡片')
      const result = await ipcRenderer.invoke(
        'add-manuscript-card',
        manuscriptId,
        content,
        order,
        noteId
      )
      return result // 直接返回主进程的包装对象
    } catch (error) {
      console.error('预加载脚本 → 添加卡片失败:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  },

  updateManuscriptCard: async (
    cardId: string,
    content?: any,
    order?: number
  ): Promise<{
    success: boolean
    card?: ManuscriptCard
    error?: string
  }> => {
    try {
      const result = await ipcRenderer.invoke('update-manuscript-card', cardId, content, order)
      return result // 直接返回主进程的包装对象
    } catch (error) {
      console.error('预加载脚本 → 更新卡片失败:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  },

  moveManuscriptCard: async (
    cardId: string,
    order: number
  ): Promise<{
    success: boolean
    card?: ManuscriptCard
    error?: string
  }> => {
    try {
      const result = await ipcRenderer.invoke('move-manuscript-card', cardId, order)
      return result // 直接返回主进程的包装对象
    } catch (error) {
      console.error('预加载脚本 → 移动卡片失败:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  },

  deleteManuscriptCard: async (
    cardId: string
  ): Promise<{
    success: boolean
    error?: string
  }> => {
    try {
      const result = await ipcRenderer.invoke('delete-manuscript-card', cardId)
      return result // 直接返回主进程的包装对象
    } catch (error) {
      console.error('预加载脚本 → 删除卡片失败:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  },

  batchAddManuscriptCards: async (
    manuscriptId: string,
    cards: { noteId: string; content: any }[]
  ): Promise<{
    success: boolean
    cards?: ManuscriptCard[]
    error?: string
  }> => {
    try {
      const result = await ipcRenderer.invoke('batch-add-manuscript-cards', manuscriptId, cards)
      return result // 直接返回主进程的包装对象
    } catch (error) {
      console.error('预加载脚本 → 批量添加卡片失败:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  },

  getManuscriptCards: async (manuscriptId: string): Promise<ManuscriptCard[]> => {
    try {
      const result = await ipcRenderer.invoke('get-manuscript-cards', manuscriptId)
      if (!result.success) throw new Error(result.error)
      return result.cards
    } catch (error) {
      console.error('预加载脚本 → 获取文稿卡片失败:', error)
      throw error
    }
  },

  getManuscriptCard: async (cardId: string): Promise<ManuscriptCard> => {
    try {
      const result = await ipcRenderer.invoke('get-manuscript-card', cardId)
      if (!result.success) throw new Error(result.error)
      return result.card
    } catch (error) {
      console.error('预加载脚本 → 获取卡片失败:', error)
      throw error
    }
  },

  // 生成初稿
  generateFirstDraft: async (params: PolishManuscriptParams): Promise<Manuscript> => {
    try {
      const result = await ipcRenderer.invoke('generate-first-draft', params)
      return result
    } catch (error) {
      console.error('预加载脚本 → 生成初稿失败:', error)
      throw error
    }
  },

  // AI 润色相关
  polishManuscript: async (params: PolishManuscriptParams) => {
    try {
      const result = await ipcRenderer.invoke('polish-manuscript', params)
      return result // 直接返回完整的 result 对象，包含 success, manuscript 和 error
    } catch (error) {
      console.error('预加载脚本 → 文稿润色失败:', error)
      throw error
    }
  },

  // 获取初稿历史
  getFirstDraftHistory: async (
    manuscriptId: string
  ): Promise<{
    success: boolean
    history?: any[]
    error?: string
  }> => {
    try {
      console.log('预加载脚本 → 准备获取初稿历史')
      const result = await ipcRenderer.invoke('get-first-draft-history', manuscriptId)
      return result
    } catch (error) {
      console.error('预加载脚本 → 获取初稿历史失败:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  },

  // 恢复初稿历史版本
  restoreFirstDraftHistory: async (
    manuscriptId: string,
    historyId: string
  ): Promise<{
    success: boolean
    manuscript?: Manuscript
    error?: string
  }> => {
    try {
      console.log('预加载脚本 → 准备恢复初稿历史版本')
      const result = await ipcRenderer.invoke(
        'restore-first-draft-history',
        manuscriptId,
        historyId
      )
      return result
    } catch (error) {
      console.error('预加载脚本 → 恢复初稿历史版本失败:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  },

  // 获取终稿历史
  getPolishHistory: async (
    manuscriptId: string
  ): Promise<{
    success: boolean
    history?: any[]
    error?: string
  }> => {
    try {
      console.log('预加载脚本 → 准备获取终稿历史')
      const result = await ipcRenderer.invoke('get-polish-history', manuscriptId)
      return result
    } catch (error) {
      console.error('预加载脚本 → 获取终稿历史失败:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  },

  // 恢复终稿历史版本
  restorePolishHistory: async (
    manuscriptId: string,
    historyId: string
  ): Promise<{
    success: boolean
    manuscript?: Manuscript
    error?: string
  }> => {
    try {
      console.log('预加载脚本 → 准备恢复终稿历史版本')
      const result = await ipcRenderer.invoke('restore-polish-history', manuscriptId, historyId)
      return result
    } catch (error) {
      console.error('预加载脚本 → 恢复终稿历史版本失败:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  },

  // 获取所有 AI 功能配置
  getAllAIConfigs: async (): Promise<{
    success: boolean
    configs?: Array<{
      id: string
      featureType: AIFeatureType
      modelConfigId: string
      createdAt: Date
      updatedAt: Date
    }>
    error?: string
  }> => {
    try {
      console.log('预加载脚本 → 准备获取所有 AI 功能配置')
      const result = await ipcRenderer.invoke('get-all-ai-configs')
      return result
    } catch (error) {
      console.error('预加载脚本 → 获取所有 AI 功能配置失败:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  },

  // 获取指定功能的配置
  getAIConfigByFeature: async (
    featureType: AIFeatureType
  ): Promise<{
    success: boolean
    config?: {
      id: string
      featureType: AIFeatureType
      modelConfigId: string
      createdAt: Date
      updatedAt: Date
    }
    error?: string
  }> => {
    try {
      console.log('预加载脚本 → 准备获取 AI 功能配置:', featureType)
      const result = await ipcRenderer.invoke('get-ai-config-by-feature', featureType)
      return result
    } catch (error) {
      console.error('预加载脚本 → 获取 AI 功能配置失败:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  },

  // 更新 AI 功能配置
  updateAIConfig: async (
    featureType: AIFeatureType,
    modelConfigId: string
  ): Promise<{
    success: boolean
    config?: {
      id: string
      featureType: AIFeatureType
      modelConfigId: string
      createdAt: Date
      updatedAt: Date
    }
    error?: string
  }> => {
    try {
      console.log('预加载脚本 → 准备更新 AI 功能配置:', { featureType, modelConfigId })
      const result = await ipcRenderer.invoke('update-ai-config', featureType, modelConfigId)
      return result
    } catch (error) {
      console.error('预加载脚本 → 更新 AI 功能配置失败:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  }
}
