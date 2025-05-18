import { ipcRenderer } from 'electron'
import type { Command, CommandGroup, CommandSearchResult } from '@shared/types'

/**
 * 命令相关的API
 */
export const commandApi = {
  /**
   * 获取所有命令
   * @returns 所有已注册的命令
   */
  getAllCommands: (): Promise<Command[]> => {
    return ipcRenderer.invoke('command:getAllCommands')
  },

  /**
   * 按类别获取命令
   * @returns 按类别分组的命令
   */
  getCommandsByCategory: (): Promise<CommandGroup[]> => {
    return ipcRenderer.invoke('command:getCommandsByCategory')
  },

  /**
   * 搜索命令
   * @param query 搜索查询
   * @returns 匹配的命令和查询字符串
   */
  searchCommands: (query: string): Promise<CommandSearchResult> => {
    return ipcRenderer.invoke('command:searchCommands', query)
  },

  /**
   * 执行命令
   * @param commandId 要执行的命令ID
   * @returns 执行结果
   */
  executeCommand: (commandId: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('command:executeCommand', commandId)
  }
}
