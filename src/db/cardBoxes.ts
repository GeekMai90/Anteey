// src/db/cardBoxes.ts

import { db } from './config'
import { CardBox } from '../renderer/src/types/Note'

export async function createCardBox(cardBox: CardBox): Promise<string> {
  await db('cardBoxes').insert(cardBox)
  return cardBox.id
}

export async function getCardBoxById(id: string): Promise<CardBox | undefined> {
  return await db('cardBoxes').where('id', id).first()
}

export async function updateCardBox(cardBox: CardBox): Promise<void> {
  await db('cardBoxes')
    .where('id', cardBox.id)
    .update({
      ...cardBox,
      updatedAt: new Date()
    })
}

export async function deleteCardBox(id: string): Promise<void> {
  await db('cardBoxes').where('id', id).delete()
}
