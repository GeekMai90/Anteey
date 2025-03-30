import { contextBridge, ipcRenderer } from 'electron'
import { notesApi } from './api/notesApi'
import { tagApi } from './api/tagApi'
import { filterApi } from './api/filterApi'
import { localTreeApi } from './api/localTreeApi'
import { userSettingsApi } from './api/userSettingsApi'
import { knowledgeTreeApi } from './api/knowledgeTreeApi'
import { imageApi } from './api/imageApi'
import { licenseApi } from './api/licenseApi'
import { backupApi } from './api/backupApi'
import { timeBlockApi } from './api/timeBlockApi'
import { webdavApi } from './api/webdavApi'
import { flashcardApi } from './api/flashcardApi'
import { noteVersionApi } from './api/noteVersionApi'
import { analyticsApi } from './api/analyticsApi'
import { draftsApi } from './api/draftsApi'
import { themeApi } from './api/themeApi'
import { windowApi } from './api/windowApi'
import { pomodoroApi } from './api/pomodoroApi'
import { dailyQuotesApi } from './api/dailyquotesApi'
import { lifeGuideApi } from './api/lifeGuideApi'
import { reviewApi } from './api/reviewApi'
import { taskApi } from './api/taskApi'
import { authApi } from './api/authApi'
import { modelConfigApi, systemPromptApi } from './api/llmConfigApi'
import { mindboardApi } from './api/mindboardApi'
import { s3Api } from './api/s3Api'
import { cloudSyncApi } from './api/cloudSyncApi'
import { dinoxApi } from './api/dinoxApi'
import { letterApi } from './api/letterApi'
import { exportApi } from './api/exportApi'
import { writingDeskApi } from './api/writingDeskApi'
import { setupWritingPromptTemplateApi } from './api/writingPromptTemplateApi'
import { agentApi } from './api/agentApi'
import { aiChatApi } from './api/aiChatApi'
import { mindEchoApi } from './api/mindEchoApi'
import { readwiseApi } from './api/readwiseApi'
import { noteAIProcessApi } from './api/noteAIProcessApi'
// 添加日志 API
contextBridge.exposeInMainWorld('electronLog', {
  info: (...args: any[]) => ipcRenderer.send('renderer-log', { level: 'info', args }),
  error: (...args: any[]) => ipcRenderer.send('renderer-log', { level: 'error', args }),
  warn: (...args: any[]) => ipcRenderer.send('renderer-log', { level: 'warn', args }),
  debug: (...args: any[]) => ipcRenderer.send('renderer-log', { level: 'debug', args })
})

// 定义事件处理函数类型
type IpcEventHandler = (...args: any[]) => void

// 添加事件监听器
const listeners: { [key: string]: IpcEventHandler[] } = {}

// 注册监听器
function addListener(channel: string, handler: IpcEventHandler) {
  if (!listeners[channel]) {
    listeners[channel] = []
  }
  listeners[channel].push(handler)

  // 实际添加 ipcRenderer 监听器
  ipcRenderer.on(channel, (...args) => {
    console.log('预加载脚本→ 收到IPC事件:', channel, args)
    listeners[channel].forEach((f) => f(...args))
  })
}

// 移除监听器
function removeListener(channel: string, handler: IpcEventHandler) {
  if (!listeners[channel]) return
  const index = listeners[channel].indexOf(handler)
  if (index > -1) {
    listeners[channel].splice(index, 1)
  }
}

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  note: {
    ...notesApi
  },
  systemMenu: {
    removeAllListeners: async (channel: string) => {
      try {
        ipcRenderer.removeAllListeners(channel)
      } catch (error) {
        console.error('Preload: 移除所有监听器时出错:', error)
        throw error
      }
    },
    // 监听菜单新建笔记事件
    onMenuNewNote: (callback: () => void) => {
      ipcRenderer.on('menu-new-note', () => callback())
    },
    // 监听菜单导出所有笔记事件
    onMenuExportNotes: (callback: () => void) => {
      ipcRenderer.on('menu-export-notes', () => callback())
    }
  },
  analytics: {
    ...analyticsApi
  },
  userSettings: {
    ...userSettingsApi
  },
  tag: {
    ...tagApi
  },
  customFilter: {
    ...filterApi
  },
  knowledgeTree: {
    ...localTreeApi,
    ...knowledgeTreeApi
  },
  image: {
    ...imageApi
  },
  activation: {
    ...licenseApi
  },
  backup: {
    ...backupApi
  },
  timeBlock: {
    ...timeBlockApi
  },
  shell: {
    // 添加 openExternal 方法
    openExternal: (url: string): Promise<void> => {
      return ipcRenderer.invoke('open-external', url)
    },
    getResourcePath: async (filename: string): Promise<string> => {
      try {
        return (await ipcRenderer.invoke('get-resource-path', filename)) as string
      } catch (error) {
        console.error('Preload: Failed to get resource path:', error)
        throw error
      }
    }
  },
  webDAV: {
    ...webdavApi
  },
  flashcard: {
    ...flashcardApi
  },
  noteVersion: {
    ...noteVersionApi
  },
  drafts: {
    ...draftsApi
  },
  theme: {
    ...themeApi
  },
  window: windowApi,
  pomodoro: {
    ...pomodoroApi
  },
  dailyQuotes: {
    ...dailyQuotesApi
  },
  lifeGuide: {
    ...lifeGuideApi
  },
  review: {
    ...reviewApi
  },
  task: {
    ...taskApi
  },
  auth: {
    ...authApi
  },
  modelConfig: {
    ...modelConfigApi
  },
  mindboard: {
    ...mindboardApi
  },
  s3: {
    ...s3Api
  },
  cloudSync: {
    ...cloudSyncApi
  },
  dinox: dinoxApi,
  letter: {
    ...letterApi
  },
  export: {
    ...exportApi
  },
  writingDesk: {
    ...writingDeskApi
  },
  writingPromptTemplate: {
    ...setupWritingPromptTemplateApi()
  },
  agent: {
    ...agentApi
  },
  aiChat: {
    ...aiChatApi
  },
  mindEcho: {
    ...mindEchoApi
  },
  readwise: {
    ...readwiseApi
  },
  // 添加事件相关的 API
  events: {
    on: addListener,
    off: removeListener
  },
  noteAIProcess: {
    ...noteAIProcessApi
  }
})

contextBridge.exposeInMainWorld('modelConfigApi', modelConfigApi)
contextBridge.exposeInMainWorld('systemPromptApi', systemPromptApi)
