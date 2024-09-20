// src/db/connections.ts

import { db } from './config'
import { Connection } from '../renderer/src/types/Note'

export async function createConnection(connection: Connection): Promise<string> {
  await db('connections').insert({
    ...connection,
    style: JSON.stringify(connection.style)
  })
  return connection.id
}

export async function getConnectionById(id: string): Promise<Connection | undefined> {
  const connection = await db('connections').where('id', id).first()
  if (!connection) return undefined

  return {
    ...connection,
    style: JSON.parse(connection.style)
  }
}

export async function updateConnection(connection: Connection): Promise<void> {
  await db('connections')
    .where('id', connection.id)
    .update({
      ...connection,
      style: JSON.stringify(connection.style)
    })
}

export async function deleteConnection(id: string): Promise<void> {
  await db('connections').where('id', id).delete()
}
