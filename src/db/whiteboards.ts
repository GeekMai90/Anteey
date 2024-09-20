// src/db/whiteboards.ts

import { db } from './config'
import { Whiteboard, WhiteboardItem } from '../renderer/src/types/Note'

export async function createWhiteboard(whiteboard: Whiteboard): Promise<string> {
  await db('whiteboards').insert({
    ...whiteboard,
    items: JSON.stringify(whiteboard.items)
  })
  return whiteboard.id
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
