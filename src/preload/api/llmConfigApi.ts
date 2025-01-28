import { ipcRenderer } from 'electron'
import type { LLMConfig, DeepSeekConfig, SystemPromptConfig } from '@shared/types'

export const llmConfigApi = {
  // 获取所有配置
  getAllConfigs: async (): Promise<LLMConfig[]> => {
    try {
      const result = await ipcRenderer.invoke('get-llm-configs')
      if (!result.success) throw new Error(result.error)
      return result.configs
    } catch (error) {
      console.error('预加载脚本 → 获取 LLM 配置列表失败:', error)
      throw error
    }
  },

  // 获取默认配置
  getDefaultConfig: async (): Promise<LLMConfig | null> => {
    try {
      const result = await ipcRenderer.invoke('get-default-llm-config')
      if (!result.success) throw new Error(result.error)
      return result.config
    } catch (error) {
      console.error('预加载脚本 → 获取默认 LLM 配置失败:', error)
      throw error
    }
  },

  // 添加配置
  addConfig: async (
    model: string,
    apiKey: string,
    deepseekConfig?: DeepSeekConfig
  ): Promise<LLMConfig> => {
    try {
      const result = await ipcRenderer.invoke('add-llm-config', {
        model,
        apiKey,
        deepseekConfig
      })
      if (!result.success) throw new Error(result.error)
      return result.config
    } catch (error) {
      console.error('预加载脚本 → 添加 LLM 配置失败:', error)
      throw error
    }
  },

  // 更新配置
  updateConfig: async (
    id: string,
    apiKey: string,
    deepseekConfig?: DeepSeekConfig
  ): Promise<LLMConfig> => {
    try {
      const result = await ipcRenderer.invoke('update-llm-config', {
        id,
        apiKey,
        deepseekConfig
      })
      if (!result.success) throw new Error(result.error)
      return result.config
    } catch (error) {
      console.error('预加载脚本 → 更新 LLM 配置失败:', error)
      throw error
    }
  },

  // 删除配置
  deleteConfig: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-llm-config', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除 LLM 配置失败:', error)
      throw error
    }
  },

  // 设置默认配置
  setDefaultConfig: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('set-default-llm-config', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 设置默认 LLM 配置失败:', error)
      throw error
    }
  },

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
