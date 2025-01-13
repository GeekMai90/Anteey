import { ipcMain } from 'electron'
import {
  createCollection,
  getCollections,
  updateCollection,
  deleteCollection,
  createArticle,
  getArticles,
  updateArticle,
  deleteArticle,
  createArticleCard,
  getArticleCards,
  updateArticleCard,
  deleteArticleCard,
  updateCardOrder,
  getArticleById
} from '../../services/writing/writingService'
import type { Collection, Article, ArticleCard, WritingCardType } from '@shared/types/writing'

export function setupWritingHandlers() {
  // === 合集相关处理器 ===

  // 创建合集
  ipcMain.handle(
    'create-collection',
    async (
      _event,
      {
        name,
        description,
        parentId
      }: {
        name: string
        description?: string
        parentId?: string
      }
    ) => {
      try {
        const collection = await createCollection(name, description, parentId)
        return { success: true, collection }
      } catch (error) {
        console.error('主进程→ 创建合集失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取合集列表
  ipcMain.handle('get-collections', async (_event, parentId: string | null = null) => {
    try {
      const collections = await getCollections(parentId)
      return { success: true, collections }
    } catch (error) {
      console.error('主进程→ 获取合集列表失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新合集
  ipcMain.handle(
    'update-collection',
    async (_event, { id, data }: { id: string; data: Partial<Collection> }) => {
      try {
        const collection = await updateCollection(id, data)
        return { success: true, collection }
      } catch (error) {
        console.error('主进程→ 更新合集失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 删除合集
  ipcMain.handle('delete-collection', async (_event, id: string) => {
    try {
      await deleteCollection(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除合集失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // === 文章相关处理器 ===

  // 创建文章
  ipcMain.handle(
    'create-article',
    async (
      _event,
      {
        title,
        description,
        collectionIds
      }: {
        title: string
        description?: string
        collectionIds?: string[]
      }
    ) => {
      try {
        const article = await createArticle(title, description, collectionIds)
        return { success: true, article }
      } catch (error) {
        console.error('主进程→ 创建文章失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取文章列表
  ipcMain.handle('get-articles', async (_event, collectionId?: string) => {
    try {
      const articles = await getArticles(collectionId)
      return { success: true, articles }
    } catch (error) {
      console.error('主进程→ 获取文章列表失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新文章
  ipcMain.handle(
    'update-article',
    async (_event, { id, data }: { id: string; data: Partial<Article> }) => {
      try {
        const article = await updateArticle(id, data)
        return { success: true, article }
      } catch (error) {
        console.error('主进程→ 更新文章失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 删除文章
  ipcMain.handle('delete-article', async (_event, id: string) => {
    try {
      await deleteArticle(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除文章失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // === 卡片相关处理器 ===

  // 创建卡片
  ipcMain.handle(
    'create-article-card',
    async (
      _event,
      {
        articleId,
        cardType,
        parentId,
        content,
        cardId
      }: {
        articleId: string
        cardType: WritingCardType
        parentId: string | null
        content?: string
        cardId?: string
      }
    ) => {
      try {
        const card = await createArticleCard(articleId, cardType, parentId, content, cardId)
        return { success: true, card }
      } catch (error) {
        console.error('主进程→ 创建卡片失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取文章的卡片列表
  ipcMain.handle('get-article-cards', async (_event, articleId: string) => {
    try {
      const cards = await getArticleCards(articleId)
      return { success: true, cards }
    } catch (error) {
      console.error('主进程→ 获取文章卡片列表失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新卡片
  ipcMain.handle(
    'update-article-card',
    async (_event, { id, data }: { id: string; data: Partial<ArticleCard> }) => {
      try {
        const card = await updateArticleCard(id, data)
        return { success: true, card }
      } catch (error) {
        console.error('主进程→ 更新卡片失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 删除卡片
  ipcMain.handle('delete-article-card', async (_event, id: string) => {
    try {
      await deleteArticleCard(id)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除卡片失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新卡片顺序
  ipcMain.handle(
    'update-card-order',
    async (
      _event,
      {
        cardId,
        newOrder,
        newParentId
      }: {
        cardId: string
        newOrder: number
        newParentId?: string | null
      }
    ) => {
      try {
        await updateCardOrder(cardId, newOrder, newParentId)
        return { success: true }
      } catch (error) {
        console.error('主进程→ 更新卡片顺序失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取单个文章
  ipcMain.handle('get-article-by-id', async (_event, id: string) => {
    try {
      const article = await getArticleById(id)
      return { success: true, article }
    } catch (error) {
      console.error('主进程→ 获取文章失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
