import type { IconName } from '@shared/types'
import {
  // 文档类
  Book,
  Notes,
  FolderOne,
  FolderOpen,
  Bookmark,
  BookOne,
  Notebook,
  Bookshelf,
  FileText,
  FileFocus,

  // 标记类
  Tag,
  TagOne,
  Flag,
  Star,
  Like,
  Heart,

  // 列表和任务
  ListTwo,
  Checklist,

  // 容器类
  Box,
  Inbox,
  Cube,
  FileCabinet,

  // 场所和建筑
  Home,
  Bank,
  School,

  // 工具和操作
  Write,
  Code,
  Bug,
  Link,
  Edit,
  Delete,
  Copy,
  Search,

  // 时间类
  Time,
  Calendar,
  Alarm,
  Schedule,

  // 思考和创意
  Brain,
  Lamp,
  Light,

  // 游戏和娱乐
  GameHandle,
  Play,

  // 其他常用
  Target,
  Plus,
  Minus,
  Close,
  More,
  Setting,
  Config,
  Help,
  Info,
  Refresh,
  Download,
  Upload,
  Share,
  Lock,
  Unlock
} from '@icon-park/vue-next'

// 创建图标映射
const iconMap = {
  // 文档类
  Book,
  Notes,
  FolderOne,
  FolderOpen,
  Bookmark,
  BookOne,
  Notebook,
  Bookshelf,
  FileText,
  FileFocus,

  // 标记类
  Tag,
  TagOne,
  Flag,
  Star,
  Like,
  Heart,

  // 列表和任务
  ListTwo,
  Checklist,

  // 容器类
  Box,
  Inbox,
  Cube,
  FileCabinet,

  // 场所和建筑
  Home,
  Bank,
  School,

  // 工具和操作
  Write,
  Code,
  Bug,
  Link,
  Edit,
  Delete,
  Copy,
  Search,

  // 时间类
  Time,
  Calendar,
  Alarm,
  Schedule,

  // 思考和创意
  Brain,
  Lamp,
  Light,

  // 游戏和娱乐
  GameHandle,
  Play,

  // 其他常用
  Target,
  Plus,
  Minus,
  Close,
  More,
  Setting,
  Config,
  Help,
  Info,
  Refresh,
  Download,
  Upload,
  Share,
  Lock,
  Unlock
} as const

// 获取图标组件
export function getIconComponent(name: IconName) {
  return iconMap[name]
}

// 获取可用的图标列表
export function getAvailableIcons(): IconName[] {
  return Object.keys(iconMap) as IconName[]
}

// 按类别获取图标
export const getIconsByCategory = () => {
  const categories: Record<string, IconName[]> = {}
  let currentCategory = ''

  const lines = Object.entries(iconMap).reduce((acc: string[], [key]) => {
    const comment = `// ${currentCategory}相关`
    if (!acc.includes(comment)) {
      currentCategory = key
      acc.push(comment)
    }
    return acc
  }, [])

  Object.keys(iconMap).forEach((iconName) => {
    for (const line of lines) {
      if (line.includes('相关')) {
        currentCategory = line.replace('//', '').replace('相关', '').trim()
      }
      if (!categories[currentCategory]) {
        categories[currentCategory] = []
      }
      categories[currentCategory].push(iconName as IconName)
      break
    }
  })

  return categories
}
