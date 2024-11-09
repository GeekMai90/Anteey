import { ipcRenderer } from 'electron'
import log from 'electron-log'
import type {
  SearchResult,
  SearchOptions,
  EnhancedSearchResult
} from '../../renderer/src/types/semantic'

// 定义 IPC 响应类型
interface IpcResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export const semanticApi = {
  // 初始化服务
  initializeSemantic: async (): Promise<boolean> => {
    try {
      const result: IpcResponse<boolean> = await ipcRenderer.invoke('semantic:initialize')
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data || false
    } catch (error) {
      log.error('Preload: 语义服务初始化失败:', error)
      throw error
    }
  },

  // 清理缓存
  clearSemanticCache: async (): Promise<boolean> => {
    try {
      const result: IpcResponse<boolean> = await ipcRenderer.invoke('semantic:clear-cache')
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data || false
    } catch (error) {
      log.error('Preload: 清理语义缓存失败:', error)
      throw error
    }
  },

  // 语义搜索
  semanticSearch: async (
    query: string,
    options: SearchOptions = { limit: 10 }
  ): Promise<SearchResult[]> => {
    try {
      const result: IpcResponse<SearchResult[]> = await ipcRenderer.invoke(
        'semantic:search',
        query,
        options
      )
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data || []
    } catch (error) {
      log.error('Preload: 语义搜索失败:', error)
      throw error
    }
  },

  // 查找相似笔记
  findSimilarNotes: async (
    content: any,
    options: SearchOptions = { limit: 5 }
  ): Promise<SearchResult[]> => {
    try {
      const result: IpcResponse<SearchResult[]> = await ipcRenderer.invoke(
        'semantic:find-similar',
        content,
        options
      )
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data || []
    } catch (error) {
      log.error('Preload: 查找相似笔记失败:', error)
      throw error
    }
  },

  // 计算混合相似度
  calculateHybridSimilarity: async (
    content1: any,
    content2: any,
    keywords1: string[],
    keywords2: string[]
  ): Promise<number> => {
    try {
      const result: IpcResponse<number> = await ipcRenderer.invoke(
        'semantic:hybrid-similarity',
        content1,
        content2,
        keywords1,
        keywords2
      )
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data || 0
    } catch (error) {
      log.error('Preload: 计算混合相似度失败:', error)
      throw error
    }
  },

  // 重建索引
  rebuildSemanticIndex: async (notes: { id: string; content: any }[]): Promise<boolean> => {
    try {
      const result: IpcResponse<boolean> = await ipcRenderer.invoke('semantic:rebuild-index', notes)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data || false
    } catch (error) {
      log.error('Preload: 重建语义索引失败:', error)
      throw error
    }
  },

  // 清理笔记向量数据
  clearNoteVectorData: async (noteId: string): Promise<boolean> => {
    try {
      const result: IpcResponse<boolean> = await ipcRenderer.invoke(
        'semantic:clear-note-vector',
        noteId
      )
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data || false
    } catch (error) {
      log.error('Preload: 清理笔记向量数据失败:', error)
      throw error
    }
  },

  // 测试语义搜索
  testSemanticSearch: async (): Promise<boolean> => {
    try {
      const result: IpcResponse<boolean> = await ipcRenderer.invoke('semantic:test-search')
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data || false
    } catch (error) {
      log.error('Preload: 测试语义搜索失败:', error)
      throw error
    }
  },

  // 检查 FAISS 是否就绪
  isFaissReady: async (): Promise<boolean> => {
    try {
      const result: IpcResponse<boolean> = await ipcRenderer.invoke('semantic:faiss-ready')
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data || false
    } catch (error) {
      log.error('Preload: 检查 FAISS 状态失败:', error)
      throw error
    }
  },

  // 增强搜索
  enhancedSearch: async (query: string, options?: SearchOptions): Promise<EnhancedSearchResult> => {
    try {
      const result = await ipcRenderer.invoke('semantic:enhanced-search', query, options)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    } catch (error) {
      log.error('Preload: 增强搜索失败:', error)
      throw error
    }
  }
}
