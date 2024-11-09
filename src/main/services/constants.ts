import { app } from 'electron'
import path from 'path'

// 使用函数来获取路径，确保在需要时才计算
export function getCachePaths() {
  const antinetPath = app.getPath('userData')
  const cachePath = (global as any).getCachePath?.() || path.join(antinetPath, 'cache')

  return {
    cache: cachePath,
    embeddings: path.join(cachePath, 'embeddings.cache.json'),
    faiss: path.join(cachePath, 'faiss'),
    faissIndex: path.join(cachePath, 'faiss', 'faiss.index')
  }
}

export const CACHE_PATHS = getCachePaths()
