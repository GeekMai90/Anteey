/**
 * 命令接口定义
 */

// 命令执行函数类型
export type CommandAction = () => void | Promise<void>

// 命令类别枚举
export enum CommandCategory {
  THEME = '主题',
  NAVIGATION = '导航',
  NOTE = '笔记',
  SETTINGS = '设置',
  TOOLS = '工具',
  SYSTEM = '系统'
}

// 命令接口
export interface Command {
  id: string // 命令唯一标识
  title: string // 命令标题
  category: CommandCategory // 命令类别
  icon?: string // 命令图标
  keywords: string[] // 搜索关键词
  shortcut?: string // 快捷键
  action: CommandAction // 执行函数
  visible?: boolean // 是否可见（默认为true）
}

// 可序列化命令接口（用于IPC通信，不包含action函数）
export type SerializableCommand = Omit<Command, 'action'>

// 命令组接口
export interface CommandGroup {
  category: CommandCategory
  commands: SerializableCommand[]
}

// 命令搜索结果
export interface CommandSearchResult {
  commands: SerializableCommand[]
  query: string
}
