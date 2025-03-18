import { ipcMain } from 'electron'
import {
  getSyncConfig,
  updateSyncConfig,
  syncNotes,
  graduateNote,
  startDinoxSyncTimer,
  stopDinoxSyncTimer,
  restartDinoxSyncTimer,
  fullSync
} from '../../services/dinox/dinoxSyncService'
import type { DinoxSyncConfig } from '@shared/types'

export function setupDinoxSyncHandlers() {
  // 初始化自动同步计时器
  startDinoxSyncTimer().catch((error) => {
    console.error('主进程→ 初始化 Dinox 自动同步计时器失败:', error)
  })

  // 获取同步配置
  ipcMain.handle('get-dinox-sync-config', async () => {
    try {
      const config = await getSyncConfig()
      return { success: true, config }
    } catch (error) {
      console.error('主进程→ 获取 Dinox 同步配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新同步配置
  ipcMain.handle(
    'update-dinox-sync-config',
    async (_event, updateData: Partial<DinoxSyncConfig>) => {
      try {
        const updatedConfig = await updateSyncConfig(updateData)

        // 如果更新了自动同步相关设置，重启计时器
        if (updateData.autoSync !== undefined || updateData.autoSyncInterval !== undefined) {
          await restartDinoxSyncTimer()
        }

        return { success: true, config: updatedConfig }
      } catch (error) {
        console.error('主进程→ 更新 Dinox 同步配置失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 执行同步
  ipcMain.handle('sync-dinox-notes', async () => {
    try {
      const stats = await syncNotes()
      return {
        success: true,
        stats,
        message: `同步完成：新增 ${stats.added}，更新 ${stats.updated}，删除 ${stats.deleted}，跳过 ${stats.skipped}`
      }
    } catch (error) {
      console.error('主进程→ 同步 Dinox 笔记失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 执行全量同步
  ipcMain.handle('full-sync-dinox-notes', async () => {
    try {
      const stats = await fullSync()
      return {
        success: true,
        stats,
        message: `全量同步完成：新增 ${stats.added}，更新 ${stats.updated}，删除 ${stats.deleted}，跳过 ${stats.skipped}`
      }
    } catch (error) {
      console.error('主进程→ 全量同步 Dinox 笔记失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 标记笔记为已毕业（转换为其他类型后不再更新）
  ipcMain.handle('graduate-dinox-note', async (_event, dinoxNoteId: string) => {
    try {
      await graduateNote(dinoxNoteId)
      return { success: true, message: '笔记已标记为已毕业状态' }
    } catch (error) {
      console.error('主进程→ 标记 Dinox 笔记毕业状态失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 重置同步时间（用于全量同步）
  ipcMain.handle('reset-dinox-sync-time', async () => {
    try {
      await updateSyncConfig({ lastSyncTime: '1900-01-01 00:00:00' })
      return { success: true, message: '同步时间已重置，下次将执行全量同步' }
    } catch (error) {
      console.error('主进程→ 重置 Dinox 同步时间失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新自动同步设置
  ipcMain.handle(
    'update-dinox-auto-sync',
    async (
      _event,
      { autoSync, autoSyncInterval }: { autoSync: boolean; autoSyncInterval?: number }
    ) => {
      try {
        const updateData: Partial<DinoxSyncConfig> = { autoSync }
        if (autoSyncInterval !== undefined) {
          updateData.autoSyncInterval = autoSyncInterval
        }

        const updatedConfig = await updateSyncConfig(updateData)

        // 根据设置启动或停止自动同步
        if (autoSync) {
          await restartDinoxSyncTimer()
        } else {
          stopDinoxSyncTimer()
        }

        return {
          success: true,
          config: updatedConfig,
          message: autoSync ? '已开启自动同步' : '已关闭自动同步'
        }
      } catch (error) {
        console.error('主进程→ 更新 Dinox 自动同步设置失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )
}
