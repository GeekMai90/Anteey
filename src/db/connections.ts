// src/db/connections.ts

import { db } from './config'
import { v4 as uuidv4 } from 'uuid'
import { Connection, ConnectionCreateData, ConnectionUpdateData } from '@renderer/types/Note'

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
    await db('connections').where({ id }).del()
    return true
  } catch (error) {
    console.error('Error deleting connection:', error)
    throw error
  }
}
