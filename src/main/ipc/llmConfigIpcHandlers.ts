import { ipcMain } from 'electron'
import { LLMConfigService } from '../../services/rag/llmConfigService'
import type { DeepSeekConfig } from '@shared/types'
import log from 'electron-log'

const llmConfigService = new LLMConfigService()

export function setupLLMConfigHandlers() {
  // 获取所有配置
  ipcMain.handle('get-llm-configs', async () => {
    try {
      const configs = await llmConfigService.getAllConfigs()
      return { success: true, configs }
    } catch (error) {
      log.error('获取 LLM 配置列表失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取默认配置
  ipcMain.handle('get-default-llm-config', async () => {
    try {
      const config = await llmConfigService.getDefaultConfig()
      return { success: true, config }
    } catch (error) {
      log.error('获取默认 LLM 配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 添加配置
  ipcMain.handle(
    'add-llm-config',
    async (
      _event,
      {
        model,
        apiKey,
        deepseekConfig
      }: {
        model: string
        apiKey: string
        deepseekConfig?: DeepSeekConfig
      }
    ) => {
      try {
        const config = await llmConfigService.addConfig(model, apiKey, deepseekConfig)
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
    async (
      _event,
      {
        id,
        apiKey,
        deepseekConfig
      }: {
        id: string
        apiKey: string
        deepseekConfig?: DeepSeekConfig
      }
    ) => {
      try {
        const config = await llmConfigService.updateConfig(id, apiKey, deepseekConfig)
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
      await llmConfigService.deleteConfig(id)
      return { success: true }
    } catch (error) {
      log.error('删除 LLM 配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 设置默认配置
  ipcMain.handle('set-default-llm-config', async (_event, id: string) => {
    try {
      await llmConfigService.setDefault(id)
      return { success: true }
    } catch (error) {
      log.error('设置默认 LLM 配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取系统提示词配置
  ipcMain.handle('get-system-prompt', async () => {
    try {
      const config = await llmConfigService.getSystemPrompt()
      return { success: true, config }
    } catch (error) {
      log.error('获取系统提示词配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新系统提示词
  ipcMain.handle('update-system-prompt', async (_event, systemPrompt: string) => {
    try {
      const config = await llmConfigService.updateSystemPrompt(systemPrompt)
      return { success: true, config }
    } catch (error) {
      log.error('更新系统提示词失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 重置系统提示词
  ipcMain.handle('reset-system-prompt', async () => {
    try {
      const config = await llmConfigService.resetSystemPrompt()
      return { success: true, config }
    } catch (error) {
      log.error('重置系统提示词失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
