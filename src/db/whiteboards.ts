// src/db/whiteboards.ts

import { db } from './config'
import { Whiteboard, WhiteboardItem } from '../renderer/src/types/Note'
import { v4 as uuidv4 } from 'uuid'

export async function createWhiteboard(): Promise<Whiteboard> {
  const id = uuidv4()
  const now = new Date()

  const newWhiteboard: Whiteboard = {
    id,
    type: 'whiteboard',
    name: '新白板',
    description: '',
    createdAt: now,
    updatedAt: now,
    items: [],
    parentId: undefined
  }

  try {
    await db('whiteboards').insert({
      ...newWhiteboard,
      items: JSON.stringify(newWhiteboard.items)
    })
    return newWhiteboard
  } catch (error) {
    console.error('后端→ 创建白板失败:', error)
    throw error
  }
}

export async function getWhiteboardById(id: string): Promise<Whiteboard | undefined> {
  const whiteboard = await db('whiteboards').where('id', id).first()
  if (!whiteboard) return undefined

  return {
    ...whiteboard,
    items: JSON.parse(whiteboard.items)
  }
}

export async function updateWhiteboard(whiteboard: Whiteboard): Promise<void> {
  await db('whiteboards')
    .where('id', whiteboard.id)
    .update({
      ...whiteboard,
      items: JSON.stringify(whiteboard.items),
      updatedAt: new Date()
    })
}

export async function deleteWhiteboard(id: string): Promise<void> {
  await db('whiteboards').where('id', id).delete()
}

export async function addItemToWhiteboard(
  whiteboardId: string,
  item: WhiteboardItem
): Promise<void> {
  const whiteboard = await getWhiteboardById(whiteboardId)
  if (!whiteboard) throw new Error('Whiteboard not found')

  whiteboard.items.push(item)
  await updateWhiteboard(whiteboard)
}
