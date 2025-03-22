import { ipcMain } from 'electron'
import {
  createManuscript,
  getAllManuscripts,
  getManuscriptById,
  updateManuscript,
  deleteManuscript,
  addManuscriptCard,
  updateManuscriptCard,
  moveManuscriptCard,
  deleteManuscriptCard,
  batchAddManuscriptCards,
  getManuscriptCards,
  getManuscriptCardById,
  polishManuscript,
  getPolishHistory
} from '../../services/writingDesk/writingDeskService'
import type {
  CreateManuscriptParams,
  UpdateManuscriptParams,
  PolishManuscriptParams
} from '@shared/types'

export function setupWritingDeskHandlers() {
  // 获取所有文稿
  ipcMain.handle('get-all-manuscripts', async () => {
    try {
      const manuscripts = await getAllManuscripts()
      return { success: true, manuscripts }
    } catch (error) {
      console.error('主进程→ 获取所有文稿失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取单个文稿
  ipcMain.handle('get-manuscript', async (_event, id: string) => {
    try {
      console.log('主进程→ 获取文稿, ID:', id)
      const manuscript = await getManuscriptById(id)
      return { success: true, manuscript }
    } catch (error) {
      console.error('主进程→ 获取文稿失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 创建文稿
  ipcMain.handle('create-manuscript', async (_event, params: CreateManuscriptParams) => {
    try {
      console.log('主进程→ 创建文稿, 参数:', params)
      const manuscript = await createManuscript(params)
      return { success: true, manuscript }
    } catch (error) {
      console.error('主进程→ 创建文稿失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新文稿
  ipcMain.handle('update-manuscript', async (_event, params: UpdateManuscriptParams) => {
    try {
      console.log('主进程→ 更新文稿, 参数:', params)
      const manuscript = await updateManuscript(params)
      return { success: true, manuscript }
    } catch (error) {
      console.error('主进程→ 更新文稿失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 删除文稿
  ipcMain.handle('delete-manuscript', async (_event, id: string) => {
    try {
      console.log('主进程→ 删除文稿, ID:', id)
      await deleteManuscript(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除文稿失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 添加卡片
  ipcMain.handle(
    'add-manuscript-card',
    async (_event, manuscriptId: string, content: any, order: number, noteId?: string) => {
      try {
        console.log('主进程→ 添加卡片, 参数:', { manuscriptId, order, noteId })
        const card = await addManuscriptCard(manuscriptId, content, order, noteId)
        return { success: true, card }
      } catch (error) {
        console.error('主进程→ 添加卡片失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 更新卡片
  ipcMain.handle(
    'update-manuscript-card',
    async (_event, cardId: string, content?: any, order?: number) => {
      try {
        console.log('主进程→ 更新卡片, 参数:', { cardId, order })
        const card = await updateManuscriptCard(cardId, content, order)
        return { success: true, card }
      } catch (error) {
        console.error('主进程→ 更新卡片失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 移动卡片
  ipcMain.handle('move-manuscript-card', async (_event, cardId: string, order: number) => {
    try {
      console.log('主进程→ 移动卡片, 参数:', { cardId, order })
      const card = await moveManuscriptCard(cardId, order)
      return { success: true, card }
    } catch (error) {
      console.error('主进程→ 移动卡片失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 删除卡片
  ipcMain.handle('delete-manuscript-card', async (_event, cardId: string) => {
    try {
      console.log('主进程→ 删除卡片, ID:', cardId)
      await deleteManuscriptCard(cardId)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除卡片失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 批量添加卡片
  ipcMain.handle(
    'batch-add-manuscript-cards',
    async (_event, manuscriptId: string, cards: { noteId: string; content: any }[]) => {
      try {
        console.log('主进程→ 批量添加卡片, 参数:', { manuscriptId, cardsCount: cards.length })
        const addedCards = await batchAddManuscriptCards(manuscriptId, cards)
        return { success: true, cards: addedCards }
      } catch (error) {
        console.error('主进程→ 批量添加卡片失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取文稿卡片
  ipcMain.handle('get-manuscript-cards', async (_event, manuscriptId: string) => {
    try {
      console.log('主进程→ 获取文稿卡片, 文稿ID:', manuscriptId)
      const cards = await getManuscriptCards(manuscriptId)
      return { success: true, cards }
    } catch (error) {
      console.error('主进程→ 获取文稿卡片失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取单个卡片
  ipcMain.handle('get-manuscript-card', async (_event, cardId: string) => {
    try {
      console.log('主进程→ 获取卡片, ID:', cardId)
      const card = await getManuscriptCardById(cardId)
      return { success: true, card }
    } catch (error) {
      console.error('主进程→ 获取卡片失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // AI 润色
  ipcMain.handle('polish-manuscript', async (_event, params: PolishManuscriptParams) => {
    try {
      console.log('主进程→ 润色文稿, 参数:', params)
      const manuscript = await polishManuscript(params)
      return { success: true, manuscript }
    } catch (error) {
      console.error('主进程→ 文稿润色失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取润色历史
  ipcMain.handle('get-polish-history', async (_event, manuscriptId: string) => {
    try {
      console.log('主进程→ 获取润色历史, 文稿ID:', manuscriptId)
      const history = await getPolishHistory(manuscriptId)
      return { success: true, history }
    } catch (error) {
      console.error('主进程→ 获取润色历史失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
