import { app, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs/promises'

export function setupCacheHandlers() {
  // 加载向量缓存
  ipcMain.handle('load-embeddings-cache', async () => {
    try {
      const cachePath = path.join(app.getPath('userData'), 'embeddings.cache.json')
      if (
        await fs
          .access(cachePath)
          .then(() => true)
          .catch(() => false)
      ) {
        const data = await fs.readFile(cachePath, 'utf8')
        return JSON.parse(data)
      }
      return {}
    } catch (error) {
      console.error('Main: 加载向量缓存失败:', error)
      return {}
    }
  })

  // 保存向量缓存
  ipcMain.handle('save-embeddings-cache', async (_, cacheData: Record<string, string>) => {
    try {
      const cachePath = path.join(app.getPath('userData'), 'embeddings.cache.json')
      await fs.writeFile(cachePath, JSON.stringify(cacheData), 'utf8')
      return true
    } catch (error) {
      console.error('Main: 保存向量缓存失败:', error)
      return false
    }
  })

  // 获取用户数据目录
  ipcMain.handle('get-user-data-path', () => {
    return app.getPath('userData')
  })
}
