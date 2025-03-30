import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useEventBus } from '@vueuse/core'
import { message } from '@renderer/utils/message'
// 定义处理状态类型
type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

// 定义AI处理状态接口
interface AIProcessStatus {
  keywords: ProcessingStatus
  lastKeywordUpdateAt: Date
  error?: string
}

// 定义AI处理结果接口
interface AIProcessResult {
  aiProcessingStatus: AIProcessStatus | null
  keywords: string[]
  suggestedTags: string[]
}

export const useNoteAIProcessStore = defineStore('noteAIProcess', () => {
  // ==================== 状态 ====================
  const processingNotes = ref<Set<string>>(new Set()) // 正在处理的笔记ID集合
  const currentModelId = ref<string | null>(null) // 当前使用的模型ID
  const pendingNotes = ref<string[]>([]) // 待处理的笔记列表
  const pendingMainNotes = ref<string[]>([]) // 待处理的主卡片笔记列表
  const isBatchProcessing = ref(false) // 是否正在进行批量处理
  const isMainCardBatchProcessing = ref(false) // 是否正在进行主卡片批量处理

  // ==================== 操作方法 ====================
  // 获取笔记的AI处理状态
  const getNoteAIStatus = async (noteId: string): Promise<AIProcessResult> => {
    try {
      return await window.electronAPI.noteAIProcess.getNoteAIStatus(noteId)
    } catch (error) {
      console.error('获取笔记AI处理状态失败:', error)
      throw error
    }
  }

  // 手动触发笔记的AI处理
  const triggerProcessing = async (noteId: string) => {
    try {
      processingNotes.value.add(noteId)
      await window.electronAPI.noteAIProcess.triggerProcessing(noteId)

      // 发送处理完成事件
      const aiProcessEventBus = useEventBus('aiProcessComplete')
      aiProcessEventBus.emit(noteId)
    } catch (error) {
      console.error('触发笔记AI处理失败:', error)
      throw error
    } finally {
      processingNotes.value.delete(noteId)
    }
  }

  // 批量处理笔记
  const processBatch = async (limit?: number) => {
    try {
      isBatchProcessing.value = true
      await window.electronAPI.noteAIProcess.processBatch(limit)
      // 刷新待处理列表
      await fetchPendingNotes()
      // 发送批量处理完成事件
      const batchProcessEventBus = useEventBus('batchProcessComplete')
      batchProcessEventBus.emit()
    } catch (error) {
      console.error('批量处理笔记失败:', error)
      throw error
    } finally {
      isBatchProcessing.value = false
    }
  }

  // 获取待处理的笔记列表
  const fetchPendingNotes = async (limit?: number) => {
    try {
      const notes = await window.electronAPI.noteAIProcess.getPendingNotes(limit)
      pendingNotes.value = notes
      return notes
    } catch (error) {
      console.error('获取待处理笔记列表失败:', error)
      throw error
    }
  }

  // 更新AI处理使用的模型配置
  const updateAIProcessModel = async (modelId: string | null) => {
    try {
      await window.electronAPI.noteAIProcess.updateAIProcessModel(modelId)
      currentModelId.value = modelId
    } catch (error) {
      console.error('更新AI处理模型配置失败:', error)
      throw error
    }
  }

  // 获取当前AI处理使用的模型配置
  const fetchCurrentModel = async () => {
    try {
      const modelId = await window.electronAPI.noteAIProcess.getAIProcessModel()
      currentModelId.value = modelId
      return modelId
    } catch (error) {
      console.error('获取当前AI处理模型配置失败:', error)
      throw error
    }
  }

  // 检查笔记是否正在处理
  const isProcessing = (noteId: string) => {
    return processingNotes.value.has(noteId)
  }

  // 获取待处理的主卡片笔记列表
  const fetchPendingMainNotes = async (limit?: number) => {
    try {
      const notes = await window.electronAPI.noteAIProcess.getPendingMainNotes(limit)
      pendingMainNotes.value = notes
      return notes
    } catch (error) {
      console.error('获取待处理主卡片笔记列表失败:', error)
      throw error
    }
  }

  // 批量处理主卡片笔记
  const processMainCardBatch = async (params?: { limit?: number; batchSize?: number }) => {
    try {
      isMainCardBatchProcessing.value = true
      message.loading('正在批量投喂AI...', 0)
      await window.electronAPI.noteAIProcess.processMainCardBatch(params)
      message.destroy()
      message.success('批量投喂AI完成')

      // 刷新待处理的主卡片列表
      await fetchPendingMainNotes()

      // 发送批量处理完成事件
      const mainCardBatchProcessEventBus = useEventBus('mainCardBatchProcessComplete')
      mainCardBatchProcessEventBus.emit()
    } catch (error) {
      console.error('批量处理主卡片笔记失败:', error)
      throw error
    } finally {
      isMainCardBatchProcessing.value = false
    }
  }

  return {
    // 状态
    processingNotes,
    currentModelId,
    pendingNotes,
    pendingMainNotes,
    isBatchProcessing,
    isMainCardBatchProcessing,

    // 方法
    getNoteAIStatus,
    triggerProcessing,
    processBatch,
    fetchPendingNotes,
    updateAIProcessModel,
    fetchCurrentModel,
    isProcessing,
    // 新增的方法
    fetchPendingMainNotes,
    processMainCardBatch
  }
})
