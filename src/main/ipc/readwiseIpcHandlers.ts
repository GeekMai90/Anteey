import { ipcMain } from 'electron'
import {
  getSyncConfig,
  updateSyncConfig,
  syncHighlights,
  startReadwiseSyncTimer,
  stopReadwiseSyncTimer,
  restartReadwiseSyncTimer,
  fullSync
} from '../../services/readwise/readwiseService'
import type { ReadwiseSyncConfig } from '@shared/types'

export function setupReadwiseSyncHandlers() {
  // 初始化自动同步计时器
  startReadwiseSyncTimer().catch((error) => {
    console.error('主进程→ 初始化 Readwise 自动同步计时器失败:', error)
  })

  // 获取同步配置
  ipcMain.handle('get-readwise-sync-config', async () => {
    try {
      const config = await getSyncConfig()
      return { success: true, config }
    } catch (error) {
      console.error('主进程→ 获取 Readwise 同步配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新同步配置
  ipcMain.handle(
    'update-readwise-sync-config',
    async (_event, updateData: Partial<ReadwiseSyncConfig>) => {
      try {
        const updatedConfig = await updateSyncConfig(updateData)

        // 如果更新了自动同步相关设置，重启计时器
        if (updateData.autoSync !== undefined || updateData.autoSyncInterval !== undefined) {
          await restartReadwiseSyncTimer()
        }

        return { success: true, config: updatedConfig }
      } catch (error) {
        console.error('主进程→ 更新 Readwise 同步配置失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 执行增量同步
  ipcMain.handle('sync-readwise-highlights', async () => {
    try {
      const stats = await syncHighlights()
      return {
        success: true,
        stats,
        message: `同步完成：新增 ${stats.added}，更新 ${stats.updated}，跳过 ${stats.skipped}`
      }
    } catch (error) {
      console.error('主进程→ 同步 Readwise 高亮失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 执行全量同步
  ipcMain.handle('full-sync-readwise-highlights', async () => {
    try {
      const stats = await fullSync()
      return {
        success: true,
        stats,
        message: `全量同步完成：新增 ${stats.added}，更新 ${stats.updated}，跳过 ${stats.skipped}`
      }
    } catch (error) {
      console.error('主进程→ 全量同步 Readwise 高亮失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新自动同步设置
  ipcMain.handle(
    'update-readwise-auto-sync',
    async (
      _event,
      { autoSync, autoSyncInterval }: { autoSync: boolean; autoSyncInterval?: number }
    ) => {
      try {
        const updateData: Partial<ReadwiseSyncConfig> = { autoSync }
        if (autoSyncInterval !== undefined) {
          updateData.autoSyncInterval = autoSyncInterval
        }

        const updatedConfig = await updateSyncConfig(updateData)

        // 根据设置启动或停止自动同步
        if (autoSync) {
          await restartReadwiseSyncTimer()
        } else {
          stopReadwiseSyncTimer()
        }

        return {
          success: true,
          config: updatedConfig,
          message: autoSync ? '已开启自动同步' : '已关闭自动同步'
        }
      } catch (error) {
        console.error('主进程→ 更新 Readwise 自动同步设置失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )
}
