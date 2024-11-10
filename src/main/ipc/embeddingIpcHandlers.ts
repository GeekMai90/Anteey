import { ipcMain } from 'electron'
import { getSimilarNotesForNote, searchSimilarNotes } from '../../db/embeddingService'
export function setupEmbeddingHandlers() {
  // 向量相似度搜索
  ipcMain.handle('search-similar-notes', async (_, query: string, limit: number = 10) => {
    try {
      const results = await searchSimilarNotes(query, limit)
      return { success: true, results }
    } catch (error) {
      console.error('搜索相似笔记失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 获取特定笔记的相似笔记
  ipcMain.handle('get-similar-notes-for-note', async (_, noteId: string, limit: number = 5) => {
    try {
      const results = await getSimilarNotesForNote(noteId, limit)
      return { success: true, results }
    } catch (error) {
      console.error('获取特定笔记的相似笔记失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })
}
