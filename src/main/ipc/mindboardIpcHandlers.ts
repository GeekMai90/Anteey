import { ipcMain } from 'electron'
import {
  createMindBoard,
  getMindBoard,
  createMindBoardElement,
  createMindBoardConnection,
  updateMindBoard,
  updateMindBoardElement,
  updateMindBoardConnection,
  deleteMindBoard,
  deleteMindBoardElement,
  deleteMindBoardConnection,
  getAllMindBoards
  // 其他方法待实现
} from '../../services/mindboard/mindboardService'
import type {
  MindBoard,
  TextCard,
  NoteCard,
  ImageCard,
  Group,
  MindBoardConnection
} from '../../renderer/src/types/mindboard'

export function setupMindBoardHandlers() {
  // 创建思维板
  ipcMain.handle('create-mind-board', async (_event, data: Partial<MindBoard>) => {
    try {
      const newBoard = await createMindBoard(data)
      return { success: true, board: newBoard }
    } catch (error) {
      console.error('主进程→ 创建思维板失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取思维板详情
  ipcMain.handle('get-mind-board', async (_event, id: string) => {
    try {
      const board = await getMindBoard(id)
      return { success: true, board }
    } catch (error) {
      console.error('主进程→ 获取思维板失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 创建元素
  ipcMain.handle(
    'create-mind-board-element',
    async (
      _event,
      { boardId, element }: { boardId: string; element: TextCard | NoteCard | ImageCard | Group }
    ) => {
      try {
        const newElement = await createMindBoardElement(boardId, element)
        return { success: true, element: newElement }
      } catch (error) {
        console.error('主进程→ 创建思维板元素失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 创建连接
  ipcMain.handle(
    'create-mind-board-connection',
    async (
      _event,
      { boardId, connection }: { boardId: string; connection: Omit<MindBoardConnection, 'id'> }
    ) => {
      try {
        const newConnection = await createMindBoardConnection(boardId, connection)
        return { success: true, connection: newConnection }
      } catch (error) {
        console.error('主进程→ 创建思维板连接失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 更新思维板
  ipcMain.handle(
    'update-mind-board',
    async (_event, { id, updateData }: { id: string; updateData: Partial<MindBoard> }) => {
      try {
        const updatedBoard = await updateMindBoard(id, updateData)
        return { success: true, board: updatedBoard }
      } catch (error) {
        console.error('主进程→ 更新思维板失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 更新元素
  ipcMain.handle(
    'update-mind-board-element',
    async (
      _event,
      {
        id,
        updateData
      }: { id: string; updateData: Partial<TextCard | NoteCard | ImageCard | Group> }
    ) => {
      try {
        const updatedElement = await updateMindBoardElement(id, updateData)
        return { success: true, element: updatedElement }
      } catch (error) {
        console.error('主进程→ 更新思维板元素失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 更新连接
  ipcMain.handle(
    'update-mind-board-connection',
    async (
      _event,
      { id, updateData }: { id: string; updateData: Partial<MindBoardConnection> }
    ) => {
      try {
        const updatedConnection = await updateMindBoardConnection(id, updateData)
        return { success: true, connection: updatedConnection }
      } catch (error) {
        console.error('主进程→ 更新思维板连接失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 删除思维板
  ipcMain.handle('delete-mind-board', async (_event, id: string) => {
    try {
      await deleteMindBoard(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除思维板失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 删除元素
  ipcMain.handle('delete-mind-board-element', async (_event, id: string) => {
    try {
      await deleteMindBoardElement(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除思维板元素失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 删除连接
  ipcMain.handle('delete-mind-board-connection', async (_event, id: string) => {
    try {
      await deleteMindBoardConnection(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除思维板连接失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取所有思维板列表
  ipcMain.handle('get-all-mind-boards', async () => {
    try {
      const boards = await getAllMindBoards()
      return { success: true, boards }
    } catch (error) {
      console.error('主进程→ 获取所有思维板失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
