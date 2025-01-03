import { ipcMain } from 'electron'
import {
  createNoteVersion,
  getNoteVersions,
  getNoteVersion,
  restoreNoteVersion,
  getNoteVersionCount,
  getLatestVersion,
  getVersionTimeRange
} from '../../services/notes/noteVersionService'
import type { CreateVersionParams, GetVersionsParams } from '../../renderer/src/types/NoteVersion'

export function setupNoteVersionHandlers() {
  // 创建版本
  ipcMain.handle('create-note-version', async (_event, params: CreateVersionParams) => {
    try {
      const version = await createNoteVersion(params)
      return { success: true, version }
    } catch (error) {
      console.error('主进程→ 创建笔记版本失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取版本列表
  ipcMain.handle('get-note-versions', async (_event, params: GetVersionsParams) => {
    try {
      const versions = await getNoteVersions(params)
      return { success: true, versions }
    } catch (error) {
      console.error('主进程→ 获取笔记版本列表失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取指定版本
  ipcMain.handle(
    'get-note-version',
    async (_event, { noteId, versionId }: { noteId: string; versionId: string }) => {
      try {
        const version = await getNoteVersion(noteId, versionId)
        return { success: true, version }
      } catch (error) {
        console.error('主进程→ 获取笔记版本失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 恢复到指定版本
  ipcMain.handle(
    'restore-note-version',
    async (_event, { noteId, versionId }: { noteId: string; versionId: string }) => {
      try {
        await restoreNoteVersion(noteId, versionId)
        return { success: true }
      } catch (error) {
        console.error('主进程→ 恢复笔记版本失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取版本总数
  ipcMain.handle('get-note-version-count', async (_event, noteId: string) => {
    try {
      const count = await getNoteVersionCount(noteId)
      return { success: true, count }
    } catch (error) {
      console.error('主进程→ 获取笔记版本总数失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取最新版本
  ipcMain.handle('get-latest-version', async (_event, noteId: string) => {
    try {
      const version = await getLatestVersion(noteId)
      return { success: true, version }
    } catch (error) {
      console.error('主进程→ 获取最新版本失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取版本时间范围
  ipcMain.handle('get-version-time-range', async (_event, noteId: string) => {
    try {
      const timeRange = await getVersionTimeRange(noteId)
      return { success: true, timeRange }
    } catch (error) {
      console.error('主进程→ 获取版本时间范围失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
