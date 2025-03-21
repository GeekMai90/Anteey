import { ipcMain } from 'electron'
import {
  createLetter,
  getLetters,
  getLetterById,
  updateLetterReadStatus,
  getLatestLetter,
  getUnreadLettersCount,
  checkTodayLetter
} from '../../services/letter/letterService'
import type { LetterType } from '@shared/types'

export function setupLetterHandlers() {
  // 创建信件
  ipcMain.handle('create-letter', async (_event, type: LetterType) => {
    try {
      const letter = await createLetter(type)
      return { success: true, letter }
    } catch (error) {
      console.error('主进程→ 创建信件失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取信件列表
  ipcMain.handle(
    'get-letters',
    async (_event, { page, limit }: { page: number; limit: number }) => {
      try {
        const result = await getLetters(page, limit)
        return { success: true, ...result }
      } catch (error) {
        console.error('主进程→ 获取信件列表失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取单个信件
  ipcMain.handle('get-letter-by-id', async (_event, id: string) => {
    try {
      const letter = await getLetterById(id)
      return { success: true, letter }
    } catch (error) {
      console.error('主进程→ 获取信件失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新信件阅读状态
  ipcMain.handle(
    'update-letter-read-status',
    async (_event, { id, readStatus }: { id: string; readStatus: boolean }) => {
      try {
        const letter = await updateLetterReadStatus(id, readStatus)
        return { success: true, letter }
      } catch (error) {
        console.error('主进程→ 更新信件阅读状态失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取最新信件
  ipcMain.handle('get-latest-letter', async () => {
    try {
      const letter = await getLatestLetter()
      return { success: true, letter }
    } catch (error) {
      console.error('主进程→ 获取最新信件失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取未读信件数量
  ipcMain.handle('get-unread-letters-count', async () => {
    try {
      const count = await getUnreadLettersCount()
      return { success: true, count }
    } catch (error) {
      console.error('主进程→ 获取未读信件数量失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 检查今天是否已经收到过信件
  ipcMain.handle('letter:checkTodayLetter', async () => {
    return await checkTodayLetter()
  })
}
