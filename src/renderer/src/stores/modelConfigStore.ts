import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ModelConfig, ProviderPreset, SystemPromptConfig, LLMProvider } from '@shared/types'

export const useModelConfigStore = defineStore('modelConfig', () => {
  const configs = ref<ModelConfig[]>([])
  const defaultConfig = ref<ModelConfig | null>(null)
  const providerPresets = ref<ProviderPreset[]>([])
  const systemPrompt = ref<SystemPromptConfig | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 加载所有配置
  const loadConfigs = async () => {
    try {
      isLoading.value = true
      error.value = null
      configs.value = await window.modelConfigApi.getAllConfigs()
      const defaultCfg = configs.value.find((config) => config.isDefault)
      defaultConfig.value = defaultCfg || null
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载配置失败'
      console.error('加载模型配置失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  // 加载提供商预设
  const loadProviderPresets = async () => {
    try {
      isLoading.value = true
      error.value = null
      providerPresets.value = await window.modelConfigApi.getProviderPresets()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载提供商预设失败'
      console.error('加载提供商预设失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  // 加载系统提示词配置
  const loadSystemPrompt = async () => {
    try {
      isLoading.value = true
      error.value = null
      systemPrompt.value = await window.systemPromptApi.getSystemPrompt()
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
      systemPrompt.value = await window.systemPromptApi.updateSystemPrompt(prompt)
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
      systemPrompt.value = await window.systemPromptApi.resetSystemPrompt()
      return systemPrompt.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : '重置系统提示词失败'
      console.error('重置系统提示词失败:', err)
      throw err
    }
  }

  // 获取单个配置
  const getConfig = async (id: string) => {
    try {
      error.value = null
      return await window.modelConfigApi.getConfig(id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取配置失败'
      console.error('获取模型配置失败:', err)
      throw err
    }
  }

  // 添加新配置
  const addConfig = async (
    config: Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ModelConfig> => {
    try {
      error.value = null
      const newConfig = await window.modelConfigApi.addConfig(config)
      configs.value.push(newConfig)

      // 如果是第一个配置或设为默认，更新默认配置
      if (newConfig.isDefault) {
        defaultConfig.value = newConfig
      }

      return newConfig
    } catch (err) {
      error.value = err instanceof Error ? err.message : '添加配置失败'
      console.error('添加模型配置失败:', err)
      throw err
    }
  }

  // 更新配置
  const updateConfig = async (
    id: string,
    updates: Partial<Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<ModelConfig> => {
    try {
      error.value = null
      const updatedConfig = await window.modelConfigApi.updateConfig(id, updates)

      const index = configs.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        configs.value[index] = updatedConfig

        // 如果更新的是默认配置，更新默认配置引用
        if (updatedConfig.isDefault) {
          defaultConfig.value = updatedConfig
        } else if (defaultConfig.value?.id === id) {
          // 如果当前是默认配置但被取消了默认状态，需要找到新的默认配置
          const newDefault = configs.value.find((c) => c.isDefault)
          defaultConfig.value = newDefault || null
        }
      }

      return updatedConfig
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新配置失败'
      console.error('更新模型配置失败:', err)
      throw err
    }
  }

  // 删除配置
  const deleteConfig = async (id: string) => {
    try {
      error.value = null
      await window.modelConfigApi.deleteConfig(id)

      // 更新本地数据
      const wasDefault = configs.value.find((c) => c.id === id)?.isDefault
      configs.value = configs.value.filter((c) => c.id !== id)

      // 如果删除的是默认配置，需要获取新的默认配置
      if (wasDefault) {
        // 重新加载配置以获取最新的默认配置
        await loadConfigs()
      } else if (defaultConfig.value?.id === id) {
        defaultConfig.value = configs.value.find((c) => c.isDefault) || null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除配置失败'
      console.error('删除模型配置失败:', err)
      throw err
    }
  }

  // 设置默认配置
  const setDefaultConfig = async (id: string) => {
    try {
      error.value = null
      await window.modelConfigApi.setDefaultConfig(id)

      // 更新本地数据状态
      configs.value = configs.value.map((c) => ({
        ...c,
        isDefault: c.id === id
      }))

      defaultConfig.value = configs.value.find((c) => c.id === id) || null
    } catch (err) {
      error.value = err instanceof Error ? err.message : '设置默认配置失败'
      console.error('设置默认模型配置失败:', err)
      throw err
    }
  }

  // 首先定义一个测试配置的接口
  interface TestConnectionConfig {
    provider: LLMProvider
    baseUrl: string
    apiKey: string
    modelName: string
    parameters?: {
      temperature: number
      maxTokens: number
    }
  }

  // 修改 testConnection 方法
  const testConnection = async (
    config: TestConnectionConfig
  ): Promise<{ valid: boolean; message?: string }> => {
    try {
      error.value = null

      // 调用 API 进行测试
      const result = await window.modelConfigApi.testConnection(
        config.provider,
        config.baseUrl,
        config.apiKey,
        config.modelName
      )

      // 记录测试结果（不包含敏感信息）
      if (!result.valid) {
        console.error('模型连接测试失败:', {
          provider: config.provider,
          baseUrl: config.baseUrl,
          modelName: config.modelName,
          message: result.message
        })
      }

      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : '测试连接失败'
      console.error('测试模型连接失败:', {
        provider: config.provider,
        baseUrl: config.baseUrl,
        modelName: config.modelName,
        error: err instanceof Error ? err.message : String(err)
      })
      throw err
    }
  }

  // 添加类型定义以提高代码可维护性
  const getProviderPreset = (provider: LLMProvider): ProviderPreset | undefined => {
    return providerPresets.value.find((preset) => preset.provider === provider)
  }

  return {
    configs,
    defaultConfig,
    providerPresets,
    systemPrompt,
    isLoading,
    error,
    loadConfigs,
    loadProviderPresets,
    loadSystemPrompt,
    updateSystemPrompt,
    resetSystemPrompt,
    getConfig,
    addConfig,
    updateConfig,
    deleteConfig,
    setDefaultConfig,
    testConnection,
    getProviderPreset
  }
})
