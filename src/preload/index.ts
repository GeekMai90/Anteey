import { contextBridge, ipcRenderer } from 'electron'
import type { Note, CardBox, UpdateUserSettings, UserSettings } from '@shared/types'
import { notesApi } from './api/notesApi'
import { tagApi } from './api/tagApi'
import { filterApi } from './api/filterApi'
import { localTreeApi } from './api/localTreeApi'
import { appearanceApi } from './api/appearanceApi'
import { knowledgeTreeApi } from './api/knowledgeTreeApi'
import { imageApi } from './api/imageApi'
import { licenseApi } from './api/licenseApi'
import { backupApi } from './api/backupApi'
import { timeBlockApi } from './api/timeBlockApi'
import { whiteboardApi } from './api/whiteboardApi'
import { webdavApi } from './api/webdavApi'
import { flashcardApi } from './api/flashcardApi'
import { noteVersionApi } from './api/noteVersionApi'
// 添加日志 API
contextBridge.exposeInMainWorld('electronLog', {
  info: (...args: any[]) => ipcRenderer.send('renderer-log', { level: 'info', args }),
  error: (...args: any[]) => ipcRenderer.send('renderer-log', { level: 'error', args }),
  warn: (...args: any[]) => ipcRenderer.send('renderer-log', { level: 'warn', args }),
  debug: (...args: any[]) => ipcRenderer.send('renderer-log', { level: 'debug', args })
})

contextBridge.exposeInMainWorld('electronAPI', {
  ...notesApi,
  ...tagApi,
  ...filterApi,
  ...localTreeApi,
  ...appearanceApi,
  ...knowledgeTreeApi,
  ...imageApi,
  ...licenseApi,
  ...backupApi,
  ...timeBlockApi,
  ...whiteboardApi,
  ...webdavApi,
  ...flashcardApi,
  ...noteVersionApi,
  getResourcePath: async (filename: string): Promise<string> => {
    try {
      return (await ipcRenderer.invoke('get-resource-path', filename)) as string
    } catch (error) {
      console.error('Preload: Failed to get resource path:', error)
      throw error
    }
  },

  createCardBox: async (name: string): Promise<CardBox> => {
    try {
      return (await ipcRenderer.invoke('create-card-box', name)) as CardBox
    } catch (error) {
      console.error('Preload: 创建卡片盒时出错:', error)
      throw error
    }
  },
  getAllCardBoxes: async (): Promise<CardBox[]> => {
    try {
      return (await ipcRenderer.invoke('get-all-card-boxes')) as CardBox[]
    } catch (error) {
      console.error('Preload: 获取所有卡片盒时出错:', error)
      throw error
    }
  },
  updateCardBox: async (id: string, name: string): Promise<CardBox | undefined> => {
    try {
      return (await ipcRenderer.invoke('update-card-box', { id, name })) as CardBox | undefined
    } catch (error) {
      console.error('Preload: 更新卡片盒时出错:', error)
      throw error
    }
  },
  deleteCardBox: async (id: string): Promise<void> => {
    try {
      return (await ipcRenderer.invoke('delete-card-box', id)) as void
    } catch (error) {
      console.error('Preload: 删除卡片盒时出错:', error)
      throw error
    }
  },

  updateNoteContent: async (id: string, content: any): Promise<Note> => {
    try {
      return (await ipcRenderer.invoke('update-note-content', id, content)) as Note
    } catch (error) {
      console.error('Preload: 更新笔记内容时出错:', error)
      throw error
    }
  },
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
  },

  // 获取白板数量
  getWhiteboardCount: async (): Promise<number> => {
    return (await ipcRenderer.invoke('get-whiteboard-count')) as number
  },
  // 获取用户使用天数
  getUserUsageDays: async (): Promise<number> => {
    return (await ipcRenderer.invoke('get-user-usage-days')) as number
  },
  // 获取随机笔记
  getRandomNotes: async (): Promise<Note[]> => {
    return (await ipcRenderer.invoke('get-random-notes')) as Note[]
  },
  // 将空笔记移到回收站
  moveEmptyNotesToTrash: async (): Promise<void> => {
    await ipcRenderer.invoke('move-empty-notes-to-trash')
  },
  // 获取所有已删除的笔记
  getAllDeletedNotes: async (): Promise<Note[]> => {
    return (await ipcRenderer.invoke('get-all-deleted-notes')) as Note[]
  },
  // 用户设置相关 API
  getUserSettings: async (): Promise<UserSettings> => {
    try {
      return await ipcRenderer.invoke('get-user-settings')
    } catch (error) {
      console.error('Preload: 获取用户设置失败:', error)
      throw error
    }
  },

  updateUserSettings: async (settings: UpdateUserSettings): Promise<UserSettings> => {
    try {
      return await ipcRenderer.invoke('update-user-settings', settings)
    } catch (error) {
      console.error('Preload: 更新用户设置失败:', error)
      throw error
    }
  },

  // 获取用户数据目录
  getUserDataPath: async (): Promise<string> => {
    return await ipcRenderer.invoke('get-user-data-path')
  },
  // 添加 openExternal 方法
  openExternal: (url: string): Promise<void> => {
    return ipcRenderer.invoke('open-external', url)
  },
  updateGlobalHotkey: async (
    newHotkey: string
  ): Promise<{ success: boolean; settings?: UserSettings }> => {
    try {
      return await ipcRenderer.invoke('update-global-hotkey', newHotkey)
    } catch (error) {
      console.error('Preload: 更新全局快捷键时出错:', error)
      throw error
    }
  }
})
