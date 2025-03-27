import { ipcMain } from 'electron'
import {
  createMindEchoFromContent,
  createMindEchoFromConversation,
  getNoteMindEchoes,
  getMindEchoWithRelations,
  updateMindEcho,
  deleteMindEcho,
  updateMindEchoOrder,
  toggleMindEchoArchived,
  batchUpdateMindEchoes
} from '../../services/mindEcho/mindEchoService'
import type { MindEcho, UpdateMindEchoParams } from '@shared/types/mind-echo'

export function setupMindEchoHandlers() {
  // 从单条AI回复创建思维共鸣
  ipcMain.handle(
    'create-mind-echo-from-content',
    async (
      _event,
      params: {
        noteId: string
        conversationId: string
        messageId: string
        modelConfigId?: string
      }
    ) => {
      try {
        const mindEcho = await createMindEchoFromContent(params)
        return { success: true, mindEcho }
      } catch (error) {
        console.error('主进程→ 创建思维共鸣失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 从多轮对话创建思维共鸣
  ipcMain.handle(
    'create-mind-echo-from-conversation',
    async (
      _event,
      params: {
        noteId: string
        conversationId: string
        modelConfigId?: string
      }
    ) => {
      try {
        const mindEcho = await createMindEchoFromConversation(params)
        return { success: true, mindEcho }
      } catch (error) {
        console.error('主进程→ 从对话创建思维共鸣失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取笔记的所有思维共鸣
  ipcMain.handle(
    'get-note-mind-echoes',
    async (_event, { noteId, includeArchived }: { noteId: string; includeArchived?: boolean }) => {
      try {
        const echoes = await getNoteMindEchoes(noteId, includeArchived)
        return { success: true, echoes }
      } catch (error) {
        console.error('主进程→ 获取笔记思维共鸣失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取思维共鸣详情（带关联数据）
  ipcMain.handle('get-mind-echo-detail', async (_event, id: string) => {
    try {
      const echo = await getMindEchoWithRelations(id)
      return { success: true, echo }
    } catch (error) {
      console.error('主进程→ 获取思维共鸣详情失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新思维共鸣
  ipcMain.handle(
    'update-mind-echo',
    async (_event, { updateData }: { updateData: UpdateMindEchoParams }) => {
      try {
        const updated = await updateMindEcho(updateData)
        return { success: true, mindEcho: updated }
      } catch (error) {
        console.error('主进程→ 更新思维共鸣失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 删除思维共鸣
  ipcMain.handle('delete-mind-echo', async (_event, id: string) => {
    try {
      await deleteMindEcho(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除思维共鸣失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新思维共鸣排序
  ipcMain.handle(
    'update-mind-echo-order',
    async (_event, { id, newOrder }: { id: string; newOrder: number }) => {
      try {
        const updated = await updateMindEchoOrder(id, newOrder)
        return { success: true, mindEcho: updated }
      } catch (error) {
        console.error('主进程→ 更新思维共鸣排序失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 切换思维共鸣归档状态
  ipcMain.handle(
    'toggle-mind-echo-archived',
    async (_event, { id, isArchived }: { id: string; isArchived: boolean }) => {
      try {
        const updated = await toggleMindEchoArchived(id, isArchived)
        return { success: true, mindEcho: updated }
      } catch (error) {
        console.error('主进程→ 更新思维共鸣归档状态失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 批量更新思维共鸣
  ipcMain.handle(
    'batch-update-mind-echoes',
    async (_event, { ids, updates }: { ids: string[]; updates: Partial<MindEcho> }) => {
      try {
        const updated = await batchUpdateMindEchoes(ids, updates)
        return { success: true, mindEchoes: updated }
      } catch (error) {
        console.error('主进程→ 批量更新思维共鸣失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )
}
