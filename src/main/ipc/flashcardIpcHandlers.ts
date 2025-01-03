import { ipcMain } from 'electron'
import { flashcardService } from '../../services/notes/flashcardService'
import type { ReviewFeedback } from '@shared/types'

export function setupFlashcardHandlers() {
  // 将笔记转换为闪卡
  ipcMain.handle('convert-to-flashcard', async (_event, noteId: string) => {
    try {
      await flashcardService.convertToFlashcard(noteId)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 转换闪卡失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 取消闪卡标记
  ipcMain.handle('remove-flashcard', async (_event, noteId: string) => {
    try {
      await flashcardService.removeFlashcard(noteId)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 取消闪卡标记失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新闪卡复习状态
  ipcMain.handle(
    'update-flashcard-status',
    async (_event, { noteId, feedback }: { noteId: string; feedback: ReviewFeedback }) => {
      try {
        await flashcardService.updateFlashcardStatus({ noteId, feedback })
        return { success: true }
      } catch (error) {
        console.error('主进程→ 更新闪卡状态失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取待复习的闪卡
  ipcMain.handle('get-due-flashcards', async (_event, tags?: string[]) => {
    try {
      const flashcards = await flashcardService.getDueFlashcards(tags)
      return { success: true, flashcards }
    } catch (error) {
      console.error('主进程→ 获取待复习闪卡失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取闪卡统计信息
  ipcMain.handle('get-flashcard-stats', async () => {
    try {
      const stats = await flashcardService.getFlashcardStats()
      return { success: true, stats }
    } catch (error) {
      console.error('主进程→ 获取闪卡统计信息失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取闪卡卡组数据
  ipcMain.handle('get-flashcard-decks', async () => {
    try {
      const decks = await flashcardService.getFlashcardDecks()
      return { success: true, decks }
    } catch (error) {
      console.error('主进程→ 获取闪卡卡组数据失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
