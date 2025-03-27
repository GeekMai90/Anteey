import { ipcMain } from 'electron'
import {
  createLetter,
  getLetters,
  getLetterById,
  updateLetterReadStatus,
  getLatestLetter,
  getUnreadLettersCount,
  checkTodayLetter,
  getLetterConfig,
  updateLetterConfig,
  validateLetterConfig,
  resetLetterConfig,
  deleteLetter
} from '../../services/letter/letterService'
import type { LetterType, UpdateLetterConfigParams } from '@shared/types'

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

  // ==================== 来信配置相关处理器 ====================

  // 获取来信配置
  ipcMain.handle('letter:getConfig', async () => {
    try {
      const config = await getLetterConfig()
      return { success: true, config }
    } catch (error) {
      console.error('主进程→ 获取来信配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新来信配置
  ipcMain.handle('letter:updateConfig', async (_event, params: UpdateLetterConfigParams) => {
    try {
      // 首先验证配置
      const validation = validateLetterConfig(params)
      if (!validation.isValid) {
        return {
          success: false,
          error: '配置验证失败',
          validationErrors: validation.errors
        }
      }

      // 更新配置
      const config = await updateLetterConfig(params)
      return { success: true, config }
    } catch (error) {
      console.error('主进程→ 更新来信配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 重置来信配置
  ipcMain.handle('letter:resetConfig', async (_event, defaultModelId: string) => {
    try {
      const config = await resetLetterConfig(defaultModelId)
      return { success: true, config }
    } catch (error) {
      console.error('主进程→ 重置来信配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 验证来信配置
  ipcMain.handle('letter:validateConfig', (_event, params: UpdateLetterConfigParams) => {
    try {
      const validation = validateLetterConfig(params)
      return { success: true, validation }
    } catch (error) {
      console.error('主进程→ 验证来信配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 添加删除信件的处理器
  ipcMain.handle('letter:delete', async (_event, id: string) => {
    try {
      const success = await deleteLetter(id)
      return { success }
    } catch (error) {
      console.error('主进程→ 删除信件失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
