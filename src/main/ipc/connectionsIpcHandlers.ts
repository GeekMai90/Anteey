import { ipcMain } from 'electron'
import { ConnectionCreateData, ConnectionUpdateData } from '../../renderer/src/types/Note'
import {
  createConnection,
  updateConnection,
  getConnectionsByWhiteboardId,
  deleteConnection,
  updateConnectionDescription
} from '../../services/notes/connections'

export function setupConnectionsHandlers() {
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
