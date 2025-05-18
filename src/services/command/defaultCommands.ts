import { Command, CommandCategory } from '@shared/types'
import { BrowserWindow } from 'electron'
import { getThemeSettings, updateThemeSettings } from '../theme/themeService'

/**
 * 创建导航相关命令
 */
export function createNavigationCommands(): Command[] {
  return [
    {
      id: 'navigation.home',
      title: '首页',
      category: CommandCategory.NAVIGATION,
      icon: 'Home',
      keywords: ['首页', '主页', 'home', 'shouye', 'zhuye'],
      shortcut: 'Ctrl+Shift+H',
      action: () => {
        navigateTo('/home')
      }
    },
    {
      id: 'navigation.inbox',
      title: '收件箱',
      category: CommandCategory.NAVIGATION,
      icon: 'Inbox',
      keywords: ['收件箱', '信箱', 'inbox', 'shoujianxiang', 'xinxiang'],
      action: () => {
        navigateTo('/inbox')
      }
    },
    {
      id: 'navigation.timeline',
      title: '笔记流',
      category: CommandCategory.NAVIGATION,
      icon: 'NotebookOne',
      keywords: ['时间线', '时间轴', 'timeline', 'shijianxian', 'shijianzhu'],
      shortcut: 'Ctrl+L',
      action: () => {
        navigateTo('/timeline')
      }
    },
    {
      id: 'navigation.cardbox',
      title: '卡片盒',
      category: CommandCategory.NAVIGATION,
      icon: 'Box',
      keywords: ['卡片盒', '卡片', 'cardbox', 'kapianhe', 'kapian'],
      shortcut: 'Ctrl+O',
      action: () => {
        navigateTo('/cardbox')
      }
    },
    {
      id: 'navigation.knowledge-tree',
      title: '知识树',
      category: CommandCategory.NAVIGATION,
      icon: 'Sapling',
      keywords: ['知识树', '树', 'knowledge tree', 'zhishishu', 'shu'],
      action: () => {
        navigateTo('/knowledge-tree')
      }
    },
    {
      id: 'navigation.timeblock',
      title: '时光记',
      category: CommandCategory.NAVIGATION,
      icon: 'Time',
      keywords: ['时间块', '时间管理', 'timeblock', 'shijiankuai', 'shijianguanli'],
      shortcut: 'Ctrl+J',
      action: () => {
        navigateTo('/timeblock')
      }
    },
    {
      id: 'navigation.flashcard',
      title: '记忆卡',
      category: CommandCategory.NAVIGATION,
      icon: 'StorageCardOne',
      keywords: ['闪卡', '记忆卡', 'flashcard', 'shanka', 'jiyika'],
      action: () => {
        navigateTo('/flashcard')
      }
    },
    {
      id: 'navigation.mindboard',
      title: '思维板',
      category: CommandCategory.NAVIGATION,
      icon: 'Workbench',
      keywords: ['思维板', '思维导图', 'mindboard', 'siweiban', 'siweidaotu'],
      shortcut: 'Ctrl+Shift+M',
      action: () => {
        navigateTo('/mindboard')
      }
    },
    {
      id: 'navigation.writing-desk',
      title: '写作台',
      category: CommandCategory.NAVIGATION,
      icon: 'Write',
      keywords: ['写作台', '写作', 'writing desk', 'xiezuotai', 'xiezuo'],
      action: () => {
        navigateTo('/writing-desk')
      }
    },
    {
      id: 'navigation.agent',
      title: 'AI 助手',
      category: CommandCategory.NAVIGATION,
      icon: 'NotebookAndPen',
      keywords: ['AI', '助手', '智能助手', 'agent', 'zhushou', 'zhinengzhushou'],
      action: () => {
        navigateTo('/agent')
      }
    },
    {
      id: 'navigation.trash',
      title: '回收站',
      category: CommandCategory.NAVIGATION,
      icon: 'RecycleBin',
      keywords: ['回收站', '垃圾桶', 'trash', 'huishouzhan', 'lajitong'],
      action: () => {
        navigateTo('/trash')
      }
    }
  ]
}
/**
 * 创建主题相关命令
 */
export function createThemeCommands(): Command[] {
  return [
    {
      id: 'theme.light',
      title: '亮色主题模式',
      category: CommandCategory.THEME,
      icon: 'Sun',
      keywords: [
        '亮色',
        '浅色',
        '白色',
        '主题',
        'light',
        'theme',
        'liangse',
        'qianse',
        'baise',
        'zhuti'
      ],
      shortcut: 'Ctrl+Shift+L',
      action: async () => {
        const settings = await getThemeSettings()
        await updateThemeSettings({ ...settings, themeMode: 'light' })
        sendThemeChangeToRenderer()
      }
    },
    {
      id: 'theme.dark',
      title: '暗色主题模式',
      category: CommandCategory.THEME,
      icon: 'Moon',
      keywords: [
        '暗色',
        '深色',
        '黑色',
        '主题',
        'dark',
        'theme',
        'anse',
        'shense',
        'heise',
        'zhuti'
      ],
      shortcut: 'Ctrl+Shift+D',
      action: async () => {
        const settings = await getThemeSettings()
        await updateThemeSettings({ ...settings, themeMode: 'dark' })
        sendThemeChangeToRenderer()
      }
    },
    {
      id: 'theme.system',
      title: '跟随系统主题模式',
      category: CommandCategory.THEME,
      icon: 'NaturalMode',
      keywords: ['系统', '自动', '主题', 'system', 'auto', 'theme', 'xitong', 'zidong', 'zhuti'],
      shortcut: 'Ctrl+Shift+S',
      action: async () => {
        const settings = await getThemeSettings()
        await updateThemeSettings({ ...settings, themeMode: 'system' })
        sendThemeChangeToRenderer()
      }
    },
    {
      id: 'theme.toggle',
      title: '循环切换主题模式',
      category: CommandCategory.THEME,
      icon: 'Switch',
      keywords: [
        '切换',
        '循环',
        '主题',
        '模式',
        'toggle',
        'theme',
        'mode',
        'qiehuan',
        'xunhuan',
        'zhuti',
        'moshi'
      ],
      shortcut: 'Ctrl+Shift+T',
      action: async () => {
        const settings = await getThemeSettings()
        // 在 light、dark 和 system 之间循环切换
        let newMode: 'light' | 'dark' | 'system'
        switch (settings.themeMode) {
          case 'light':
            newMode = 'dark'
            break
          case 'dark':
            newMode = 'system'
            break
          case 'system':
            newMode = 'light'
            break
          default:
            newMode = 'light'
        }
        await updateThemeSettings({ ...settings, themeMode: newMode })
        sendThemeChangeToRenderer()
      }
    },
    {
      id: 'theme.modern',
      title: '现代主题风格',
      category: CommandCategory.THEME,
      icon: 'Theme',
      keywords: ['现代', '风格', '样式', 'modern', 'style', 'xiandai', 'fengge', 'yangshi'],
      action: async () => {
        const settings = await getThemeSettings()
        if (settings.styleMode !== 'modern') {
          await updateThemeSettings({ ...settings, styleMode: 'modern' })
          sendThemeChangeToRenderer()
        }
      }
    },
    {
      id: 'theme.classic',
      title: '经典主题风格',
      category: CommandCategory.THEME,
      icon: 'Theme',
      keywords: ['经典', '风格', '样式', 'classic', 'style', 'jingdian', 'fengge', 'yangshi'],
      action: async () => {
        const settings = await getThemeSettings()
        if (settings.styleMode !== 'classic') {
          await updateThemeSettings({ ...settings, styleMode: 'classic' })
          sendThemeChangeToRenderer()
        }
      }
    },
    {
      id: 'theme.toggleStyle',
      title: '切换主题风格',
      category: CommandCategory.THEME,
      icon: 'Theme',
      keywords: ['切换', '风格', '样式', 'toggle', 'style', 'qiehuan', 'fengge', 'yangshi'],
      action: async () => {
        const settings = await getThemeSettings()
        const newStyle = settings.styleMode === 'modern' ? 'classic' : 'modern'
        await updateThemeSettings({ ...settings, styleMode: newStyle })
        sendThemeChangeToRenderer()
      }
    },
    {
      id: 'theme.toggleGradient',
      title: '切换现代主题风格渐变颜色',
      category: CommandCategory.THEME,
      icon: 'Theme',
      keywords: ['渐变', '切换', '模式', 'gradient', 'toggle', 'jianbian', 'qiehuan', 'moshi'],
      action: async () => {
        const settings = await getThemeSettings()
        const newMode = settings.gradientMode === 'universal' ? 'specific' : 'universal'
        await updateThemeSettings({ ...settings, gradientMode: newMode })
        sendThemeChangeToRenderer()
      }
    }
  ]
}

/**
 * 创建笔记相关命令
 */
export function createNoteCommands(): Command[] {
  return [
    {
      id: 'note.create',
      title: '创建新笔记',
      category: CommandCategory.NOTE,
      icon: 'Plus',
      keywords: ['新建', '创建', '笔记', 'new', 'note', 'xinjian', 'chuangjian', 'biji'],
      shortcut: 'Ctrl+N',
      action: () => {
        sendToRenderer('menu-new-note')
      }
    },
    {
      id: 'note.search',
      title: '搜索笔记',
      category: CommandCategory.NOTE,
      icon: 'Search',
      keywords: ['搜索', '查找', '笔记', 'search', 'note', 'sousuo', 'chazhao', 'biji'],
      shortcut: 'Ctrl+S',
      action: () => {
        sendToRenderer('open-search-modal')
      }
    }
  ]
}

/**
 * 创建设置相关命令
 */
export function createSettingsCommands(): Command[] {
  return [
    {
      id: 'settings.open',
      title: '打开设置',
      category: CommandCategory.SETTINGS,
      icon: 'Setting',
      keywords: ['设置', '偏好', '配置', 'settings', 'preferences', 'shezhi', 'pianhao', 'peizhi'],
      shortcut: 'Ctrl+,',
      action: () => {
        sendToRenderer('open-settings')
      }
    }
  ]
}

/**
 * 创建系统相关命令
 */
export function createSystemCommands(): Command[] {
  return [
    {
      id: 'system.reload',
      title: '重新加载应用',
      category: CommandCategory.SYSTEM,
      icon: 'Refresh',
      keywords: ['重载', '刷新', '重启', 'reload', 'refresh', 'zhongzai', 'shuaxin', 'chongqi'],
      action: () => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) {
          win.webContents.reload()
        }
      }
    },
    {
      id: 'system.toggleLeftSidebar',
      title: '切换左侧边栏显示',
      category: CommandCategory.SYSTEM,
      icon: 'ExpandRight',
      keywords: [
        '左侧边栏',
        '切换',
        '显示',
        '隐藏',
        'sidebar',
        'toggle',
        'zuocebianlan',
        'qiehuan',
        'xianshi',
        'yincang'
      ],
      shortcut: 'Cmd + /',
      action: () => {
        sendToRenderer('toggle-sidebar')
      }
    },
    {
      id: 'system.toggleRightSidebar',
      title: '切换右侧边栏显示',
      category: CommandCategory.SYSTEM,
      icon: 'ExpandLeft',
      keywords: [
        '右侧边栏',
        '切换',
        '显示',
        '隐藏',
        'sidebar',
        'toggle',
        'youcebianlan',
        'qiehuan',
        'xianshi',
        'yincang'
      ],
      shortcut: 'Cmd + Shift + /',
      action: () => {
        sendToRenderer('toggle-right-sidebar')
      }
    },
    {
      id: 'system.openCardbox',
      title: '打开右侧卡片盒',
      category: CommandCategory.SYSTEM,
      icon: 'Box',
      keywords: [
        '卡片盒',
        '侧边栏',
        '打开',
        'cardbox',
        'sidebar',
        'kapianhe',
        'cebianlan',
        'dakai'
      ],
      action: () => {
        sendToRenderer('open-right-sidebar-tab', 'cardbox')
      }
    },
    {
      id: 'system.openWidgets',
      title: '打开右侧小组件',
      category: CommandCategory.SYSTEM,
      icon: 'Components',
      keywords: [
        '小组件',
        '侧边栏',
        '打开',
        'widgets',
        'sidebar',
        'xiaozujian',
        'cebianlan',
        'dakai'
      ],
      action: () => {
        sendToRenderer('open-right-sidebar-tab', 'widgets')
      }
    },
    {
      id: 'system.openDrafts',
      title: '打开右侧草稿纸',
      category: CommandCategory.SYSTEM,
      icon: 'Notepad',
      keywords: [
        '草稿纸',
        '侧边栏',
        '打开',
        'drafts',
        'sidebar',
        'caogaozhi',
        'cebianlan',
        'dakai'
      ],
      action: () => {
        sendToRenderer('open-right-sidebar-tab', 'drafts')
      }
    },
    {
      id: 'system.openAssistant',
      title: '打开右侧AI助手',
      category: CommandCategory.SYSTEM,
      icon: 'Robot',
      keywords: [
        'AI助手',
        '智能助手',
        '侧边栏',
        '打开',
        'assistant',
        'sidebar',
        'zhushou',
        'zhinengzhushou',
        'cebianlan',
        'dakai'
      ],
      action: () => {
        sendToRenderer('open-right-sidebar-tab', 'assistant')
      }
    },
    {
      id: 'system.openIndex',
      title: '打开右侧索引',
      category: CommandCategory.SYSTEM,
      icon: 'ListAlphabet',
      keywords: ['索引', '侧边栏', '打开', 'index', 'sidebar', 'suoyin', 'cebianlan', 'dakai'],
      action: () => {
        sendToRenderer('open-right-sidebar-tab', 'index')
      }
    }
  ]
}

/**
 * 创建所有默认命令
 */
export function createAllDefaultCommands(): Command[] {
  return [
    ...createThemeCommands(),
    ...createNavigationCommands(),
    ...createNoteCommands(),
    ...createSettingsCommands(),
    ...createSystemCommands()
  ]
}

/**
 * 发送主题变更消息到渲染进程
 */
function sendThemeChangeToRenderer(): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    win.webContents.send('theme-changed')
  }
}

/**
 * 导航到指定路径
 */
function navigateTo(path: string): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    win.webContents.send('navigate-to', path)
  }
}

/**
 * 发送消息到渲染进程
 */
function sendToRenderer(channel: string, ...args: any[]): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    win.webContents.send(channel, ...args)
  }
}
