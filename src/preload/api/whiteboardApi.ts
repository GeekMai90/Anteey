import { ipcRenderer } from 'electron'
import type {
  CreateWhiteboardInput,
  Whiteboard,
  WhiteboardNote,
  RootWhiteboard,
  WhiteboardGroup,
  Connection,
  CreateWhiteboardNoteInput,
  ConnectionUpdateData,
  ConnectionCreateData
} from '@shared/types'

export const whiteboardApi = {
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
  // 更新白板笔记内容
  updateWhiteboardNoteContent: async (id: string, content: object): Promise<WhiteboardNote> => {
    try {
      return (await ipcRenderer.invoke('update-whiteboard-note-content', {
        id,
        content
      })) as WhiteboardNote
    } catch (error) {
      console.error('Preload: 更新白板笔记内容时出错:', error)
      throw error
    }
  },

  // 新增：更新白板笔记样式
  updateWhiteboardNoteStyle: async (
    id: string,
    style: WhiteboardNote['style']
  ): Promise<WhiteboardNote> => {
    try {
      return (await ipcRenderer.invoke('update-whiteboard-note-style', {
        id,
        style
      })) as WhiteboardNote
    } catch (error) {
      console.error('Preload: 更新白板笔记样式时出错:', error)
      throw error
    }
  },

  // 获取白板数量
  getWhiteboardCount: async (): Promise<number> => {
    return (await ipcRenderer.invoke('get-whiteboard-count')) as number
  }
}
