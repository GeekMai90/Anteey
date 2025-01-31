import { ipcMain } from 'electron'
import {
  createMindboard,
  getMindboard,
  getAllMindboards,
  updateMindboard,
  deleteMindboard,
  createNode,
  getNodes,
  updateNode,
  deleteNode,
  createEdge,
  getEdges,
  updateEdge,
  deleteEdge
} from '../../services/mindboard/mindboardService'
import type { Mindboard, MindboardNode, MindboardEdge } from '@shared/types/mindboard'

export function setupMindboardHandlers() {
  // 思维板操作
  ipcMain.handle(
    'create-mindboard',
    async (_event, data: Omit<Mindboard, 'id' | 'created_at' | 'updated_at'>) => {
      try {
        const mindboard = await createMindboard(data)
        return { success: true, mindboard }
      } catch (error) {
        console.error('主进程→ 创建思维板失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  ipcMain.handle('get-all-mindboards', async () => {
    try {
      const mindboards = await getAllMindboards()
      return { success: true, mindboards }
    } catch (error) {
      console.error('主进程→ 获取所有思维板失败:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('get-mindboard', async (_event, id: string) => {
    try {
      const mindboard = await getMindboard(id)
      return { success: true, mindboard }
    } catch (error) {
      console.error('主进程→ 获取思维板失败:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(
    'update-mindboard',
    async (_event, { id, data }: { id: string; data: Partial<Mindboard> }) => {
      try {
        const mindboard = await updateMindboard(id, data)
        return { success: true, mindboard }
      } catch (error) {
        console.error('主进程→ 更新思维板失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  ipcMain.handle('delete-mindboard', async (_event, id: string) => {
    try {
      await deleteMindboard(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除思维板失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 节点操作
  ipcMain.handle(
    'create-node',
    async (_event, data: Omit<MindboardNode, 'id' | 'created_at' | 'updated_at'>) => {
      try {
        const node = await createNode(data)
        return { success: true, node }
      } catch (error) {
        console.error('主进程→ 创建节点失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  ipcMain.handle('get-nodes', async (_event, mindboardId: string) => {
    try {
      const nodes = await getNodes(mindboardId)
      return { success: true, nodes }
    } catch (error) {
      console.error('主进程→ 获取节点失败:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(
    'update-node',
    async (_event, { id, data }: { id: string; data: Partial<MindboardNode> }) => {
      try {
        const node = await updateNode(id, data)
        return { success: true, node }
      } catch (error) {
        console.error('主进程→ 更新节点失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  ipcMain.handle('delete-node', async (_event, id: string) => {
    try {
      await deleteNode(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除节点失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 连线操作
  ipcMain.handle(
    'create-edge',
    async (_event, data: Omit<MindboardEdge, 'id' | 'created_at' | 'updated_at'>) => {
      try {
        const edge = await createEdge(data)
        return { success: true, edge }
      } catch (error) {
        console.error('主进程→ 创建连线失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  ipcMain.handle('get-edges', async (_event, mindboardId: string) => {
    try {
      const edges = await getEdges(mindboardId)
      return { success: true, edges }
    } catch (error) {
      console.error('主进程→ 获取连线失败:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(
    'update-edge',
    async (_event, { id, data }: { id: string; data: Partial<MindboardEdge> }) => {
      try {
        const edge = await updateEdge(id, data)
        return { success: true, edge }
      } catch (error) {
        console.error('主进程→ 更新连线失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  ipcMain.handle('delete-edge', async (_event, id: string) => {
    try {
      await deleteEdge(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除连线失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
