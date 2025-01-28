import { ipcMain } from 'electron'
import {
  getAllConfigs,
  getDefaultConfig,
  addConfig,
  updateConfig,
  deleteConfig,
  setDefaultConfig
} from '@services/rag/llmConfigService'
import log from 'electron-log'

export function setupLLMConfigHandlers() {
  // 获取所有配置
  ipcMain.handle('get-llm-configs', async () => {
    try {
      const configs = await getAllConfigs()
      return { success: true, configs }
    } catch (error) {
      log.error('获取 LLM 配置列表失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取默认配置
  ipcMain.handle('get-default-llm-config', async () => {
    try {
      const config = await getDefaultConfig()
      return { success: true, config }
    } catch (error) {
      log.error('获取默认 LLM 配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 添加配置
  ipcMain.handle(
    'add-llm-config',
    async (_event, { model, apiKey }: { model: string; apiKey: string }) => {
      try {
        const config = await addConfig(model, apiKey)
        return { success: true, config }
      } catch (error) {
        log.error('添加 LLM 配置失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 更新配置
  ipcMain.handle(
    'update-llm-config',
    async (_event, { id, apiKey }: { id: string; apiKey: string }) => {
      try {
        const config = await updateConfig(id, apiKey)
        return { success: true, config }
      } catch (error) {
        log.error('更新 LLM 配置失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 删除配置
  ipcMain.handle('delete-llm-config', async (_event, id: string) => {
    try {
      await deleteConfig(id)
      return { success: true }
    } catch (error) {
      log.error('删除 LLM 配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 设置默认配置
  ipcMain.handle('set-default-llm-config', async (_event, id: string) => {
    try {
      await setDefaultConfig(id)
      return { success: true }
    } catch (error) {
      log.error('设置默认 LLM 配置失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
