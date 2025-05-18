import {
  Command,
  CommandGroup,
  CommandSearchResult,
  SerializableCommand,
  CommandCategory
} from '@shared/types'
import { createAllDefaultCommands } from './defaultCommands'

// 存储所有注册的命令
const commands: Command[] = []

/**
 * 将命令对象转换为可序列化的命令对象
 * @param command 命令对象
 * @returns 可序列化的命令对象
 */
function toSerializableCommand(command: Command): SerializableCommand {
  // 排除 action 函数，只保留可序列化的属性
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { action, ...serializableCommand } = command
  return serializableCommand as SerializableCommand
}

/**
 * 注册一个命令
 * @param command 要注册的命令
 */
export function registerCommand(command: Command): void {
  // 检查命令ID是否已存在
  const existingCommand = commands.find((cmd) => cmd.id === command.id)
  if (existingCommand) {
    console.warn(`命令ID '${command.id}' 已存在，将被覆盖`)
    // 移除旧命令
    const index = commands.findIndex((cmd) => cmd.id === command.id)
    commands.splice(index, 1)
  }

  // 添加新命令
  commands.push(command)
}

/**
 * 注册多个命令
 * @param commandsToRegister 要注册的命令数组
 */
export function registerCommands(commandsToRegister: Command[]): void {
  commandsToRegister.forEach((command) => registerCommand(command))
}

/**
 * 获取所有命令
 * @returns 所有已注册的命令（可序列化版本）
 */
export function getAllCommands(): SerializableCommand[] {
  return commands.filter((cmd) => cmd.visible !== false).map(toSerializableCommand)
}

/**
 * 按类别分组获取命令
 * @returns 按类别分组的命令（可序列化版本）
 */
export function getCommandsByCategory(): CommandGroup[] {
  const visibleCommands = commands.filter((cmd) => cmd.visible !== false)

  // 获取所有唯一的类别
  const categories = [...new Set(visibleCommands.map((cmd) => cmd.category))]

  // 按类别分组命令
  return categories.map((category) => ({
    category,
    commands: visibleCommands.filter((cmd) => cmd.category === category).map(toSerializableCommand)
  }))
}

/**
 * 搜索命令
 * @param query 搜索查询
 * @returns 匹配的命令和查询字符串
 */
export function searchCommands(query: string): CommandSearchResult {
  if (!query || query.trim() === '') {
    // 如果没有搜索关键词，按类别和标题名称排序返回所有命令
    return {
      commands: getAllCommands().sort((a, b) => {
        // 首先按类别排序
        if (a.category !== b.category) {
          // 定义类别的优先级顺序
          const categoryOrder: Record<CommandCategory, number> = {
            [CommandCategory.NAVIGATION]: 1, // 导航放在最前面
            [CommandCategory.NOTE]: 2, // 笔记相关次之
            [CommandCategory.SYSTEM]: 3, // 系统功能再次
            [CommandCategory.THEME]: 4, // 主题设置
            [CommandCategory.SETTINGS]: 5, // 设置放后面
            [CommandCategory.TOOLS]: 6 // 工具最后
          }

          // 按照类别优先级排序
          return (categoryOrder[a.category] || 999) - (categoryOrder[b.category] || 999)
        }

        // 同一类别内按标题字母顺序排序
        return a.title.localeCompare(b.title)
      }),
      query: ''
    }
  }

  const normalizedQuery = query.toLowerCase().trim()

  // 搜索匹配的命令
  const matchedCommands = commands
    .filter((cmd) => {
      // 命令不可见则排除
      if (cmd.visible === false) return false

      // 匹配标题
      if (cmd.title.toLowerCase().includes(normalizedQuery)) return true

      // 匹配关键词
      return cmd.keywords.some((keyword) => keyword.toLowerCase().includes(normalizedQuery))
    })
    .sort((a, b) => {
      // 优先显示标题直接匹配的结果
      const aMatchesTitle = a.title.toLowerCase().includes(normalizedQuery)
      const bMatchesTitle = b.title.toLowerCase().includes(normalizedQuery)

      if (aMatchesTitle && !bMatchesTitle) return -1
      if (!aMatchesTitle && bMatchesTitle) return 1

      // 其次按类别优先级排序
      const categoryOrder: Record<CommandCategory, number> = {
        [CommandCategory.NAVIGATION]: 1,
        [CommandCategory.NOTE]: 2,
        [CommandCategory.SYSTEM]: 3,
        [CommandCategory.THEME]: 4,
        [CommandCategory.SETTINGS]: 5,
        [CommandCategory.TOOLS]: 6
      }

      if (a.category !== b.category) {
        return (categoryOrder[a.category] || 999) - (categoryOrder[b.category] || 999)
      }

      // 最后按照标题字母顺序排序
      return a.title.localeCompare(b.title)
    })
    .map(toSerializableCommand)

  return {
    commands: matchedCommands,
    query: normalizedQuery
  }
}

/**
 * 执行命令
 * @param commandId 要执行的命令ID
 * @returns 执行结果的Promise
 */
export async function executeCommand(commandId: string): Promise<void> {
  const command = commands.find((cmd) => cmd.id === commandId)
  if (!command) {
    throw new Error(`未找到ID为 '${commandId}' 的命令`)
  }

  try {
    await command.action()
  } catch (error) {
    console.error(`执行命令 '${command.title}' 失败:`, error)
    throw error
  }
}

/**
 * 注册默认的系统命令
 * 这个函数会在应用启动时调用
 */
export function registerDefaultCommands(): void {
  // 注册默认命令
  const defaultCommands = createAllDefaultCommands()
  registerCommands(defaultCommands)
}
