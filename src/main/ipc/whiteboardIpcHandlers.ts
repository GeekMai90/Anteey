import { ipcMain } from 'electron'
import type {
  ConnectionCreateData,
  ConnectionUpdateData,
  CreateWhiteboardInput,
  CreateWhiteboardNoteInput
} from '@shared/types'
import {
  createWhiteboard,
  getTopLevelWhiteboards,
  updateWhiteboardPosition,
  createWhiteboardNote,
  createRootWhiteboard,
  getRootWhiteboard,
  saveViewStateToRootWhiteboard,
  getRootWhiteboardViewState,
  saveViewStateToWhiteboard,
  getWhiteboardViewState,
  getCardCount,
  getWhiteboardNotes,
  getWhiteboardGroups,
  getWhiteboardSubboards,
  updateWhiteboardNotePosition,
  updateWhiteboardNoteSize,
  deleteWhiteboardNote,
  updateWhiteboardNoteAutoHeight,
  updateWhiteboardName,
  deleteWhiteboard,
  getWhiteboardCount,
  updateWhiteboardNoteContent,
  updateWhiteboardNoteStyle,
  createConnection,
  updateConnectionDescription,
  updateConnection,
  getConnectionsByWhiteboardId,
  deleteConnection
} from '../../services/notes/whiteboardService'

export function setupWhiteboardHandlers() {
  // 获取白板数量
  ipcMain.handle('get-whiteboard-count', async () => {
    try {
      const result = await getWhiteboardCount()
      return result
    } catch (error) {
      console.error('主进程 → 获取白板数量失败:', error)
      throw error
    }
  })
  // 删除白板
  ipcMain.handle('delete-whiteboard', async (_, id: string) => {
    try {
      const result = await deleteWhiteboard(id)
      return result
    } catch (error) {
      console.error('主进程 → 删除白板时出错:', error)
      return { success: false, error: error as string }
    }
  })
  // 更新白板名称
  ipcMain.handle('update-whiteboard-name', async (_, id: string, name: string) => {
    try {
      const updatedWhiteboard = await updateWhiteboardName(id, name)
      return updatedWhiteboard
    } catch (error) {
      console.error('主进程 → 更新白板名称时出错:', error)
      return { success: false, error: error }
    }
  })
  // 更新白板笔记的自动高度
  ipcMain.handle(
    'update-whiteboard-note-auto-height',
    async (_, id: string, isAutoHeight: boolean) => {
      try {
        const updatedWhiteboardNote = await updateWhiteboardNoteAutoHeight(id, isAutoHeight)
        return updatedWhiteboardNote
      } catch (error) {
        console.error('主进程 → 更新白板笔记自动高度时出错:', error)
        return { success: false, error: error }
      }
    }
  )
  // 删除白板笔记
  ipcMain.handle('delete-whiteboard-note', async (_, id: string) => {
    try {
      console.log('主进程 → 删除白板笔记:', id)
      await deleteWhiteboardNote(id)
      console.log('主进程 → 删除白板笔记成功:', id)
      return { success: true }
    } catch (error) {
      console.error('主进程 → 删除白板笔记时出错:', error)
      return { success: false, error: error }
    }
  })
  // 更新白板笔记的大小
  ipcMain.handle('update-whiteboard-note-size', async (_, { id, width, height }) => {
    try {
      const updatedWhiteboardNote = await updateWhiteboardNoteSize(id, width, height)
      return updatedWhiteboardNote
    } catch (error) {
      console.error('主进程 → 更新白板笔记大小时出错:', error)
      return { success: false, error: error }
    }
  })
  // 更新白板笔记的位置
  ipcMain.handle('update-whiteboard-note-position', async (_, { id, x, y }) => {
    try {
      const updatedWhiteboardNote = await updateWhiteboardNotePosition(id, x, y)
      return updatedWhiteboardNote
    } catch (error) {
      console.error('主进程 → 更新白板笔记位置时出错:', error)
      return { success: false, error: error }
    }
  })
  // 获取白板中的所有白板
  ipcMain.handle('get-whiteboard-subboards', async (_, { whiteboardId }) => {
    try {
      const whiteboardSubboards = await getWhiteboardSubboards(whiteboardId)
      return whiteboardSubboards
    } catch (error) {
      console.error('主进程 → 获取白板中的白板时出错:', error)
      return { success: false, error: error }
    }
  })
  // 获取白板中的所有分组
  ipcMain.handle('get-whiteboard-groups', async (_, { whiteboardId }) => {
    try {
      const whiteboardGroups = await getWhiteboardGroups(whiteboardId)
      return whiteboardGroups
    } catch (error) {
      console.error('主进程 → 获取白板中的分组时出错:', error)
      return { success: false, error: error }
    }
  })
  // 获取白板中的所有白板笔记
  ipcMain.handle('get-whiteboard-notes', async (_, { whiteboardId }) => {
    try {
      const whiteboardNotes = await getWhiteboardNotes(whiteboardId)
      return whiteboardNotes
    } catch (error) {
      console.error('主进程 → 获取白板中的笔记时出错:', error)
      return { success: false, error: error }
    }
  })
  // 获取白板中的卡片数量
  ipcMain.handle('get-card-count', async (_, { whiteboardId }) => {
    try {
      const cardCount = await getCardCount(whiteboardId)
      return cardCount
    } catch (error) {
      console.error('主进程 → 获取白板中的卡片数量时出错:', error)
      return { success: false, error: error }
    }
  })

  //获取白板视图状态
  ipcMain.handle('get-whiteboard-view-state', async (_, { whiteboardId }) => {
    try {
      console.log('主进程 → 获取白板视图状态:', whiteboardId)
      const viewState = await getWhiteboardViewState(whiteboardId)
      console.log('主进程 → 获取白板视图状态成功:', viewState)
      return viewState
    } catch (error) {
      console.error('主进程 → 获取白板视图状态时出错:', error)
      return { success: false, error: error }
    }
  })
  //保存视图状态到白板
  ipcMain.handle(
    'save-view-state-to-whiteboard',
    async (_, { whiteboardId, scale, translateX, translateY }) => {
      try {
        console.log('主进程 → 保存视图状态到白板:', { whiteboardId, scale, translateX, translateY })
        const result = await saveViewStateToWhiteboard(whiteboardId, scale, translateX, translateY)
        console.log('主进程 → 保存视图状态到白板成功:', result)
        return result
      } catch (error) {
        console.error('主进程 → 保存视图状态到白板时出错:', error)
        return { success: false, error: error }
      }
    }
  )
  // 获取根白板的视图状态
  ipcMain.handle('get-root-whiteboard-view-state', async () => {
    try {
      console.log('主进程 → 获取根白板的视图状态')
      const viewState = await getRootWhiteboardViewState()
      console.log('主进程 → 获取根白板的视图状态成功:', viewState)
      return viewState
    } catch (error) {
      console.error('主进程 → 获取根白板的视图状态时出错:', error)
      return { success: false, error: error }
    }
  })

  // 保存视图状态到根白板
  ipcMain.handle(
    'save-view-state-to-root-whiteboard',
    async (_, { scale, translateX, translateY }) => {
      try {
        console.log('主进程 → 保存视图状态到根白板:', { scale, translateX, translateY })
        const result = await saveViewStateToRootWhiteboard(scale, translateX, translateY)
        console.log('主进程 → 保存视图状态到根白板成功:', result)
        return result
      } catch (error) {
        console.error('主进程 → 保存视图状态到根白板时出错:', error)
        return { success: false, error: error }
      }
    }
  )
  // 获取根白板
  ipcMain.handle('get-root-whiteboard', async () => {
    try {
      console.log('主进程 → 获取根白板')
      const rootWhiteboard = await getRootWhiteboard()
      console.log('主进程 → 获取根白板成功:', rootWhiteboard)
      return rootWhiteboard
    } catch (error) {
      console.error('主进程 → 获取根白板时出错:', error)
      return { success: false, error: error }
    }
  })
  // 创建根白板
  ipcMain.handle('create-root-whiteboard', async () => {
    try {
      console.log('主进程 → 创建根白板')
      const newRootWhiteboard = await createRootWhiteboard()
      console.log('主进程 → 创建根白板成功:', newRootWhiteboard)
      return newRootWhiteboard
    } catch (error) {
      console.error('主进程 → 创建根白板时出错:', error)
      return { success: false, error: error }
    }
  })
  // 创建白板笔记
  ipcMain.handle('create-whiteboard-note', async (_, input: CreateWhiteboardNoteInput) => {
    try {
      console.log('主进程 → 创建白板笔记:', input)
      const newWhiteboardNote = await createWhiteboardNote(input)
      console.log('主进程 → 创建白板笔记成功:', newWhiteboardNote)
      return newWhiteboardNote
    } catch (error) {
      console.error('主进程 → 创建白板笔记时出错:', error)
      return { success: false, error: error }
    }
  })
  // 更新白板位置
  ipcMain.handle('update-whiteboard-position', async (_, { id, x, y }) => {
    try {
      console.log('主进程 → 更新白板位置:', { id, x, y })
      const updatedWhiteboard = await updateWhiteboardPosition(id, x, y)
      console.log('主进程 → 更新白板位置成功:', updatedWhiteboard)
      return updatedWhiteboard
    } catch (error) {
      console.error('主进程 → 更新白板位置时出错:', error)
      return { success: false, error: error }
    }
  })
  // 获取所有顶层白板
  ipcMain.handle('get-top-level-whiteboards', async () => {
    try {
      console.log('主进程 → 获取顶层白板')
      const whiteboards = await getTopLevelWhiteboards()
      console.log('主进程 → 获取顶层白板成功:', whiteboards)
      return whiteboards
    } catch (error) {
      console.error('主进程 → 获取顶层白板时出错:', error)
      return { success: false, error: error }
    }
  })
  // 创建白板
  ipcMain.handle('create-whiteboard', async (_, input: CreateWhiteboardInput) => {
    try {
      console.log('主进程 → 创建白板:', input)
      const newWhiteboard = await createWhiteboard(input)
      console.log('主进程 → 创建白板成功:', newWhiteboard)
      return newWhiteboard
    } catch (error) {
      console.error('主进程 → 创建白板时出错:', error)
      return { success: false, error: error }
    }
  })
  // 新增：更新白板笔记内容（用于文本类型）
  ipcMain.handle('update-whiteboard-note-content', async (_, { id, content }) => {
    try {
      const updatedWhiteboardNote = await updateWhiteboardNoteContent(id, content)
      return updatedWhiteboardNote
    } catch (error) {
      console.error('主进程 → 更新白板笔记内容时出错:', error)
      return { success: false, error: error }
    }
  })

  // 新增：更新白板笔记样式
  ipcMain.handle('update-whiteboard-note-style', async (_, { id, style }) => {
    try {
      const updatedWhiteboardNote = await updateWhiteboardNoteStyle(id, style)
      return updatedWhiteboardNote
    } catch (error) {
      console.error('主进程 → 更新白板笔记样式时出错:', error)
      return { success: false, error: error }
    }
  })

  // 创建连线
  ipcMain.handle('create-connection', async (_, connection: ConnectionCreateData) => {
    try {
      const newConnection = await createConnection(connection)
      return newConnection
    } catch (error) {
      console.error('主进程 → 创建连线时出错:', error)
      return { success: false, error: error }
    }
  })
  // 更新连线描述
  ipcMain.handle('update-connection-description', async (_, id: string, description: string) => {
    try {
      console.log('主进程 → 更新连线描述:', id, description)
      const updatedConnection = await updateConnectionDescription(id, description)
      return { success: true, connection: updatedConnection }
    } catch (error) {
      console.error('主进程 → 更新连线描述时出错:', error)
      return { success: false, error: error }
    }
  })
  // 更新连线
  ipcMain.handle('update-connection', async (_, connection: ConnectionUpdateData) => {
    try {
      const updatedConnection = await updateConnection(connection)
      return updatedConnection
    } catch (error) {
      console.error('主进程 → 更新连线时出错:', error)
      return { success: false, error: error }
    }
  })
  // 获取白板中的所有连线
  ipcMain.handle('get-connections-by-whiteboard-id', async (_, { whiteboardId }) => {
    try {
      const connections = await getConnectionsByWhiteboardId(whiteboardId)
      return connections
    } catch (error) {
      console.error('主进程 → 获取白板中的连线时出错:', error)
      return { success: false, error: error }
    }
  })
  //删除连线
  ipcMain.handle('delete-connection', async (_, id: string) => {
    console.log('主进程 → 正在删除连线:', id)
    try {
      await deleteConnection(id)
      console.log('主进程 → 删除连线成功:', id)
      return { success: true }
    } catch (error) {
      console.error('主进程 → 删除连线时出错:', error)
      return { success: false, error: error }
    }
  })
}
