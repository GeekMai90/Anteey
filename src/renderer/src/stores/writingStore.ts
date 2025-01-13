import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Collection, Article, ArticleCard, WritingCardType } from '@shared/types/writing'

export const useWritingStore = defineStore('writing', () => {
  // ==================== 状态 ====================
  const collections = ref<Collection[]>([])
  const currentCollection = ref<Collection | null>(null)
  const articles = ref<Article[]>([])
  const currentArticle = ref<Article | null>(null)
  const articleCards = ref<ArticleCard[]>([])

  // ==================== 合集相关方法 ====================

  // 获取合集列表
  const fetchCollections = async (parentId: string | null = null) => {
    try {
      const fetchedCollections = await window.electronAPI.writing.getCollections(parentId)
      collections.value = fetchedCollections
      return fetchedCollections
    } catch (error) {
      console.error('获取合集列表失败:', error)
      throw error
    }
  }

  // 创建合集
  const createCollection = async (params: {
    name: string
    description?: string
    parentId?: string
  }) => {
    try {
      const newCollection = await window.electronAPI.writing.createCollection(params)
      await fetchCollections(params.parentId)
      return newCollection
    } catch (error) {
      console.error('创建合集失败:', error)
      throw error
    }
  }

  // 更新合集
  const updateCollection = async (id: string, data: Partial<Collection>) => {
    try {
      const updatedCollection = await window.electronAPI.writing.updateCollection(id, data)
      await fetchCollections(updatedCollection.parent_id ?? null)
      return updatedCollection
    } catch (error) {
      console.error('更新合集失败:', error)
      throw error
    }
  }

  // 删除合集
  const deleteCollection = async (id: string) => {
    try {
      await window.electronAPI.writing.deleteCollection(id)
      if (currentCollection.value?.id === id) {
        currentCollection.value = null
      }
      await fetchCollections(currentCollection.value?.parent_id ?? null)
    } catch (error) {
      console.error('删除合集失败:', error)
      throw error
    }
  }

  // ==================== 文章相关方法 ====================

  // 获取文章列表
  const fetchArticles = async (collectionId?: string) => {
    try {
      const fetchedArticles = await window.electronAPI.writing.getArticles(collectionId)
      articles.value = fetchedArticles
      return fetchedArticles
    } catch (error) {
      console.error('获取文章列表失败:', error)
      throw error
    }
  }

  // 获取单篇文章
  const getArticleById = async (id: string) => {
    try {
      const article = await window.electronAPI.writing.getArticleById(id)
      if (article) {
        currentArticle.value = article
      }
      return article
    } catch (error) {
      console.error('获取文章失败:', error)
      throw error
    }
  }

  // 创建文章
  const createArticle = async (params: {
    title: string
    description?: string
    collectionIds?: string[]
  }) => {
    try {
      const newArticle = await window.electronAPI.writing.createArticle(params)
      await fetchArticles()
      return newArticle
    } catch (error) {
      console.error('创建文章失败:', error)
      throw error
    }
  }

  // 更新文章
  const updateArticle = async (id: string, data: Partial<Article>) => {
    try {
      const updatedArticle = await window.electronAPI.writing.updateArticle(id, data)
      await fetchArticles()
      return updatedArticle
    } catch (error) {
      console.error('更新文章失败:', error)
      throw error
    }
  }

  // 删除文章
  const deleteArticle = async (id: string) => {
    try {
      await window.electronAPI.writing.deleteArticle(id)
      if (currentArticle.value?.id === id) {
        currentArticle.value = null
      }
      await fetchArticles()
    } catch (error) {
      console.error('删除文章失败:', error)
      throw error
    }
  }

  // ==================== 卡片相关方法 ====================

  // 获取文章的卡片列表
  const fetchArticleCards = async (articleId: string) => {
    try {
      const cards = await window.electronAPI.writing.getArticleCards(articleId)
      articleCards.value = cards
      return cards
    } catch (error) {
      console.error('获取文章卡片列表失败:', error)
      throw error
    }
  }

  // 创建卡片
  const createArticleCard = async (params: {
    articleId: string
    cardType: WritingCardType
    parentId: string | null
    content?: string
    cardId?: string
  }) => {
    try {
      const newCard = await window.electronAPI.writing.createArticleCard(params)
      await fetchArticleCards(params.articleId)
      return newCard
    } catch (error) {
      console.error('创建卡片失败:', error)
      throw error
    }
  }

  // 更新卡片
  const updateArticleCard = async (id: string, data: Partial<ArticleCard>) => {
    try {
      const updatedCard = await window.electronAPI.writing.updateArticleCard(id, data)
      if (currentArticle.value) {
        await fetchArticleCards(currentArticle.value.id)
      }
      return updatedCard
    } catch (error) {
      console.error('更新卡片失败:', error)
      throw error
    }
  }

  // 删除卡片
  const deleteArticleCard = async (id: string) => {
    try {
      await window.electronAPI.writing.deleteArticleCard(id)
      if (currentArticle.value) {
        await fetchArticleCards(currentArticle.value.id)
      }
    } catch (error) {
      console.error('删除卡片失败:', error)
      throw error
    }
  }

  // 更新卡片顺序
  const updateCardOrder = async (params: {
    cardId: string
    newOrder: number
    newParentId?: string | null
  }) => {
    try {
      await window.electronAPI.writing.updateCardOrder(params)
      if (currentArticle.value) {
        await fetchArticleCards(currentArticle.value.id)
      }
    } catch (error) {
      console.error('更新卡片顺序失败:', error)
      throw error
    }
  }

  return {
    // 状态
    collections,
    currentCollection,
    articles,
    currentArticle,
    articleCards,

    // 合集方法
    fetchCollections,
    createCollection,
    updateCollection,
    deleteCollection,

    // 文章方法
    fetchArticles,
    getArticleById,
    createArticle,
    updateArticle,
    deleteArticle,

    // 卡片方法
    fetchArticleCards,
    createArticleCard,
    updateArticleCard,
    deleteArticleCard,
    updateCardOrder
  }
})
