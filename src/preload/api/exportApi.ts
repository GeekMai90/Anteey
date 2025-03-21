import { ipcRenderer } from 'electron'

interface ExportResult {
  filePath: string
  fileName: string
}

export const exportApi = {
  // 导出单个笔记
  exportNote: async (noteId: string): Promise<ExportResult> => {
    try {
      const result = await ipcRenderer.invoke('export-note', noteId)
      if (!result.success) throw new Error(result.error)
      return {
        filePath: result.filePath,
        fileName: result.fileName
      }
    } catch (error) {
      console.error('预加载脚本 → 导出笔记失败:', error)
      throw error
    }
  },

  // 批量导出所有笔记
  exportAllNotes: async (): Promise<ExportResult> => {
    try {
      const result = await ipcRenderer.invoke('export-all-notes')
      if (!result.success) throw new Error(result.error)
      return {
        filePath: result.filePath,
        fileName: result.fileName
      }
    } catch (error) {
      console.error('预加载脚本 → 批量导出笔记失败:', error)
      throw error
    }
  }
}
