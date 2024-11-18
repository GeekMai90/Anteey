import { ipcMain } from 'electron'
import { getLocalTreeNotes, findNoteByAddress } from '../../services/localTree/localTreeService'

export function setupLocalTreeHandlers() {
  // 获取本地树相关笔记
  ipcMain.handle('get-local-tree', async (_event, noteId: string) => {
    try {
      console.log('主进程→ 收到获取本地树请求:', noteId)
      const treeData = await getLocalTreeNotes(noteId)
      console.log('主进程→ 获取本地树成功')
      return { success: true, data: treeData }
    } catch (error) {
      console.error('主进程→ 获取本地树失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 添加根据地址获取笔记的处理器
  ipcMain.handle('get-note-by-address', async (_event, address: string) => {
    try {
      console.log('主进程→ 收到根据地址获取笔记请求:', address)
      const note = await findNoteByAddress(address)
      console.log('主进程→ 获取笔记成功')
      return { success: true, data: note }
    } catch (error) {
      console.error('主进程→ 根据地址获取笔记失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
