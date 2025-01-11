import { ipcMain, BrowserWindow } from 'electron'

export function setupWindowHandlers() {
  // 最小化
  ipcMain.handle('window-minimize', () => {
    BrowserWindow.getFocusedWindow()?.minimize()
  })

  // 最大化/还原
  ipcMain.handle('window-maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  // 关闭窗口
  ipcMain.handle('window-close', () => {
    BrowserWindow.getFocusedWindow()?.close()
  })

  // 获取窗口状态
  ipcMain.handle('window-is-maximized', () => {
    return BrowserWindow.getFocusedWindow()?.isMaximized()
  })
}
