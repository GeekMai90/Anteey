import { ipcRenderer } from 'electron'
import type { ModelConfig, SystemPromptConfig } from '@shared/types'

// 模型配置 API
export const modelConfigApi = {
  // 获取所有配置
  getAllConfigs: async (): Promise<ModelConfig[]> => {
    try {
      const result = await ipcRenderer.invoke('get-model-configs')
      if (!result.success) throw new Error(result.error)
      return result.configs
    } catch (error) {
      console.error('预加载脚本 → 获取模型配置列表失败:', error)
      throw error
    }
  },

  // 获取单个配置
  getConfig: async (id: string): Promise<ModelConfig | null> => {
    try {
      const result = await ipcRenderer.invoke('get-model-config', id)
      if (!result.success) throw new Error(result.error)
      return result.config
    } catch (error) {
      console.error(`预加载脚本 → 获取模型配置(${id})失败:`, error)
      throw error
    }
  },

  // 获取默认配置
  getDefaultConfig: async (): Promise<ModelConfig | null> => {
    try {
      const result = await ipcRenderer.invoke('get-default-model-config')
      if (!result.success) throw new Error(result.error)
      return result.config
    } catch (error) {
      console.error('预加载脚本 → 获取默认模型配置失败:', error)
      throw error
    }
  },

  // 添加配置
  addConfig: async (
    config: Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ModelConfig> => {
    try {
      const result = await ipcRenderer.invoke('add-model-config', config)
      if (!result.success) throw new Error(result.error)
      return result.config
    } catch (error) {
      console.error('预加载脚本 → 添加模型配置失败:', error)
      throw error
    }
  },

  // 更新配置
  updateConfig: async (
    id: string,
    updates: Partial<Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<ModelConfig> => {
    try {
      const result = await ipcRenderer.invoke('update-model-config', { id, updates })
      if (!result.success) throw new Error(result.error)
      return result.config
    } catch (error) {
      console.error('预加载脚本 → 更新模型配置失败:', error)
      throw error
    }
  },

  // 删除配置
  deleteConfig: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-model-config', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除模型配置失败:', error)
      throw error
    }
  },

  // 设置默认配置
  setDefaultConfig: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('set-default-model-config', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 设置默认模型配置失败:', error)
      throw error
    }
  },

  // 获取提供商预设
  getProviderPresets: async (): Promise<any[]> => {
    try {
      const result = await ipcRenderer.invoke('get-provider-presets')
      if (!result.success) throw new Error(result.error)
      return result.presets
    } catch (error) {
      console.error('预加载脚本 → 获取提供商预设失败:', error)
      throw error
    }
  },

  // 测试模型连接
  testConnection: async (
    provider: string,
    baseUrl: string,
    apiKey: string,
    modelName: string
  ): Promise<{ valid: boolean; message?: string }> => {
    try {
      const result = await ipcRenderer.invoke('test-model-connection', {
        provider,
        baseUrl,
        apiKey,
        modelName
      })
      if (!result.success) throw new Error(result.error?.message || result.error)
      return result.result
    } catch (error: any) {
      console.error('预加载脚本 → 测试模型连接失败:', error)
      return {
        valid: false,
        message: error.message || '连接测试失败'
      }
    }
  }
}

// 系统提示词 API
export const systemPromptApi = {
  // 获取系统提示词配置
  getSystemPrompt: async (): Promise<SystemPromptConfig> => {
    try {
      const result = await ipcRenderer.invoke('get-system-prompt')
      if (!result.success) throw new Error(result.error)
      return result.config
    } catch (error) {
      console.error('预加载脚本 → 获取系统提示词配置失败:', error)
      throw error
    }
  },

  // 更新系统提示词
  updateSystemPrompt: async (systemPrompt: string): Promise<SystemPromptConfig> => {
    try {
      const result = await ipcRenderer.invoke('update-system-prompt', systemPrompt)
      if (!result.success) throw new Error(result.error)
      return result.config
    } catch (error) {
      console.error('预加载脚本 → 更新系统提示词失败:', error)
      throw error
    }
  },

  // 重置系统提示词
  resetSystemPrompt: async (): Promise<SystemPromptConfig> => {
    try {
      const result = await ipcRenderer.invoke('reset-system-prompt')
      if (!result.success) throw new Error(result.error)
      return result.config
    } catch (error) {
      console.error('预加载脚本 → 重置系统提示词失败:', error)
      throw error
    }
  }
}
