import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { LLMConfig } from '../types/llm'
import { LLM_MODELS } from '../../../services/rag/llm.config'

export const useLLMConfigStore = defineStore('llmConfig', () => {
  const configs = ref<LLMConfig[]>([])
  const defaultConfig = ref<LLMConfig | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 加载所有配置
  const loadConfigs = async () => {
    try {
      isLoading.value = true
      error.value = null
      configs.value = await window.electronAPI.getAllConfigs()

      // 获取默认配置
      defaultConfig.value = configs.value.find((config) => config.isDefault) || null
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载配置失败'
      console.error('加载 LLM 配置失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  // 添加新配置
  const addConfig = async (model: string, apiKey: string) => {
    try {
      error.value = null
      const newConfig = await window.electronAPI.addConfig(model, apiKey)
      configs.value.push(newConfig)

      // 如果是第一个配置，设为默认
      if (configs.value.length === 1) {
        defaultConfig.value = newConfig
      }

      return newConfig
    } catch (err) {
      error.value = err instanceof Error ? err.message : '添加配置失败'
      console.error('添加 LLM 配置失败:', err)
      throw err
    }
  }

  // 更新配置
  const updateConfig = async (id: string, apiKey: string) => {
    try {
      error.value = null
      const updatedConfig = await window.electronAPI.updateConfig(id, apiKey)
      const index = configs.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        configs.value[index] = updatedConfig
        if (defaultConfig.value?.id === id) {
          defaultConfig.value = updatedConfig
        }
      }
      return updatedConfig
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
      await window.electronAPI.deleteConfig(id)
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
      await window.electronAPI.setDefaultConfig(id)
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
    isLoading,
    error,
    availableModels,
    loadConfigs,
    addConfig,
    updateConfig,
    deleteConfig,
    setDefaultConfig
  }
})
