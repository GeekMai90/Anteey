import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import type { FutureLog, MonthlyLog, TimeBlockDay } from '@shared/types'

// 获取某天的时间块数据
export async function getTimeBlockDay(date: string): Promise<TimeBlockDay> {
  try {
    console.log('Service: 开始查询日期:', date)
    let day = await db('time_block_days').where('date', date).first()
    console.log('Service: 查询到的日期数据:', day)

    if (!day) {
      // 创建新的一天
      const newDay = {
        id: uuidv4(),
        date,
        weather: null,
        mood: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      await db('time_block_days').insert(newDay)
      day = newDay
    }

    // 获取该天所有时间块，添加 orderBy 确保顺序一致
    const blocks = await db('time_blocks')
      .where('dayId', day.id)
      .select('id', 'hour', 'content', 'createdAt', 'updatedAt')
      .orderBy('hour', 'asc')
    console.log('Service: 查询到的时间块:', blocks)

    // 构建结果对象
    const result = {
      ...day,
      blocks: blocks.reduce(
        (acc, block) => {
          acc[block.hour] = {
            id: block.id,
            content: block.content || '',
            createdAt: block.createdAt,
            updatedAt: block.updatedAt
          }
          return acc
        },
        {} as TimeBlockDay['blocks']
      )
    }
    console.log('Service: 返回的完整数据:', result)
    return result
  } catch (error) {
    console.error('获取时间块数据失败:', error)
    throw error
  }
}

// 更新时间块内容
export async function updateTimeBlock(
  dayId: string,
  hour: number,
  content: string
): Promise<string> {
  try {
    const now = new Date()
    const blockId = uuidv4()

    // 先检查是否已存在时间块
    const existingBlock = await db('time_blocks').where({ dayId, hour }).first()

    if (existingBlock) {
      // 如果存在，更新内容
      await db('time_blocks').where({ dayId, hour }).update({
        content: content,
        updatedAt: now
      })
      return existingBlock.id
    } else {
      // 如果不存在，创建新的时间块
      await db('time_blocks').insert({
        id: blockId,
        dayId,
        hour,
        content: content,
        createdAt: now,
        updatedAt: now
      })
      return blockId
    }
  } catch (error) {
    console.error('更新时间块失败:', error)
    throw error
  }
}

// 更新时间块日期状态（天气和心情）
export async function updateTimeBlockDayStatus(
  id: string,
  data: { weather?: string; mood?: string }
) {
  try {
    const now = new Date()
    const updateData = {
      ...data,
      updatedAt: now
    }

    await db('time_block_days').where('id', id).update(updateData)
  } catch (error) {
    console.error('更新时间块日期状态失败:', error)
    throw error
  }
}

// 获取时间块设置
export async function getTimeBlockSettings() {
  try {
    const settings = await db('time_block_settings').first()
    return (
      settings || {
        enabled: true,
        startTime: 5,
        endTime: 23
      }
    )
  } catch (error) {
    console.error('获取时间块设置失败:', error)
    throw error
  }
}

// 更新时间块设置
export async function updateTimeBlockSettings(settings: {
  enabled?: boolean
  startTime?: number
  endTime?: number
}) {
  try {
    await db('time_block_settings').update(settings).where({}) // 由于只有一条记录,不需要 where 条件

    return await getTimeBlockSettings()
  } catch (error) {
    console.error('更新时间块设置失败:', error)
    throw error
  }
}

// 获取未来日志内容
export async function getFutureLog(): Promise<FutureLog | null> {
  try {
    // 按创建时间排序确保获取最早的那条记录
    const log = await db('future_logs').orderBy('createdAt', 'asc').first()
    console.log('Service: 获取到的未来日志:', log)
    return log || null
  } catch (error) {
    console.error('获取未来日志失败:', error)
    throw error
  }
}

// 更新未来日志内容
export async function updateFutureLog(content: string): Promise<string> {
  try {
    const now = new Date()
    console.log('Service: 准备更新未来日志，内容:', content)

    // 获取现有日志（如果存在）
    const existingLog = await db('future_logs').orderBy('createdAt', 'asc').first()
    console.log('Service: 现有日志:', existingLog)

    let id: string
    if (existingLog) {
      // 更新现有记录
      console.log('Service: 更新现有日志, id:', existingLog.id)
      await db('future_logs').where('id', existingLog.id).update({
        content,
        updatedAt: now
      })
      id = existingLog.id
    } else {
      // 创建新记录
      console.log('Service: 创建新日志')
      id = uuidv4()
      await db('future_logs').insert({
        id,
        content,
        createdAt: now,
        updatedAt: now
      })
    }

    // 验证更新
    const updatedLog = await db('future_logs').where('id', id).first()
    console.log('Service: 更新后的日志:', updatedLog)

    // 清理可能存在的多余记录
    const result = await db('future_logs').count('* as count').first()
    const count = result ? Number(result.count) : 0
    if (count > 1) {
      console.log('Service: 清理多余的日志记录')
      // 保留最早创建的记录，删除其他记录
      await db('future_logs').whereNot('id', id).delete()
    }

    return id
  } catch (error) {
    console.error('Service: 更新未来日志失败:', error)
    throw error
  }
}

// 获取月度日志内容
export async function getMonthlyLog(year: number, month: number): Promise<MonthlyLog | null> {
  try {
    console.log('Service: 开始查询月度日志:', year, month)
    const log = await db('monthly_logs').where({ year, month }).first()
    console.log('Service: 获取到的月度日志:', log)
    return log || null
  } catch (error) {
    console.error('获取月度日志失败:', error)
    throw error
  }
}

// 更新月度日志内容
export async function updateMonthlyLog(
  year: number,
  month: number,
  content: string
): Promise<string> {
  try {
    const now = new Date()
    console.log('Service: 准备更新月度日志，年月:', year, month)

    // 获取现有日志（如果存在）
    const existingLog = await db('monthly_logs').where({ year, month }).first()
    console.log('Service: 现有月度日志:', existingLog)

    let id: string
    if (existingLog) {
      // 更新现有记录
      console.log('Service: 更新现有月度日志, id:', existingLog.id)
      await db('monthly_logs').where('id', existingLog.id).update({
        content,
        updatedAt: now
      })
      id = existingLog.id
    } else {
      // 创建新记录
      console.log('Service: 创建新月度日志')
      id = uuidv4()
      await db('monthly_logs').insert({
        id,
        year,
        month,
        content,
        createdAt: now,
        updatedAt: now
      })
    }

    // 验证更新
    const updatedLog = await db('monthly_logs').where('id', id).first()
    console.log('Service: 更新后的月度日志:', updatedLog)

    return id
  } catch (error) {
    console.error('Service: 更新月度日志失败:', error)
    throw error
  }
}

// 获取指定年份的所有月度日志
export async function getYearMonthlyLogs(year: number): Promise<MonthlyLog[]> {
  try {
    console.log('Service: 开始查询年度月度日志:', year)
    const logs = await db('monthly_logs').where({ year }).orderBy('month', 'asc')
    console.log('Service: 获取到的年度月度日志:', logs)
    return logs
  } catch (error) {
    console.error('获取年度月度日志失败:', error)
    throw error
  }
}

// 添加搜索时光记的函数
export async function searchTimeBlocks(searchTerm: string): Promise<
  Array<{
    date: string
    hour: number
    content: string
    id: string
  }>
> {
  try {
    const query = searchTerm.toLowerCase().trim()

    // 从 time_blocks 表中搜索内容
    const results = await db('time_blocks')
      .join('time_block_days', 'time_blocks.dayId', 'time_block_days.id')
      .whereRaw('LOWER(time_blocks.content) LIKE ?', [`%${query}%`])
      .select('time_block_days.date', 'time_blocks.hour', 'time_blocks.content', 'time_blocks.id')
      .orderBy(['time_block_days.date', 'time_blocks.hour'])

    return results
  } catch (error) {
    console.error('搜索时光记失败:', error)
    throw error
  }
}
