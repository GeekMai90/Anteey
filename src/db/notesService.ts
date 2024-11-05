import { db } from './config'
import {
  CardType,
  Keyword,
  Note,
  RelatedNote,
  RelatedNotesResult
} from '../renderer/src/types/Note'
import { v4 as uuidv4 } from 'uuid'
import { extractKeywords } from '../renderer/src/utils/keywordExtractor'
import { calculateSimilarity } from '../renderer/src/utils/noteSililarity'
import { SemanticVectorizer } from '../renderer/src/utils/semanticVector'
import { extractTextFromContent } from '../renderer/src/utils/keywordExtractor'
import type { NoteReference, InternalNoteReference } from '../renderer/src/types/Note'

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

// 批处理大小常量
const BATCH_SIZE = 50
const SIMILARITY_THRESHOLD = 20
const MAX_TOTAL_NOTES = 1000

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

    // 2. 初始化向量服务
    const vectorizer = SemanticVectorizer.getInstance()
    await vectorizer.initialize()

    // 3. 预处理当前笔记数据
    const currentKeywords = JSON.parse(currentNote.keywords || '[]')
    const currentContent = JSON.parse(currentNote.content)
    const currentText = extractTextFromContent(currentContent)

    // 4. 获取笔记总数
    const { count } = (await db('notes')
      .where('id', '!=', noteId)
      .andWhere('isDeleted', false)
      .count('* as count')
      .first()) as { count: number }

    if (count > MAX_TOTAL_NOTES) {
      console.log(`后端→ 笔记数量(${count})超过限制(${MAX_TOTAL_NOTES})，将随机选择笔记进行比较`)
    }

    // 5. 分批处理笔记
    let processedNotes = 0
    let allResults: (RelatedNote & { matchType: string })[] = []
    const stats = { keyword: 0, semantic: 0, hybrid: 0, error: 0 }

    while (processedNotes < Math.min(count, MAX_TOTAL_NOTES)) {
      // 获取一批笔记
      const notes = await db('notes')
        .where('id', '!=', noteId)
        .andWhere('isDeleted', false)
        .offset(processedNotes)
        .limit(BATCH_SIZE)
        .select('*')

      if (notes.length === 0) break

      // 处理这一批笔记
      const batchResults = await Promise.all(
        notes.map(async (note) => {
          try {
            const noteKeywords = JSON.parse(note.keywords || '[]')
            const noteContent = JSON.parse(note.content)
            const noteText = extractTextFromContent(noteContent)

            const isShortContent = noteText.length < 100 || currentText.length < 100
            const hasKeywords = noteKeywords.length > 0 && currentKeywords.length > 0

            let similarity: number
            let matchType: string

            if (isShortContent && hasKeywords) {
              similarity = calculateSimilarity(currentKeywords, noteKeywords)
              matchType = 'keyword'
              stats.keyword++
            } else if (!hasKeywords && !isShortContent) {
              similarity = await vectorizer.calculateSemanticSimilarity(currentText, noteText)
              matchType = 'semantic'
              stats.semantic++
            } else {
              similarity = await vectorizer.calculateHybridSimilarity(
                currentContent,
                noteContent,
                currentKeywords,
                noteKeywords
              )
              matchType = 'hybrid'
              stats.hybrid++
            }

            // 提前过滤掉相似度低的结果
            if (similarity <= SIMILARITY_THRESHOLD) {
              return null
            }

            return {
              ...convertToNote(note),
              similarity,
              matchType
            }
          } catch (error) {
            console.error('后端→ 计算单个笔记相似度失败:', error)
            stats.error++
            return null
          }
        })
      )

      // 过滤掉空值并添加到结果集
      const validResults = batchResults.filter(
        (r): r is RelatedNote & { matchType: string } => r !== null
      )
      allResults = [...allResults, ...validResults]

      // 对结果进行排序和裁剪，保持最相关的结果
      allResults.sort((a, b) => b.similarity - a.similarity)
      allResults = allResults.slice(0, limit)

      processedNotes += notes.length
      console.log(`后端→ 已处理 ${processedNotes}/${Math.min(count, MAX_TOTAL_NOTES)} 个笔记`)
    }

    console.log('后端→ 相似度计算统计:', stats)

    return {
      success: true,
      notes: allResults,
      totalProcessed: processedNotes,
      stats: {
        keywordMatches: stats.keyword,
        semanticMatches: stats.semantic,
        hybridMatches: stats.hybrid,
        errors: stats.error
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

//所有已删除的笔记
export async function getAllDeletedNotes(): Promise<Note[]> {
  try {
    const notes = await db('notes').where('isDeleted', true).select('*')
    return notes.map(convertToNote)
  } catch (error) {
    console.error('后端→ 获取所有已删除的笔记失败:', error)
    throw error
  }
}
// 将空笔记移到回收站
export async function moveEmptyNotesToTrash(): Promise<void> {
  try {
    // 获取所有未删除的笔记
    const notes = await db('notes').where('isDeleted', false).select('*')

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

      // 如果笔记内容为空且地址为空，则移到回收站
      if (isEmptyContent && note.address === '') {
        await db('notes').where('id', note.id).update({
          isDeleted: true,
          updatedAt: new Date().getTime()
        })
      }
    }
    console.log('后端→ 空笔记已移至回收站')
  } catch (error) {
    console.error('后端→ 移动空笔记到回收站失败:', error)
    throw error
  }
}
// 从所有笔记中随机选择三个笔记
export async function getRandomNotes(): Promise<Note[]> {
  try {
    const notes = await db('notes').where('isDeleted', false).orderBy('createdAt', 'desc')
    const randomNotes = notes.sort(() => Math.random() - 0.5).slice(0, 3)
    return randomNotes.map(convertToNote)
  } catch (error) {
    console.error('后端→ 从所有笔记中随机选择三个笔记失败:', error)
    throw error
  }
}
// 获取用户使用天数
export async function getUserUsageDays(): Promise<number> {
  try {
    // 获取最早的笔记创建时间
    const firstNote = await db('notes')
      .where('isDeleted', false)
      .orderBy('createdAt', 'asc')
      .first()

    if (!firstNote) {
      return 0
    }

    // 计算从第一条笔记到现在的天数
    const firstNoteDate = new Date(firstNote.createdAt)
    const now = new Date()

    // 将两个日期都设置为当天的开始时间（00:00:00）以确保计算准确
    firstNoteDate.setHours(0, 0, 0, 0)
    now.setHours(0, 0, 0, 0)

    const diffTime = Math.abs(now.getTime() - firstNoteDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // 如果是同一天创建的，返回1，否则返回计算的天数
    return diffDays === 0 ? 1 : diffDays
  } catch (error) {
    console.error('后端→ 获取用户使用天数失败:', error)
    throw error
  }
}

// 昨日笔记数量
export async function getLastDayNoteCount(): Promise<number> {
  const lastDay = new Date(new Date().setDate(new Date().getDate() - 1))
  try {
    const count = await db('notes')
      .where('isDeleted', false)
      .where('createdAt', '>=', lastDay)
      .count('* as count')
      .first()
    return count ? (count.count as number) : 0
  } catch (error) {
    console.error('后端→ 获取昨日笔记数量失败:', error)
    throw error
  }
}

// 笔记总数量
export async function getNoteCount(): Promise<number> {
  try {
    const count = await db('notes').where('isDeleted', false).count('* as count').first()
    return count ? (count.count as number) : 0
  } catch (error) {
    console.error('后端→ 获取笔记数量失败:', error)
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

// 搜索笔记
export async function searchNotes(query: string): Promise<
  Array<{
    id: string
    title: string
    blocks: Array<{ content: string }>
  }>
> {
  console.log('后端→ 开始搜索笔记:', query)
  const lowercaseQuery = query.toLowerCase().trim()
  if (!lowercaseQuery) return []

  try {
    const notes = await db('notes').where('isDeleted', false).select('id', 'address', 'content')

    return notes.reduce(
      (results, note) => {
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
      },
      [] as Array<{ id: string; title: string; blocks: Array<{ content: string }> }>
    )
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

interface GetNotesByDateResult {
  notes: Note[]
  totalCount: number
}
//获取都有哪些日期有笔记
export async function getAllDatesWithNotes(): Promise<string[]> {
  try {
    console.log('后端→ 开始获取有笔记的日期')

    const result = await db('notes')
      .distinct(db.raw("strftime('%Y-%m-%d', datetime(createdAt / 1000, 'unixepoch')) as date"))
      .where('isDeleted', 0)
      .orderBy('date', 'desc')

    console.log('后端→ 原始查询结果:', result)

    if (!result || result.length === 0) {
      console.log('后端→ 查询结果为空')
      return []
    }

    const dates = result.map((row: { date: string }) => row.date)
    console.log('后端→ 处理后的日期数组:', dates)

    return dates
  } catch (error) {
    console.error('后端→ 获取有笔记的日期失败:', error)
    throw error
  }
}
//获取某一天的笔记
export async function getNotesByOneDate(date: string): Promise<Note[]> {
  try {
    console.log('后端→ 开始获取某一天的笔记', date)

    // 将输入的日期字符串转换为当天的开始和结束时间戳
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const startTimestamp = startOfDay.getTime()
    const endTimestamp = endOfDay.getTime()

    const notes = await db('notes')
      .where('isDeleted', false)
      .whereBetween('createdAt', [startTimestamp, endTimestamp])

    console.log('后端→ 获取某一天的笔记成功', notes)

    if (notes.length === 0) {
      console.log('后端→ 没有找到该日期的笔记')
      return []
    }

    return notes.map(convertToNote)
  } catch (error) {
    console.error('后端→ 获取某一天的笔记失败:', error)
    throw error
  }
}
// 获取按日期排序的笔记
export async function getNotesByDate(
  direction: 'newer' | 'older',
  referenceDate: Date | null,
  limit: number
): Promise<GetNotesByDateResult> {
  let query = db('notes').where('isDeleted', false)
  const sortOrder = direction === 'older' ? 'desc' : 'asc'

  if (referenceDate) {
    query = query.where('createdAt', direction === 'older' ? '<' : '>', referenceDate)
  }

  const notes = await query.orderBy('createdAt', sortOrder).limit(limit)

  const totalCount = await db('notes').where('isDeleted', false).count('* as count').first()
  const count = totalCount ? (totalCount.count as number) : 0

  return {
    notes: notes.map(convertToNote),
    totalCount: count
  }
}

// 获取分页的笔记
export async function getPaginatedNotes(
  page: number,
  limit: number
): Promise<{ notes: Note[]; totalCount: number }> {
  try {
    const query = db('notes').where('isDeleted', false)

    const offset = (page - 1) * limit

    const [notes, countResult] = await Promise.all([
      query.clone().orderBy('createdAt', 'desc').limit(limit).offset(offset),
      query.clone().count('* as count').first()
    ])

    return {
      notes: notes.map(convertToNote),
      totalCount: countResult ? (countResult.count as number) : 0
    }
  } catch (error) {
    console.error('后端→ 获取分页笔记失败:', error)
    throw new Error('后端→ 获取分页笔记失败')
  }
}
export interface GetPaginatedNotesParams {
  page: number
  limit: number
  cardBoxId?: string // 'all' | 'inbox' | string
  cardTypes?: string[] // ['Maincard', 'Bibcard', 'Indexcard']
  tags?: string[] // 标签ID数组
  keyword?: string // 搜索关键词
  sortBy: string // 排序字段
  sortOrder: 'asc' | 'desc'
}

export async function getPaginatedNotesByCardbox({
  page,
  limit,
  cardBoxId,
  cardTypes,
  tags,
  keyword,
  sortBy = 'updatedAt',
  sortOrder = 'desc'
}: GetPaginatedNotesParams): Promise<{ notes: Note[]; totalCount: number }> {
  try {
    console.log('后端→ 开始获取卡片盒分页笔记', {
      cardBoxId,
      cardTypes,
      tags,
      keyword,
      sortBy,
      sortOrder,
      page,
      limit
    })

    let query = db('notes')
      .leftJoin('note_tags', 'notes.id', 'note_tags.noteId')
      .where('notes.isDeleted', false)
      .distinct('notes.*')

    // 基础筛选：卡片盒
    if (cardBoxId === 'inbox') {
      query = query.whereNull('notes.cardBoxId')
    } else if (cardBoxId && cardBoxId !== 'all') {
      query = query.where('notes.cardBoxId', cardBoxId)
    }

    // 卡片类型筛选
    if (cardTypes && cardTypes.length > 0) {
      query = query.whereIn('notes.cardType', cardTypes)
    }

    // 标签筛选
    if (tags && tags.length > 0) {
      query = query.whereIn('note_tags.tagId', tags)
      // 如果需要匹配所有标签（而不是任意一个），使用以下方式：
      // tags.forEach(tagId => {
      //   query = query.whereExists(function() {
      //     this.select('*')
      //       .from('note_tags as nt')
      //       .whereRaw('nt.noteId = notes.id')
      //       .where('nt.tagId', tagId)
      //   })
      // })
    }

    // 关键词搜索
    if (keyword) {
      const searchKeyword = `%${keyword}%`
      query = query.where((builder) => {
        builder
          .where('notes.title', 'like', searchKeyword)
          .orWhere('notes.content', 'like', searchKeyword)
          .orWhere('notes.address', 'like', searchKeyword)
      })
    }

    // 计算总数
    const countResult = await query.clone().count('* as count').first()
    const totalCount = countResult ? (countResult.count as number) : 0

    // 获取分页数据
    const offset = (page - 1) * limit
    const notes = await query.orderBy(`notes.${sortBy}`, sortOrder).limit(limit).offset(offset)

    console.log('后端→ 查询结果数量:', notes.length)
    console.log('后端→ 总计数:', totalCount)

    return {
      notes: notes.map(convertToNote),
      totalCount
    }
  } catch (error) {
    console.error('后端→ 获取分页笔记失败:', error)
    throw new Error('获取分页笔记失败')
  }
}

// 创建笔记、新建笔记
export async function createNote(): Promise<Note> {
  const id = uuidv4()
  const now = new Date()

  const newNote: Note = {
    id,
    type: 'note',
    address: '',
    cardType: 'Maincard',
    content: {
      type: 'doc',
      content: [
        {
          attrs: {
            textAlign: 'left'
          },
          content: [],
          type: 'paragraph'
        }
      ]
    },
    createdAt: now,
    updatedAt: now,

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

// 获取单条笔记
export async function getNoteById(id: string): Promise<Note | null> {
  try {
    const noteRecord = await db('notes').where('id', id).first()
    return noteRecord ? convertToNote(noteRecord) : null
  } catch (error) {
    console.error('后端→ 获取单条笔记失败 by ID:', error)
    throw new Error('后端→ 获取单条笔记失败')
  }
}

// 获取所有笔记
export async function getAllNotes(includeDeleted: boolean = false): Promise<Note[]> {
  try {
    let query = db('notes')
    if (!includeDeleted) {
      query = query.where('isDeleted', false)
    }
    const noteRecords = await query.orderBy('updatedAt', 'desc')
    return noteRecords.map(convertToNote)
  } catch (error) {
    console.error('后端→ 获取所有笔记失败:', error)
    throw new Error('后端→ 获取所有笔记失败')
  }
}

// 更新笔记内容 content
const MAX_RETRIES = 3
const RETRY_DELAY = 100 // 毫秒

export async function updateNoteContent(id: string, content: object): Promise<Note> {
  let retries = 0

  while (retries < MAX_RETRIES) {
    try {
      return await db.transaction(
        async (trx) => {
          // 设置事务超时
          await trx.raw('PRAGMA busy_timeout = 5000;')

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

          // 4. 执行更新并返回更新后的笔记
          const [updatedNote] = await trx('notes').where('id', id).update(updateData).returning('*')

          console.log(`后端→ 笔记 ${id} 内容已更新`)

          // 5. 转换并返回笔记
          return convertToNote(updatedNote)
        },
        {
          // 设置事务配置
          isolationLevel: 'read committed'
        }
      )
    } catch (error) {
      retries++

      if ((error as Error).message.includes('database is locked')) {
        console.warn(`后端→ 数据库锁定，正在重试 (${retries}/${MAX_RETRIES})`)
        if (retries < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * retries))
          continue
        }
      }

      console.error('后端→ 更新笔记内容失败:', error)
      throw error
    }
  }

  throw new Error('更新笔记内容失败: 达到最大重试次数')
}

export async function updateNote(id: string, updateNoteDto: Partial<Note>): Promise<Note> {
  console.log(`后端→ 开始更新笔记 ID: ${id}`)
  console.log('后端→ 更新数据:', JSON.stringify(updateNoteDto, null, 2))

  if (!id?.trim()) {
    console.error('后端→ 无效的笔记ID')
    throw new Error('无效的笔记ID')
  }

  return db.transaction(async (trx) => {
    try {
      // 1. 查找笔记
      const note = await trx('notes').where({ id }).first()
      if (!note) {
        console.error(`后端→ 未找到ID为 ${id} 的笔记`)
        throw new Error(`Note with ID "${id}" not found`)
      }

      console.log('后端→ 找到的原始笔记:', JSON.stringify(note, null, 2))

      // 2. 准备更新数据
      const updateData: any = {}

      // 处理基础字段
      const fields = ['address', 'cardType', 'linkedTo', 'linkedFrom', 'parentId']
      fields.forEach((field) => {
        if (updateNoteDto[field as keyof Partial<Note>] !== undefined) {
          console.log(`后端→ 更新字段 ${field}:`, updateNoteDto[field as keyof Partial<Note>])
          updateData[field] = updateNoteDto[field as keyof Partial<Note>]
        }
      })

      // 处理内容和关键词
      // 处理内容和关键词
      if (updateNoteDto.content !== undefined) {
        try {
          console.log('后端→ 开始处理内容更新')
          updateData.content =
            typeof updateNoteDto.content === 'string'
              ? JSON.parse(updateNoteDto.content)
              : updateNoteDto.content

          // 1. 提取关键词
          try {
            const keywords: Keyword[] = extractKeywords(updateData.content)
            console.log('后端→ 关键词提取完成:', keywords)
            updateData.keywords = JSON.stringify(keywords)
          } catch (keywordError) {
            console.error('后端→ 关键词提取失败:', keywordError)
            updateData.keywords = JSON.stringify([])
          }

          // 2. 计算语义向量 (新增)
          try {
            const vectorizer = SemanticVectorizer.getInstance()
            await vectorizer.initialize()
            const text = extractTextFromContent(updateData.content)
            const vector = await vectorizer.getVector(text)
            updateData.semanticVector = JSON.stringify(vector)
            console.log('后端→ 语义向量计算完成')
          } catch (vectorError) {
            console.error('后端→ 语义向量计算失败:', vectorError)
            updateData.semanticVector = JSON.stringify([])
          }
        } catch (error) {
          console.error('后端→ 解析内容时出错:', error)
          updateData.content = { type: 'doc', content: [] }
          updateData.keywords = JSON.stringify([])
          updateData.semanticVector = JSON.stringify([])
        }
      }

      // 3. 更新时间戳
      updateData.updatedAt = new Date()

      // 4. 保存更新前的数据处理
      console.log('后端→ 更新数据处理完成，准备保存:', JSON.stringify(updateData, null, 2))

      // 将 content 转换为 JSON 字符串
      if (updateData.content) {
        try {
          updateData.content = JSON.stringify(updateData.content)
        } catch (error) {
          console.error('后端→ content序列化失败:', error)
          updateData.content = JSON.stringify({ type: 'doc', content: [] })
        }
      }

      // 处理所有需要 JSON 序列化的字段
      const jsonFields = ['linkedTo', 'linkedFrom']
      jsonFields.forEach((field) => {
        if (Array.isArray(updateData[field])) {
          try {
            updateData[field] = JSON.stringify(updateData[field])
          } catch (error) {
            console.error(`后端→ ${field}序列化失败:`, error)
            updateData[field] = JSON.stringify([])
          }
        }
      })

      // 5. 执行更新
      console.log('后端→ 开始执行数据库更新')
      const [updatedNote] = await trx('notes').where({ id }).update(updateData).returning('*')
      console.log('后端→ 数据库更新完成')

      if (!updatedNote) {
        throw new Error('更新失败：未返回更新后的笔记')
      }

      // 6. 处理返回数据
      const parseFields = ['content', 'linkedTo', 'linkedFrom', 'keywords', 'semanticVector']
      parseFields.forEach((field) => {
        if (typeof updatedNote[field] === 'string') {
          try {
            updatedNote[field] = JSON.parse(updatedNote[field])
          } catch (error) {
            console.error(`后端→ 解析${field}字段失败:`, error)
            updatedNote[field] = field === 'content' ? { type: 'doc', content: [] } : []
          }
        }
      })

      console.log('后端→ 更新成功，返回数据:', JSON.stringify(updatedNote, null, 2))
      return updatedNote
    } catch (error) {
      console.error('后端→ 更新笔记事务失败:', error)
      throw error
    }
  })
}

// 软删除笔记
export async function softDeleteNote(id: string): Promise<Note> {
  console.log(`后端→ 开始软删除笔记: ${id}`)

  return db.transaction(async (trx) => {
    try {
      // 1. 首先获取笔记
      const note = await trx('notes').where('id', id).first()

      if (!note) {
        console.warn(`后端→ 未找到ID为 ${id} 的笔记`)
        throw new Error(`后端→ 未找到ID为 ${id} 的笔记`)
      }

      // 2. 更新笔记状态
      const [updatedNote] = await trx('notes')
        .where('id', id)
        .update({ isDeleted: true, updatedAt: new Date() })
        .returning('*')

      if (!updatedNote) {
        console.error(`后端→ 更新笔记失败: ${id}`)
        throw new Error(`后端→ 更新笔记失败: ${id}`)
      }

      const convertedNote = convertToNote(updatedNote)
      console.log('后端→ 软删除笔记成功，更新后的笔记:', JSON.stringify(convertedNote))

      return convertedNote
    } catch (error) {
      console.error(`后端→ 软删除笔记失败: ${id}:`, error)
      throw error
    }
  })
}

// 恢复已删除的笔记
export async function restoreNote(id: string): Promise<void> {
  try {
    await db('notes').where('id', id).update('isDeleted', false)
  } catch (error) {
    console.error(`后端→ 恢复已删除的笔记失败: ${id}:`, error)
    throw error
  }
}

// 获取所有已删除的笔记
export async function getDeletedNotes(): Promise<Note[]> {
  try {
    const notes = await db('notes').where('isDeleted', true).orderBy('updatedAt', 'desc')
    return notes.map(convertToNote)
  } catch (error) {
    console.error('后端→ 获取已删除的笔记失败:', error)
    throw error
  }
}

// 永久删除笔记
export async function permanentDeleteNote(id: string): Promise<void> {
  try {
    await db('notes').where('id', id).delete()
    console.log(`后端→ 永久删除笔记: ${id}`)
  } catch (error) {
    console.error(`后端→ 永久删除笔记失败: ${id}:`, error)
    throw error
  }
}

// //添加笔记到卡片盒
// export async function addNoteToCardBox(cardBoxId: string, noteId: string): Promise<void> {
//   try {
//     await db('notes').where('id', noteId).update({ cardBoxId: cardBoxId })
//     console.log(`后端→ 添加笔记到卡片盒: ${noteId}`)
//   } catch (error) {
//     console.error(`后端→ 添加笔记到卡片盒失败: ${noteId}:`, error)
//     throw error
//   }
// }

// 添加星标收藏
export async function addStarToNote(id: string): Promise<Note> {
  return db.transaction(async (trx) => {
    const note = await trx('notes').where('id', id).first()
    if (!note) {
      throw new Error(`笔记 ${id} 不存在`)
    }

    if (note.isStarred) {
      return convertToNote(note) // 如果已经是星标，直接返回
    }

    const maxOrderResult = await trx('notes')
      .max('starredOrder as maxOrder')
      .where('isStarred', true)
      .first()
    const newStarredOrder = (maxOrderResult?.maxOrder || 0) + 1

    const [updatedNote] = await trx('notes')
      .where('id', id)
      .update({
        isStarred: true,
        starredOrder: newStarredOrder
      })
      .returning('*')

    return convertToNote(updatedNote)
  })
}

// 移除星标收藏
export async function removeStarFromNote(
  id: string
): Promise<{ updatedNote: Note; reorderedNotes: Note[] }> {
  console.log(`开始取消笔记 ${id} 的星标状态`)

  return db
    .transaction(async (trx) => {
      // 1. 查找并检查笔记
      const note = await trx('notes').where('id', id).first()
      if (!note) {
        console.error(`笔记 ${id} 不存在`)
        throw new Error(`笔记 ${id} 不存在`)
      }
      if (!note.isStarred) {
        console.log(`笔记 ${id} 未被星标，无需操作`)
        return { updatedNote: convertToNote(note), reorderedNotes: [] }
      }

      const removedOrder = note.starredOrder
      console.log(`笔记 ${id} 当前的星标顺序为 ${removedOrder}`)

      // 2. 更新当前笔记
      const [updatedNote] = await trx('notes')
        .where('id', id)
        .update({
          isStarred: false,
          starredOrder: 0
        })
        .returning('*')

      console.log(`已更新笔记 ${id} 的星标状态`)

      // 3. 获取需要更新的笔记
      const notesToUpdate = await trx('notes')
        .where('isStarred', true)
        .andWhere('starredOrder', '>', removedOrder)
        .orderBy('starredOrder', 'asc')

      console.log(`需要更新顺序的笔记数量: ${notesToUpdate.length}`)

      // 4. 更新其他笔记的顺序
      const reorderedNotes = await Promise.all(
        notesToUpdate.map(async (note) => {
          const [updated] = await trx('notes')
            .where('id', note.id)
            .update({
              starredOrder: note.starredOrder - 1
            })
            .returning('*')
          return updated
        })
      )

      console.log(`已更新 ${reorderedNotes.length} 个笔记的顺序`)

      // 5. 转换并返回结果
      return {
        updatedNote: convertToNote(updatedNote),
        reorderedNotes: reorderedNotes.map(convertToNote)
      }
    })
    .catch((error) => {
      console.error(`取消笔记 ${id} 的星标状态时发生错误:`, error)
      throw error
    })
}

// 获取收藏的笔记
export async function getStarredNotes(): Promise<Note[]> {
  try {
    const notes = await db('notes')
      .where('isStarred', true)
      .andWhere('isDeleted', false)
      .orderBy('updatedAt', 'desc')
    return notes.map(convertToNote)
  } catch (error) {
    console.error('后端→ 获取收藏的笔记失败:', error)
    throw error
  }
}

// 更新收藏笔记的顺序
export async function updateStarredNotesOrder(
  orders: { id: string; starredOrder: number }[]
): Promise<Note[]> {
  try {
    console.log('后端→ 开始更新星标笔记顺序', orders)

    if (!orders || orders.length === 0) {
      throw new Error('后端→ 更新星标笔记顺序：无效的输入数据')
    }

    const updatedNotes = await db.transaction(async (trx) => {
      // 创建一个 case 语句来更新 starredOrder
      const cases = orders.map((order) => `WHEN '${order.id}' THEN ${order.starredOrder}`).join(' ')

      // 批量更新
      await trx('notes')
        .update({
          starredOrder: trx.raw(`CASE id ${cases} ELSE starredOrder END`)
        })
        .whereIn(
          'id',
          orders.map((o) => o.id)
        )
        .where('isStarred', true)

      // 获取更新后的笔记
      return await trx('notes')
        .whereIn(
          'id',
          orders.map((o) => o.id)
        )
        .where('isStarred', true)
        .orderBy('starredOrder', 'asc')
        .select('*')
    })

    console.log(`后端→ 更新星标笔记顺序成功，共更新 ${updatedNotes.length} 条笔记`)

    return updatedNotes.map(convertToNote)
  } catch (error) {
    console.error('后端→ 更新星标笔记顺序失败:', error)
    throw error
  }
}
// 更新笔记地址
export async function updateNoteAddress(id: string, address: string): Promise<Note> {
  try {
    console.log('后端→ 开始更新笔记地址:', { id, address })

    const [updatedNote] = await db('notes')
      .where({ id })
      .update({
        address,
        updatedAt: new Date()
      })
      .returning('*')

    if (!updatedNote) {
      throw new Error(`未找到ID为 ${id} 的笔记`)
    }

    console.log('后端→ 笔记地址更新成功:', updatedNote)
    return convertToNote(updatedNote)
  } catch (error) {
    console.error('后端→ 更新笔记地址失败:', error)
    throw error
  }
}
// 更新笔记类型
export async function updateNoteCardType(id: string, cardType: string): Promise<Note> {
  try {
    console.log('后端→ 开始更新笔记类型:', { id, cardType })

    const [updatedNote] = await db('notes')
      .where({ id })
      .update({
        cardType,
        updatedAt: new Date()
      })
      .returning('*')

    if (!updatedNote) {
      throw new Error(`未找到ID为 ${id} 的笔记`)
    }

    console.log('后端→ 笔记类型更新成功:', updatedNote)
    return convertToNote(updatedNote)
  } catch (error) {
    console.error('后端→ 更新笔记类型失败:', error)
    throw error
  }
}
// 更新笔记的卡片盒
export async function updateNoteCardBox(noteId: string, cardBoxId: string): Promise<Note> {
  try {
    console.log('后端→ 开始更新笔记卡片盒:', { noteId, cardBoxId })

    const [updatedNote] = await db('notes')
      .where({ id: noteId })
      .update({
        cardBoxId,
        updatedAt: new Date()
      })
      .returning('*')

    if (!updatedNote) {
      throw new Error(`未找到ID为 ${noteId} 的笔记`)
    }

    console.log('后端→ 笔记卡片盒更新成功:', updatedNote)
    return convertToNote(updatedNote)
  } catch (error) {
    console.error('后端→ 更新笔记卡片盒失败:', error)
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

// 创建引用关系
export interface CreateNoteReferenceParams {
  sourceNoteId: string
  targetNoteId: string
  type: 'reference'
  context: {
    text: string
    position: number
  }
  metadata: {
    title: string
    preview: string
    cardType?: CardType // 使用 CardType 类型
  }
}

export async function createNoteReference(
  params: CreateNoteReferenceParams
): Promise<NoteReference> {
  try {
    console.log('后端→ 创建笔记引用关系:', params)
    const now = new Date()

    // 1. 验证笔记是否存在
    const [sourceNote, targetNote] = await Promise.all([
      db('notes').where('id', params.sourceNoteId).first(),
      db('notes').where('id', params.targetNoteId).first()
    ])

    if (!sourceNote || !targetNote) {
      throw new Error('源笔记或目标笔记不存在')
    }

    // 2. 创建引用关系
    const [reference] = await db('note_references')
      .insert({
        id: uuidv4(),
        sourceNoteId: params.sourceNoteId,
        targetNoteId: params.targetNoteId,
        type: params.type,
        context: JSON.stringify(params.context),
        metadata: JSON.stringify({
          ...params.metadata,
          address: targetNote.address,
          cardType: params.metadata.cardType || targetNote.cardType
        }),
        createdAt: now,
        updatedAt: now
      })
      .returning('*')

    // 3. 创建内部引用对象
    const outgoingRef: InternalNoteReference = {
      id: reference.id,
      targetNoteId: params.targetNoteId,
      type: params.type,
      context: params.context,
      metadata: {
        ...params.metadata,
        address: targetNote.address,
        cardType: params.metadata.cardType || targetNote.cardType
      },
      createdAt: now,
      updatedAt: now
    }

    const incomingRef: InternalNoteReference = {
      id: reference.id,
      sourceNoteId: params.sourceNoteId,
      type: params.type,
      context: params.context,
      metadata: {
        ...params.metadata,
        address: sourceNote.address,
        cardType: params.metadata.cardType || sourceNote.cardType
      },
      createdAt: now,
      updatedAt: now
    }

    // 4. 更新源笔记的 outgoing references
    const sourceReferences = JSON.parse(sourceNote.references)
    sourceReferences.outgoing.push(outgoingRef)
    await db('notes')
      .where('id', params.sourceNoteId)
      .update({
        references: JSON.stringify(sourceReferences),
        updatedAt: now
      })

    // 5. 更新目标笔记的 incoming references
    const targetReferences = JSON.parse(targetNote.references)
    targetReferences.incoming.push(incomingRef)
    await db('notes')
      .where('id', params.targetNoteId)
      .update({
        references: JSON.stringify(targetReferences),
        updatedAt: now
      })

    return {
      ...reference,
      context: JSON.parse(reference.context),
      metadata: JSON.parse(reference.metadata),
      createdAt: now,
      updatedAt: now
    }
  } catch (error) {
    console.error('后端→ 创建笔记引用关系失败:', error)
    throw error
  }
}

export async function deleteNoteReference(params: {
  sourceNoteId: string
  targetNoteId: string
}): Promise<void> {
  try {
    console.log('后端→ 删除笔记引用关系:', params)

    // 1. 获取引用关系
    const reference = await db('note_references')
      .where({
        sourceNoteId: params.sourceNoteId,
        targetNoteId: params.targetNoteId
      })
      .first()

    if (!reference) {
      throw new Error('引用关系不存在')
    }

    // 2. 更新源笔记的 outgoing references
    const sourceNote = await db('notes').where('id', params.sourceNoteId).first()
    const sourceReferences = JSON.parse(sourceNote.references)
    sourceReferences.outgoing = sourceReferences.outgoing.filter(
      (ref: InternalNoteReference) => ref.targetNoteId !== params.targetNoteId
    )
    await db('notes')
      .where('id', params.sourceNoteId)
      .update({
        references: JSON.stringify(sourceReferences),
        updatedAt: new Date()
      })

    // 3. 更新目标笔记的 incoming references
    const targetNote = await db('notes').where('id', params.targetNoteId).first()
    const targetReferences = JSON.parse(targetNote.references)
    targetReferences.incoming = targetReferences.incoming.filter(
      (ref: InternalNoteReference) => ref.sourceNoteId !== params.sourceNoteId
    )
    await db('notes')
      .where('id', params.targetNoteId)
      .update({
        references: JSON.stringify(targetReferences),
        updatedAt: new Date()
      })

    // 4. 删除引用关系记录
    await db('note_references')
      .where({
        sourceNoteId: params.sourceNoteId,
        targetNoteId: params.targetNoteId
      })
      .delete()

    console.log('后端→ 删除笔记引用关系成功')
  } catch (error) {
    console.error('后端→ 删除笔记引用关系失败:', error)
    throw error
  }
}

// 更新笔记标签
export async function updateNoteTag(params: {
  noteId: string
  tagId: string
  action: 'add' | 'remove'
}): Promise<void> {
  // 不需要返回整个笔记了
  try {
    await db.transaction(async (trx) => {
      // 1. 检查笔记是否存在
      const noteExists = await trx('notes').where({ id: params.noteId }).first()
      if (!noteExists) {
        throw new Error(`笔记不存在: ${params.noteId}`)
      }

      // 2. 检查标签是否存在
      const tagExists = await trx('tags').where({ id: params.tagId }).first()
      if (!tagExists) {
        throw new Error(`标签不存在: ${params.tagId}`)
      }

      if (params.action === 'add') {
        // 3a. 添加标签关联（使用 onConflict 避免重复）
        await trx('note_tags')
          .insert({
            noteId: params.noteId,
            tagId: params.tagId,
            createdAt: new Date()
          })
          .onConflict(['noteId', 'tagId'])
          .ignore()
      } else {
        // 3b. 移除标签关联
        await trx('note_tags')
          .where({
            noteId: params.noteId,
            tagId: params.tagId
          })
          .delete()
      }

      console.log('后端→ 笔记标签更新成功:', {
        noteId: params.noteId,
        tagId: params.tagId,
        action: params.action
      })
    })
  } catch (error) {
    console.error('后端→ 更新笔记标签失败:', { params, error })
    throw new Error('更新笔记标签失败')
  }
}

// 批量更新笔记标签
export async function updateNoteTags(noteId: string, tagIds: string[]): Promise<void> {
  try {
    await db.transaction(async (trx) => {
      // 1. 检查笔记是否存在
      const noteExists = await trx('notes').where({ id: noteId }).first()
      if (!noteExists) {
        throw new Error(`笔记不存在: ${noteId}`)
      }

      // 2. 检查所有标签是否存在
      const existingTags = await trx('tags').whereIn('id', tagIds).select('id')
      if (existingTags.length !== tagIds.length) {
        throw new Error('存在无效的标签ID')
      }

      // 3. 删除所有现有关联
      await trx('note_tags').where('noteId', noteId).delete()

      // 4. 添加新的关联
      if (tagIds.length > 0) {
        await trx('note_tags').insert(
          tagIds.map((tagId) => ({
            noteId,
            tagId,
            createdAt: new Date()
          }))
        )
      }

      console.log('后端→ 批量更新笔记标签成功:', {
        noteId,
        tagCount: tagIds.length
      })
    })
  } catch (error) {
    console.error('后端→ 批量更新笔记标签失败:', { noteId, tagIds, error })
    throw new Error('批量更新笔记标签失败')
  }
}
