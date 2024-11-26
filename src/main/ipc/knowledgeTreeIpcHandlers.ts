import { ipcMain } from 'electron'
import {
  getTopLevelNodes,
  getChildNodes,
  getChildCount,
  getNodePath
} from '../../services/notes/knowledgeTreeService'

export function setupKnowledgeTreeHandlers() {
  // 获取顶层节点
  ipcMain.handle('get-top-level-nodes', async () => {
    try {
      console.log('主进程→ 收到获取顶层节点请求')
      const nodes = await getTopLevelNodes()
      console.log('主进程→ 获取顶层节点成功:', nodes)
      return { success: true, nodes }
    } catch (error) {
      console.error('主进程→ 获取顶层节点失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取子节点
  ipcMain.handle('get-child-nodes', async (_event, parentAddress: string) => {
    try {
      console.log('主进程→ 收到获取子节点请求:', parentAddress)
      const nodes = await getChildNodes(parentAddress)
      console.log('主进程→ 获取子节点成功:', nodes)
      return { success: true, nodes }
    } catch (error) {
      console.error('主进程→ 获取子节点失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取子节点数量
  ipcMain.handle('get-child-count', async (_event, parentAddress: string) => {
    try {
      console.log('主进程→ 收到获取子节点数量请求:', parentAddress)
      const count = await getChildCount(parentAddress)
      console.log('主进程→ 获取子节点数量成功:', count)
      return { success: true, count }
    } catch (error) {
      console.error('主进程→ 获取子节点数量失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取节点路径
  ipcMain.handle('get-node-path', async (_event, address: string) => {
    try {
      console.log('主进程→ 收到获取节点路径请求:', address)
      const path = await getNodePath(address)
      console.log('主进程→ 获取节点路径成功:', path)
      return { success: true, path }
    } catch (error) {
      console.error('主进程→ 获取节点路径失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
