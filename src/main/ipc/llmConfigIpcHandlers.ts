import { ipcMain } from 'electron'
import { ModelConfigService } from '../../services/rag/llmConfigService'
import log from 'electron-log'

// 创建 ModelConfigService 实例
const modelConfigService = new ModelConfigService()

export function setupLLMConfigHandlers() {
  // 获取所有模型配置
  ipcMain.handle('get-model-configs', async () => {
    try {
      const configs = await modelConfigService.getAllConfigs()
      return { success: true, configs }
    } catch (error) {
      log.error('获取模型配置列表失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取一个配置的详细信息
  ipcMain.handle('get-model-config', async (_event, id: string) => {
    try {
      const config = await modelConfigService.getConfigById(id)
      return { success: true, config }
    } catch (error) {
      log.error(`获取模型配置(${id})失败:`, error)
      return { success: false, error: String(error) }
    }
  })

  // 获取默认配置
  ipcMain.handle('get-default-model-config', async () => {
    try {
      const config = await modelConfigService.getDefaultConfig()
      return { success: true, config }
    } catch (error) {
      log.error('获取默认模型配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 添加配置
  ipcMain.handle('add-model-config', async (_event, config: any) => {
    try {
      const result = await modelConfigService.createConfig(config)
      return { success: true, config: result }
    } catch (error) {
      log.error('添加模型配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新配置
  ipcMain.handle(
    'update-model-config',
    async (_event, { id, updates }: { id: string; updates: any }) => {
      try {
        const result = await modelConfigService.updateConfig(id, updates)
        return { success: true, config: result }
      } catch (error) {
        log.error('更新模型配置失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 删除配置
  ipcMain.handle('delete-model-config', async (_event, id: string) => {
    try {
      await modelConfigService.deleteConfig(id)
      return { success: true }
    } catch (error) {
      log.error('删除模型配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 设置默认配置
  ipcMain.handle('set-default-model-config', async (_event, id: string) => {
    try {
      await modelConfigService.setDefaultConfig(id)
      return { success: true }
    } catch (error) {
      log.error('设置默认模型配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取系统提示词配置
  ipcMain.handle('get-system-prompt', async () => {
    try {
      const config = await modelConfigService.getSystemPrompt()
      return { success: true, config }
    } catch (error) {
      log.error('获取系统提示词配置失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新系统提示词
  ipcMain.handle('update-system-prompt', async (_event, systemPrompt: string) => {
    try {
      const config = await modelConfigService.updateSystemPrompt(systemPrompt)
      return { success: true, config }
    } catch (error) {
      log.error('更新系统提示词失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 重置系统提示词
  ipcMain.handle('reset-system-prompt', async () => {
    try {
      const config = await modelConfigService.resetSystemPrompt()
      return { success: true, config }
    } catch (error) {
      log.error('重置系统提示词失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取所有预设提供商
  ipcMain.handle('get-provider-presets', async () => {
    try {
      const presets = await modelConfigService.getAllProviderPresets()
      return { success: true, presets }
    } catch (error) {
      log.error('获取提供商预设失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 测试模型配置连接
  ipcMain.handle(
    'test-model-connection',
    async (_event, { provider, baseUrl, apiKey, modelName }: any) => {
      try {
        const result = await modelConfigService.testConnection(provider, baseUrl, apiKey, modelName)
        return { success: true, result }
      } catch (error: any) {
        log.error('测试模型连接失败:', error)
        return {
          success: false,
          error: {
            message: error.message || '未知错误',
            code: error.code || 'UNKNOWN_ERROR',
            details: String(error)
          }
        }
      }
    }
  )
}
