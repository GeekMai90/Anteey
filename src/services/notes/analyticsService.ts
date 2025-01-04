import { db } from '../../db/config'

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
