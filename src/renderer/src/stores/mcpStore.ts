import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { McpApiKey, McpServiceStatus } from '@shared/types'

export const useMcpStore = defineStore('mcp', () => {
  // ==================== 状态 ====================
  const apiKeys = ref<McpApiKey[]>([])
  const serviceStatus = ref<McpServiceStatus | null>(null)
  const isLoading = ref(false)
  const isCreating = ref(false)
  const isDeleting = ref(false)
  const isUpdating = ref(false)

  // ==================== 操作方法 ====================
  // 获取所有API密钥
  const fetchApiKeys = async () => {
    try {
      isLoading.value = true
      const keys = await window.electronAPI.mcp.getApiKeys()
      apiKeys.value = keys
      return keys
    } catch (error) {
      console.error('获取API密钥失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 创建API密钥
  const createApiKey = async (name: string) => {
    try {
      isCreating.value = true
      const newKey = await window.electronAPI.mcp.createApiKey(name)
      // 添加新创建的密钥到列表
      apiKeys.value.push(newKey)
      return newKey
    } catch (error) {
      console.error('创建API密钥失败:', error)
      throw error
    } finally {
      isCreating.value = false
    }
  }

  // 删除API密钥
  const deleteApiKey = async (id: string) => {
    try {
      isDeleting.value = true
      await window.electronAPI.mcp.deleteApiKey(id)
      // 从列表中移除被删除的密钥
      apiKeys.value = apiKeys.value.filter((key) => key.id !== id)
      return true
    } catch (error) {
      console.error('删除API密钥失败:', error)
      throw error
    } finally {
      isDeleting.value = false
    }
  }

  // 更新API密钥状态
  const updateApiKeyStatus = async (id: string, isActive: boolean) => {
    try {
      isUpdating.value = true
      await window.electronAPI.mcp.updateApiKeyStatus(id, isActive)
      // 更新列表中的密钥状态
      const keyIndex = apiKeys.value.findIndex((key) => key.id === id)
      if (keyIndex !== -1) {
        apiKeys.value[keyIndex].isActive = isActive
      }
      return true
    } catch (error) {
      console.error('更新API密钥状态失败:', error)
      throw error
    } finally {
      isUpdating.value = false
    }
  }

  // 重命名API密钥
  const renameApiKey = async (id: string, name: string) => {
    try {
      isUpdating.value = true
      await window.electronAPI.mcp.renameApiKey(id, name)
      // 更新列表中的密钥名称
      const keyIndex = apiKeys.value.findIndex((key) => key.id === id)
      if (keyIndex !== -1) {
        apiKeys.value[keyIndex].name = name
      }
      return true
    } catch (error) {
      console.error('重命名API密钥失败:', error)
      throw error
    } finally {
      isUpdating.value = false
    }
  }

  // 获取服务状态
  const fetchServiceStatus = async () => {
    try {
      const status = await window.electronAPI.mcp.getServiceStatus()
      serviceStatus.value = status
      return status
    } catch (error) {
      console.error('获取服务状态失败:', error)
      throw error
    }
  }

  return {
    // 状态
    apiKeys,
    serviceStatus,
    isLoading,
    isCreating,
    isDeleting,
    isUpdating,

    // 方法
    fetchApiKeys,
    createApiKey,
    deleteApiKey,
    updateApiKeyStatus,
    renameApiKey,
    fetchServiceStatus
  }
})
