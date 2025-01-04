import { ipcRenderer } from 'electron'

export const analyticsApi = {
  // 获取热力图数据
  getHeatmapData: async (): Promise<{ date: string; count: number }[]> => {
    return (await ipcRenderer.invoke('get-heatmap-data')) as { date: string; count: number }[]
  },
  // 获取笔记总数量
  getNoteCount: async (): Promise<number> => {
    return (await ipcRenderer.invoke('get-note-count')) as number
  },
  // 获取昨日笔记数量
  getLastDayNoteCount: async (): Promise<number> => {
    return (await ipcRenderer.invoke('get-last-day-note-count')) as number
  },
  // 获取用户使用天数
  getUserUsageDays: async (): Promise<number> => {
    return (await ipcRenderer.invoke('get-user-usage-days')) as number
  }
}
