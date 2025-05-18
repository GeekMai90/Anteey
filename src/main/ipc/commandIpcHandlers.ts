import { ipcMain } from 'electron'
import {
  getAllCommands,
  getCommandsByCategory,
  searchCommands,
  executeCommand
} from '../../services/command/commandService'

/**
 * 注册命令相关的IPC处理程序
 */
export function registerCommandIpcHandlers(): void {
  // 获取所有命令
  ipcMain.handle('command:getAllCommands', () => {
    return getAllCommands()
  })

  // 按类别获取命令
  ipcMain.handle('command:getCommandsByCategory', () => {
    return getCommandsByCategory()
  })

  // 搜索命令
  ipcMain.handle('command:searchCommands', (_event, query: string) => {
    return searchCommands(query)
  })

  // 执行命令
  ipcMain.handle('command:executeCommand', async (_event, commandId: string) => {
    try {
      await executeCommand(commandId)
      return { success: true }
    } catch (error) {
      console.error('执行命令失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })
}
