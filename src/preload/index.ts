import { contextBridge, ipcRenderer } from 'electron'
import {
  Note,
  CardBox,
  Whiteboard,
  CreateWhiteboardInput,
  CreateWhiteboardNoteInput,
  WhiteboardNote,
  RootWhiteboard,
  WhiteboardGroup,
  Connection,
  ConnectionCreateData,
  ConnectionUpdateData
} from '../renderer/src/types/Note'
import { UpdateUserSettings, UserSettings } from '../renderer/src/types/UserSettings'
import { notesApi } from './api/notesApi'
import { tagApi } from './api/tagApi'
import { filterApi } from './api/filterApi'
import { embeddingApi } from './api/embeddingApi'
import { dictionaryApi } from './api/dictionaryApi'
import { ragApi } from './api/ragApi'
import { llmConfigApi } from './api/llmConfigApi'
import { localTreeApi } from './api/localTreeApi'
import { appearanceApi } from './api/appearanceApi'
import { tldrawApi } from './api/tldrawApi'
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
  ...embeddingApi,
  ...dictionaryApi,
  ...ragApi,
  ...llmConfigApi,
  ...localTreeApi,
  ...appearanceApi,
  ...tldrawApi,
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
  createWhiteboard: async (input: CreateWhiteboardInput): Promise<Whiteboard> => {
    try {
      console.log('Preload: 正在创建白板:', input)
      return (await ipcRenderer.invoke('create-whiteboard', input)) as Whiteboard
    } catch (error) {
      console.error('Preload: 创建白板时出错:', error)
      throw error
    }
  },
  getTopLevelWhiteboards: async (): Promise<Whiteboard[]> => {
    try {
      console.log('Preload: 正在获取顶层白板')
      return (await ipcRenderer.invoke('get-top-level-whiteboards')) as Whiteboard[]
    } catch (error) {
      console.error('Preload: 获取顶层白板时出错:', error)
      throw error
    }
  },
  updateWhiteboardPosition: async (id: string, x: number, y: number): Promise<Whiteboard> => {
    try {
      console.log('Preload: 正在更新白板位置:', { id, x, y })
      return (await ipcRenderer.invoke('update-whiteboard-position', { id, x, y })) as Whiteboard
    } catch (error) {
      console.error('Preload: 更新白板位置时出错:', error)
      throw error
    }
  },
  createWhiteboardNote: async (input: CreateWhiteboardNoteInput): Promise<WhiteboardNote> => {
    try {
      console.log('Preload: 正在创建白板笔记:', input)
      return (await ipcRenderer.invoke('create-whiteboard-note', input)) as WhiteboardNote
    } catch (error) {
      console.error('Preload: 创建白板笔记时出错:', error)
      throw error
    }
  },
  createRootWhiteboard: async (): Promise<RootWhiteboard> => {
    try {
      console.log('Preload: 正在创建根白板')
      return (await ipcRenderer.invoke('create-root-whiteboard')) as RootWhiteboard
    } catch (error) {
      console.error('Preload: 创建根白板时出错:', error)
      throw error
    }
  },
  getRootWhiteboard: async (): Promise<RootWhiteboard> => {
    try {
      console.log('Preload: 正在获取根白板')
      return (await ipcRenderer.invoke('get-root-whiteboard')) as RootWhiteboard
    } catch (error) {
      console.error('Preload: 获取根白板时出错:', error)
      throw error
    }
  },
  saveViewStateToRootWhiteboard: async (scale: number, translateX: number, translateY: number) => {
    try {
      console.log('Preload: 正在保存视图状态到根白板:', { scale, translateX, translateY })
      return (await ipcRenderer.invoke('save-view-state-to-root-whiteboard', {
        scale,
        translateX,
        translateY
      })) as boolean
    } catch (error) {
      console.error('Preload: 保存视图状态到根白板时出错:', error)
      throw error
    }
  },
  getRootWhiteboardViewState: async (): Promise<{
    scale: number
    translateX: number
    translateY: number
  }> => {
    try {
      return (await ipcRenderer.invoke('get-root-whiteboard-view-state')) as {
        scale: number
        translateX: number
        translateY: number
      }
    } catch (error) {
      console.error('Preload: 获取根白板的视图状态时出错:', error)
      throw error
    }
  },
  // 保存视图状态到白板
  saveViewStateToWhiteboard: async (
    whiteboardId: string,
    scale: number,
    translateX: number,
    translateY: number
  ) => {
    try {
      console.log('Preload: 正在保存视图状态到白板:', {
        whiteboardId,
        scale,
        translateX,
        translateY
      })
      return (await ipcRenderer.invoke('save-view-state-to-whiteboard', {
        whiteboardId,
        scale,
        translateX,
        translateY
      })) as boolean
    } catch (error) {
      console.error('Preload: 保存视图状态到白板时出错:', error)
      throw error
    }
  },
  // 获取白板视图状态
  getWhiteboardViewState: async (
    whiteboardId: string
  ): Promise<{
    scale: number
    translateX: number
    translateY: number
  }> => {
    try {
      return (await ipcRenderer.invoke('get-whiteboard-view-state', { whiteboardId })) as {
        scale: number
        translateX: number
        translateY: number
      }
    } catch (error) {
      console.error('Preload: 获取白板视图状态时出错:', error)
      throw error
    }
  },

  // 获取白板中的卡片数量
  getCardCount: async (whiteboardId: string): Promise<number> => {
    try {
      return (await ipcRenderer.invoke('get-card-count', { whiteboardId })) as number
    } catch (error) {
      console.error('Preload: 获取白板中的卡片数量时出错:', error)
      throw error
    }
  },
  // 获取白板中的所有白板笔记
  getWhiteboardNotes: async (whiteboardId: string): Promise<WhiteboardNote[]> => {
    try {
      return (await ipcRenderer.invoke('get-whiteboard-notes', {
        whiteboardId
      })) as WhiteboardNote[]
    } catch (error) {
      console.error('Preload: 获取白板中的笔记时出错:', error)
      throw error
    }
  },
  // 获取白板中的所有分组
  getWhiteboardGroups: async (whiteboardId: string): Promise<WhiteboardGroup[]> => {
    try {
      return (await ipcRenderer.invoke('get-whiteboard-groups', {
        whiteboardId
      })) as WhiteboardGroup[]
    } catch (error) {
      console.error('Preload: 获取白板中的分组时出错:', error)
      throw error
    }
  },
  // 获取白板中的所有白板
  getWhiteboardSubboards: async (whiteboardId: string): Promise<Whiteboard[]> => {
    try {
      return (await ipcRenderer.invoke('get-whiteboard-subboards', {
        whiteboardId
      })) as Whiteboard[]
    } catch (error) {
      console.error('Preload: 获取白板中的白板时出错:', error)
      throw error
    }
  },
  // 更新白板笔记的位置
  updateWhiteboardNotePosition: async (
    id: string,
    x: number,
    y: number
  ): Promise<WhiteboardNote> => {
    try {
      return (await ipcRenderer.invoke('update-whiteboard-note-position', {
        id,
        x,
        y
      })) as WhiteboardNote
    } catch (error) {
      console.error('Preload: 更新白板笔记位置时出错:', error)
      throw error
    }
  },
  // 更新白板笔记的大小
  updateWhiteboardNoteSize: async (
    id: string,
    width: number,
    height: number
  ): Promise<WhiteboardNote> => {
    try {
      return (await ipcRenderer.invoke('update-whiteboard-note-size', {
        id,
        width,
        height
      })) as WhiteboardNote
    } catch (error) {
      console.error('Preload: 更新白板笔记大小时出错:', error)
      throw error
    }
  },
  // 创建连线
  createConnection: async (connection: ConnectionCreateData): Promise<Connection> => {
    try {
      return (await ipcRenderer.invoke('create-connection', connection)) as Connection
    } catch (error) {
      console.error('Preload: 创建连线时出错:', error)
      throw error
    }
  },
  // 更新连线
  updateConnection: async (connection: ConnectionUpdateData): Promise<Connection> => {
    try {
      return (await ipcRenderer.invoke('update-connection', connection)) as Connection
    } catch (error) {
      console.error('Preload: 更新连线时出错:', error)
      throw error
    }
  },
  // 删除连线
  deleteConnection: async (id: string): Promise<boolean> => {
    console.log('Preload: 正在删除连线:', id)
    try {
      return (await ipcRenderer.invoke('delete-connection', id)) as boolean
    } catch (error) {
      console.error('Preload: 删除连线时出错:', error)
      throw error
    }
  },
  // 获取白板中的所有连线
  getConnectionsByWhiteboardId: async (whiteboardId: string): Promise<Connection[]> => {
    try {
      return (await ipcRenderer.invoke('get-connections-by-whiteboard-id', {
        whiteboardId
      })) as Connection[]
    } catch (error) {
      console.error('Preload: 获取白板中的连线时出错:', error)
      throw error
    }
  },
  // 更新连线描述
  updateConnectionDescription: async (id: string, description: string): Promise<Connection> => {
    try {
      return (await ipcRenderer.invoke(
        'update-connection-description',
        id,
        description
      )) as Connection
    } catch (error) {
      console.error('Preload: 更新连线描述时出错:', error)
      throw error
    }
  },
  // 删除白板笔记
  deleteWhiteboardNote: async (id: string): Promise<boolean> => {
    try {
      return (await ipcRenderer.invoke('delete-whiteboard-note', id)) as boolean
    } catch (error) {
      console.error('Preload: 删除白板笔记时出错:', error)
      throw error
    }
  },
  // 更新白板笔记的自动高度
  updateWhiteboardNoteAutoHeight: async (
    id: string,
    isAutoHeight: boolean
  ): Promise<WhiteboardNote> => {
    try {
      return (await ipcRenderer.invoke(
        'update-whiteboard-note-auto-height',
        id,
        isAutoHeight
      )) as WhiteboardNote
    } catch (error) {
      console.error('Preload: 更新白板笔记自动高度时出错:', error)
      throw error
    }
  },
  updateWhiteboardName: async (id: string, name: string): Promise<Whiteboard> => {
    try {
      return (await ipcRenderer.invoke('update-whiteboard-name', id, name)) as Whiteboard
    } catch (error) {
      console.error('Preload: 更新白板名称时出错:', error)
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
  deleteWhiteboard: async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      return (await ipcRenderer.invoke('delete-whiteboard', id)) as {
        success: boolean
        error?: string
      }
    } catch (error) {
      console.error('Preload: 删除白板时出错:', error)
      throw error
    }
  },
  getImagePath: async (relativePath: string): Promise<string> => {
    try {
      const imagePath = await ipcRenderer.invoke('get-image-path', relativePath)
      if (typeof imagePath !== 'string') {
        throw new Error('Invalid image path returned')
      }
      // 确保返回的路径以 file:// 开头
      return imagePath.startsWith('file://') ? imagePath : `file://${imagePath}`
    } catch (error) {
      console.error('Preload: 获取图片路径时出错:', error)
      throw error
    }
  },

  uploadImage: async (
    filePath: string
  ): Promise<{ success: boolean; path?: string; error?: string }> => {
    try {
      const result = await ipcRenderer.invoke('upload-image', filePath)
      if (typeof result !== 'object' || result === null) {
        throw new Error('Invalid upload result')
      }
      // 确保返回的路径以 file:// 开头
      if (result.success && result.path && !result.path.startsWith('file://')) {
        result.path = `file://${result.path}`
      }
      return result as { success: boolean; path?: string; error?: string }
    } catch (error) {
      console.error('Preload: 上传图片时出错:', error)
      throw error
    }
  },
  downloadImage: async (
    url: string,
    filename: string
  ): Promise<{ success: boolean; path?: string; error?: string }> => {
    try {
      return (await ipcRenderer.invoke('download-image', { url, filename })) as {
        success: boolean
        path?: string
        error?: string
      }
    } catch (error) {
      console.error('Preload: 下载图片时出错:', error)
      throw error
    }
  },
  copyImage: async (
    imageUrl: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      return (await ipcRenderer.invoke('copy-image', imageUrl)) as {
        success: boolean
        message?: string
        error?: string
      }
    } catch (error) {
      console.error('Preload: 复制图片时出错:', error)
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
