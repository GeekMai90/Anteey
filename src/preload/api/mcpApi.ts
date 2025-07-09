/**
 * @file mcpApi.ts
 * @description MCP (Multimodal Context Preservation) 预加载API
 * 暴露MCP相关的IPC方法给渲染进程
 */

import { ipcRenderer } from 'electron'
import type { McpApiKey, McpServiceStatus } from '@shared/types'

export const mcpApi = {
  /**
   * 创建新的API密钥
   * @param name API密钥名称
   * @returns 创建的API密钥对象
   */
  createApiKey: async (name: string): Promise<McpApiKey> => {
    try {
      const result = await ipcRenderer.invoke('mcp:createApiKey', name)
      if (!result.success) throw new Error(result.error)
      return result.data
    } catch (error) {
      console.error('预加载脚本 → 创建API密钥失败:', error)
      throw error
    }
  },

  /**
   * 获取所有API密钥
   * @returns API密钥列表
   */
  getApiKeys: async (): Promise<McpApiKey[]> => {
    try {
      const result = await ipcRenderer.invoke('mcp:getApiKeys')
      if (!result.success) throw new Error(result.error)
      return result.data
    } catch (error) {
      console.error('预加载脚本 → 获取API密钥列表失败:', error)
      throw error
    }
  },

  /**
   * 删除API密钥
   * @param id API密钥ID
   */
  deleteApiKey: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('mcp:deleteApiKey', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除API密钥失败:', error)
      throw error
    }
  },

  /**
   * 更新API密钥状态（启用/禁用）
   * @param id API密钥ID
   * @param isActive 是否激活
   */
  updateApiKeyStatus: async (id: string, isActive: boolean): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('mcp:updateApiKeyStatus', id, isActive)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 更新API密钥状态失败:', error)
      throw error
    }
  },

  /**
   * 重命名API密钥
   * @param id API密钥ID
   * @param name 新名称
   */
  renameApiKey: async (id: string, name: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('mcp:renameApiKey', id, name)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 重命名API密钥失败:', error)
      throw error
    }
  },

  /**
   * 获取MCP服务状态
   * @returns 服务状态信息
   */
  getServiceStatus: async (): Promise<McpServiceStatus> => {
    try {
      const result = await ipcRenderer.invoke('mcp:getServiceStatus')
      if (!result.success) throw new Error(result.error)
      return result.data
    } catch (error) {
      console.error('预加载脚本 → 获取服务状态失败:', error)
      throw error
    }
  }
}
