import { v4 as uuidv4 } from 'uuid'
import type {
  NoteReference,
  InternalNoteReference,
  Note,
  CreateNoteReferenceParams,
  GetPaginatedNotesParams,
  TimelineQueryParams,
  TimelineQueryResult,
  CardType,
  SearchResult
} from '@shared/types'
import { Knex } from 'knex/types'
import { FilterRule } from '@shared/types'
import { db } from '../../db/config'

import { getCurrentAuthState } from '../auth/authService'
import { ImageService } from '../images/imageService'
import { pinyin } from 'pinyin-pro'

// 辅助函数：将数据库记录转换为 Note 对象
export function convertToNote(record: any): Note {
  return {
    id: record.id,
    type: 'note',
    title: record.title || '',
    address: record.address,
    cardType: record.cardType,

    // 索引相关字段
    isIndexed: record.isIndexed === 1 || false, // SQLite 中的布尔值转换
    indexInfo: record.indexInfo ? JSON.parse(record.indexInfo) : undefined,

    content: JSON.parse(record.content),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
    lastVectorizedAt: record.lastVectorizedAt ? new Date(record.lastVectorizedAt) : undefined,

    // 引用关系
    references: JSON.parse(record.references || '{}'),

    // 关系树缓存
    relationshipTree: record.relationshipTree ? JSON.parse(record.relationshipTree) : undefined,

    // 图谱相关
    graphData: record.graphData ? JSON.parse(record.graphData) : undefined,

    // 基础字段
    cardBoxId: record.cardBoxId || undefined,
    parentId: record.parentId || undefined,
    isDeleted: record.isDeleted === 1,
    isStarred: record.isStarred === 1,
    starredOrder: record.starredOrder,
    rightBarOrder: record.rightBarOrder,

    // 元数据
    metadata: record.metadata ? JSON.parse(record.metadata) : undefined,

    // 闪卡相关
    isFlashcard: record.isFlashcard === 1,
    flashcard: record.flashcard ? JSON.parse(record.flashcard) : undefined,
    nextReviewAt: record.nextReviewAt ? new Date(record.nextReviewAt) : undefined,

    // 关键词和标签相关
    keywords: record.keywords ? JSON.parse(record.keywords) : undefined,
    suggestedTags: record.suggestedTags ? JSON.parse(record.suggestedTags) : undefined,
    aiProcessingStatus: record.aiProcessingStatus
      ? JSON.parse(record.aiProcessingStatus)
      : undefined,
    vectorStatus: record.vectorStatus ? JSON.parse(record.vectorStatus) : undefined
  }
}

// 获取相关笔记

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
    // console.log('后端→ 空笔记已移至回收站')
  } catch (error) {
    console.error('后端→ 移动空笔记到回收站失败:', error)
    throw error
  }
}
// 从所有笔记中随机选择三个笔记
export async function getRandomNotes(): Promise<Note[]> {
  try {
    const notes = await db('notes')
      .where('isDeleted', false)
      .where('cardType', 'Maincard')
      .orderBy('createdAt', 'desc')
    const randomNotes = notes.sort(() => Math.random() - 0.5).slice(0, 3)
    return randomNotes.map(convertToNote)
  } catch (error) {
    console.error('后端→ 从所有笔记中随机选择三个笔记失败:', error)
    throw error
  }
}

// 添加搜索参数接口
interface SearchParams {
  mode: 'all' | 'address' | 'title'
  term: string
}

// 新增一个提取文本内容的辅助函数
function extractTextContent(content: any): string {
  let text = ''

  function traverse(node: any) {
    if (!node) return

    // 处理文本节点
    if (node.type === 'text') {
      text += node.text + ' '
      return
    }

    // 处理特殊节点类型
    if (node.type === 'heading') {
      text += '# ' // 添加标记以提高标题搜索权重
    }

    // 处理列表项
    if (node.type === 'listItem') {
      text += '• ' // 添加列表项标记
    }

    // 处理表格单元格
    if (node.type === 'tableCell' || node.type === 'tableHeader') {
      text += '| '
    }

    // 递归处理内容
    if (Array.isArray(node.content)) {
      node.content.forEach(traverse)
    } else if (node.content) {
      traverse(node.content)
    }

    // 处理节点结束
    if (node.type === 'paragraph' || node.type === 'heading') {
      text += '\n'
    }
  }

  traverse(content)
  return text.trim()
}

// 定义搜索模式类型
type SearchMode = 'all' | 'address' | 'title'

// 修改查询构建逻辑
function buildSearchQuery(db: Knex, mode: SearchMode, searchTerms: string[]) {
  const query = db('notes').where('isDeleted', false).whereNot('cardType', 'Draftcard')

  switch (mode) {
    case 'address':
      // 对地址进行多关键词匹配
      query.where((builder) => {
        searchTerms.forEach((term, index) => {
          if (index === 0) {
            builder.whereRaw('LOWER(address) LIKE ?', [`%${term}%`])
          } else {
            builder.andWhereRaw('LOWER(address) LIKE ?', [`%${term}%`])
          }
        })
      })
      return query.select('*', db.raw('3 as match_priority'))

    case 'title':
      // 对标题进行多关键词匹配
      query.where((builder) => {
        searchTerms.forEach((term, index) => {
          if (index === 0) {
            builder.whereRaw('LOWER(title) LIKE ?', [`%${term}%`])
          } else {
            builder.andWhereRaw('LOWER(title) LIKE ?', [`%${term}%`])
          }
        })
      })
      return query.select('*', db.raw('3 as match_priority'))

    case 'all':
    default:
      // 保持原有的全文搜索逻辑
      return query
        .where((builder) => {
          searchTerms.forEach((term) => {
            builder.andWhere((subBuilder) => {
              subBuilder
                .whereRaw('LOWER(title) LIKE ?', [`%${term}%`])
                .orWhereRaw('LOWER(address) LIKE ?', [`%${term}%`])
                .orWhereRaw("LOWER(json_extract(content, '$')) LIKE ?", [`%${term}%`])
            })
          })
        })
        .select(
          '*',
          db.raw(
            `CASE 
            WHEN ${searchTerms.map((term) => `LOWER(title) LIKE '%${term}%'`).join(' AND ')} THEN 10
            WHEN ${searchTerms.map((term) => `LOWER(address) LIKE '%${term}%'`).join(' AND ')} THEN 8
            ELSE 1
          END as match_priority`
          )
        )
        .orderBy('match_priority', 'desc')
  }
}

// 修改搜索笔记函数
export async function searchNotes(params: SearchParams): Promise<Array<SearchResult>> {
  const { mode, term } = params
  const searchTerms = term.toLowerCase().trim().split(/\s+/).filter(Boolean)

  if (searchTerms.length === 0) return []

  try {
    const query = buildSearchQuery(db, mode, searchTerms)
    const notes = await query

    return notes.reduce((results: SearchResult[], note) => {
      const matchingBlocks: Array<{ content: string }> = []
      const metadata = JSON.parse(note.metadata || '{}')
      let content: any

      try {
        content = typeof note.content === 'string' ? JSON.parse(note.content) : content
        const textContent = extractTextContent(content)

        // 检查地址匹配
        const lowerAddress = note.address.toLowerCase()
        const addressMatches = searchTerms.every((term) => lowerAddress.includes(term))

        if (mode === 'all') {
          // 在全文搜索模式下，同时检查地址、标题和内容
          if (addressMatches) {
            matchingBlocks.push({
              content: note.address
            })
          }

          // 检查标题
          if (metadata.title) {
            const lowerTitle = metadata.title.toLowerCase()
            const titleMatches = searchTerms.every((term) => lowerTitle.includes(term))
            if (titleMatches) {
              matchingBlocks.push({
                content: metadata.title
              })
            }
          }

          // 检查内容
          const lowerTextContent = textContent.toLowerCase()
          const contentMatches = searchTerms.every((term) => lowerTextContent.includes(term))
          if (contentMatches) {
            const lines = textContent.split('\n')
            const matches = lines
              .filter((line) => {
                const lowerLine = line.toLowerCase()
                return searchTerms.some((term) => lowerLine.includes(term))
              })
              .map((line) => ({
                content: line
              }))
            matchingBlocks.push(...matches)
          }
        } else if (mode === 'address') {
          // 只检查地址
          const lowerAddress = note.address.toLowerCase()
          const allTermsFound = searchTerms.every((term) => lowerAddress.includes(term))
          if (allTermsFound) {
            matchingBlocks.push({
              content: note.address
            })
          }
        } else if (mode === 'title') {
          // 只检查标题
          const lowerTitle = metadata.title.toLowerCase()
          const allTermsFound = searchTerms.every((term) => lowerTitle.includes(term))
          if (allTermsFound) {
            matchingBlocks.push({
              content: metadata.title
            })
          }
        }

        if (matchingBlocks.length > 0) {
          results.push({
            id: note.id,
            title: metadata.title || note.address || '无标题',
            address: note.address,
            blocks: matchingBlocks.slice(0, 5),
            priority: note.match_priority || 1
          })
        }
      } catch (e) {
        console.error('处理笔记内容失败:', e)
      }

      return results
    }, [])
  } catch (error) {
    console.error('搜索笔记失败:', error)
    throw new Error('搜索笔记失败')
  }
}

// 搜索笔记列表
export async function searchNotesList(query: string): Promise<Note[]> {
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
    const result = await db('notes')
      .distinct(db.raw("strftime('%Y-%m-%d', datetime(createdAt / 1000, 'unixepoch')) as date"))
      .where('isDeleted', 0)
      .orderBy('date', 'desc')

    if (!result || result.length === 0) {
      // console.log('后端→ 查询结果为空')
      return []
    }

    const dates = result.map((row: { date: string }) => row.date)

    return dates
  } catch (error) {
    console.error('后端→ 获取有笔记的日期失败:', error)
    throw error
  }
}
//获取某一天的笔记
export async function getNotesByOneDate(date: string): Promise<Note[]> {
  try {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const startTimestamp = startOfDay.getTime()
    const endTimestamp = endOfDay.getTime()

    const notes = await db('notes')
      .where('isDeleted', false)
      .where('cardType', 'Maincard') // 添加 cardType 筛选条件
      .whereBetween('createdAt', [startTimestamp, endTimestamp])

    if (notes.length === 0) {
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

// 笔记流获取分页的笔记
export async function getPaginatedNotes(
  page: number,
  limit: number
): Promise<{ notes: Note[]; totalCount: number }> {
  try {
    const offset = (page - 1) * limit
    const [notes, [{ count }]] = await Promise.all([
      db('notes')
        .where('isDeleted', false)
        .whereNot('cardType', 'Draftcard') // 排除 Draftcard 类型
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset),
      db('notes')
        .where('isDeleted', false)
        .whereNot('cardType', 'Draftcard') // 排除 Draftcard 类型
        .count('* as count')
    ])

    return {
      notes: notes.map((note) => convertToNote(note)),
      totalCount: Number(count)
    }
  } catch (error) {
    console.error('获取分页笔记失败:', error)
    throw error
  }
}

// 获取草稿笔记
export async function getDraftNotes(
  page: number,
  limit: number
): Promise<{ notes: Note[]; totalCount: number }> {
  try {
    const offset = (page - 1) * limit
    const [notes, [{ count }]] = await Promise.all([
      db('notes')
        .where('isDeleted', false)
        .where('cardType', 'Draftcard')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset),
      db('notes').where('isDeleted', false).where('cardType', 'Draftcard').count('* as count')
    ])

    return {
      notes: notes.map((note) => convertToNote(note)),
      totalCount: Number(count)
    }
  } catch (error) {
    console.error('后端→ 获取草稿笔记失败:', error)
    throw error
  }
}

async function canCreateNote(): Promise<{ allowed: boolean; message?: string }> {
  try {
    // 获取当前认证状态
    const authState = await getCurrentAuthState()

    // 如果是永久授权用户，直接允许
    if (authState?.user?.licenseType === 'desktop_permanent') {
      return { allowed: true }
    }

    // 未授权或免费用户检查笔记数量
    const count = await db('notes').where('isDeleted', false).count('* as count').first()
    const noteCount = count ? (count.count as number) : 0

    if (noteCount >= 100) {
      return {
        allowed: false,
        message: '已达到免费版100张笔记的限制，请升级到永久授权版本继续使用'
      }
    }

    return {
      allowed: true,
      message: `免费版还可以创建${100 - noteCount}张笔记`
    }
  } catch (error) {
    console.error('notesService→ 检查笔记创建权限失败:', error)
    throw error
  }
}

// 添加创建笔记的参数接口
interface CreateNoteOptions {
  cardType?: CardType
  address?: string
  createdAt?: Date
  metadata?: Partial<Note['metadata']>
}

// 创建笔记、新建笔记
export async function createNote(
  options: CreateNoteOptions | CardType = 'Maincard'
): Promise<Note> {
  // 处理参数，支持旧的调用方式
  const opts: CreateNoteOptions = typeof options === 'string' ? { cardType: options } : options
  const cardType = opts.cardType || 'Maincard'

  const id = uuidv4()
  const now = new Date()

  const newNote: Note = {
    id,
    type: 'note',
    address: opts.address || '',
    title: opts.metadata?.title || '',
    cardType,
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
    createdAt: opts.createdAt || now,
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

    // 元数据
    metadata: {
      title: opts.metadata?.title || '',
      summary: '',
      ...opts.metadata
    },

    // 新增：闪卡相关属性
    isFlashcard: false,
    flashcard: undefined,
    nextReviewAt: undefined
  }

  try {
    // 检查是否可以创建笔记
    const checkResult = await canCreateNote()
    if (!checkResult.allowed) {
      throw new Error(checkResult.message)
    }
    await db('notes').insert({
      ...newNote,
      content: JSON.stringify(newNote.content),
      references: JSON.stringify(newNote.references),
      relationshipTree: JSON.stringify(newNote.relationshipTree),
      graphData: JSON.stringify(newNote.graphData),
      metadata: JSON.stringify(newNote.metadata)
    })

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

// 获取所有笔记(排除已删除和Draftcard类型)
export async function getAllNotes(): Promise<Note[]> {
  try {
    const noteRecords = await db('notes')
      .where('isDeleted', false)
      .whereNot('cardType', 'Draftcard')
      .orderByRaw("CASE WHEN address = '' OR address IS NULL THEN 1 ELSE 0 END")
      .orderBy('address', 'asc')

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
      // 1. 保存笔记内容到 SQLite
      const updatedNote = await db.transaction(async (trx) => {
        // 设置事务超时
        await trx.raw('PRAGMA busy_timeout = 5000;')

        // 提取第一行文本作为标题
        const firstLineText = extractFirstLineText(content)

        // 准备更新数据
        const updateData: any = {
          content: JSON.stringify(content),
          updatedAt: new Date(),
          title: firstLineText,
          metadata: db.raw(
            `json_patch(
              COALESCE(metadata, '{}'),
              json_object('title', ?)
            )`,
            [firstLineText]
          )
        }

        // 执行更新并返回更新后的笔记
        const [note] = await trx('notes').where('id', id).update(updateData).returning('*')
        return convertToNote(note)
      })

      return updatedNote
    } catch (error) {
      retries++
      const isLockError = (error as Error).message.includes('database is locked')

      if (isLockError && retries < MAX_RETRIES) {
        const delay = RETRY_DELAY * Math.pow(2, retries - 1)
        console.warn(`后端→ 数据库锁定，正在重试 (${retries}/${MAX_RETRIES})，延迟: ${delay}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      console.error('后端→ 更新笔记内容失败:', error)
      throw new Error(`更新笔记内容失败: ${isLockError ? '数据库锁定' : (error as Error).message}`)
    }
  }

  throw new Error('更新笔记内容失败: 达到最大重试次数')
}

function extractFirstLineText(content: any): string {
  if (content?.content?.[0]?.content?.[0]?.text) {
    return content.content[0].content[0].text
  }
  return '无标题'
}

export async function updateNote(id: string, updateNoteDto: Partial<Note>): Promise<Note> {
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

      if (updateNoteDto.content !== undefined) {
        try {
          console.log('后端→ 开始处理内容更新')
          updateData.content =
            typeof updateNoteDto.content === 'string'
              ? JSON.parse(updateNoteDto.content)
              : updateNoteDto.content
        } catch (error) {
          console.error('后端→ 解析内容时出错:', error)
          updateData.content = { type: 'doc', content: [] }
        }
      }

      // 3. 更新时间戳
      updateData.updatedAt = new Date()

      // 4. 保存更新前的数据处理
      console.log('后端→ 更新数据处理完成准备保存:', JSON.stringify(updateData, null, 2))

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
      const parseFields = ['content', 'linkedTo', 'linkedFrom']
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

// 永久删除笔记 硬删除笔记
export async function permanentDeleteNote(id: string): Promise<void> {
  return db.transaction(async (trx) => {
    try {
      // 0. 获取笔记内容，提取图片路径
      const note = await trx('notes').where('id', id).first()
      if (note && note.content) {
        const content = typeof note.content === 'string' ? JSON.parse(note.content) : note.content
        const imagePaths = extractImagePathsFromContent(content)

        // 删除笔记中的所有图片
        if (imagePaths.length > 0) {
          const imageService = new ImageService()

          for (const imagePath of imagePaths) {
            try {
              if (imagePath.startsWith('app-image:///')) {
                await imageService.deleteImage(imagePath)
              }
            } catch (imgError) {
              console.warn(`后端→ 删除笔记图片失败: ${imagePath}`, imgError)
              // 继续处理其他图片，不中断流程
            }
          }
        }
      }

      // 1. 删除所有以该笔记为源的引用关系
      await trx('note_references').where('sourceNoteId', id).delete()

      // 2. 删除所有以该笔记为目标的引用关系
      await trx('note_references').where('targetNoteId', id).delete()

      // 3. 删除笔记本身
      await trx('notes').where('id', id).delete()
    } catch (error) {
      console.error(`后端→ 永久删除笔记失败: ${id}:`, error)
      throw error
    }
  })
}

// 从笔记内容中提取所有图片路径
function extractImagePathsFromContent(content: any): string[] {
  const imagePaths: string[] = []

  // 递归遍历内容对象，查找图片路径
  function traverse(obj: any) {
    if (!obj || typeof obj !== 'object') return

    // 检查是否是图片节点
    if (obj.type === 'image' && obj.attrs && obj.attrs.src) {
      imagePaths.push(obj.attrs.src)
    }

    // 遍历子节点
    if (Array.isArray(obj.content)) {
      obj.content.forEach(traverse)
    } else if (obj.content && typeof obj.content === 'object') {
      traverse(obj.content)
    }

    // 处理其他可能包含图片的属性
    if (obj.blocks) {
      obj.blocks.forEach(traverse)
    }
  }

  traverse(content)
  return imagePaths
}

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
  return db
    .transaction(async (trx) => {
      // 1. 查找并检查笔记
      const note = await trx('notes').where('id', id).first()
      if (!note) {
        console.error(`笔记 ${id} 不存在`)
        throw new Error(`笔记 ${id} 不存在`)
      }
      if (!note.isStarred) {
        return { updatedNote: convertToNote(note), reorderedNotes: [] }
      }

      const removedOrder = note.starredOrder

      // 2. 更新当前笔记
      const [updatedNote] = await trx('notes')
        .where('id', id)
        .update({
          isStarred: false,
          starredOrder: 0
        })
        .returning('*')

      // 3. 获取需要更新的笔记
      const notesToUpdate = await trx('notes')
        .where('isStarred', true)
        .andWhere('starredOrder', '>', removedOrder)
        .orderBy('starredOrder', 'asc')

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

    return updatedNotes.map(convertToNote)
  } catch (error) {
    console.error('后端→ 更新星标笔记顺序失败:', error)
    throw error
  }
}
// 更新笔记地址
export async function updateNoteAddress(id: string, address: string): Promise<Note> {
  try {
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

    return convertToNote(updatedNote)
  } catch (error) {
    console.error('后端→ 更新笔记地址失败:', error)
    throw error
  }
}
// 更新笔记类型
export async function updateNoteCardType(id: string, cardType: string): Promise<Note> {
  try {
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

    return convertToNote(updatedNote)
  } catch (error) {
    console.error('后端→ 更新笔记类型失败:', error)
    throw error
  }
}
// 更新笔记的卡片盒
export async function updateNoteCardBox(noteId: string, cardBoxId: string): Promise<Note> {
  try {
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

    return convertToNote(updatedNote)
  } catch (error) {
    console.error('后端→ 更新笔记卡片盒失败:', error)
    throw error
  }
}

// 获取时间线笔记
export async function getTimelineNotes(params: TimelineQueryParams): Promise<TimelineQueryResult> {
  try {
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

export async function createNoteReference(
  params: CreateNoteReferenceParams
): Promise<NoteReference> {
  try {
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
  // 不需要返回个笔记了
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
    })
  } catch (error) {
    console.error('后端→ 批量更新笔记标签失败:', { noteId, tagIds, error })
    throw new Error('批量更新笔记标签失败')
  }
}

// 卡片盒筛选笔记

export async function getPaginatedNotesByCardbox({
  page,
  limit,
  cardBoxId,
  cardTypes,
  tags,
  keyword,
  isFlashcard,
  sortBy = 'address',
  sortOrder = 'asc',
  customFilterId,
  targetNoteId
}: GetPaginatedNotesParams): Promise<{
  notes: Note[]
  totalCount: number
  targetPosition?: number
}> {
  try {
    let query = db('notes')
      .leftJoin('note_tags', 'notes.id', 'note_tags.noteId')
      .where('notes.isDeleted', false)
      .whereNot('notes.cardType', 'Draftcard')
      .distinct('notes.*')

    // 如果有自定义筛选规则，优先使用自定义规则
    if (customFilterId) {
      const customFilter = await db('custom_filters').where('id', customFilterId).first()

      if (customFilter) {
        const rules = await db('filter_rules')
          .where('filterId', customFilterId)
          .orderBy('createdAt', 'asc')

        // 根据匹配类型构建查询
        if (customFilter.matchType === 'all') {
          // AND 逻辑：所有规则都必须满足
          for (const rule of rules) {
            query = applyFilterRule(query.clone(), rule)
          }
        } else {
          // OR 逻辑：满足任一规则即可
          query = query.where(function () {
            rules.forEach((rule, index) => {
              const method = index === 0 ? 'where' : 'orWhere'
              this[method](function () {
                applyFilterRule(this, rule)
              })
            })
          })
        }
      }
    } else {
      // 使用常规筛选条件
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
      // 标签筛选
      if (tags && tags.length > 0) {
        if (tags.includes('none')) {
          // 筛选无标签的笔记
          query = query.whereNotExists(function () {
            this.select('*').from('note_tags').whereRaw('note_tags.noteId = notes.id')
          })
        } else if (tags.includes('all')) {
          // 筛选所有有标签的笔记
          query = query.whereExists(function () {
            this.select('*').from('note_tags').whereRaw('note_tags.noteId = notes.id')
          })
        } else {
          // 筛选有特定标签的笔记
          query = query.whereIn('note_tags.tagId', tags)
        }
      }

      // 关键词搜索
      if (keyword) {
        const searchKeyword = `%${keyword}%`
        query = query.where((builder) => {
          builder
            .where('notes.content', 'like', searchKeyword)
            .orWhere('notes.address', 'like', searchKeyword)
        })
      }
    }

    // 添加闪卡筛选
    if (isFlashcard !== undefined) {
      query = query.where('notes.isFlashcard', isFlashcard)
    }

    // 如果提供了目标笔记ID，先获取它的位置
    let targetPosition: number | undefined
    if (targetNoteId) {
      // 克隆当前查询，添加排序条件
      const positionQuery = query.clone().orderBy(`notes.${sortBy}`, sortOrder)

      // 获取目标笔记之前的记录数
      const beforeCount = await positionQuery
        .clone()
        .where(function () {
          if (sortOrder === 'asc') {
            this.where(`notes.${sortBy}`, '<', db('notes').where('id', targetNoteId).select(sortBy))
          } else {
            this.where(`notes.${sortBy}`, '>', db('notes').where('id', targetNoteId).select(sortBy))
          }
        })
        .count('* as count')
        .first()

      if (beforeCount) {
        targetPosition = Number(beforeCount.count)
      }
    }

    // 计算总数
    const countResult = await query.clone().count('* as count').first()
    const totalCount = countResult ? (countResult.count as number) : 0

    // 获取分页数据
    const offset = (page - 1) * limit
    const notes = await query.orderBy(`notes.${sortBy}`, sortOrder).limit(limit).offset(offset)

    return {
      notes: notes.map(convertToNote),
      totalCount,
      targetPosition
    }
  } catch (error) {
    console.error('后端→ 获取分页笔记失败:', error)
    throw new Error('获取分页笔记失败')
  }
}

// 辅助函数：应用单个筛选规则
function applyFilterRule(query: Knex.QueryBuilder, rule: FilterRule): Knex.QueryBuilder {
  // 解析值并去除额外的引号
  const parseValue = (value: any) => {
    if (typeof value === 'string') {
      // 先去除外层的引号
      let parsed = value.replace(/^"(.*)"$/, '$1')
      try {
        // 尝试解析 JSON
        parsed = JSON.parse(parsed)
        return parsed
      } catch {
        return parsed
      }
    }
    return value
  }

  const value = parseValue(rule.value)

  switch (rule.field) {
    case 'tag': {
      let tagIds: string[] = []

      // 处理标签值，可能需要多次解析
      if (typeof value === 'string') {
        try {
          // 尝试解析可能的嵌套 JSON
          let parsed = value
          while (typeof parsed === 'string' && (parsed.startsWith('[') || parsed.startsWith('"'))) {
            parsed = JSON.parse(parsed)
          }
          tagIds = Array.isArray(parsed) ? parsed : [parsed]
        } catch {
          tagIds = [value]
        }
      } else if (Array.isArray(value)) {
        tagIds = value
      } else {
        tagIds = [String(value)]
      }

      // 确保每个标签 ID 是干净的字符串
      tagIds = tagIds.map((id) => {
        if (typeof id === 'string') {
          return id
            .replace(/^"(.*)"$/, '$1')
            .replace(/\\/g, '')
            .replace(/^\[(.*)\]$/, '$1')
        }
        return String(id)
      })

      if (rule.operator === 'contains') {
        // 修改为使用子查询，确保笔记同时包含所有指定标签
        return query.whereIn('notes.id', function () {
          this.select('noteId')
            .from('note_tags')
            .whereIn('tagId', tagIds)
            .groupBy('noteId')
            .havingRaw('COUNT(DISTINCT tagId) = ?', [tagIds.length])
        })
      } else if (rule.operator === 'doesNotContain') {
        // 不包含任何指定标签
        return query.whereNotIn('notes.id', function () {
          this.select('noteId').from('note_tags').whereIn('tagId', tagIds)
        })
      }
      break
    }

    case 'cardBox': {
      const boxId = String(value)
      if (rule.operator === 'is') {
        return boxId === 'inbox'
          ? query.whereNull('notes.cardBoxId')
          : query.where('notes.cardBoxId', boxId)
      } else if (rule.operator === 'isNot') {
        return boxId === 'inbox'
          ? query.whereNotNull('notes.cardBoxId')
          : query.whereNot('notes.cardBoxId', boxId)
      }
      break
    }

    case 'cardType': {
      const cardType = String(value)
      if (rule.operator === 'is') {
        return query.where('notes.cardType', cardType)
      } else if (rule.operator === 'isNot') {
        return query.whereNot('notes.cardType', cardType)
      }
      break
    }

    case 'keyword': {
      const keyword = String(value)
      const searchKeyword = `%${keyword}%`
      if (rule.operator === 'contains') {
        return query.where((builder) => {
          builder
            .where('notes.content', 'like', searchKeyword)
            .orWhere('notes.address', 'like', searchKeyword)
        })
      } else if (rule.operator === 'doesNotContain') {
        return query.whereNot((builder) => {
          builder
            .where('notes.content', 'like', searchKeyword)
            .orWhere('notes.address', 'like', searchKeyword)
        })
      }
      break
    }

    case 'isFlashcard': {
      if (rule.operator === 'is') {
        return query.where('notes.isFlashcard', 1)
      } else if (rule.operator === 'isNot') {
        return query.where(function () {
          this.where('notes.isFlashcard', 0).orWhereNull('notes.isFlashcard')
        })
      }
      break
    }
  }

  return query
}

// 获取最近编辑的 10 篇主卡片笔记
export async function getRecentEditedNotes(): Promise<
  Array<{
    id: string
    address: string
    title: string
    cardType: string
  }>
> {
  try {
    const notes = await db('notes')
      .where({
        isDeleted: false,
        cardType: 'Maincard' // 只获取 Maincard 类型的笔记
      })
      .orderBy('updatedAt', 'desc')
      .limit(10)

    return notes.map((note: Note) => {
      let metadata = { title: '' }
      try {
        // 因为从数据库读出来的 metadata 是字符串，需要解析
        metadata =
          typeof note.metadata === 'string' ? JSON.parse(note.metadata) : note.metadata || {}
      } catch (e) {
        console.error('解析笔记 metadata 失败:', note.id, e)
      }

      return {
        id: note.id,
        address: note.address,
        title: metadata.title || '',
        cardType: note.cardType
      }
    })
  } catch (error) {
    console.error('后端→ 获取最近编辑的主卡片笔记失败:', error)
    throw new Error('获取最近编辑的主卡片笔记失败')
  }
}

// 批量移动笔记到卡片盒
export async function batchMoveNotesToCardBox(
  noteIds: string[],
  cardBoxId: string | null
): Promise<Note[]> {
  try {
    // 使用事务确保操作的原子性
    const updatedNotes = await db.transaction(async (trx) => {
      // 1. 如果指定了卡片盒ID，验证卡片盒是否存在
      if (cardBoxId !== null) {
        const cardBox = await trx('cardboxes').where('id', cardBoxId).first()
        if (!cardBox) {
          throw new Error('目标卡片盒不存在')
        }
      }

      // 2. 验证所有笔记是否存在
      const existingNotes = await trx('notes').whereIn('id', noteIds).select('id')
      if (existingNotes.length !== noteIds.length) {
        throw new Error('部分笔记不存在')
      }

      // 3. 更新笔记的卡片盒
      const notes = await trx('notes')
        .whereIn('id', noteIds)
        .update({
          cardBoxId: cardBoxId,
          updatedAt: new Date()
        })
        .returning('*')

      // 4. 使用 convertToNote 处理返回数据
      return notes.map(convertToNote)
    })

    return updatedNotes
  } catch (error) {
    console.error('后端→ 批量移动笔记失败:', error)
    throw error
  }
}

// 批量设置卡片类型
export async function batchUpdateNotesCardType(
  noteIds: string[],
  cardType: string
): Promise<Note[]> {
  try {
    // 使用事务确保操作的原子性
    const updatedNotes = await db.transaction(async (trx) => {
      // 1. 验证所有笔记是否存在
      const existingNotes = await trx('notes').whereIn('id', noteIds).select('id')
      if (existingNotes.length !== noteIds.length) {
        throw new Error('部分笔记不存在')
      }

      // 2. 验证卡片类型是否有效
      const validCardTypes = ['Maincard', 'Bibcard', 'Indexcard', 'Hoplinkcard']
      if (!validCardTypes.includes(cardType)) {
        throw new Error('无效的卡片类型')
      }

      // 3. 更新笔记的卡片类型
      const notes = await trx('notes')
        .whereIn('id', noteIds)
        .update({
          cardType: cardType,
          updatedAt: new Date()
        })
        .returning('*')

      // 4. 使用 convertToNote 处理返回数据
      return notes.map(convertToNote)
    })

    return updatedNotes
  } catch (error) {
    console.error('后端→ 批量设置卡片类型失败:', error)
    throw error
  }
}

// 批量软删除笔记
export async function batchSoftDeleteNotes(noteIds: string[]): Promise<Note[]> {
  return db.transaction(async (trx) => {
    try {
      // 1. 首先获取所有笔记
      const notes = await trx('notes').whereIn('id', noteIds)
      if (notes.length !== noteIds.length) {
        const foundIds = notes.map((note) => note.id)
        const missingIds = noteIds.filter((id) => !foundIds.includes(id))
        throw new Error(`部分笔记不存在: ${missingIds.join(', ')}`)
      }

      // 2. 批量更新笔记状态
      const updatedNotes = await trx('notes')
        .whereIn('id', noteIds)
        .update({
          isDeleted: true,
          updatedAt: new Date()
        })
        .returning('*')

      if (!updatedNotes || updatedNotes.length === 0) {
        throw new Error('批量更新笔记失败')
      }

      const convertedNotes = updatedNotes.map((note) => convertToNote(note))

      return convertedNotes
    } catch (error) {
      console.error(`后端→ 批量软删除笔记失败:`, error)
      throw error
    }
  })
}

// 用于API创建笔记的专门方法
export async function createNoteViaApi(content: string): Promise<Note> {
  const now = new Date()
  // 修改时间戳格式化方式
  const timestamp = now
    .toISOString()
    .slice(0, 19) // 取到秒 (2025-03-29T12:05:30)
    .replace(/[-:T]/g, '') // 去掉横杠、冒号和T (20250329120530)

  // 构建笔记地址格式: 闪念-YYYYMMDDHHmmss
  const address = `闪念-${timestamp}` // 例如: 闪念-20250329120530

  const title = content.slice(0, 50)
  const newNote: Note = {
    id: uuidv4(),
    type: 'note',
    address,
    title: title,
    cardType: 'Draftcard',
    content: {
      type: 'doc',
      content: [
        {
          attrs: {
            textAlign: 'left'
          },
          content: [
            {
              type: 'text',
              text: content
            }
          ],
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

    // 元数据
    metadata: {
      title: title,
      summary: ''
    },

    // 闪卡相关属性
    isFlashcard: false,
    flashcard: undefined,
    nextReviewAt: undefined
  }

  try {
    await db('notes').insert({
      ...newNote,
      content: JSON.stringify(newNote.content),
      references: JSON.stringify(newNote.references),
      relationshipTree: JSON.stringify(newNote.relationshipTree),
      graphData: JSON.stringify(newNote.graphData),
      metadata: JSON.stringify(newNote.metadata)
    })

    return newNote
  } catch (error) {
    console.error('通过API创建笔记失败:', error)
    throw error
  }
}

// 1. 切换笔记的索引状态
export async function toggleNoteIndex(noteId: string): Promise<Note> {
  return db.transaction(async (trx) => {
    // 获取笔记
    const note = await trx('notes').where('id', noteId).first()
    if (!note) {
      throw new Error('笔记不存在')
    }

    // 准备更新数据
    const now = new Date()
    const updateData: any = {
      isIndexed: !note.isIndexed,
      updatedAt: now
    }

    // 如果是添加到索引，需要设置 indexInfo
    if (!note.isIndexed) {
      // 获取标题的首字母（支持中英文）
      const firstLetter = getFirstLetter(note.title)

      // 修改：使用正确的 JSON 查询语法
      const maxOrderResult = await trx('notes')
        .where('isIndexed', true)
        .whereRaw("json_extract(indexInfo, '$.firstLetter') = ?", [firstLetter])
        .select(trx.raw("COALESCE(MAX(json_extract(indexInfo, '$.order')), 0) as maxOrder"))
        .first()

      updateData.indexInfo = JSON.stringify({
        firstLetter,
        order: (maxOrderResult?.maxOrder || 0) + 1,
        addedAt: now
      })
    } else {
      // 如果是移除索引，清空 indexInfo
      updateData.indexInfo = null
    }

    // 执行更新
    const [updatedNote] = await trx('notes').where('id', noteId).update(updateData).returning('*')

    return convertToNote(updatedNote)
  })
}

// 2. 获取所有索引笔记（按首字母分组）
export async function getIndexedNotes(): Promise<{
  [key: string]: Note[]
}> {
  try {
    const notes = await db('notes')
      .where('isIndexed', true)
      .whereNotNull('indexInfo')
      .orderByRaw("json_extract(indexInfo, '$.firstLetter') ASC") // 修改：使用单引号
      .orderByRaw("json_extract(indexInfo, '$.order') ASC") // 修改：使用单引号

    // 按首字母分组
    const groupedNotes = notes.reduce((groups: { [key: string]: Note[] }, note) => {
      const indexInfo = JSON.parse(note.indexInfo)
      const firstLetter = indexInfo.firstLetter
      if (!groups[firstLetter]) {
        groups[firstLetter] = []
      }
      groups[firstLetter].push(convertToNote(note))
      return groups
    }, {})

    return groupedNotes
  } catch (error) {
    console.error('获取索引笔记失败:', error)
    throw error
  }
}

// 3. 更新索引笔记的顺序
export async function updateIndexOrder(
  updates: {
    noteId: string
    firstLetter: string
    order: number
  }[]
): Promise<Note[]> {
  return db.transaction(async (trx) => {
    const updatedNotes: Note[] = []

    for (const update of updates) {
      const [updatedNote] = await trx('notes')
        .where('id', update.noteId)
        .update({
          indexInfo: db.raw(`json_set(indexInfo, '$.firstLetter', ?, '$.order', ?)`, [
            update.firstLetter,
            update.order
          ]),
          updatedAt: new Date()
        })
        .returning('*')

      updatedNotes.push(convertToNote(updatedNote))
    }

    return updatedNotes
  })
}

// 4. 批量添加到索引
export async function batchAddToIndex(noteIds: string[]): Promise<Note[]> {
  return db.transaction(async (trx) => {
    const now = new Date()
    const updatedNotes: Note[] = []

    for (const noteId of noteIds) {
      const note = await trx('notes').where('id', noteId).first()
      if (!note || note.isIndexed) continue

      const firstLetter = getFirstLetter(note.title)
      const maxOrder = await trx('notes')
        .where('isIndexed', true)
        .whereRaw('json_extract(indexInfo, "$.firstLetter") = ?', [firstLetter])
        .max('json_extract(indexInfo, "$.order") as maxOrder')
        .first()

      const [updatedNote] = await trx('notes')
        .where('id', noteId)
        .update({
          isIndexed: true,
          indexInfo: JSON.stringify({
            firstLetter,
            order: (maxOrder?.maxOrder || 0) + 1,
            addedAt: now
          }),
          updatedAt: now
        })
        .returning('*')

      updatedNotes.push(convertToNote(updatedNote))
    }

    return updatedNotes
  })
}

// 5. 批量移除索引
export async function batchRemoveFromIndex(noteIds: string[]): Promise<Note[]> {
  return db.transaction(async (trx) => {
    // 移除数组解构，直接获取更新后的笔记数组
    const updatedNotes = await trx('notes')
      .whereIn('id', noteIds)
      .update({
        isIndexed: false,
        indexInfo: null,
        updatedAt: new Date()
      })
      .returning('*')

    // 确保 updatedNotes 是一个数组
    return Array.isArray(updatedNotes) ? updatedNotes.map(convertToNote) : []
  })
}

// 6. 获取特定首字母的索引笔记
export async function getIndexedNotesByLetter(letter: string): Promise<Note[]> {
  try {
    const notes = await db('notes')
      .where('isIndexed', true)
      .whereRaw("json_extract(indexInfo, '$.firstLetter') = ?", [letter]) // 修改：使用单引号
      .orderByRaw("json_extract(indexInfo, '$.order') ASC") // 修改：使用单引号

    return notes.map(convertToNote)
  } catch (error) {
    console.error('获取特定首字母的索引笔记失败:', error)
    throw error
  }
}

// 辅助函数：获取文字的首字母（支持中英文）
function getFirstLetter(text: string): string {
  if (!text) return '#'

  // 移除空格
  text = text.trim()
  if (!text) return '#'

  // 获取第一个字符
  const firstChar = text.charAt(0)

  // 如果是英文字母，直接返回大写
  if (/[a-zA-Z]/.test(firstChar)) {
    return firstChar.toUpperCase()
  }

  // 如果是中文，转换为拼音首字母
  if (/[\u4e00-\u9fa5]/.test(firstChar)) {
    try {
      const pinyinResult = pinyin(firstChar, {
        pattern: 'first', // 只获取首字母
        toneType: 'none', // 不带声调
        type: 'array'
      })
      return pinyinResult[0].toUpperCase()
    } catch (error) {
      console.error('转换拼音失败:', error)
      return '#'
    }
  }

  // 其他字符返回 #
  return '#'
}
