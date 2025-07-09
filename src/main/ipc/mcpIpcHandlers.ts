/**
 * @file mcpIpcHandlers.ts
 * @description MCP (Multimodal Context Preservation) IPC处理程序
 * 处理渲染进程与MCP服务的交互
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import * as mcpService from '../../services/mcp/mcpService'

/**
 * 注册MCP相关的IPC处理程序
 */
export function registerMcpIpcHandlers(): void {
  log.info('注册MCP IPC处理程序')

  // 创建API密钥
  ipcMain.handle('mcp:createApiKey', async (_event, name: string) => {
    try {
      const apiKey = await mcpService.createApiKey(name)
      return {
        success: true,
        data: apiKey
      }
    } catch (error) {
      log.error('创建API密钥失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建API密钥失败'
      }
    }
  })

  // 获取所有API密钥
  ipcMain.handle('mcp:getApiKeys', async () => {
    try {
      const apiKeys = await mcpService.getApiKeys()
      return {
        success: true,
        data: apiKeys
      }
    } catch (error) {
      log.error('获取API密钥列表失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取API密钥列表失败'
      }
    }
  })

  // 删除API密钥
  ipcMain.handle('mcp:deleteApiKey', async (_event, id: string) => {
    try {
      await mcpService.deleteApiKey(id)
      return {
        success: true
      }
    } catch (error) {
      log.error('删除API密钥失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除API密钥失败'
      }
    }
  })

  // 更新API密钥状态（启用/禁用）
  ipcMain.handle('mcp:updateApiKeyStatus', async (_event, id: string, isActive: boolean) => {
    try {
      await mcpService.updateApiKeyStatus(id, isActive)
      return {
        success: true
      }
    } catch (error) {
      log.error('更新API密钥状态失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新API密钥状态失败'
      }
    }
  })

  // 重命名API密钥
  ipcMain.handle('mcp:renameApiKey', async (_event, id: string, name: string) => {
    try {
      await mcpService.renameApiKey(id, name)
      return {
        success: true
      }
    } catch (error) {
      log.error('重命名API密钥失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '重命名API密钥失败'
      }
    }
  })

  // 获取MCP服务状态
  ipcMain.handle('mcp:getServiceStatus', async () => {
    try {
      const status = await mcpService.getServiceStatus()
      return {
        success: true,
        data: status
      }
    } catch (error) {
      log.error('获取MCP服务状态失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取MCP服务状态失败'
      }
    }
  })
}
