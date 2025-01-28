import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { LLMConfig, DeepSeekConfig, SystemPromptConfig } from '@shared/types'
import { LLM_MODELS } from '@services/rag/llm.config'

export const useLLMConfigStore = defineStore('llmConfig', () => {
  const configs = ref<LLMConfig[]>([])
  const defaultConfig = ref<LLMConfig | null>(null)
  const systemPrompt = ref<SystemPromptConfig | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 加载所有配置
  const loadConfigs = async () => {
    try {
      isLoading.value = true
      error.value = null
      configs.value = await window.electronAPI.llmConfig.getAllConfigs()
      defaultConfig.value = configs.value.find((config) => config.isDefault) || null
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载配置失败'
      console.error('加载 LLM 配置失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  // 加载系统提示词配置
  const loadSystemPrompt = async () => {
    try {
      isLoading.value = true
      error.value = null
      systemPrompt.value = await window.electronAPI.llmConfig.getSystemPrompt()
      // console.log('store中加载的系统提示词:', systemPrompt.value)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载系统提示词失败'
      console.error('加载系统提示词失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  // 更新系统提示词
  const updateSystemPrompt = async (prompt: string) => {
    try {
      error.value = null
      systemPrompt.value = await window.electronAPI.llmConfig.updateSystemPrompt(prompt)
      return systemPrompt.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新系统提示词失败'
      console.error('更新系统提示词失败:', err)
      throw err
    }
  }

  // 重置系统提示词
  const resetSystemPrompt = async () => {
    try {
      error.value = null
      systemPrompt.value = await window.electronAPI.llmConfig.resetSystemPrompt()
      return systemPrompt.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : '重置系统提示词失败'
      console.error('重置系统提示词失败:', err)
      throw err
    }
  }

  // 添加新配置
  const addConfig = async (model: string, apiKey: string, deepseekConfig?: DeepSeekConfig) => {
    try {
      error.value = null
      // 确保 deepseekConfig 是一个普通对象
      const configToSend = {
        model,
        apiKey,
        deepseekConfig: deepseekConfig
          ? {
              temperature: Number(deepseekConfig.temperature),
              maxTokens: Number(deepseekConfig.maxTokens)
            }
          : undefined
      }

      const config = await window.electronAPI.llmConfig.addConfig(
        configToSend.model,
        configToSend.apiKey,
        configToSend.deepseekConfig
      )
      configs.value.push(config)

      // 如果是第一个配置，设为默认
      if (configs.value.length === 1) {
        defaultConfig.value = config
      }

      return config
    } catch (err) {
      error.value = err instanceof Error ? err.message : '添加配置失败'
      console.error('添加 LLM 配置失败:', err)
      throw err
    }
  }

  // 更新配置
  const updateConfig = async (id: string, apiKey: string, deepseekConfig?: DeepSeekConfig) => {
    try {
      error.value = null
      // 确保 deepseekConfig 是一个普通对象
      const configToSend = {
        id,
        apiKey,
        deepseekConfig: deepseekConfig
          ? {
              temperature: Number(deepseekConfig.temperature),
              maxTokens: Number(deepseekConfig.maxTokens)
            }
          : undefined
      }

      const config = await window.electronAPI.llmConfig.updateConfig(
        configToSend.id,
        configToSend.apiKey,
        configToSend.deepseekConfig
      )
      const index = configs.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        configs.value[index] = config
        if (defaultConfig.value?.id === id) {
          defaultConfig.value = config
        }
      }
      return config
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新配置失败'
      console.error('更新 LLM 配置失败:', err)
      throw err
    }
  }

  // 删除配置
  const deleteConfig = async (id: string) => {
    try {
      error.value = null
      await window.electronAPI.llmConfig.deleteConfig(id)
      configs.value = configs.value.filter((c) => c.id !== id)
      if (defaultConfig.value?.id === id) {
        defaultConfig.value = configs.value[0] || null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除配置失败'
      console.error('删除 LLM 配置失败:', err)
      throw err
    }
  }

  // 设置默认配置
  const setDefaultConfig = async (id: string) => {
    try {
      error.value = null
      await window.electronAPI.llmConfig.setDefaultConfig(id)
      configs.value = configs.value.map((c) => ({
        ...c,
        isDefault: c.id === id
      }))
      defaultConfig.value = configs.value.find((c) => c.id === id) || null
    } catch (err) {
      error.value = err instanceof Error ? err.message : '设置默认配置失败'
      console.error('设置默认 LLM 配置失败:', err)
      throw err
    }
  }

  // 获取可用的模型列表
  const availableModels = Object.entries(LLM_MODELS).map(([id, model]) => ({
    id,
    name: model.name
  }))

  return {
    configs,
    defaultConfig,
    systemPrompt,
    isLoading,
    error,
    availableModels,
    loadConfigs,
    loadSystemPrompt,
    updateSystemPrompt,
    resetSystemPrompt,
    addConfig,
    updateConfig,
    deleteConfig,
    setDefaultConfig
  }
})
