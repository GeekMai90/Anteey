import { db } from '../db/config'
import { v4 as uuidv4 } from 'uuid'
import type { TimeBlockDay } from '@renderer/types/timeBlock'

// 获取某天的时间块数据
export async function getTimeBlockDay(date: string): Promise<TimeBlockDay> {
  try {
    let day = await db('time_block_days').where('date', date).first()
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

    // 获取该天所有时间块
    const blocks = await db('time_blocks')
      .where('dayId', day.id)
      .select('hour', 'content', 'createdAt', 'updatedAt')

    // 构建返回数据结构
    return {
      ...day,
      blocks: blocks.reduce(
        (acc, block) => {
          acc[block.hour] = {
            content: block.content,
            createdAt: block.createdAt,
            updatedAt: block.updatedAt
          }
          return acc
        },
        {} as TimeBlockDay['blocks']
      )
    }
  } catch (error) {
    console.error('获取时间块数据失败:', error)
    throw error
  }
}

// 更新时间块内容
export async function updateTimeBlock(dayId: string, hour: number, content: string) {
  try {
    const now = new Date()
    await db('time_blocks')
      .insert({
        dayId,
        hour,
        content,
        createdAt: now,
        updatedAt: now
      })
      .onConflict(['dayId', 'hour'])
      .merge({
        content,
        updatedAt: now
      })

    // 同时更新 time_block_days 的 updatedAt
    await db('time_block_days').where('id', dayId).update({
      updatedAt: now
    })
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
