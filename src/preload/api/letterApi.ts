import { ipcRenderer } from 'electron'
import type {
  Letter,
  LetterType,
  GetLetterConfigResult,
  UpdateLetterConfigParams,
  ConfigValidationResult
} from '@shared/types'

export const letterApi = {
  // 创建信件
  createLetter: async (type: LetterType): Promise<Letter> => {
    try {
      const result = await ipcRenderer.invoke('create-letter', type)
      if (!result.success) throw new Error(result.error)
      return result.letter
    } catch (error) {
      console.error('预加载脚本 → 创建信件失败:', error)
      throw error
    }
  },

  // 获取信件列表
  getLetters: async (
    page: number = 1,
    limit: number = 10
  ): Promise<{ letters: Letter[]; total: number }> => {
    try {
      const result = await ipcRenderer.invoke('get-letters', { page, limit })
      if (!result.success) throw new Error(result.error)
      return {
        letters: result.letters,
        total: result.total
      }
    } catch (error) {
      console.error('预加载脚本 → 获取信件列表失败:', error)
      throw error
    }
  },

  // 获取单个信件
  getLetterById: async (id: string): Promise<Letter | null> => {
    try {
      const result = await ipcRenderer.invoke('get-letter-by-id', id)
      if (!result.success) throw new Error(result.error)
      return result.letter
    } catch (error) {
      console.error('预加载脚本 → 获取信件失败:', error)
      throw error
    }
  },

  // 更新信件阅读状态
  updateLetterReadStatus: async (id: string, readStatus: boolean): Promise<Letter> => {
    try {
      const result = await ipcRenderer.invoke('update-letter-read-status', { id, readStatus })
      if (!result.success) throw new Error(result.error)
      return result.letter
    } catch (error) {
      console.error('预加载脚本 → 更新信件阅读状态失败:', error)
      throw error
    }
  },

  // 获取最新信件
  getLatestLetter: async (): Promise<Letter | null> => {
    try {
      const result = await ipcRenderer.invoke('get-latest-letter')
      if (!result.success) throw new Error(result.error)
      return result.letter
    } catch (error) {
      console.error('预加载脚本 → 获取最新信件失败:', error)
      throw error
    }
  },

  // 获取未读信件数量
  getUnreadLettersCount: async (): Promise<number> => {
    try {
      const result = await ipcRenderer.invoke('get-unread-letters-count')
      if (!result.success) throw new Error(result.error)
      return result.count
    } catch (error) {
      console.error('预加载脚本 → 获取未读信件数量失败:', error)
      throw error
    }
  },

  // 检查今天是否已经收到过信件
  checkTodayLetter: () => ipcRenderer.invoke('letter:checkTodayLetter'),

  // ==================== 来信配置相关方法 ====================

  // 获取来信配置
  getLetterConfig: async (): Promise<GetLetterConfigResult> => {
    try {
      const result = await ipcRenderer.invoke('letter:getConfig')
      if (!result.success) throw new Error(result.error)
      return result.config
    } catch (error) {
      console.error('预加载脚本 → 获取来信配置失败:', error)
      throw error
    }
  },

  // 更新来信配置
  updateLetterConfig: async (params: UpdateLetterConfigParams): Promise<GetLetterConfigResult> => {
    try {
      const result = await ipcRenderer.invoke('letter:updateConfig', params)
      if (!result.success) {
        // 如果是验证错误，抛出特殊的错误对象
        if (result.validationErrors) {
          throw {
            message: '配置验证失败',
            validationErrors: result.validationErrors
          }
        }
        throw new Error(result.error)
      }
      return result.config
    } catch (error) {
      console.error('预加载脚本 → 更新来信配置失败:', error)
      throw error
    }
  },

  // 重置来信配置
  resetLetterConfig: async (defaultModelId: string): Promise<GetLetterConfigResult> => {
    try {
      const result = await ipcRenderer.invoke('letter:resetConfig', defaultModelId)
      if (!result.success) throw new Error(result.error)
      return result.config
    } catch (error) {
      console.error('预加载脚本 → 重置来信配置失败:', error)
      throw error
    }
  },

  // 验证来信配置
  validateLetterConfig: async (
    params: UpdateLetterConfigParams
  ): Promise<ConfigValidationResult> => {
    try {
      const result = await ipcRenderer.invoke('letter:validateConfig', params)
      if (!result.success) throw new Error(result.error)
      return result.validation
    } catch (error) {
      console.error('预加载脚本 → 验证来信配置失败:', error)
      throw error
    }
  },

  // 添加删除信件的方法
  deleteLetter: async (id: string): Promise<boolean> => {
    try {
      const result = await ipcRenderer.invoke('letter:delete', id)
      if (!result.success) throw new Error(result.error)
      return result.success
    } catch (error) {
      console.error('预加载脚本 → 删除信件失败:', error)
      throw error
    }
  }
}
