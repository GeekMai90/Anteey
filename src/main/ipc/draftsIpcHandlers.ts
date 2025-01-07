import { ipcMain } from 'electron'
import {
  getDraft,
  createDraft,
  updateDraft,
  appendDraft
} from '../../services/drafts/draftsService'
import type { UpdateDraftInput, AppendDraftInput } from '@shared/types'

export function setupDraftHandlers() {
  // 获取草稿纸内容
  ipcMain.handle('get-draft', async () => {
    try {
      const draft = await getDraft()
      return { success: true, draft }
    } catch (error) {
      console.error('主进程→ 获取草稿纸内容失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 创建草稿纸
  ipcMain.handle('create-draft', async () => {
    try {
      const draft = await createDraft()
      return { success: true, draft }
    } catch (error) {
      console.error('主进程→ 创建草稿纸失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新草稿纸内容
  ipcMain.handle('update-draft', async (_event, input: UpdateDraftInput) => {
    try {
      const draft = await updateDraft(input)
      return { success: true, draft }
    } catch (error) {
      console.error('主进程→ 更新草稿纸内容失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 追加内容到草稿纸
  ipcMain.handle('append-draft', async (_event, input: AppendDraftInput) => {
    try {
      const draft = await appendDraft(input)
      return { success: true, draft }
    } catch (error) {
      console.error('主进程→ 追加内容到草稿纸失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
