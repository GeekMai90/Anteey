import { ipcMain } from 'electron'
import {
  createAgent,
  getAllAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  searchAgents,
  getMenuAgents,
  getNonMenuAgents,
  validateModelConfig
} from '../../services/rag/agentService'
import type { CreateAgentParams, UpdateAgentParams } from '@shared/types'

export function setupAgentHandlers() {
  // 创建 Agent
  ipcMain.handle('create-agent', async (_event, params: CreateAgentParams) => {
    try {
      // 先验证模型配置是否有效
      const isValidModel = await validateModelConfig(params.modelConfigId)
      if (!isValidModel) {
        return { success: false, error: '无效的模型配置' }
      }

      const agent = await createAgent(params)
      return { success: true, agent }
    } catch (error) {
      console.error('主进程→ 创建Agent失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取所有 Agents
  ipcMain.handle('get-all-agents', async () => {
    try {
      const agents = await getAllAgents()
      return { success: true, agents }
    } catch (error) {
      console.error('主进程→ 获取所有Agent失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 根据ID获取 Agent
  ipcMain.handle('get-agent-by-id', async (_event, id: string) => {
    try {
      const agent = await getAgentById(id)
      return { success: true, agent }
    } catch (error) {
      console.error('主进程→ 获取Agent失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新 Agent
  ipcMain.handle(
    'update-agent',
    async (_event, { id, updateData }: { id: string; updateData: UpdateAgentParams }) => {
      try {
        // 如果更新包含模型配置，先验证其有效性
        if (updateData.modelConfigId) {
          const isValidModel = await validateModelConfig(updateData.modelConfigId)
          if (!isValidModel) {
            return { success: false, error: '无效的模型配置' }
          }
        }

        const agent = await updateAgent(id, updateData)
        return { success: true, agent }
      } catch (error) {
        console.error('主进程→ 更新Agent失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 删除 Agent
  ipcMain.handle('delete-agent', async (_event, id: string) => {
    try {
      await deleteAgent(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除Agent失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 搜索 Agents
  ipcMain.handle('search-agents', async (_event, query: string) => {
    try {
      const agents = await searchAgents(query)
      return { success: true, agents }
    } catch (error) {
      console.error('主进程→ 搜索Agent失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取可在笔记菜单中显示的 Agents
  ipcMain.handle('get-menu-agents', async () => {
    try {
      const agents = await getMenuAgents()
      return { success: true, agents }
    } catch (error) {
      console.error('主进程→ 获取菜单Agent失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取不在笔记菜单中显示的 Agents
  ipcMain.handle('get-non-menu-agents', async () => {
    try {
      const agents = await getNonMenuAgents()
      return { success: true, agents }
    } catch (error) {
      console.error('主进程→ 获取非菜单Agent失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
