import { ipcRenderer } from 'electron'
import type { Agent, CreateAgentParams, UpdateAgentParams } from '@shared/types'

export const agentApi = {
  // 创建 Agent
  createAgent: async (params: CreateAgentParams): Promise<Agent> => {
    try {
      const result = await ipcRenderer.invoke('create-agent', params)
      if (!result.success) throw new Error(result.error)
      return result.agent
    } catch (error) {
      console.error('预加载脚本 → 创建Agent失败:', error)
      throw error
    }
  },

  // 获取所有 Agents
  getAllAgents: async (): Promise<Agent[]> => {
    try {
      const result = await ipcRenderer.invoke('get-all-agents')
      if (!result.success) throw new Error(result.error)
      return result.agents
    } catch (error) {
      console.error('预加载脚本 → 获取所有Agent失败:', error)
      throw error
    }
  },

  // 根据ID获取 Agent
  getAgentById: async (id: string): Promise<Agent | null> => {
    try {
      const result = await ipcRenderer.invoke('get-agent-by-id', id)
      if (!result.success) throw new Error(result.error)
      return result.agent
    } catch (error) {
      console.error('预加载脚本 → 获取Agent失败:', error)
      throw error
    }
  },

  // 更新 Agent
  updateAgent: async (id: string, updateData: UpdateAgentParams): Promise<Agent> => {
    try {
      const result = await ipcRenderer.invoke('update-agent', { id, updateData })
      if (!result.success) throw new Error(result.error)
      return result.agent
    } catch (error) {
      console.error('预加载脚本 → 更新Agent失败:', error)
      throw error
    }
  },

  // 删除 Agent
  deleteAgent: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-agent', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除Agent失败:', error)
      throw error
    }
  },

  // 搜索 Agents
  searchAgents: async (query: string): Promise<Agent[]> => {
    try {
      const result = await ipcRenderer.invoke('search-agents', query)
      if (!result.success) throw new Error(result.error)
      return result.agents
    } catch (error) {
      console.error('预加载脚本 → 搜索Agent失败:', error)
      throw error
    }
  },

  // 获取可在笔记菜单中显示的 Agents
  getMenuAgents: async (): Promise<Agent[]> => {
    try {
      const result = await ipcRenderer.invoke('get-menu-agents')
      if (!result.success) throw new Error(result.error)
      return result.agents
    } catch (error) {
      console.error('预加载脚本 → 获取菜单Agent失败:', error)
      throw error
    }
  },

  // 获取不在笔记菜单中显示的 Agents
  getNonMenuAgents: async (): Promise<Agent[]> => {
    try {
      const result = await ipcRenderer.invoke('get-non-menu-agents')
      if (!result.success) throw new Error(result.error)
      return result.agents
    } catch (error) {
      console.error('预加载脚本 → 获取非菜单Agent失败:', error)
      throw error
    }
  }
}
