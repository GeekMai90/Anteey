import { ipcMain, shell } from 'electron'
import { getCustomCssContent, getCustomCssPath } from '../../services/theme/customCssService'
import path from 'path'

/**
 * 设置自定义CSS相关的IPC处理器
 */
export function setupCustomCssIpcHandlers(): void {
  // 获取自定义CSS内容
  ipcMain.handle('get-custom-css-content', async () => {
    try {
      return await getCustomCssContent()
    } catch (error) {
      console.error('获取自定义CSS内容失败:', error)
      return ''
    }
  })

  // 获取自定义CSS文件路径
  ipcMain.handle('get-custom-css-path', async () => {
    try {
      return await getCustomCssPath()
    } catch (error) {
      console.error('获取自定义CSS路径失败:', error)
      return ''
    }
  })

  // 打开自定义CSS文件所在的文件夹
  ipcMain.handle('open-custom-css-folder', async () => {
    try {
      const cssPath = await getCustomCssPath()
      const folderPath = path.dirname(cssPath)
      await shell.openPath(folderPath)
      return { success: true }
    } catch (error) {
      console.error('打开自定义CSS文件夹失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
