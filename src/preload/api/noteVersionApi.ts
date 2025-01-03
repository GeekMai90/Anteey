import { ipcRenderer } from 'electron'
import type {
  NoteVersion,
  CreateVersionParams,
  GetVersionsParams
} from '../../renderer/src/types/NoteVersion'

export const noteVersionApi = {
  // 创建版本
  createNoteVersion: async (params: CreateVersionParams): Promise<NoteVersion> => {
    try {
      const result = await ipcRenderer.invoke('create-note-version', params)
      if (!result.success) throw new Error(result.error)
      return result.version
    } catch (error) {
      console.error('预加载脚本 → 创建笔记版本失败:', error)
      throw error
    }
  },

  // 获取版本列表
  getNoteVersions: async (params: GetVersionsParams): Promise<NoteVersion[]> => {
    try {
      const result = await ipcRenderer.invoke('get-note-versions', params)
      if (!result.success) throw new Error(result.error)
      return result.versions
    } catch (error) {
      console.error('预加载脚本 → 获取笔记版本列表失败:', error)
      throw error
    }
  },

  // 获取指定版本
  getNoteVersion: async (noteId: string, versionId: string): Promise<NoteVersion | null> => {
    try {
      const result = await ipcRenderer.invoke('get-note-version', { noteId, versionId })
      if (!result.success) throw new Error(result.error)
      return result.version
    } catch (error) {
      console.error('预加载脚本 → 获取笔记版本失败:', error)
      throw error
    }
  },

  // 恢复到指定版本
  restoreNoteVersion: async (noteId: string, versionId: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('restore-note-version', { noteId, versionId })
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 恢复笔记版本失败:', error)
      throw error
    }
  },

  // 获取版本总数
  getNoteVersionCount: async (noteId: string): Promise<number> => {
    try {
      const result = await ipcRenderer.invoke('get-note-version-count', noteId)
      if (!result.success) throw new Error(result.error)
      return result.count
    } catch (error) {
      console.error('预加载脚本 → 获取笔记版本总数失败:', error)
      throw error
    }
  },

  // 获取最新版本
  getLatestVersion: async (noteId: string): Promise<NoteVersion | null> => {
    try {
      const result = await ipcRenderer.invoke('get-latest-version', noteId)
      if (!result.success) throw new Error(result.error)
      return result.version
    } catch (error) {
      console.error('预加载脚本 → 获取最新版本失败:', error)
      throw error
    }
  },

  // 获取版本时间范围
  getVersionTimeRange: async (noteId: string): Promise<{ earliest: Date; latest: Date } | null> => {
    try {
      const result = await ipcRenderer.invoke('get-version-time-range', noteId)
      if (!result.success) throw new Error(result.error)
      return result.timeRange
    } catch (error) {
      console.error('预加载脚本 → 获取版本时间范围失败:', error)
      throw error
    }
  }
}
