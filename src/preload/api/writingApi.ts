import { ipcRenderer } from 'electron'
import type { Collection, Article, ArticleCard, WritingCardType } from '@shared/types/writing'

export const writingApi = {
  // === 合集相关方法 ===

  // 创建合集
  createCollection: async ({
    name,
    description,
    parentId
  }: {
    name: string
    description?: string
    parentId?: string
  }): Promise<Collection> => {
    try {
      const result = await ipcRenderer.invoke('create-collection', { name, description, parentId })
      if (!result.success) throw new Error(result.error)
      return result.collection
    } catch (error) {
      console.error('预加载脚本 → 创建合集失败:', error)
      throw error
    }
  },

  // 获取合集列表
  getCollections: async (parentId: string | null = null): Promise<Collection[]> => {
    try {
      const result = await ipcRenderer.invoke('get-collections', parentId)
      if (!result.success) throw new Error(result.error)
      return result.collections
    } catch (error) {
      console.error('预加载脚本 → 获取合集列表失败:', error)
      throw error
    }
  },

  // 更新合集
  updateCollection: async (id: string, data: Partial<Collection>): Promise<Collection> => {
    try {
      const result = await ipcRenderer.invoke('update-collection', { id, data })
      if (!result.success) throw new Error(result.error)
      return result.collection
    } catch (error) {
      console.error('预加载脚本 → 更新合集失败:', error)
      throw error
    }
  },

  // 删除合集
  deleteCollection: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-collection', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除合集失败:', error)
      throw error
    }
  },

  // === 文章相关方法 ===

  // 创建文章
  createArticle: async ({
    title,
    description,
    collectionIds
  }: {
    title: string
    description?: string
    collectionIds?: string[]
  }): Promise<Article> => {
    try {
      const result = await ipcRenderer.invoke('create-article', {
        title,
        description,
        collectionIds
      })
      if (!result.success) throw new Error(result.error)
      return result.article
    } catch (error) {
      console.error('预加载脚本 → 创建文章失败:', error)
      throw error
    }
  },

  // 获取文章列表
  getArticles: async (collectionId?: string): Promise<Article[]> => {
    try {
      const result = await ipcRenderer.invoke('get-articles', collectionId)
      if (!result.success) throw new Error(result.error)
      return result.articles
    } catch (error) {
      console.error('预加载脚本 → 获取文章列表失败:', error)
      throw error
    }
  },

  // 更新文章
  updateArticle: async (id: string, data: Partial<Article>): Promise<Article> => {
    try {
      const result = await ipcRenderer.invoke('update-article', { id, data })
      if (!result.success) throw new Error(result.error)
      return result.article
    } catch (error) {
      console.error('预加载脚本 → 更新文章失败:', error)
      throw error
    }
  },

  // 删除文章
  deleteArticle: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-article', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除文章失败:', error)
      throw error
    }
  },

  // === 卡片相关方法 ===

  // 创建卡片
  createArticleCard: async ({
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
  }): Promise<ArticleCard> => {
    try {
      const result = await ipcRenderer.invoke('create-article-card', {
        articleId,
        cardType,
        parentId,
        content,
        cardId
      })
      if (!result.success) throw new Error(result.error)
      return result.card
    } catch (error) {
      console.error('预加载脚本 → 创建卡片失败:', error)
      throw error
    }
  },

  // 获取文章的卡片列表
  getArticleCards: async (articleId: string): Promise<ArticleCard[]> => {
    try {
      const result = await ipcRenderer.invoke('get-article-cards', articleId)
      if (!result.success) throw new Error(result.error)
      return result.cards
    } catch (error) {
      console.error('预加载脚本 → 获取文章卡片列表失败:', error)
      throw error
    }
  },

  // 更新卡片
  updateArticleCard: async (id: string, data: Partial<ArticleCard>): Promise<ArticleCard> => {
    try {
      const result = await ipcRenderer.invoke('update-article-card', { id, data })
      if (!result.success) throw new Error(result.error)
      return result.card
    } catch (error) {
      console.error('预加载脚本 → 更新卡片失败:', error)
      throw error
    }
  },

  // 删除卡片
  deleteArticleCard: async (id: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('delete-article-card', id)
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 删除卡片失败:', error)
      throw error
    }
  },

  // 更新卡片顺序
  updateCardOrder: async ({
    cardId,
    newOrder,
    newParentId
  }: {
    cardId: string
    newOrder: number
    newParentId?: string | null
  }): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('update-card-order', {
        cardId,
        newOrder,
        newParentId
      })
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 更新卡片顺序失败:', error)
      throw error
    }
  },

  // 获取单个文章
  getArticleById: async (id: string): Promise<Article | null> => {
    try {
      const result = await ipcRenderer.invoke('get-article-by-id', id)
      if (!result.success) throw new Error(result.error)
      return result.article
    } catch (error) {
      console.error('预加载脚本 → 获取文章失败:', error)
      throw error
    }
  }
}
