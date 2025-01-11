import { ipcMain } from 'electron'
import { getRandomLifeGuideNote } from '../../services/widget/lifeGuideService'

export function setupLifeGuideHandlers() {
  // 获取随机人生指南笔记
  ipcMain.handle('get-random-life-guide-note', async () => {
    try {
      const note = await getRandomLifeGuideNote()
      return { success: true, note }
    } catch (error) {
      console.error('主进程→ 获取随机人生指南笔记失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
