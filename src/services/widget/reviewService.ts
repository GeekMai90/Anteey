import { db } from '../../db/config'
import { Note } from '@shared/types'
import { convertToNote } from '../notes/notesService'

// 获取今日随机回顾笔记
export async function getRandomReviewNotes(): Promise<Note[]> {
  try {
    // 1. 从数据库中随机选择3条未删除的笔记
    const notes = await db('notes')
      .where('isDeleted', false)
      .where('cardType', 'Maincard') // 只获取 Maincard 类型的卡片
      .orderByRaw('RANDOM()') // 随机排序
      .limit(3)
      .select('*')

    // 2. 如果没有找到笔记,返回空数组
    if (!notes || notes.length === 0) {
      return []
    }

    // 3. 使用 convertToNote 处理每条笔记数据(处理序列化的字段)
    return notes.map(convertToNote)
  } catch (error) {
    console.error('获取随机回顾笔记失败:', error)
    throw error
  }
}

// 获取智能回顾数据
export async function getReviewData() {
  try {
    const notes = await getRandomReviewNotes()
    return {
      notes,
      lastRefreshedAt: new Date()
    }
  } catch (error) {
    console.error('获取智能回顾数据失败:', error)
    throw error
  }
}

// 获取单条随机笔记
export async function getOneRandomNote(): Promise<Note | null> {
  try {
    // 从数据库中随机选择1条未删除的笔记
    const note = await db('notes')
      .where('isDeleted', false)
      .where('cardType', 'Maincard') // 只获取 Maincard 类型的卡片
      .orderByRaw('RANDOM()') // 随机排序
      .limit(1)
      .first()

    // 如果没有找到笔记,返回 null
    if (!note) {
      return null
    }

    // 使用 convertToNote 处理笔记数据
    return convertToNote(note)
  } catch (error) {
    console.error('获取单条随机笔记失败:', error)
    throw error
  }
}
