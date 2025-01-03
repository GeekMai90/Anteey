import { ipcRenderer } from 'electron'
import type { KnowledgeTreeNode } from '@shared/types'

export const knowledgeTreeApi = {
  // 获取顶层节点
  getTopLevelNodes: async (): Promise<KnowledgeTreeNode[]> => {
    try {
      const result = await ipcRenderer.invoke('get-top-level-nodes')
      if (!result.success) throw new Error(result.error)
      return result.nodes
    } catch (error) {
      console.error('预加载脚本 → 获取顶层节点失败:', error)
      throw error
    }
  },

  // 获取子节点
  getChildNodes: async (parentAddress: string): Promise<KnowledgeTreeNode[]> => {
    try {
      const result = await ipcRenderer.invoke('get-child-nodes', parentAddress)
      if (!result.success) throw new Error(result.error)
      return result.nodes
    } catch (error) {
      console.error('预加载脚本 → 获取子节点失败:', error)
      throw error
    }
  },

  // 获取子节点数量
  getChildCount: async (parentAddress: string): Promise<number> => {
    try {
      const result = await ipcRenderer.invoke('get-child-count', parentAddress)
      if (!result.success) throw new Error(result.error)
      return result.count
    } catch (error) {
      console.error('预加载脚本 → 获取子节点数量失败:', error)
      throw error
    }
  },

  // 获取节点路径
  getNodePath: async (address: string): Promise<KnowledgeTreeNode[]> => {
    try {
      const result = await ipcRenderer.invoke('get-node-path', address)
      if (!result.success) throw new Error(result.error)
      return result.path
    } catch (error) {
      console.error('预加载脚本 → 获取节点路径失败:', error)
      throw error
    }
  }
}
