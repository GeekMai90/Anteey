import { ipcMain } from 'electron'
import { exportNote, exportAllNotes } from '../../services/export/exportService'

export function setupExportHandlers() {
  // 导出单个笔记
  ipcMain.handle('export-note', async (_event, noteId: string) => {
    try {
      const result = await exportNote(noteId)
      return {
        success: true,
        filePath: result.filePath,
        fileName: result.fileName
      }
    } catch (error) {
      console.error('主进程→ 导出笔记失败:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  })

  // 批量导出所有笔记
  ipcMain.handle('export-all-notes', async () => {
    try {
      const result = await exportAllNotes()
      return {
        success: true,
        filePath: result.filePath,
        fileName: result.fileName
      }
    } catch (error) {
      console.error('主进程→ 批量导出笔记失败:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  })
}
