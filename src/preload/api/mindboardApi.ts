import { ipcRenderer } from 'electron'
import type { Mindboard, MindboardNode, MindboardEdge } from '@shared/types/mindboard'

export const mindboardApi = {
  // 思维板操作
  createMindboard: async (
    data: Omit<Mindboard, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Mindboard> => {
    try {
      const result = await ipcRenderer.invoke('create-mindboard', data)
      if (!result.success) throw new Error(result.error)
      return result.mindboard
    } catch (error) {
      console.error('预加载脚本 → 创建思维板失败:', error)
      throw error
    }
  },

  getAllMindboards: async (): Promise<Mindboard[]> => {
    try {
      const result = await ipcRenderer.invoke('get-all-mindboards')
      if (!result.success) throw new Error(result.error)
      return result.mindboards
    } catch (error) {
      console.error('预加载脚本 → 获取所有思维板失败:', error)
      throw error
    }
  },

  getMindboard: async (id: string): Promise<Mindboard> => {
    try {
      const result = await ipcRenderer.invoke('get-mindboard', id)
      if (!result.success) throw new Error(result.error)
      return result.mindboard
    } catch (error) {
      console.error('预加载脚本 → 获取思维板失败:', error)
      throw error
    }
  },

  updateMindboard: async (id: string, data: Partial<Mindboard>): Promise<Mindboard> => {
    try {
      const result = await ipcRenderer.invoke('update-mindboard', { id, data })
      if (!result.success) throw new Error(result.error)
      return result.mindboard
    } catch (error) {
      console.error('预加载脚本 → 更新思维板失败:', error)
      throw error
    }
  },

  deleteMindboard: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-mindboard', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除思维板失败:', error)
      throw error
    }
  },

  // 节点操作
  createNode: async (
    data: Omit<MindboardNode, 'id' | 'created_at' | 'updated_at'>
  ): Promise<MindboardNode> => {
    try {
      const result = await ipcRenderer.invoke('create-node', data)
      if (!result.success) throw new Error(result.error)
      return result.node
    } catch (error) {
      console.error('预加载脚本 → 创建节点失败:', error)
      throw error
    }
  },

  getNodes: async (mindboardId: string): Promise<MindboardNode[]> => {
    try {
      const result = await ipcRenderer.invoke('get-nodes', mindboardId)
      if (!result.success) throw new Error(result.error)
      return result.nodes
    } catch (error) {
      console.error('预加载脚本 → 获取节点失败:', error)
      throw error
    }
  },

  updateNode: async (id: string, data: Partial<MindboardNode>): Promise<MindboardNode> => {
    try {
      const result = await ipcRenderer.invoke('update-node', { id, data })
      if (!result.success) throw new Error(result.error)
      return result.node
    } catch (error) {
      console.error('预加载脚本 → 更新节点失败:', error)
      throw error
    }
  },

  deleteNode: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-node', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除节点失败:', error)
      throw error
    }
  },

  // 连线操作
  createEdge: async (
    data: Omit<MindboardEdge, 'id' | 'created_at' | 'updated_at'>
  ): Promise<MindboardEdge> => {
    try {
      const result = await ipcRenderer.invoke('create-edge', data)
      if (!result.success) throw new Error(result.error)
      return result.edge
    } catch (error) {
      console.error('预加载脚本 → 创建连线失败:', error)
      throw error
    }
  },

  getEdges: async (mindboardId: string): Promise<MindboardEdge[]> => {
    try {
      const result = await ipcRenderer.invoke('get-edges', mindboardId)
      if (!result.success) throw new Error(result.error)
      return result.edges
    } catch (error) {
      console.error('预加载脚本 → 获取连线失败:', error)
      throw error
    }
  },

  updateEdge: async (id: string, data: Partial<MindboardEdge>): Promise<MindboardEdge> => {
    try {
      const result = await ipcRenderer.invoke('update-edge', { id, data })
      if (!result.success) throw new Error(result.error)
      return result.edge
    } catch (error) {
      console.error('预加载脚本 → 更新连线失败:', error)
      throw error
    }
  },

  deleteEdge: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-edge', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除连线失败:', error)
      throw error
    }
  }
}
