import { db } from '../../db/config'
import { DailyQuote } from '@shared/types'
import { v4 as uuidv4 } from 'uuid'

// 工具函数:根据日期生成随机种子
function getRandomSeed(date: string): number {
  return date.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
}

// 获取今日金句
export async function getTodayQuote(): Promise<DailyQuote> {
  try {
    // 获取所有金句
    const quotes = await db('daily_quotes').select('*')
    if (!quotes.length) {
      throw new Error('没有可用的金句')
    }

    // 使用今天的日期作为随机种子
    const today = new Date().toISOString().split('T')[0]
    const seed = getRandomSeed(today)

    // 使用种子选择今天的金句
    const index = seed % quotes.length
    return quotes[index]
  } catch (error) {
    console.error('获取今日金句失败:', error)
    throw error
  }
}

// 添加新金句
export async function addQuote(content: string, author: string): Promise<DailyQuote> {
  try {
    const now = new Date()
    const newQuote = {
      id: uuidv4(),
      content,
      author,
      createdAt: now,
      updatedAt: now
    }

    const [quote] = await db('daily_quotes').insert(newQuote).returning('*')
    return quote
  } catch (error) {
    console.error('添加金句失败:', error)
    throw error
  }
}

// 获取所有金句
export async function getAllQuotes(): Promise<DailyQuote[]> {
  try {
    return await db('daily_quotes').select('*').orderBy('createdAt', 'desc')
  } catch (error) {
    console.error('获取所有金句失败:', error)
    throw error
  }
}

// 删除金句
export async function deleteQuote(id: string): Promise<void> {
  try {
    await db('daily_quotes').where({ id }).delete()
  } catch (error) {
    console.error('删除金句失败:', error)
    throw error
  }
}

// 更新金句
export async function updateQuote(
  id: string,
  data: { content?: string; author?: string }
): Promise<DailyQuote> {
  try {
    const [updatedQuote] = await db('daily_quotes')
      .where({ id })
      .update({
        ...data,
        updatedAt: new Date()
      })
      .returning('*')

    if (!updatedQuote) {
      throw new Error(`金句不存在: ${id}`)
    }

    return updatedQuote
  } catch (error) {
    console.error('更新金句失败:', error)
    throw error
  }
}
