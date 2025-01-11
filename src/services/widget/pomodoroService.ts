import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import type { PomodoroConfig } from '@shared/types'

// 工具函数:获取今天的日期字符串 YYYY-MM-DD
function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

// 获取今日番茄钟记录
export async function getTodayRecord() {
  try {
    const today = getTodayString()
    const record = await db('pomodoro_records').where('date', today).first()

    if (!record) {
      // 如果今天没有记录,创建一条新记录
      const newRecord = {
        id: uuidv4(),
        date: today,
        count: 0,
        totalMinutes: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      await db('pomodoro_records').insert(newRecord)
      return newRecord
    }

    return record
  } catch (error) {
    console.error('获取今日番茄钟记录失败:', error)
    throw error
  }
}

// 更新今日番茄钟记录
export async function updateTodayRecord(count: number, minutes: number) {
  try {
    const today = getTodayString()
    const [record] = await db('pomodoro_records')
      .where('date', today)
      .update({
        count,
        totalMinutes: minutes,
        updatedAt: new Date()
      })
      .returning('*')

    return record
  } catch (error) {
    console.error('更新今日番茄钟记录失败:', error)
    throw error
  }
}

// 获取番茄钟设置
export async function getPomodoroSettings(): Promise<PomodoroConfig> {
  try {
    const settings = await db('pomodoro_settings').orderBy('createdAt', 'desc').first()

    if (!settings) {
      throw new Error('未找到番茄钟设置')
    }

    return {
      defaultDuration: settings.defaultDuration,
      sound: settings.sound
    }
  } catch (error) {
    console.error('获取番茄钟设置失败:', error)
    throw error
  }
}

// 更新番茄钟设置
export async function updatePomodoroSettings(
  config: Partial<PomodoroConfig>
): Promise<PomodoroConfig> {
  try {
    const [settings] = await db('pomodoro_settings')
      .update({
        ...config,
        updatedAt: new Date()
      })
      .returning('*')

    return {
      defaultDuration: settings.defaultDuration,
      sound: settings.sound
    }
  } catch (error) {
    console.error('更新番茄钟设置失败:', error)
    throw error
  }
}

// 获取指定日期范围的番茄钟记录
export async function getPomodoroRecords(startDate: string, endDate: string) {
  try {
    const records = await db('pomodoro_records')
      .whereBetween('date', [startDate, endDate])
      .orderBy('date', 'asc')

    return records
  } catch (error) {
    console.error('获取番茄钟记录失败:', error)
    throw error
  }
}

// 获取统计数据
export async function getPomodoroStats() {
  try {
    const result = await db('pomodoro_records')
      .select([
        db.raw('SUM(count) as totalCount'),
        db.raw('SUM(totalMinutes) as totalMinutes'),
        db.raw('AVG(count) as avgDailyCount'),
        db.raw('COUNT(DISTINCT date) as totalDays')
      ])
      .first()

    return {
      totalCount: Number(result.totalCount || 0),
      totalMinutes: Number(result.totalMinutes || 0),
      avgDailyCount: Number(result.avgDailyCount || 0),
      totalDays: Number(result.totalDays || 0)
    }
  } catch (error) {
    console.error('获取番茄钟统计数据失败:', error)
    throw error
  }
}
