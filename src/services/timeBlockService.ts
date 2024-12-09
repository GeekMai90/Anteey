import { db } from '../db/config'
import { v4 as uuidv4 } from 'uuid'
import type {
  TimeBlockDay,
  TimeBlockItemType,
  TaskStatus,
  TimeBlockItem
} from '../renderer/src/types/timeBlock'

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
            items: [], // 保持空数组以兼容类型定义
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

// 添加时间块内容项
export async function addTimeBlockItem(
  blockId: string,
  data: {
    type: TimeBlockItemType
    content: string
    status?: TaskStatus
  }
): Promise<TimeBlockItem> {
  try {
    const now = new Date()

    // 获取当前最大的 order
    const maxOrder = await db('time_block_items')
      .where('blockId', blockId)
      .max('order as maxOrder')
      .first()

    const order = (maxOrder?.maxOrder || 0) + 1

    const item: TimeBlockItem = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    }

    await db('time_block_items').insert({
      ...item,
      blockId,
      order
    })

    return item
  } catch (error) {
    console.error('添加时间块内容项失败:', error)
    throw error
  }
}

// 更新内容项状态
export async function updateItemStatus(itemId: string, status: TaskStatus): Promise<void> {
  try {
    await db('time_block_items').where('id', itemId).update({
      status,
      updatedAt: new Date()
    })
  } catch (error) {
    console.error('更新内容项状态失败:', error)
    throw error
  }
}

// 迁移内容项
export async function migrateItem(itemId: string, targetBlockId: string): Promise<TimeBlockItem> {
  try {
    const now = new Date()

    // 获取目标时间块的最大 order
    const maxOrder = await db('time_block_items')
      .where('blockId', targetBlockId)
      .max('order as maxOrder')
      .first()

    const order = (maxOrder?.maxOrder || 0) + 1

    // 更新内容项
    await db('time_block_items').where('id', itemId).update({
      blockId: targetBlockId,
      order,
      updatedAt: now
    })

    // 返回更新后的内容项
    const item = await db('time_block_items').where('id', itemId).first()

    return item
  } catch (error) {
    console.error('迁移内容项失败:', error)
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
