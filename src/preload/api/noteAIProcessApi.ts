import { ipcRenderer } from 'electron'

export const noteAIProcessApi = {
  // 手动触发笔记的AI处理
  triggerProcessing: async (noteId: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('trigger-note-ai-process', noteId)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 触发笔记AI处理失败:', error)
      throw error
    }
  },

  // 批量处理笔记
  processBatch: async (limit?: number): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('process-notes-batch', limit)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 批量处理笔记失败:', error)
      throw error
    }
  },

  // 获取待处理的笔记列表
  getPendingNotes: async (limit?: number): Promise<string[]> => {
    try {
      const result = await ipcRenderer.invoke('get-pending-notes', limit)
      if (!result.success) throw new Error(result.error)
      return result.noteIds
    } catch (error) {
      console.error('预加载脚本 → 获取待处理笔记列表失败:', error)
      throw error
    }
  },

  // 获取笔记的AI处理状态
  getNoteAIStatus: async (
    noteId: string
  ): Promise<{
    aiProcessingStatus: {
      keywords: 'pending' | 'processing' | 'completed' | 'failed'
      lastKeywordUpdateAt: Date
      error?: string
    } | null
    keywords: string[]
    suggestedTags: string[]
  }> => {
    try {
      const result = await ipcRenderer.invoke('get-note-ai-status', noteId)
      if (!result.success) throw new Error(result.error)

      // 转换日期字符串为 Date 对象
      if (result.status?.lastKeywordUpdateAt) {
        result.status.lastKeywordUpdateAt = new Date(result.status.lastKeywordUpdateAt)
      }

      return {
        aiProcessingStatus: result.status,
        keywords: result.keywords || [],
        suggestedTags: result.suggestedTags || []
      }
    } catch (error) {
      console.error('预加载脚本 → 获取笔记AI处理状态失败:', error)
      throw error
    }
  },

  // 更新AI处理使用的模型配置
  updateAIProcessModel: async (modelId: string | null): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('update-ai-process-model', modelId)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 更新AI处理模型配置失败:', error)
      throw error
    }
  },

  // 获取当前AI处理使用的模型配置
  getAIProcessModel: async (): Promise<string | null> => {
    try {
      const result = await ipcRenderer.invoke('get-ai-process-model')
      if (!result.success) throw new Error(result.error)
      return result.modelId
    } catch (error) {
      console.error('预加载脚本 → 获取AI处理模型配置失败:', error)
      throw error
    }
  },

  // 获取待处理的主卡片笔记列表
  getPendingMainNotes: async (limit?: number): Promise<string[]> => {
    try {
      const result = await ipcRenderer.invoke('get-pending-main-notes', limit)
      if (!result.success) throw new Error(result.error)
      return result.noteIds
    } catch (error) {
      console.error('预加载脚本 → 获取待处理主卡片笔记列表失败:', error)
      throw error
    }
  },

  // 批量处理主卡片笔记
  processMainCardBatch: async (params?: { limit?: number; batchSize?: number }): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('process-main-notes-batch', params)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 批量处理主卡片笔记失败:', error)
      throw error
    }
  }
}
