import { ipcMain } from 'electron'
import log from 'electron-log'
import { SemanticService } from '../services/semanticService'
import type { SearchOptions } from '../../renderer/src/types/semantic'

export function setupSemanticHandlers() {
  const semanticService = SemanticService.getInstance()

  // 初始化语义服务
  ipcMain.handle('semantic:initialize', async () => {
    try {
      await semanticService.initialize()
      return {
        success: true
      }
    } catch (error) {
      log.error('IPC: 语义服务初始化失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 清理缓存
  ipcMain.handle('semantic:clear-cache', async () => {
    try {
      await semanticService.clearCache()
      return {
        success: true
      }
    } catch (error) {
      log.error('IPC: 清理语义缓存失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 语义搜索
  ipcMain.handle('semantic:search', async (_, query: string, options: SearchOptions) => {
    try {
      const results = await semanticService.semanticSearch(query, options.limit)
      return {
        success: true,
        data: results
      }
    } catch (error) {
      log.error('IPC: 语义搜索失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 查找相似笔记
  ipcMain.handle('semantic:find-similar', async (_, content: any, options: SearchOptions) => {
    try {
      const results = await semanticService.findSimilarNotes(content, options.limit)
      return {
        success: true,
        data: results
      }
    } catch (error) {
      log.error('IPC: 查找相似笔记失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 计算混合相似度
  ipcMain.handle(
    'semantic:hybrid-similarity',
    async (_, content1: any, content2: any, keywords1: any[], keywords2: any[]) => {
      try {
        const similarity = await semanticService.calculateHybridSimilarity(
          content1,
          content2,
          keywords1,
          keywords2
        )
        return {
          success: true,
          data: similarity
        }
      } catch (error) {
        log.error('IPC: 计算混合相似度失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  )

  // 重建索引
  ipcMain.handle('semantic:rebuild-index', async (_, notes: { id: string; content: any }[]) => {
    try {
      await semanticService.rebuildIndex(notes)
      return {
        success: true
      }
    } catch (error) {
      log.error('IPC: 重建语义索引失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 清理笔记向量数据
  ipcMain.handle('semantic:clear-note-vector', async (_, noteId: string) => {
    try {
      await semanticService.clearNoteVectorData(noteId)
      return {
        success: true
      }
    } catch (error) {
      log.error('IPC: 清理笔记向量数据失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 测试语义搜索
  ipcMain.handle('semantic:test-search', async () => {
    try {
      await semanticService.testSemanticSearch()
      return {
        success: true
      }
    } catch (error) {
      log.error('IPC: 测试语义搜索失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 检查 FAISS 是否就绪
  ipcMain.handle('semantic:faiss-ready', () => {
    return {
      success: true,
      data: semanticService.isFaissReady()
    }
  })

  // 增强搜索
  ipcMain.handle('semantic:enhanced-search', async (_, query: string, options: SearchOptions) => {
    try {
      const results = await semanticService.enhancedSearch(query, options)
      return {
        success: true,
        data: results
      }
    } catch (error) {
      log.error('IPC: 增强搜索失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })
}
