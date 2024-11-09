import { ipcMain } from 'electron'
import path from 'path'
import fs from 'fs/promises'

import { CACHE_PATHS } from '../services/constants'

export function setupCacheHandlers() {
  ipcMain.handle('load-embeddings-cache', async () => {
    try {
      if (
        await fs
          .access(CACHE_PATHS.embeddings)
          .then(() => true)
          .catch(() => false)
      ) {
        const data = await fs.readFile(CACHE_PATHS.embeddings, 'utf8')
        return JSON.parse(data)
      }
      return {}
    } catch (error) {
      console.error('加载缓存失败:', error)
      return {}
    }
  })

  ipcMain.handle('save-embeddings-cache', async (_, data) => {
    try {
      await fs.mkdir(path.dirname(CACHE_PATHS.embeddings), { recursive: true })
      await fs.writeFile(CACHE_PATHS.embeddings, JSON.stringify(data), 'utf8')
      return true
    } catch (error) {
      console.error('保存缓存失败:', error)
      return false
    }
  })
}
