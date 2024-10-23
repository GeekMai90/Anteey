import { db } from './config'
import { Note } from '../renderer/src/types/Note'
import { v4 as uuidv4 } from 'uuid'

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
    tags: JSON.parse(record.tags),
    linkedTo: JSON.parse(record.linkedTo),
    linkedFrom: JSON.parse(record.linkedFrom),
    cardBoxId: record.cardBoxId || undefined,
    parentId: record.parentId || undefined,
    isDeleted: record.isDeleted,
    isStarred: record.isStarred,
    starredOrder: record.starredOrder,
    rightBarOrder: record.rightBarOrder
  }
}

//获取热力图数据
// export async function getHeatmapData(): Promise<{ date: string; count: number }[]> {
//   const now = new Date()
//   const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
//   const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
//   const endDate = new Date(today)
//   endDate.setDate(endDate.getDate() + 30)

//   const data: Record<string, number> = {}

//   // 初始化日期范围
//   for (let d = new Date(oneYearAgo); d <= endDate; d.setDate(d.getDate() + 1)) {
//     const dateString = d.toISOString().split('T')[0]
//     data[dateString] = 0
//   }

//   // 从数据库获取笔记创建日期并统计
//   const notes = await db('notes')
//     .where('isDeleted', false)
//     .select('createdAt')
//     .whereBetween('createdAt', [oneYearAgo, endDate])

//   notes.forEach((note) => {
//     const dateString = note.createdAt.toISOString().split('T')[0]
//     if (dateString in data) {
//       data[dateString]++
//     }
//   })

//   return Object.entries(data).map(([date, count]) => ({ date, count }))
// }
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
    const notes = await db('notes')
      .where('isDeleted', false)
      .select('id', 'address', 'content', 'tags')

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
  cardBoxId?: string // 'all' 表示所有卡片, 'inbox' 表示收件箱, 其他值为特定卡片盒 ID
  cardTypes?: string[] // ['Maincard', 'Bibcard', 'Indexcard']
  sortBy: string
  sortOrder: 'asc' | 'desc'
}
//卡片盒页面获取分页的笔记
export async function getPaginatedNotesByCardbox({
  page,
  limit,
  cardBoxId,
  cardTypes,
  sortBy = 'address',
  sortOrder = 'asc'
}: GetPaginatedNotesParams): Promise<{ notes: Note[]; totalCount: number }> {
  try {
    console.log('后端→ 开始获取卡片盒分页笔记', cardBoxId, cardTypes, sortBy, sortOrder)
    let query = db('notes').where('isDeleted', false)
    // let query = db('notes').whereNull('cardBoxId').where('isDeleted', false)

    // 卡片盒筛选
    if (cardBoxId === 'inbox') {
      console.log('后端→ 筛选收件箱笔记')
      query = query.where('cardBoxId', '')
    } else if (cardBoxId && cardBoxId !== 'all') {
      console.log(`后端→ 筛选卡片盒 ${cardBoxId} 的笔记`)
      query = query.where('cardBoxId', cardBoxId)
    } else {
      console.log('后端→ 获取所有卡片盒的笔记')
    }

    // 卡片类型筛选
    if (cardTypes && cardTypes.length > 0) {
      query = query.whereIn('cardType', cardTypes)
    }

    const offset = (page - 1) * limit

    // 排序
    const validSortColumns = ['address', 'createdAt', 'updatedAt'] // 添加其他有效的排序列
    const actualSortBy = validSortColumns.includes(sortBy) ? sortBy : 'address'

    const [notes, countResult] = await Promise.all([
      query.clone().orderBy(actualSortBy, sortOrder).limit(limit).offset(offset),
      query.clone().count('* as count').first()
    ])

    console.log('后端→ 获取卡片盒分页笔记成功', notes)
    return {
      notes: notes.map(convertToNote),
      totalCount: countResult ? (countResult.count as number) : 0
    }
  } catch (error) {
    console.error('后端→ 获取分页笔记失败:', error)
    throw new Error('后端→ 获取分页笔记失败')
  }
}

// 创建笔记
export async function createNote(): Promise<Note> {
  const id = uuidv4()
  const now = new Date()

  const newNote: Note = {
    id,
    type: 'note',
    address: '',
    cardType: 'Maincard',
    // content: {
    //   type: 'doc',
    //   content: [{ type: 'paragraph' }]
    // },
    content: { type: 'doc', content: [] },
    createdAt: now,
    updatedAt: now,
    tags: [],
    linkedTo: [],
    linkedFrom: [],
    cardBoxId: '',
    parentId: '',
    isDeleted: false,
    isStarred: false,
    starredOrder: 0,
    rightBarOrder: 0
  }

  try {
    await db('notes').insert({
      ...newNote,
      content: JSON.stringify(newNote.content),
      tags: JSON.stringify(newNote.tags),
      linkedTo: JSON.stringify(newNote.linkedTo),
      linkedFrom: JSON.stringify(newNote.linkedFrom)
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

// 更新笔记 content
export async function updateNoteContent(id: string, content: any): Promise<Note> {
  try {
    console.log('后端→ 更新笔记内容', id, content)
    const [updatedNote] = await db('notes')
      .where('id', id)
      .update({ content: JSON.stringify(content) })
      .returning('*')
    return convertToNote(updatedNote)
  } catch (error) {
    console.error('后端→ 更新笔记内容失败:', error)
    throw new Error('后端→ 更新笔记内容失败')
  }
}

//更新笔记
export async function updateNote(id: string, updateNoteDto: Partial<Note>): Promise<Note> {
  console.log(`后端→ 开始更新笔记 ID: ${id}`)
  console.log('后端→ 更新数据:', JSON.stringify(updateNoteDto))

  return db.transaction(async (trx) => {
    try {
      // 1. 查找笔记
      const note = await trx('notes').where({ id }).first()

      if (!note) {
        console.error(`后端→ 未找到ID为 ${id} 的笔记`)
        throw new Error(`Note with ID "${id}" not found`)
      }

      console.log('后端→ 找到的原始笔记:', JSON.stringify(note))

      // 2. 准备更新数据
      const updateData: Partial<Note> = {}

      const fields = ['address', 'cardType', 'tags', 'linkedTo', 'linkedFrom', 'parentId']
      fields.forEach((field) => {
        if (updateNoteDto[field as keyof Partial<Note>] !== undefined) {
          ;(updateData as any)[field] = updateNoteDto[field as keyof Partial<Note>]
        }
      })

      if (updateNoteDto.content !== undefined) {
        try {
          updateData.content =
            typeof updateNoteDto.content === 'string'
              ? JSON.parse(updateNoteDto.content)
              : updateNoteDto.content
          console.log('后端→ 更新内容:', JSON.stringify(updateData.content))
        } catch (error) {
          console.error('后端→ 解析内容时出错:', error)
          throw new Error('Invalid content format')
        }
      }

      // 3. 更新时间戳
      updateData.updatedAt = new Date()

      // 4. 保存更新
      console.log('后端→ 更新后的笔记（保存前）:', JSON.stringify({ ...note, ...updateData }))

      // 确保 content 字段在存储到数据库之前被转换为 JSON 字符串
      if (updateData.content) {
        updateData.content = JSON.stringify(updateData.content) as any
      }

      // 处理数组字段
      ;['tags', 'linkedTo', 'linkedFrom'].forEach((field) => {
        if (Array.isArray(updateData[field as keyof Partial<Note>])) {
          ;(updateData as any)[field] = JSON.stringify(updateData[field as keyof Partial<Note>])
        }
      })

      const [updatedNote] = await trx('notes').where({ id }).update(updateData).returning('*')

      // 解析返回的数据
      if (typeof updatedNote.content === 'string') {
        updatedNote.content = JSON.parse(updatedNote.content)
      }

      // 解析数组字段
      ;['tags', 'linkedTo', 'linkedFrom'].forEach((field) => {
        if (typeof updatedNote[field] === 'string') {
          updatedNote[field] = JSON.parse(updatedNote[field])
        }
      })

      console.log('后端→ 保存后的笔记:', JSON.stringify(updatedNote))
      return updatedNote
    } catch (error) {
      console.error('后端→ 更新笔记事务失败:', error)
      throw error
    }
  })
}

// 软删除笔记
// export async function softDeleteNote(id: string): Promise<Note | null> {
//   try {
//     // 软删除后返回更新后的笔记
//     const result = await db('notes').where('id', id).update('isDeleted', true).returning('*')
//     const updatedNote = result[0] ? convertToNote(result[0]) : null
//     console.log('后端→ 软删除笔记更新后的笔记:', JSON.stringify(updatedNote))
//     return updatedNote
//   } catch (error) {
//     console.error(`后端→ 软删除笔记失败: ${id}:`, error)
//     throw error
//   }
// }
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

// 更新笔记的卡片盒
export async function updateNoteCardBox(noteId: string, cardBoxId: string): Promise<Note | null> {
  try {
    // 更新卡片盒前的笔记
    const note = await getNoteById(noteId)
    console.log('后端→ 更新卡片盒的笔记是:', note)
    // 更新卡片盒
    await db('notes').where('id', noteId).update({ cardBoxId: cardBoxId })
    // 更新卡片盒后的笔记
    const updatedNote = await getNoteById(noteId)
    console.log('后端→ 更新卡片盒后的笔记是:', updatedNote)
    // console.log(`后端→ 更新笔记的卡片盒: ${noteId}`)
    return updatedNote
  } catch (error) {
    console.error(`后端→ 更新笔记的卡片盒失败: ${noteId}:`, error)
    throw error
  }
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
    const notes = await db('notes').where('isStarred', true).orderBy('updatedAt', 'desc')
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
