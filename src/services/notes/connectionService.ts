// src/services/notes/connections.ts

import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import { Connection, ConnectionCreateData, ConnectionUpdateData } from '@shared/types'

// 创建连线
// 需要输入白板id，起点项目id，终点项目id，起点坐标，终点坐标，描述
export async function createConnection(connection: ConnectionCreateData): Promise<Connection> {
  try {
    const newConnection = {
      id: uuidv4(),
      ...connection,
      startPoint: JSON.stringify(connection.startPoint),
      endPoint: JSON.stringify(connection.endPoint)
    }
    await db('connections').insert(newConnection)
    return processConnectionData(newConnection)
  } catch (error) {
    console.error('Error creating connection:', error)
    throw error
  }
}

// 辅助处理函数
function processConnectionData(item: any): Connection {
  return {
    ...item,
    startPoint: JSON.parse(item.startPoint),
    endPoint: JSON.parse(item.endPoint)
  }
}

// 更新连线
export async function updateConnection(connection: ConnectionUpdateData): Promise<Connection> {
  try {
    const updatedConnection = await db('connections')
      .where({ id: connection.id })
      .update({
        startPoint: JSON.stringify(connection.startPoint),
        endPoint: JSON.stringify(connection.endPoint),
        description: connection.description || null
      })
      .returning('*')
    return processConnectionData(updatedConnection[0])
  } catch (error) {
    console.error('Error updating connection:', error)
    throw error
  }
}

// 获取白板上的所有连线
export async function getConnectionsByWhiteboardId(whiteboardId: string): Promise<Connection[]> {
  try {
    const connections = await db('connections').where({ whiteboardId })
    return connections.map(processConnectionData)
  } catch (error) {
    console.error('Error getting connections by whiteboardId:', error)
    throw error
  }
}

// 删除连线
export async function deleteConnection(id: string): Promise<boolean> {
  try {
    console.log('后端→ 删除连线', id)
    await db('connections').where({ id }).del()
    console.log('后端→ 删除连线成功')
    return true
  } catch (error) {
    console.error('Error deleting connection:', error)
    throw error
  }
}

// 更新连线描述
// export async function updateConnectionDescription(
//   id: string,
//   description: string | null
// ): Promise<Connection> {
//   try {
//     console.log('后端→ 更新连线描述', id, description)
//     const updatedConnection = await db('connections')
//       .where({ id })
//       .update({ description })
//       .returning('*')
//     return processConnectionData(updatedConnection[0])
//   } catch (error) {
//     console.error('Error updating connection description:', error)
//     throw error
//   }
// }
export async function updateConnectionDescription(
  id: string,
  description: string | null
): Promise<Connection> {
  try {
    console.log('后端→ 开始更新连线描述', id, description)

    // 首先检查连接是否存在
    const existingConnection = await db('connections').where({ id }).first()
    if (!existingConnection) {
      throw new Error(`Connection with id ${id} not found`)
    }

    // 处理空字符串的情况
    const updatedDescription = description === '' ? null : description

    console.log('后端→ 执行更新操作', id, updatedDescription)

    const updatedConnection = await db('connections')
      .where({ id })
      .update({ description: updatedDescription })
      .returning('*')

    console.log('后端→ 更新操作完成', updatedConnection)

    if (!updatedConnection || updatedConnection.length === 0) {
      throw new Error(`Failed to update connection with id ${id}`)
    }

    const processedConnection = processConnectionData(updatedConnection[0])
    console.log('后端→ 返回处理后的连接数据', processedConnection)

    return processedConnection
  } catch (error) {
    console.error('Error updating connection description:', error)
    throw error
  }
}
