import { ipcMain } from 'electron'
import { getCurrentConfig, updateConfig } from '../../services/cloud/cloudSyncService'
import type { CloudSyncConfig, UpdateCloudSyncOptions } from '@shared/types'

export function setupCloudSyncHandlers() {
  // 获取当前云同步配置
  ipcMain.handle('get-cloud-sync-config', async () => {
    try {
      const config = await getCurrentConfig()
      return { success: true, config }
    } catch (error) {
      console.error('主进程→ 获取云同步配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新云同步配置
  ipcMain.handle(
    'update-cloud-sync-config',
    async (
      _event,
      { config, options }: { config: Partial<CloudSyncConfig>; options?: UpdateCloudSyncOptions }
    ) => {
      try {
        const updatedConfig = await updateConfig(config, options)
        return { success: true, config: updatedConfig }
      } catch (error) {
        console.error('主进程→ 更新云同步配置失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )
}
