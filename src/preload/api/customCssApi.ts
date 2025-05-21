import { ipcRenderer } from 'electron'

export const customCssApi = {
  /**
   * 获取自定义CSS内容
   */
  getCustomCssContent: async (): Promise<string> => {
    return await ipcRenderer.invoke('get-custom-css-content')
  },

  /**
   * 获取自定义CSS文件路径
   */
  getCustomCssPath: async (): Promise<string> => {
    return await ipcRenderer.invoke('get-custom-css-path')
  },

  /**
   * 打开自定义CSS文件所在的文件夹
   */
  openCustomCssFolder: async (): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('open-custom-css-folder')
  }
}
