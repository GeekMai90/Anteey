import { ipcRenderer } from 'electron'

export const windowApi = {
  // 最小化窗口
  minimize: () => ipcRenderer.invoke('window-minimize'),

  // 最大化/还原窗口
  maximize: () => ipcRenderer.invoke('window-maximize'),

  // 关闭窗口
  close: () => ipcRenderer.invoke('window-close'),

  // 获取窗口最大化状态
  isMaximized: () => ipcRenderer.invoke('window-is-maximized')
}
