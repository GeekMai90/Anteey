import { app, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'

const CACHE_FILE_PATH = path.join(app.getPath('userData'), 'embeddings.cache.json')

// 处理读取缓存请求
ipcMain.handle('load-embeddings-cache', async () => {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const data = fs.readFileSync(CACHE_FILE_PATH, 'utf8')
      return JSON.parse(data)
    }
    return {}
  } catch (error) {
    console.error('加载缓存失败:', error)
    return {}
  }
})

// 处理保存缓存请求
ipcMain.handle('save-embeddings-cache', async (_, cacheData) => {
  try {
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cacheData), 'utf8')
    return true
  } catch (error) {
    console.error('保存缓存失败:', error)
    return false
  }
})
