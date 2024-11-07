// src/db/cardBoxes.ts

import { db } from './config'
import { CardBox } from '../renderer/src/types/Note'
import { v4 as uuidv4 } from 'uuid'

// 创建卡片盒
// 接收一个卡片盒的name，返回一个卡片盒
export async function createCardBox(name: string): Promise<CardBox> {
  const newCardBox: CardBox = {
    id: uuidv4(),
    type: 'cardbox',
    name: name,
    description: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    noteIds: [],
    parentId: '',
    isStarred: false,
    starredOrder: 0,
    isPinned: false,
    pinnedOrder: 0
  }
  // 返回新创建的卡片盒
  const result = await db('cardboxes')
    .insert({
      ...newCardBox,
      noteIds: JSON.stringify(newCardBox.noteIds)
    })
    .returning('id')
  return result[0] as CardBox
}

// 获取所有卡片盒
export async function getAllCardBoxes(): Promise<CardBox[]> {
  // 从数据库中选择所有 cardBoxes 表的数据
  const cardBoxes = await db('cardBoxes').select('*')
  // 对每个卡片盒进行处理并返回处理后的数组
  return cardBoxes.map((cardBox) => ({
    ...cardBox,
    noteIds: JSON.parse(cardBox.noteIds) // 将 noteIds 从 JSON 字符串解析为 JavaScript 对象或数组
  }))
}
// 更新卡片盒
//接收一个卡片盒id,和一个name，更新卡片盒
export async function updateCardBox(id: string, name: string): Promise<CardBox | undefined> {
  const updatedCardBox = await db('cardBoxes')
    .where('id', id)
    .update({
      name: name,
      updatedAt: new Date()
    })
    .returning('*')
  return updatedCardBox[0] as CardBox
}

export async function getCardBoxById(id: string): Promise<CardBox | undefined> {
  return await db('cardBoxes').where('id', id).first()
}

// 删除卡片盒
// 接收一个卡片盒 id，然后找到所有包含该卡片盒 id 的笔记，删除这些笔记中的 cardBoxId，然后删除该卡片盒
export async function deleteCardBox(id: string): Promise<void> {
  try {
    // 删除卡片盒中的所有笔记
    await db('notes').where('cardBoxId', id).update({ cardBoxId: '' })
    console.log('后端→删除卡片盒中的所有笔记', id)
    // 删除卡片盒
    await db('cardBoxes').where('id', id).delete()
    console.log('后端→删除卡片盒', id)
  } catch (error) {
    console.error('后端→删除卡片盒失败:', error)
    throw error
  }
}
