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
    // 使用 SQL 直接统计不同日期的数量
    const result = await db('notes')
      .where('isDeleted', false)
      .countDistinct(db.raw("strftime('%Y-%m-%d', datetime(createdAt / 1000, 'unixepoch'))"))
      .first()

    // 获取计数结果（处理不同数据库返回结果的差异）
    const count = result ? (result as any).count || Object.values(result)[0] : 0
    return Number(count)
  } catch (error) {
    console.error('后端→ 获取用户使用天数失败:', error)
    throw error
  }
}
