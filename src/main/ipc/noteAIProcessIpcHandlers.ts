import { ipcMain } from 'electron'
import { noteAIProcessService } from '../../services/notes/noteAIProcessService'
import log from 'electron-log'

export function setupNoteAIProcessHandlers() {
  // 手动触发单个笔记的AI处理
  ipcMain.handle('trigger-note-ai-process', async (_event, noteId: string) => {
    try {
      await noteAIProcessService.triggerProcessing(noteId)
      return {
        success: true,
        message: '笔记AI处理已触发'
      }
    } catch (error) {
      log.error('主进程→ 触发笔记AI处理失败:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  })

  // 批量处理笔记
  ipcMain.handle('process-notes-batch', async (_event, limit?: number) => {
    try {
      await noteAIProcessService.processBatch(limit)
      return {
        success: true,
        message: '批量处理已完成'
      }
    } catch (error) {
      log.error('主进程→ 批量处理笔记失败:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  })

  // 获取待处理的笔记列表
  ipcMain.handle('get-pending-notes', async (_event, limit?: number) => {
    try {
      const noteIds = await noteAIProcessService.getPendingNotes(limit)
      return {
        success: true,
        noteIds,
        count: noteIds.length
      }
    } catch (error) {
      log.error('主进程→ 获取待处理笔记列表失败:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  })

  // 获取笔记的AI处理状态
  ipcMain.handle('get-note-ai-status', async (_event, noteId: string) => {
    try {
      const note = await noteAIProcessService.getNoteAIStatus(noteId)
      return {
        success: true,
        status: note.aiProcessingStatus,
        keywords: note.keywords,
        suggestedTags: note.suggestedTags
      }
    } catch (error) {
      log.error('主进程→ 获取笔记AI处理状态失败:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  })

  // 更新AI处理使用的模型配置
  ipcMain.handle('update-ai-process-model', async (_event, modelId: string | null) => {
    try {
      await noteAIProcessService.updateAIProcessModel(modelId)
      return { success: true }
    } catch (error) {
      log.error('主进程→ 更新AI处理模型配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取当前AI处理使用的模型配置
  ipcMain.handle('get-ai-process-model', async () => {
    try {
      const modelId = await noteAIProcessService.getAIProcessModel()
      return { success: true, modelId }
    } catch (error) {
      log.error('主进程→ 获取AI处理模型配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取待处理的主卡片笔记列表
  ipcMain.handle('get-pending-main-notes', async (_event, limit?: number) => {
    try {
      const noteIds = await noteAIProcessService.getPendingMainNotes(limit)
      return {
        success: true,
        noteIds,
        count: noteIds.length
      }
    } catch (error) {
      log.error('主进程→ 获取待处理主卡片笔记列表失败:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  })

  // 批量处理主卡片笔记
  ipcMain.handle(
    'process-main-notes-batch',
    async (_event, { limit, batchSize }: { limit?: number; batchSize?: number }) => {
      try {
        await noteAIProcessService.processMainCardBatch(limit, batchSize)
        return {
          success: true,
          message: '主卡片笔记批量处理已完成'
        }
      } catch (error) {
        log.error('主进程→ 批量处理主卡片笔记失败:', error)
        return {
          success: false,
          error: String(error)
        }
      }
    }
  )
}
