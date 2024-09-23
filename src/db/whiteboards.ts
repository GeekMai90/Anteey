import { v4 as uuidv4 } from 'uuid'
import { db } from './config' // 假设你有一个 db 模块来处理数据库连接
import type { CreateWhiteboardInput, Whiteboard } from '../renderer/src/types/Note'

export async function createWhiteboard(input: CreateWhiteboardInput): Promise<Whiteboard> {
  const id = uuidv4()
  const now = new Date().toISOString() // 确保日期格式正确

  const newWhiteboard: Whiteboard = {
    id,
    name: input.name || '新白板',
    description: input.description || '',
    createdAt: new Date(now),
    updatedAt: new Date(now),
    items: [],
    position: input.position,
    size: input.size,
    parentId: input.parentId ?? undefined, // 确保 parentId 是 null 而不是 undefined
    isRoot: input.isRoot,
    isStarred: input.isStarred || false,
    starredOrder: input.starredOrder || undefined // 确保 starredOrder 是 null 而不是 undefined
  }

  try {
    await db('whiteboards').insert({
      ...newWhiteboard,
      items: JSON.stringify(newWhiteboard.items), // 确保 items 字段是一个 JSON 字符串
      position: JSON.stringify(newWhiteboard.position), // 确保 position 字段是一个 JSON 字符串
      size: newWhiteboard.size ? JSON.stringify(newWhiteboard.size) : null // 确保 size 字段是一个 JSON 字符串或 null
    })
    return newWhiteboard
  } catch (error) {
    console.error('后端→ 创建白板失败:', error)
    throw error
  }
}
