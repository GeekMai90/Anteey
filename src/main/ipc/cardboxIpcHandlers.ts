import { ipcMain } from 'electron'
import {
  createCardBox,
  getAllCardBoxes,
  updateCardBox,
  deleteCardBox
} from '../../services/notes/cardBoxes'

export function setupCardboxHandlers() {
  // 创建卡片盒
  ipcMain.handle('create-card-box', async (_event, name: string) => {
    try {
      const newCardBox = await createCardBox(name)
      return newCardBox
    } catch (error) {
      console.error('主进程 → 创建卡片盒时出错:', error)
      return { success: false, error: error }
    }
  })
  // 获取所有卡片盒
  ipcMain.handle('get-all-card-boxes', async () => {
    try {
      const cardBoxes = await getAllCardBoxes()
      return cardBoxes
    } catch (error) {
      console.error('主进程 → 获取所有卡片盒时出错:', error)
      return { success: false, error: error }
    }
  })
  // 更新卡片盒
  ipcMain.handle('update-card-box', async (_event, { id, name }) => {
    try {
      const updatedCardBox = await updateCardBox(id, name)
      return updatedCardBox
    } catch (error) {
      console.error('主进程 → 更新卡片盒时出错:', error)
      return { success: false, error: error }
    }
  })
  // 删除卡片盒
  ipcMain.handle('delete-card-box', async (_event, id: string) => {
    try {
      await deleteCardBox(id)
      return { success: true }
      console.log('主进程 → 删除卡片盒成功', id)
    } catch (error) {
      console.error('主进程 → 删除卡片盒时出错:', error)
      return { success: false, error: error }
    }
  })
}
