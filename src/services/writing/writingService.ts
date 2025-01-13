import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import {
  Collection,
  Article,
  ArticleCard,
  ArticleStatus,
  WritingCardType
} from '@shared/types/writing'

// === 合集相关方法 ===

// 创建合集
export async function createCollection(
  name: string,
  description?: string,
  parentId?: string
): Promise<Collection> {
  try {
    const id = uuidv4()
    const now = Date.now()

    const newCollection: Collection = {
      id,
      name,
      description,
      parent_id: parentId,
      order: await getNextOrder(parentId),
      created_at: now,
      updated_at: now,
      is_deleted: false
    }

    await db('collections').insert({
      ...newCollection,
      parent_id: parentId ?? null
    })

    return newCollection
  } catch (error) {
    console.error('后端→ 创建合集失败:', error)
    throw error
  }
}

// 获取合集列表
export async function getCollections(parentId: string | null = null): Promise<Collection[]> {
  try {
    return await db('collections')
      .where({
        parent_id: parentId,
        is_deleted: false
      })
      .orderBy('order', 'asc')
  } catch (error) {
    console.error('后端→ 获取合集列表失败:', error)
    throw error
  }
}

// === 文章相关方法 ===

// 创建文章
export async function createArticle(
  title: string,
  description?: string,
  collectionIds?: string[]
): Promise<Article> {
  try {
    const id = uuidv4()
    const now = Date.now()

    const newArticle = {
      id,
      title,
      description,
      status: 'draft' as ArticleStatus,
      collection_ids: collectionIds ? JSON.stringify(collectionIds) : null,
      created_at: now,
      updated_at: now,
      is_deleted: false
    }

    await db('articles').insert(newArticle)
    return {
      ...newArticle,
      collection_ids: collectionIds || [],
      tags: []
    }
  } catch (error) {
    console.error('后端→ 创建文章失败:', error)
    throw error
  }
}

// 获取文章列表
export async function getArticles(collectionId?: string): Promise<Article[]> {
  try {
    let query = db('articles').where('is_deleted', false)

    if (collectionId) {
      query = query.whereRaw('collection_ids @> ?', [JSON.stringify([collectionId])])
    }

    const articles = await query.orderBy('updated_at', 'desc')

    return articles.map((article) => ({
      ...article,
      collection_ids: article.collection_ids ? JSON.parse(article.collection_ids) : [],
      tags: article.tags ? JSON.parse(article.tags) : []
    }))
  } catch (error) {
    console.error('后端→ 获取文章列表失败:', error)
    throw error
  }
}

// === 卡片相关方法 ===

// 创建卡片
export async function createArticleCard(
  articleId: string,
  cardType: WritingCardType,
  parentId: string | null,
  content?: string | object,
  cardId?: string
): Promise<ArticleCard> {
  try {
    const id = uuidv4()
    const now = Date.now()

    // 获取同级最大顺序号
    const maxOrder = await db('article_cards')
      .where({ article_id: articleId, parent_id: parentId })
      .max('order as maxOrder')
      .first()

    const order = (maxOrder?.maxOrder || 0) + 1
    const level = parentId ? (await getCardLevel(parentId)) + 1 : 0

    // 处理内容
    const processedContent = content
      ? typeof content === 'string'
        ? content
        : JSON.stringify(content)
      : JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              attrs: { textAlign: 'left' },
              content: []
            }
          ]
        })

    const newCard: ArticleCard = {
      id,
      article_id: articleId,
      card_type: cardType,
      card_id: cardId,
      content: processedContent,
      parent_id: parentId,
      level,
      order,
      created_at: now,
      updated_at: now
    }

    await db('article_cards').insert(newCard)

    // 返回时反序列化内容
    return {
      ...newCard,
      content: typeof newCard.content === 'string' ? JSON.parse(newCard.content) : newCard.content
    }
  } catch (error) {
    console.error('后端→ 创建卡片失败:', error)
    throw error
  }
}

// 获取文章的卡片列表
export async function getArticleCards(articleId: string): Promise<ArticleCard[]> {
  try {
    const cards = await db('article_cards')
      .where('article_id', articleId)
      .orderBy(['level', 'order'])

    // 返回时反序列化所有卡片的内容
    return cards.map((card) => ({
      ...card,
      content: typeof card.content === 'string' ? JSON.parse(card.content) : card.content
    }))
  } catch (error) {
    console.error('后端→ 获取文章卡片列表失败:', error)
    throw error
  }
}

// === 辅助方法 ===

// 获取下一个排序号
async function getNextOrder(parentId?: string): Promise<number> {
  const maxOrder = await db('collections')
    .where({ parent_id: parentId ?? null })
    .max('order as maxOrder')
    .first()
  return (maxOrder?.maxOrder || 0) + 1
}

// 获取卡片层级
async function getCardLevel(cardId: string): Promise<number> {
  const card = await db('article_cards').where('id', cardId).first()
  return card ? card.level : 0
}

// === 合集更新和删除 ===

// 更新合集
export async function updateCollection(id: string, data: Partial<Collection>): Promise<Collection> {
  try {
    const now = Date.now()
    const [updatedCollection] = await db('collections')
      .where({ id })
      .update({
        ...data,
        updated_at: now
      })
      .returning('*')

    if (!updatedCollection) {
      throw new Error(`合集不存在: ${id}`)
    }

    return updatedCollection
  } catch (error) {
    console.error('后端→ 更新合集失败:', error)
    throw error
  }
}

// 删除合集（软删除）
export async function deleteCollection(id: string): Promise<void> {
  try {
    await db.transaction(async (trx) => {
      // 1. 标记当前合集为已删除
      await trx('collections').where({ id }).update({
        is_deleted: true,
        updated_at: Date.now()
      })

      // 2. 递归标记所有子合集为已删除
      const childCollections = await trx('collections').where('parent_id', id).select('id')

      for (const child of childCollections) {
        await deleteCollection(child.id)
      }
    })
  } catch (error) {
    console.error('后端→ 删除合集失败:', error)
    throw error
  }
}

// === 文章更新和删除 ===

// 更新文章
export async function updateArticle(id: string, data: Partial<Article>): Promise<Article> {
  try {
    const now = Date.now()
    const updateData: any = {
      ...data,
      updated_at: now
    }

    // 处理需要序列化的字段
    if (data.collection_ids) {
      updateData.collection_ids = JSON.stringify(data.collection_ids)
    }
    if (data.tags) {
      updateData.tags = JSON.stringify(data.tags)
    }

    const [updatedArticle] = await db('articles').where({ id }).update(updateData).returning('*')

    if (!updatedArticle) {
      throw new Error(`文章不存在: ${id}`)
    }

    // 反序列化返回数据
    return {
      ...updatedArticle,
      collection_ids: updatedArticle.collection_ids
        ? JSON.parse(updatedArticle.collection_ids)
        : [],
      tags: updatedArticle.tags ? JSON.parse(updatedArticle.tags) : []
    }
  } catch (error) {
    console.error('后端→ 更新文章失败:', error)
    throw error
  }
}

// 删除文章（软删除）
export async function deleteArticle(id: string): Promise<void> {
  try {
    await db.transaction(async (trx) => {
      // 1. 标记文章为已删除
      await trx('articles').where({ id }).update({
        is_deleted: true,
        updated_at: Date.now()
      })

      // 2. 删除所有相关的卡片
      await trx('article_cards').where('article_id', id).delete()
    })
  } catch (error) {
    console.error('后端→ 删除文章失败:', error)
    throw error
  }
}

// === 卡片更新和删除 ===

// 更新卡片
export async function updateArticleCard(
  id: string,
  data: Partial<ArticleCard>
): Promise<ArticleCard> {
  try {
    const now = Date.now()
    const updateData: any = {
      ...data,
      updated_at: now
    }

    // 处理内容字段
    if (data.content !== undefined) {
      updateData.content =
        typeof data.content === 'string' ? data.content : JSON.stringify(data.content)
    }

    const [updatedCard] = await db('article_cards').where({ id }).update(updateData).returning('*')

    if (!updatedCard) {
      throw new Error(`卡片不存在: ${id}`)
    }

    // 返回时反序列化内容
    return {
      ...updatedCard,
      content:
        typeof updatedCard.content === 'string'
          ? JSON.parse(updatedCard.content)
          : updatedCard.content
    }
  } catch (error) {
    console.error('后端→ 更新卡片失败:', error)
    throw error
  }
}

// 删除卡片及其子卡片
export async function deleteArticleCard(id: string): Promise<void> {
  try {
    await db.transaction(async (trx) => {
      // 1. 获取所有子卡片ID
      const childCards = await trx('article_cards').where('parent_id', id).select('id')

      // 2. 递归删除所有子卡片
      for (const child of childCards) {
        await deleteArticleCard(child.id)
      }

      // 3. 删除当前卡片
      await trx('article_cards').where({ id }).delete()
    })
  } catch (error) {
    console.error('后端→ 删除卡片失败:', error)
    throw error
  }
}

// === 卡片排序和层级操作 ===

// 更新卡片顺序
export async function updateCardOrder(
  cardId: string,
  newOrder: number,
  newParentId?: string | null
): Promise<void> {
  try {
    await db.transaction(async (trx) => {
      const card = await trx('article_cards').where({ id: cardId }).first()

      if (!card) {
        throw new Error(`卡片不存在: ${cardId}`)
      }

      // 如果改变了父级，需要更新层级
      if (newParentId !== undefined && newParentId !== card.parent_id) {
        const newLevel = newParentId ? (await getCardLevel(newParentId)) + 1 : 0
        await trx('article_cards').where({ id: cardId }).update({
          parent_id: newParentId,
          level: newLevel,
          order: newOrder,
          updated_at: Date.now()
        })
      } else {
        // 仅更新顺序
        await trx('article_cards').where({ id: cardId }).update({
          order: newOrder,
          updated_at: Date.now()
        })
      }
    })
  } catch (error) {
    console.error('后端→ 更新卡片顺序失败:', error)
    throw error
  }
}

// 获取单个文章
export async function getArticleById(id: string): Promise<Article | null> {
  try {
    const article = await db('articles').where({ id, is_deleted: false }).first()

    if (!article) {
      return null
    }

    return {
      ...article,
      collection_ids: article.collection_ids ? JSON.parse(article.collection_ids) : [],
      tags: article.tags ? JSON.parse(article.tags) : []
    }
  } catch (error) {
    console.error('后端→ 获取文章失败:', error)
    throw error
  }
}
