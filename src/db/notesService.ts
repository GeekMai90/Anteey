import { db } from './config'
import {
  CardType,
  Keyword,
  Note,
  NoteReference,
  RelatedNote,
  RelatedNotesResult
} from '../renderer/src/types/Note'
import { v4 as uuidv4 } from 'uuid'
import { extractKeywords } from '../renderer/src/utils/keywordExtractor'
import { calculateSimilarity } from '../renderer/src/utils/noteSililarity'
import { SemanticVectorizer } from '../renderer/src/utils/semanticVector'
import { extractTextFromContent } from '../renderer/src/utils/keywordExtractor'

// 辅助函数：将数据库记录转换为 Note 对象
function convertToNote(record: any): Note {
  return {
    id: record.id,
    type: 'note',
    address: record.address,
    cardType: record.cardType,
    content: JSON.parse(record.content),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),

    // 标签列表
    tags: JSON.parse(record.tags),

    // 引用关系
    references: JSON.parse(record.references),

    // 关系树缓存
    relationshipTree: record.relationshipTree ? JSON.parse(record.relationshipTree) : undefined,

    // 图谱数据
    graphData: record.graphData ? JSON.parse(record.graphData) : undefined,

    // 基础字段
    cardBoxId: record.cardBoxId || undefined,
    parentId: record.parentId || undefined,
    isDeleted: record.isDeleted,
    isStarred: record.isStarred,
    starredOrder: record.starredOrder,
    rightBarOrder: record.rightBarOrder,

    // 语义相关
    keywords: record.keywords ? (JSON.parse(record.keywords) as Keyword[]) : undefined,
    semanticVector: record.semanticVector ? JSON.parse(record.semanticVector) : undefined,

    // 元数据
    metadata: record.metadata ? JSON.parse(record.metadata) : undefined
  }
}

// 获取相关笔记
export async function getRelatedNotes(
  noteId: string,
  limit: number = 5
): Promise<RelatedNotesResult> {
  try {
    console.log('后端→ 开始查找相关笔记:', noteId)

    // 1. 获取当前笔记
    const currentNote = await db('notes').where('id', noteId).first()
    if (!currentNote) {
      throw new Error(`Note with ID "${noteId}" not found`)
    }

    // 2. 确保语义向量服务已初始化
    const vectorizer = SemanticVectorizer.getInstance()
    await vectorizer.initialize()

    // 3. 获取所有其他未删除的笔记
    const allNotes = await db('notes')
      .where('id', '!=', noteId)
      .andWhere('isDeleted', false)
      .select('*')

    const currentKeywords = JSON.parse(currentNote.keywords || '[]')
    const currentContent = JSON.parse(currentNote.content)
    const currentText = extractTextFromContent(currentContent)

    // 4. 并行计算相似度
    const notesWithSimilarity = await Promise.all(
      allNotes.map(async (note) => {
        try {
          const noteKeywords = JSON.parse(note.keywords || '[]')
          const noteContent = JSON.parse(note.content)
          const noteText = extractTextFromContent(noteContent)

          // 根据内容长度和关键词数量决定计算方法
          const isShortContent = noteText.length < 100 || currentText.length < 100
          const hasKeywords = noteKeywords.length > 0 && currentKeywords.length > 0

          let similarity: number

          if (isShortContent && hasKeywords) {
            // 短内容且有关键词时使用关键词相似度
            similarity = calculateSimilarity(currentKeywords, noteKeywords)
            console.log('后端→ 使用关键词相似度:', note.id)
          } else if (!hasKeywords && !isShortContent) {
            // 长内容无关键词时使用纯语义相似度
            similarity = await vectorizer.calculateSemanticSimilarity(currentText, noteText)
            console.log('后端→ 使用语义相似度:', note.id)
          } else {
            // 其他情况使用混合相似度
            similarity = await vectorizer.calculateHybridSimilarity(
              currentContent,
              noteContent,
              currentKeywords,
              noteKeywords
            )
            console.log('后端→ 使用混合相似度:', note.id)
          }

          return {
            ...convertToNote(note),
            similarity,
            matchType:
              isShortContent && hasKeywords
                ? 'keyword'
                : !hasKeywords && !isShortContent
                  ? 'semantic'
                  : 'hybrid'
          } as RelatedNote & { matchType: string }
        } catch (error) {
          console.error('后端→ 计算笔记相似度失败:', error)
          return {
            ...convertToNote(note),
            similarity: 0,
            matchType: 'error'
          } as RelatedNote & { matchType: string }
        }
      })
    )

    // 5. 过滤和排序结果
    const filteredNotes = notesWithSimilarity
      .filter((item) => item.similarity > 20)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    console.log('后端→ 相似度计算统计:', {
      关键词匹配: notesWithSimilarity.filter((n) => n.matchType === 'keyword').length,
      语义匹配: notesWithSimilarity.filter((n) => n.matchType === 'semantic').length,
      混合匹配: notesWithSimilarity.filter((n) => n.matchType === 'hybrid').length,
      匹配失败: notesWithSimilarity.filter((n) => n.matchType === 'error').length
    })

    return {
      success: true,
      notes: filteredNotes,
      totalProcessed: allNotes.length,
      stats: {
        keywordMatches: notesWithSimilarity.filter((n) => n.matchType === 'keyword').length,
        semanticMatches: notesWithSimilarity.filter((n) => n.matchType === 'semantic').length,
        hybridMatches: notesWithSimilarity.filter((n) => n.matchType === 'hybrid').length,
        errors: notesWithSimilarity.filter((n) => n.matchType === 'error').length
      }
    }
  } catch (error) {
    console.error('后端→ 查找相关笔记失败:', error)
    return {
      success: false,
      notes: [],
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// ===笔记删除相关===
// 获取所有已删除的笔记
export async function getAllDeletedNotes(): Promise<Note[]> {
  try {
    const notes = await db('notes')
      .where('isDeleted', true)
      .orderBy('updatedAt', 'desc') // 按最后更新时间倒序排列
      .select('*')

    return notes.map(convertToNote)
  } catch (error) {
    console.error('后端→ 获取所有已删除的笔记失败:', error)
    throw error
  }
}

// 分页获取已删除的笔记
export async function getDeletedNotes(
  page: number,
  pageSize: number
): Promise<{
  notes: Note[]
  total: number
}> {
  try {
    const offset = (page - 1) * pageSize

    // 获取总数
    const [{ count }] = await db('notes').where('isDeleted', true).count('* as count')

    // 获取分页数据
    const notes = await db('notes')
      .where('isDeleted', true)
      .orderBy('updatedAt', 'desc')
      .offset(offset)
      .limit(pageSize)
      .select('*')

    return {
      notes: notes.map(convertToNote),
      total: Number(count)
    }
  } catch (error) {
    console.error('后端→ 获取已删除的笔记失败:', error)
    throw error
  }
}
// 软删除笔记
export async function softDeleteNote(id: string): Promise<Note> {
  return db.transaction(async (trx) => {
    try {
      // 1. 首先获取笔记
      const note = await trx('notes').where('id', id).first()

      if (!note) {
        throw new Error(`后端→ 未找到ID为 ${id} 的笔记`)
      }

      // 2. 更新笔记状态和相关数据
      const [updatedNote] = await trx('notes')
        .where('id', id)
        .update({
          isDeleted: true,
          updatedAt: new Date(),
          // 清空关系树缓存，因为被删除的笔记不应该出现在关系树中
          relationshipTree: null,
          // 更新图谱数据
          graphData: null
        })
        .returning('*')

      if (!updatedNote) {
        throw new Error(`后端→ 更新笔记失败: ${id}`)
      }

      // 3. 更新引用这个笔记的其他笔记的引用关系
      const referencingNotes = await trx('notes')
        .whereRaw(`json_extract(references, '$.outgoing') LIKE ?`, [`%${id}%`])
        .select('*')

      for (const refNote of referencingNotes) {
        const refs = JSON.parse(refNote.references)
        // 从 outgoing 引用中移除被删除的笔记
        refs.outgoing = refs.outgoing.filter((ref: NoteReference) => ref.noteId !== id)

        await trx('notes')
          .where('id', refNote.id)
          .update({
            references: JSON.stringify(refs),
            updatedAt: new Date()
          })
      }

      const convertedNote = convertToNote(updatedNote)
      return convertedNote
    } catch (error) {
      console.error(`后端→ 软删除笔记失败: ${id}:`, error)
      throw error
    }
  })
}

// 恢复已删除的笔记
export async function restoreNote(id: string): Promise<Note> {
  return db.transaction(async (trx) => {
    try {
      // 1. 获取要恢复的笔记
      const note = await trx('notes').where('id', id).first()

      if (!note) {
        throw new Error(`后端→ 未找到ID为 ${id} 的笔记`)
      }
      // 2. 恢复笔记状态
      const [restoredNote] = await trx('notes')
        .where('id', id)
        .update({
          isDeleted: false,
          updatedAt: new Date()
        })
        .returning('*')

      if (!restoredNote) {
        throw new Error(`后端→ 恢复笔记失败: ${id}`)
      }
      return convertToNote(restoredNote)
    } catch (error) {
      console.error(`后端→ 恢复已删除的笔记失败: ${id}:`, error)
      throw error
    }
  })
}

// 永久删除笔记
export async function permanentDeleteNote(id: string): Promise<void> {
  return db.transaction(async (trx) => {
    try {
      // 1. 获取要删除的笔记（用于记录日志）
      const note = await trx('notes').where('id', id).first()

      if (!note) {
        throw new Error(`后端→ 未找到ID为 ${id} 的笔记`)
      }

      // 2. 删除笔记引用表中的相关记录
      await trx('note_references').where('sourceNoteId', id).orWhere('targetNoteId', id).delete()

      // 3. 永久删除笔记
      await trx('notes').where('id', id).delete()

      // 4. 更新其他笔记中的引用关系
      await trx('notes')
        .whereRaw(`json_extract(references, '$.outgoing') LIKE ?`, [`%${id}%`])
        .orWhereRaw(`json_extract(references, '$.incoming') LIKE ?`, [`%${id}%`])
        .update({
          references: db.raw(
            `
            json_set(
              references,
              '$.outgoing',
              json_remove(json_extract(references, '$.outgoing'), json_each.value)
            )
            WHERE json_each.value LIKE ?
          `,
            [`%"noteId":"${id}"%`]
          )
        })

      console.log(`后端→ 永久删除笔记成功: ${id}`)
    } catch (error) {
      console.error(`后端→ 永久删除笔记失败: ${id}:`, error)
      throw error
    }
  })
}
// 将空笔记移到回收站
export async function moveEmptyNotesToTrash(): Promise<void> {
  try {
    // 1. 获取所有未删除的笔记（只选择需要的字段）
    const notes = await db('notes').where('isDeleted', false).select('id', 'content', 'address')

    const emptyNoteIds: string[] = []

    // 2. 检查哪些笔记是空的
    for (const note of notes) {
      const content = JSON.parse(note.content)

      // 检查笔记是否为空
      const isEmptyContent =
        content.type === 'doc' &&
        Array.isArray(content.content) &&
        (content.content.length === 0 ||
          (content.content.length === 1 &&
            content.content[0].type === 'paragraph' &&
            (!content.content[0].content || content.content[0].content.length === 0)))

      // 如果笔记内容为空且地址为空，记录其 ID
      if (isEmptyContent && note.address === '') {
        emptyNoteIds.push(note.id)
      }
    }

    if (emptyNoteIds.length === 0) {
      console.log('后端→ 没有找到需要移动到回收站的空笔记')
      return
    }

    // 3. 批量更新空笔记
    await db('notes').whereIn('id', emptyNoteIds).update({
      isDeleted: true,
      updatedAt: new Date()
    })

    console.log(`后端→ ${emptyNoteIds.length} 个空笔记已移至回收站`)
  } catch (error) {
    console.error('后端→ 移动空笔记到回收站失败:', error)
    throw error
  }
}

// ===笔记创建相关===
// 创建笔记
export async function createNote(): Promise<Note> {
  const id = uuidv4()
  const now = new Date()

  const newNote: Note = {
    id,
    type: 'note',
    address: '',
    cardType: 'Maincard',
    content: { type: 'doc', content: [] },
    createdAt: now,
    updatedAt: now,

    // 标签列表
    tags: [],

    // 引用关系
    references: {
      outgoing: [],
      incoming: []
    },

    // 关系树（初始为空）
    relationshipTree: {
      parents: [],
      children: [],
      siblings: []
    },

    // 图谱数据（初始为空）
    graphData: {
      x: 0,
      y: 0
    },

    // 基础字段
    cardBoxId: undefined,
    parentId: undefined,
    isDeleted: false,
    isStarred: false,
    starredOrder: undefined,
    rightBarOrder: undefined,

    // 语义相关（初始为空）
    keywords: [],
    semanticVector: undefined,

    // 元数据（初始为空）
    metadata: {
      title: '',
      summary: ''
    }
  }

  try {
    await db('notes').insert({
      ...newNote,
      content: JSON.stringify(newNote.content),
      tags: JSON.stringify(newNote.tags),
      references: JSON.stringify(newNote.references),
      relationshipTree: JSON.stringify(newNote.relationshipTree),
      graphData: JSON.stringify(newNote.graphData),
      keywords: JSON.stringify(newNote.keywords),
      metadata: JSON.stringify(newNote.metadata)
    })

    console.log('后端→ 创建笔记成功:', id)
    return newNote
  } catch (error) {
    console.error('后端→ 创建笔记失败:', error)
    throw error
  }
}

//===笔记更新相关===
// 更新笔记地址
export async function updateNoteAddress(id: string, address: string): Promise<void> {
  try {
    await db('notes').where('id', id).update({
      address,
      updatedAt: new Date()
    })

    console.log(`后端→ 笔记 ${id} 地址更新为: ${address}`)
  } catch (error) {
    console.error('后端→ 更新笔记地址失败:', error)
    throw error
  }
}
// 更新笔记类型
export async function updateNoteCardType(id: string, cardType: CardType): Promise<void> {
  try {
    // 验证卡片类型是否合法
    if (!['Maincard', 'Bibcard', 'Indexcard', 'Hoplinkcard'].includes(cardType)) {
      throw new Error(`无效的卡片类型: ${cardType}`)
    }

    await db('notes').where('id', id).update({
      cardType,
      updatedAt: new Date()
    })

    console.log(`后端→ 笔记 ${id} 类型更新为: ${cardType}`)
  } catch (error) {
    console.error('后端→ 更新笔记类型失败:', error)
    throw error
  }
}
// 更新笔记的卡片盒
export async function updateNoteCardBox(id: string, cardBoxId: string | null): Promise<void> {
  try {
    // 如果要设置卡片盒，先验证卡片盒是否存在
    if (cardBoxId) {
      const cardBox = await db('cardboxes').where('id', cardBoxId).first()
      if (!cardBox) {
        throw new Error(`卡片盒 ${cardBoxId} 不存在`)
      }
    }

    await db('notes').where('id', id).update({
      cardBoxId,
      updatedAt: new Date()
    })

    console.log(`后端→ 笔记 ${id} 更新卡片盒为: ${cardBoxId || '无'}`)
  } catch (error) {
    console.error('后端→ 更新笔记卡片盒失败:', error)
    throw error
  }
}

// 更新笔记内容
export async function updateNoteContent(id: string, content: object): Promise<void> {
  try {
    await db.transaction(async (trx) => {
      // 1. 准备更新数据
      const updateData: any = {
        content: JSON.stringify(content),
        updatedAt: new Date()
      }

      // 2. 提取关键词
      try {
        const keywords: Keyword[] = extractKeywords(content)
        console.log('后端→ 关键词提取完成:', keywords)
        updateData.keywords = JSON.stringify(keywords)
      } catch (keywordError) {
        console.error('后端→ 关键词提取失败:', keywordError)
        updateData.keywords = JSON.stringify([])
      }

      // 3. 计算语义向量
      try {
        const vectorizer = SemanticVectorizer.getInstance()
        await vectorizer.initialize()
        const text = extractTextFromContent(content)
        const vector = await vectorizer.getVector(text)
        updateData.semanticVector = JSON.stringify(vector)
        console.log('后端→ 语义向量计算完成')
      } catch (vectorError) {
        console.error('后端→ 语义向量计算失败:', vectorError)
        updateData.semanticVector = JSON.stringify([])
      }

      // 4. 执行更新
      await trx('notes').where('id', id).update(updateData)

      console.log(`后端→ 笔记 ${id} 内容已更新`)
    })
  } catch (error) {
    console.error('后端→ 更新笔记内容失败:', error)
    throw error
  }
}

// 更新笔记标签
export async function updateNoteTags(id: string, tags: string[]): Promise<void> {
  try {
    await db('notes')
      .where('id', id)
      .update({
        tags: JSON.stringify(tags),
        updatedAt: new Date()
      })

    console.log(`后端→ 笔记 ${id} 标签已更新:`, tags)
  } catch (error) {
    console.error('后端→ 更新笔记标签失败:', error)
    throw error
  }
}
// 更新笔记引用关系
export async function updateNoteReferences(
  id: string,
  references: {
    outgoing: NoteReference[]
    incoming: NoteReference[]
  }
): Promise<void> {
  try {
    await db('notes')
      .where('id', id)
      .update({
        references: JSON.stringify(references),
        updatedAt: new Date()
      })

    console.log(`后端→ 笔记 ${id} 引用关系已更新`)
  } catch (error) {
    console.error('后端→ 更新笔记引用关系失败:', error)
    throw error
  }
}
// 更新笔记关系树
export async function updateNoteRelationshipTree(
  id: string,
  relationshipTree: {
    parents: string[]
    children: string[]
    siblings: string[]
  }
): Promise<void> {
  try {
    await db('notes')
      .where('id', id)
      .update({
        relationshipTree: JSON.stringify(relationshipTree),
        updatedAt: new Date()
      })

    console.log(`后端→ 笔记 ${id} 关系树已更新`)
  } catch (error) {
    console.error('后端→ 更新笔记关系树失败:', error)
    throw error
  }
}
// 更新笔记图谱数据
export async function updateNoteGraphData(
  id: string,
  graphData: {
    x: number
    y: number
  }
): Promise<void> {
  try {
    await db('notes')
      .where('id', id)
      .update({
        graphData: JSON.stringify(graphData),
        updatedAt: new Date()
      })

    console.log(`后端→ 笔记 ${id} 图谱数据已更新:`, graphData)
  } catch (error) {
    console.error('后端→ 更新笔记图谱数据失败:', error)
    throw error
  }
}
// 更新笔记父节点
export async function updateNoteParent(id: string, parentId: string | null): Promise<void> {
  try {
    await db('notes').where('id', id).update({
      parentId,
      updatedAt: new Date()
    })

    console.log(`后端→ 笔记 ${id} 父节点已更新为: ${parentId || '无'}`)
  } catch (error) {
    console.error('后端→ 更新笔记父节点失败:', error)
    throw error
  }
}
// 更新笔记收藏状态
export async function updateNoteStarred(id: string, isStarred: boolean): Promise<boolean> {
  // 返回最终的收藏状态
  return db.transaction(async (trx) => {
    // 1. 获取当前笔记
    const note = await trx('notes').where('id', id).first()
    if (!note) {
      throw new Error(`笔记 ${id} 不存在`)
    }

    // 如果状态没变，直接返回当前状态
    if (note.isStarred === isStarred) {
      return isStarred
    }

    if (isStarred) {
      // 添加星标
      const maxOrderResult = await trx('notes')
        .max('starredOrder as maxOrder')
        .where('isStarred', true)
        .first()
      const newStarredOrder = (maxOrderResult?.maxOrder || 0) + 1

      await trx('notes').where('id', id).update({
        isStarred: true,
        starredOrder: newStarredOrder,
        updatedAt: new Date()
      })
    } else {
      // 移除星标
      const removedOrder = note.starredOrder

      // 更新当前笔记
      await trx('notes').where('id', id).update({
        isStarred: false,
        starredOrder: null,
        updatedAt: new Date()
      })

      // 更新其他笔记的顺序
      await trx('notes')
        .where('isStarred', true)
        .andWhere('starredOrder', '>', removedOrder)
        .update({
          starredOrder: trx.raw('starredOrder - 1'),
          updatedAt: new Date()
        })
    }

    console.log(`后端→ 笔记 ${id} 收藏状态已更新为: ${isStarred}`)
    return isStarred // 返回最终状态
  })
}

// 更新收藏笔记的顺序
export async function updateStarredNotesOrder(
  orders: { id: string; starredOrder: number }[]
): Promise<void> {
  try {
    if (!orders || orders.length === 0) {
      throw new Error('后端→ 更新星标笔记顺序：无效的输入数据')
    }

    await db.transaction(async (trx) => {
      const cases = orders.map((order) => `WHEN '${order.id}' THEN ${order.starredOrder}`).join(' ')

      await trx('notes')
        .update({
          starredOrder: trx.raw(`CASE id ${cases} ELSE starredOrder END`),
          updatedAt: new Date()
        })
        .whereIn(
          'id',
          orders.map((o) => o.id)
        )
        .where('isStarred', true)
    })

    console.log(`后端→ 更新星标笔记顺序成功，共更新 ${orders.length} 条笔记`)
  } catch (error) {
    console.error('后端→ 更新星标笔记顺序失败:', error)
    throw error
  }
}

// 更新笔记元数据
export async function updateNoteMetadata(
  id: string,
  metadata: {
    title?: string
    summary?: string
  }
): Promise<void> {
  try {
    // 1. 获取当前笔记的元数据
    const note = await db('notes').where('id', id).select('metadata').first()

    if (!note) {
      throw new Error(`笔记 ${id} 不存在`)
    }

    // 2. 合并新旧元数据
    const currentMetadata = note.metadata ? JSON.parse(note.metadata) : {}
    const updatedMetadata = {
      ...currentMetadata,
      ...metadata
    }

    // 3. 更新元数据
    await db('notes')
      .where('id', id)
      .update({
        metadata: JSON.stringify(updatedMetadata),
        updatedAt: new Date()
      })

    console.log(`后端→ 笔记 ${id} 元数据已更新:`, metadata)
  } catch (error) {
    console.error('后端→ 更新笔记元数据失败:', error)
    throw error
  }
}

// ===获取笔记相关===
// 获取单条笔记
export async function getNoteById(id: string): Promise<Note> {
  try {
    const note = await db('notes').where('id', id).first()

    if (!note) {
      throw new Error(`笔记 ${id} 不存在`)
    }

    const convertedNote = convertToNote(note)
    console.log(`后端→ 获取笔记 ${id} 成功`)
    return convertedNote
  } catch (error) {
    console.error('后端→ 获取笔记失败:', error)
    throw error
  }
}

// 获取所有笔记
export async function getAllNotes(options?: {
  includeDeleted?: boolean // 是否包含已删除的笔记
  orderBy?: 'createdAt' | 'updatedAt' // 排序字段
  order?: 'asc' | 'desc' // 排序方向
}): Promise<Note[]> {
  try {
    let query = db('notes')

    // 默认不包含已删除的笔记
    if (!options?.includeDeleted) {
      query = query.where('isDeleted', false)
    }

    // 设置排序
    const orderBy = options?.orderBy || 'updatedAt'
    const order = options?.order || 'desc'
    query = query.orderBy(orderBy, order)

    const notes = await query

    const convertedNotes = notes.map(convertToNote)
    console.log(`后端→ 获取所有笔记成功，共 ${convertedNotes.length} 条`)

    return convertedNotes
  } catch (error) {
    console.error('后端→ 获取所有笔记失败:', error)
    throw error
  }
}

// 获取收藏的笔记
export async function getStarredNotes(): Promise<Note[]> {
  try {
    const notes = await db('notes')
      .where({
        isStarred: true,
        isDeleted: false
      })
      .orderBy('starredOrder', 'asc') // 按收藏顺序排序
      .orderBy('updatedAt', 'desc') // 相同顺序的按更新时间排序

    const convertedNotes = notes.map(convertToNote)
    console.log(`后端→ 获取收藏笔记成功，共 ${convertedNotes.length} 条`)

    return convertedNotes
  } catch (error) {
    console.error('后端→ 获取收藏笔记失败:', error)
    throw error
  }
}

// 分页查询参数接口
export interface GetPaginatedNotesParams {
  page: number
  limit: number
  cardBoxId?: string // 'all' | 'inbox' | string
  cardTypes?: CardType[]
  sortBy: 'address' | 'createdAt' | 'updatedAt'
  sortOrder: 'asc' | 'desc'
  searchTerm?: string
}

// 分页查询结果接口
export interface PaginatedResult {
  notes: Note[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasMore: boolean
}

// 卡片盒页面获取分页的笔记
export async function getPaginatedNotesByCardbox({
  page,
  limit,
  cardBoxId,
  cardTypes,
  sortBy = 'address',
  sortOrder = 'asc',
  searchTerm
}: GetPaginatedNotesParams): Promise<PaginatedResult> {
  try {
    console.log('后端→ 开始获取卡片盒分页笔记', {
      cardBoxId,
      cardTypes,
      sortBy,
      sortOrder,
      searchTerm,
      page,
      limit
    })

    let query = db('notes').where('isDeleted', false)

    // 卡片盒筛选
    if (cardBoxId === 'inbox') {
      console.log('后端→ 筛选收件箱笔记')
      query = query.whereNull('cardBoxId')
    } else if (cardBoxId && cardBoxId !== 'all') {
      console.log(`后端→ 筛选卡片盒 ${cardBoxId} 的笔记`)
      query = query.where('cardBoxId', cardBoxId)
    } else {
      console.log('后端→ 获取所有卡片盒的笔记')
    }

    // 搜索条件
    if (searchTerm?.trim()) {
      query = query.where((builder) => {
        builder
          .whereRaw('LOWER(address) LIKE ?', [`%${searchTerm.toLowerCase()}%`])
          .orWhereRaw('content::text ILIKE ?', [`%${searchTerm}%`])
          .orWhereRaw('metadata::text ILIKE ?', [`%${searchTerm}%`])
      })
      console.log(`后端→ 添加搜索条件: ${searchTerm}`)
    }

    // 卡片类型筛选
    if (cardTypes && cardTypes.length > 0) {
      query = query.whereIn('cardType', cardTypes)
      console.log('后端→ 添加卡片类型筛选:', cardTypes)
    }

    const offset = (page - 1) * limit

    // 排序
    const validSortColumns = ['address', 'createdAt', 'updatedAt']
    const actualSortBy = validSortColumns.includes(sortBy) ? sortBy : 'address'

    // 并发查询总数和分页数据
    const [notes, countResult] = await Promise.all([
      query.clone().orderBy(actualSortBy, sortOrder).limit(limit).offset(offset),
      query.clone().count('* as count').first()
    ])

    const totalCount = countResult ? (countResult.count as number) : 0
    const totalPages = Math.ceil(totalCount / limit)
    const hasMore = page < totalPages

    console.log('后端→ 获取卡片盒分页笔记成功', {
      totalCount,
      currentPage: page,
      totalPages,
      hasMore,
      noteCount: notes.length
    })

    return {
      notes: notes.map(convertToNote),
      totalCount,
      currentPage: page,
      totalPages,
      hasMore
    }
  } catch (error) {
    console.error('后端→ 获取分页笔记失败:', error)
    throw error
  }
}

// 时间线查询参数接口
export interface TimelineQueryParams {
  mode: 'all' | 'date' | 'range' // 查询模式
  page?: number // 分页模式参数
  limit?: number
  date?: string // 具体日期查询参数
  dateRange?: {
    // 日期范围查询参数
    start: Date
    end: Date
  }
  cardTypes?: CardType[] // 卡片类型过滤
  sortOrder?: 'asc' | 'desc' // 排序方向
  searchTerm?: string // 搜索关键词
  searchFields?: ('content' | 'address' | 'metadata')[] // 搜索字段
}

// 时间线查询结果接口
export interface TimelineQueryResult {
  notes: Note[] // 笔记列表
  totalCount: number // 总数
  currentPage?: number // 当前页码（仅在 mode='all' 时返回）
  hasMore?: boolean // 是否还有更多（仅在 mode='all' 时返回）
}

// 获取时间线笔记
export async function getTimelineNotes(params: TimelineQueryParams): Promise<TimelineQueryResult> {
  try {
    console.log('后端→ 开始获取时间线笔记', params)

    let query = db('notes').where('isDeleted', false)

    // 日期相关查询条件
    switch (params.mode) {
      case 'date': {
        if (!params.date) throw new Error('日期参数缺失')
        const startOfDay = new Date(params.date)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(params.date)
        endOfDay.setHours(23, 59, 59, 999)
        query = query.whereBetween('createdAt', [startOfDay, endOfDay])
        break
      }

      case 'range': {
        if (!params.dateRange) throw new Error('日期范围参数缺失')
        query = query.whereBetween('createdAt', [params.dateRange.start, params.dateRange.end])
        break
      }

      case 'all': {
        if (!params.page || !params.limit) {
          throw new Error('分页参数缺失')
        }
        break
      }
    }

    // 搜索条件
    if (params.searchTerm?.trim()) {
      query = query.where((builder) => {
        const searchFields = params.searchFields || ['content', 'address', 'metadata']
        const searchTerm = params.searchTerm!.toLowerCase()

        searchFields.forEach((field, index) => {
          const condition = index === 0 ? 'whereRaw' : 'orWhereRaw'
          switch (field) {
            case 'content':
              builder[condition]('LOWER(content::text) LIKE ?', [`%${searchTerm}%`])
              break
            case 'address':
              builder[condition]('LOWER(address) LIKE ?', [`%${searchTerm}%`])
              break
            case 'metadata':
              builder[condition]('LOWER(metadata::text) LIKE ?', [`%${searchTerm}%`])
              break
          }
        })
      })
      console.log(`后端→ 添加搜索条件: ${params.searchTerm}`)
    }

    // 卡片类型过滤
    if (params.cardTypes && params.cardTypes.length > 0) {
      query = query.whereIn('cardType', params.cardTypes)
    }

    // 排序
    query = query.orderBy('createdAt', params.sortOrder || 'desc')

    // 执行查询
    if (params.mode === 'all') {
      const offset = (params.page! - 1) * params.limit!

      const [notes, countResult] = await Promise.all([
        query
          .clone()
          .limit(params.limit! + 1)
          .offset(offset),
        query.clone().count('* as count').first()
      ])

      const hasMore = notes.length > params.limit!
      const resultNotes = hasMore ? notes.slice(0, params.limit!) : notes

      return {
        notes: resultNotes.map(convertToNote),
        totalCount: countResult ? (countResult.count as number) : 0,
        hasMore,
        currentPage: params.page
      }
    } else {
      const notes = await query
      return {
        notes: notes.map(convertToNote),
        totalCount: notes.length
      }
    }
  } catch (error) {
    console.error('后端→ 获取时间线笔记失败:', error)
    throw error
  }
}

// 通用分页查询参数接口
export interface CommonPaginationParams {
  page: number
  limit: number
  sortBy?: 'createdAt' | 'updatedAt' | 'address'
  sortOrder?: 'asc' | 'desc'
  searchTerm?: string
  searchFields?: ('content' | 'address' | 'metadata')[]
  cardTypes?: CardType[]
  includeDeleted?: boolean
}

// 分页查询结果接口
export interface PaginationResult {
  notes: Note[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasMore: boolean
}

// 获取分页的笔记（通用方法）
export async function getPaginatedNotes({
  page,
  limit,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  searchTerm,
  searchFields = ['content', 'address', 'metadata'],
  cardTypes,
  includeDeleted = false
}: CommonPaginationParams): Promise<PaginationResult> {
  try {
    console.log('后端→ 开始获取分页笔记', {
      page,
      limit,
      sortBy,
      sortOrder,
      searchTerm,
      cardTypes
    })

    // 基础查询
    let query = db('notes')

    // 是否包含已删除的笔记
    if (!includeDeleted) {
      query = query.where('isDeleted', false)
    }

    // 搜索条件
    if (searchTerm?.trim()) {
      query = query.where((builder) => {
        searchFields.forEach((field, index) => {
          const condition = index === 0 ? 'whereRaw' : 'orWhereRaw'
          const searchValue = searchTerm.toLowerCase()

          switch (field) {
            case 'content':
              builder[condition]('LOWER(content::text) LIKE ?', [`%${searchValue}%`])
              break
            case 'address':
              builder[condition]('LOWER(address) LIKE ?', [`%${searchValue}%`])
              break
            case 'metadata':
              builder[condition]('LOWER(metadata::text) LIKE ?', [`%${searchValue}%`])
              break
          }
        })
      })
      console.log(`后端→ 添加搜索条件: ${searchTerm}`)
    }

    // 卡片类型筛选
    if (cardTypes && cardTypes.length > 0) {
      query = query.whereIn('cardType', cardTypes)
      console.log('后端→ 添加卡片类型筛选:', cardTypes)
    }

    const offset = (page - 1) * limit

    // 执行查询
    const [notes, countResult] = await Promise.all([
      query.clone().orderBy(sortBy, sortOrder).limit(limit).offset(offset),
      query.clone().count('* as count').first()
    ])

    const totalCount = countResult ? (countResult.count as number) : 0
    const totalPages = Math.ceil(totalCount / limit)
    const hasMore = page < totalPages

    console.log('后端→ 获取分页笔记成功', {
      totalCount,
      currentPage: page,
      totalPages,
      hasMore,
      noteCount: notes.length
    })

    return {
      notes: notes.map(convertToNote),
      totalCount,
      currentPage: page,
      totalPages,
      hasMore
    }
  } catch (error) {
    console.error('后端→ 获取分页笔记失败:', error)
    throw error
  }
}

// 日期查询参数接口
export interface DateQueryParams {
  startDate?: Date // 开始日期
  endDate?: Date // 结束日期
  cardTypes?: CardType[] // 可选的卡片类型过滤
}

// 日期查询结果接口
export interface DateQueryResult {
  dates: string[] // 有笔记的日期
  notesCount: {
    // 每个日期的笔记数量
    [date: string]: number
  }
}

// 获取有笔记的日期
export async function getAllDatesWithNotes(params?: DateQueryParams): Promise<DateQueryResult> {
  try {
    console.log('后端→ 开始获取有笔记的日期', params)

    let query = db('notes').where('isDeleted', false)

    // PostgreSQL 日期格式化
    const dateFormat = 'TO_CHAR(TO_TIMESTAMP("createdAt" / 1000), \'YYYY-MM-DD\')'

    // 添加日期范围过滤
    if (params?.startDate) {
      query = query.where('createdAt', '>=', params.startDate.getTime())
    }
    if (params?.endDate) {
      query = query.where('createdAt', '<=', params.endDate.getTime())
    }

    // 添加卡片类型过滤
    if (params?.cardTypes && params?.cardTypes.length > 0) {
      query = query.whereIn('cardType', params.cardTypes)
    }

    // 获取日期和每个日期的笔记数量
    const result = await query
      .select(db.raw(`${dateFormat} as date`))
      .count('* as count')
      .groupBy(db.raw(dateFormat))
      .orderBy('date', 'desc')

    if (!result || result.length === 0) {
      console.log('后端→ 没有找到任何笔记日期')
      return {
        dates: [],
        notesCount: {}
      }
    }

    // 处理结果
    const dates = result.map((row: any) => row.date as string)
    const notesCount = result.reduce(
      (acc: { [key: string]: number }, row: any) => {
        acc[row.date] = Number(row.count)
        return acc
      },
      {} as { [key: string]: number }
    )

    console.log('后端→ 获取笔记日期成功', {
      totalDates: dates.length,
      dateRange: {
        first: dates[dates.length - 1],
        last: dates[0]
      }
    })

    return {
      dates,
      notesCount
    }
  } catch (error) {
    console.error('后端→ 获取有笔记的日期失败:', error)
    throw error
  }
}
// 随机笔记查询参数接口
export interface RandomNotesParams {
  count?: number // 需要获取的笔记数量
  cardTypes?: CardType[] // 卡片类型过滤
  excludeIds?: string[] // 需要排除的笔记ID
  minCreatedAt?: Date // 最早创建时间
  maxCreatedAt?: Date // 最晚创建时间
}

// 获取随机笔记
export async function getRandomNotes(params?: RandomNotesParams): Promise<Note[]> {
  try {
    const { count = 3, cardTypes, excludeIds, minCreatedAt, maxCreatedAt } = params || {}

    console.log('后端→ 开始获取随机笔记', params)

    let query = db('notes').where('isDeleted', false)

    // 添加卡片类型过滤
    if (cardTypes && cardTypes.length > 0) {
      query = query.whereIn('cardType', cardTypes)
    }

    // 排除指定的笔记
    if (excludeIds && excludeIds.length > 0) {
      query = query.whereNotIn('id', excludeIds)
    }

    // 添加时间范围过滤
    if (minCreatedAt) {
      query = query.where('createdAt', '>=', minCreatedAt.getTime())
    }
    if (maxCreatedAt) {
      query = query.where('createdAt', '<=', maxCreatedAt.getTime())
    }

    // 使用数据库的随机排序功能
    // PostgreSQL 使用 RANDOM()
    const randomNotes = await query.orderByRaw('RANDOM()').limit(count)

    console.log(`后端→ 成功获取 ${randomNotes.length} 条随机笔记`)

    return randomNotes.map(convertToNote)
  } catch (error) {
    console.error('后端→ 获取随机笔记失败:', error)
    throw error
  }
}

// 用户使用统计接口
export interface UserUsageStats {
  totalDays: number
  firstNoteDate: Date
  totalNotes: number
  activeDays: number
  notesByType: {
    Maincard: number
    Bibcard: number
    Indexcard: number
    Hoplinkcard: number
  }
  averageNotesPerDay: number
  lastActiveDate: Date
}

// 笔记类型统计结果接口
interface NoteTypeCount {
  cardType: CardType
  count: string | number
}

// 获取用户使用统计
export async function getUserUsageStats(): Promise<UserUsageStats> {
  try {
    console.log('后端→ 开始获取用户使用统计')

    const [firstNote, lastNote, totalNotesResult, notesByType, activeDaysResult] =
      await Promise.all([
        // 第一条笔记
        db('notes').where('isDeleted', false).orderBy('createdAt', 'asc').first(),

        // 最后一条笔记
        db('notes').where('isDeleted', false).orderBy('createdAt', 'desc').first(),

        // 总笔记数
        db('notes').where('isDeleted', false).count('* as count').first(),

        // 各类型笔记数量
        db('notes')
          .where('isDeleted', false)
          .select('cardType')
          .count('* as count')
          .groupBy('cardType') as Promise<NoteTypeCount[]>,

        // 有写笔记的天数
        db('notes')
          .where('isDeleted', false)
          .countDistinct(db.raw('DATE(TO_TIMESTAMP("createdAt" / 1000))') as any)
          .first()
      ])

    if (!firstNote) {
      return {
        totalDays: 0,
        firstNoteDate: new Date(),
        totalNotes: 0,
        activeDays: 0,
        notesByType: {
          Maincard: 0,
          Bibcard: 0,
          Indexcard: 0,
          Hoplinkcard: 0
        },
        averageNotesPerDay: 0,
        lastActiveDate: new Date()
      }
    }

    // 计算总天数
    const firstDate = new Date(firstNote.createdAt)
    const now = new Date()
    firstDate.setHours(0, 0, 0, 0)
    now.setHours(0, 0, 0, 0)
    const diffTime = Math.abs(now.getTime() - firstDate.getTime())
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1

    // 处理笔记类型统计
    const typeStats = {
      Maincard: 0,
      Bibcard: 0,
      Indexcard: 0,
      Hoplinkcard: 0
    }

    notesByType.forEach((item: NoteTypeCount) => {
      typeStats[item.cardType] = Number(item.count)
    })

    const stats: UserUsageStats = {
      totalDays,
      firstNoteDate: new Date(firstNote.createdAt),
      totalNotes: Number(totalNotesResult?.count || 0),
      activeDays: Number(activeDaysResult?.count || 0),
      notesByType: typeStats,
      averageNotesPerDay: Number(totalNotesResult?.count || 0) / totalDays,
      lastActiveDate: lastNote ? new Date(lastNote.createdAt) : new Date()
    }

    console.log('后端→ 获取用户使用统计成功', stats)
    return stats
  } catch (error) {
    console.error('后端→ 获取用户使用统计失败:', error)
    throw error
  }
}

// 昨日笔记统计接口
export interface DailyNoteStats {
  totalCount: number
  typeDistribution: {
    Maincard: number
    Bibcard: number
    Indexcard: number
    Hoplinkcard: number
  }
  hourlyDistribution: {
    [hour: number]: number
  }
  firstNoteTime: Date | null
  lastNoteTime: Date | null
}

// 查询结果类型定义
interface TypeCount {
  cardType: CardType
  count: string | number
}

interface HourCount {
  hour: number
  count: string | number
}

// 获取昨日笔记统计
export async function getLastDayNoteStats(): Promise<DailyNoteStats> {
  try {
    const now = new Date()
    const lastDayStart = new Date(now.setDate(now.getDate() - 1))
    lastDayStart.setHours(0, 0, 0, 0)
    const lastDayEnd = new Date(lastDayStart)
    lastDayEnd.setHours(23, 59, 59, 999)

    // 并发查询各项统计数据
    const [totalCount, typeStats, firstNote, lastNote, hourlyStats] = await Promise.all([
      db('notes')
        .where('isDeleted', false)
        .whereBetween('createdAt', [lastDayStart.getTime(), lastDayEnd.getTime()])
        .count('* as count')
        .first(),

      db('notes')
        .where('isDeleted', false)
        .whereBetween('createdAt', [lastDayStart.getTime(), lastDayEnd.getTime()])
        .select('cardType')
        .count('* as count')
        .groupBy('cardType') as Promise<TypeCount[]>,

      db('notes')
        .where('isDeleted', false)
        .whereBetween('createdAt', [lastDayStart.getTime(), lastDayEnd.getTime()])
        .orderBy('createdAt', 'asc')
        .first(),

      db('notes')
        .where('isDeleted', false)
        .whereBetween('createdAt', [lastDayStart.getTime(), lastDayEnd.getTime()])
        .orderBy('createdAt', 'desc')
        .first(),

      db('notes')
        .where('isDeleted', false)
        .whereBetween('createdAt', [lastDayStart.getTime(), lastDayEnd.getTime()])
        .select(db.raw('EXTRACT(HOUR FROM TO_TIMESTAMP("createdAt" / 1000)) as hour'))
        .count('* as count')
        .groupBy('hour') as Promise<HourCount[]>
    ])

    // 处理类型统计
    const typeDistribution = {
      Maincard: 0,
      Bibcard: 0,
      Indexcard: 0,
      Hoplinkcard: 0
    }

    typeStats.forEach((item) => {
      typeDistribution[item.cardType] = Number(item.count)
    })

    // 初始化小时分布
    const hourlyDistribution: { [key: number]: number } = {}
    for (let i = 0; i < 24; i++) {
      hourlyDistribution[i] = 0
    }

    // 处理小时分布
    hourlyStats.forEach((item) => {
      hourlyDistribution[item.hour] = Number(item.count)
    })

    const stats: DailyNoteStats = {
      totalCount: Number(totalCount?.count || 0),
      typeDistribution,
      hourlyDistribution,
      firstNoteTime: firstNote ? new Date(firstNote.createdAt) : null,
      lastNoteTime: lastNote ? new Date(lastNote.createdAt) : null
    }

    return stats
  } catch (error) {
    console.error('后端→ 获取昨日笔记统计失败:', error)
    throw error
  }
}

//获取热力图数据
export async function getHeatmapData(): Promise<{ date: string; count: number }[]> {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + 30)

  const data: Record<string, number> = {}

  // 初始化日期范围
  for (let d = new Date(oneYearAgo); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateString = d.toISOString().split('T')[0]
    data[dateString] = 0
  }

  // 从数据库获取笔记创建日期并统计
  const notes = await db('notes')
    .where('isDeleted', false)
    .select(db.raw("strftime('%Y-%m-%d', datetime(createdAt / 1000, 'unixepoch')) as createdDate"))
    .whereBetween('createdAt', [oneYearAgo.getTime(), endDate.getTime()])

  notes.forEach((note) => {
    const dateString = note.createdDate
    if (dateString in data) {
      data[dateString]++
    }
  })

  return Object.entries(data).map(([date, count]) => ({ date, count }))
}

export interface SearchResult {
  id: string
  title: string
  blocks: Array<{ content: string }>
}
// 搜索笔记
export async function searchNotes(query: string): Promise<SearchResult[]> {
  console.log('后端→ 开始搜索笔记:', query)
  const lowercaseQuery = query.toLowerCase().trim()
  if (!lowercaseQuery) return []

  try {
    const notes = await db('notes')
      .where('isDeleted', false)
      .select('id', 'address', 'content', 'tags')

    return notes.reduce((results, note) => {
      const matchingBlocks: Array<{ content: string }> = []

      // 搜索地址
      if (note.address.toLowerCase().includes(lowercaseQuery)) {
        matchingBlocks.push({ content: note.address })
      }

      // 搜索内容
      const content = JSON.parse(note.content)
      const searchContent = (item: any) => {
        if (!item) return
        if (Array.isArray(item)) {
          item.forEach(searchContent)
        } else if (typeof item === 'object') {
          if (item.type === 'text' && typeof item.text === 'string') {
            if (item.text.toLowerCase().includes(lowercaseQuery)) {
              matchingBlocks.push({ content: item.text })
            }
          } else if (item.content) {
            searchContent(item.content)
          } else {
            Object.values(item).forEach(searchContent)
          }
        }
      }
      searchContent(content)

      // 搜索标签
      const tags = JSON.parse(note.tags)
      tags.forEach((tag: string) => {
        if (tag.toLowerCase().includes(lowercaseQuery)) {
          matchingBlocks.push({ content: `#${tag}` })
        }
      })

      if (matchingBlocks.length > 0) {
        results.push({
          id: note.id,
          title: note.address,
          blocks: matchingBlocks
        })
      }

      return results
    }, [] as SearchResult[])
  } catch (error) {
    console.error('后端→ 搜索笔记失败:', error)
    throw new Error('搜索笔记失败')
  }
}

// 搜索笔记列表
export async function searchNotesList(query: string): Promise<Note[]> {
  console.log('后端→ 开始搜索笔记列表:', query)
  const lowercaseQuery = query.toLowerCase().trim()
  if (!lowercaseQuery) return []

  try {
    const result = await db('notes').where('isDeleted', false).select('*')

    const notes = result.filter((note) => {
      // 搜索地址
      if (note.address.toLowerCase().includes(lowercaseQuery)) {
        return true
      }

      // 搜索内容
      const content = JSON.parse(note.content)
      const searchContent = (item: any): boolean => {
        if (!item) return false
        if (Array.isArray(item)) {
          return item.some(searchContent)
        } else if (typeof item === 'object') {
          if (item.type === 'text' && typeof item.text === 'string') {
            return item.text.toLowerCase().includes(lowercaseQuery)
          } else if (item.content) {
            return searchContent(item.content)
          } else {
            return Object.values(item).some(searchContent)
          }
        }
        return false
      }
      if (searchContent(content)) {
        return true
      }

      // 搜索标签
      const tags = JSON.parse(note.tags)
      return tags.some((tag: string) => tag.toLowerCase().includes(lowercaseQuery))
    })
    return notes.map(convertToNote)
  } catch (error) {
    console.error('后端→ 搜索笔记列表失败:', error)
    throw new Error('搜索笔记列表失败')
  }
}
