import { ipcMain } from 'electron'
import {
  getTimeBlockDay,
  updateTimeBlock,
  updateTimeBlockDayStatus,
  getTimeBlockSettings,
  updateTimeBlockSettings,
  addTimeBlockItem,
  updateItemStatus,
  migrateItem
} from '../../services/timeBlockService'
import type { TimeBlockItemType, TaskStatus } from '../../renderer/src/types/timeBlock'
import log from '../logger'

export function setupTimeBlockHandlers() {
  // 获取某天的时间块数据
  ipcMain.handle('getTimeBlockDay', async (_event, date: string) => {
    try {
      const day = await getTimeBlockDay(date)
      return { success: true, day }
    } catch (error) {
      log.error('主进程→ 获取时间块数据失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新时间块内容
  ipcMain.handle(
    'updateTimeBlock',
    async (_event, dayId: string, hour: number, content: string) => {
      try {
        const blockId = await updateTimeBlock(dayId, hour, content)
        return { success: true, blockId }
      } catch (error) {
        log.error('主进程→ 更新时间块内容失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 添加时间块内容项
  ipcMain.handle(
    'addTimeBlockItem',
    async (
      _event,
      blockId: string,
      data: {
        type: TimeBlockItemType
        content: string
        status?: TaskStatus
      }
    ) => {
      try {
        const item = await addTimeBlockItem(blockId, data)
        return { success: true, item }
      } catch (error) {
        log.error('主进程→ 添加时间块内容项失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 更新内容项状态
  ipcMain.handle('updateItemStatus', async (_event, itemId: string, status: TaskStatus) => {
    try {
      await updateItemStatus(itemId, status)
      return { success: true }
    } catch (error) {
      log.error('主进程→ 更新内容项状态失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 迁移内容项
  ipcMain.handle('migrateItem', async (_event, itemId: string, targetBlockId: string) => {
    try {
      const item = await migrateItem(itemId, targetBlockId)
      return { success: true, item }
    } catch (error) {
      log.error('主进程→ 迁移内容项失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新时间块日期状态
  ipcMain.handle(
    'updateTimeBlockDayStatus',
    async (_event, id: string, data: { weather?: string; mood?: string }) => {
      try {
        await updateTimeBlockDayStatus(id, data)
        return { success: true }
      } catch (error) {
        log.error('主进程→ 更新时间块日期状态失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取时间块设置
  ipcMain.handle('getTimeBlockSettings', async () => {
    try {
      const settings = await getTimeBlockSettings()
      return { success: true, settings }
    } catch (error) {
      log.error('主进程→ 获取时间块设置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新时间块设置
  ipcMain.handle(
    'updateTimeBlockSettings',
    async (
      _event,
      settings: {
        enabled?: boolean
        startTime?: number
        endTime?: number
      }
    ) => {
      try {
        const updatedSettings = await updateTimeBlockSettings(settings)
        return { success: true, settings: updatedSettings }
      } catch (error) {
        log.error('主进程→ 更新时间块设置失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )
}
