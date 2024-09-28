// src/db/connections.ts

import { db } from './config'
import { v4 as uuidv4 } from 'uuid'

export interface Connection {
  id: string
  type: 'connection'
  startItemId: string // 起点项目的ID
  endItemId: string // 终点项目的ID
  startEdge: 'top' | 'right' | 'bottom' | 'left' // 起点边
  endEdge: 'top' | 'right' | 'bottom' | 'left' // 终点边
  color?: string // 连线颜色
  thickness?: number // 连线粗细
  label?: string // 连线中的文字内容
  labelPosition?: { x: number; y: number } // 新增：标签位置
  lineStyle?: 'solid' | 'dashed' // 连线样式
  startArrow?: boolean // 起点是否有箭头，默认false
  endArrow?: boolean // 终点是否有箭头，默认true
  lineShape?: 'straight' | 'curved' | 'angled' // 连线形状
  position: { x: number; y: number } // 新增：连线的位置
  controlPoints?: { x: number; y: number }[] // 新增：控制点，用于调整连线形状
  zIndex: number // 新增：用于控制连线的层级
  size: { width: number; height: number }
  rotation: number
}

// 创建连线
export async function createConnection(connection: Omit<Connection, 'id'>): Promise<Connection> {
  try {
    const newConnection = {
      id: uuidv4(),
      ...connection,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await db('connections').insert({
      ...newConnection,
      labelPosition: JSON.stringify(newConnection.labelPosition),
      position: JSON.stringify(newConnection.position),
      controlPoints: JSON.stringify(newConnection.controlPoints),
      size: JSON.stringify(newConnection.size)
    })
    console.log('后端→ 创建连线成功:', newConnection)
    return newConnection
  } catch (error) {
    console.error('后端→ 创建连线失败:', error)
    throw error
  }
}

// 获取白板上的所有连线
export async function getConnectionsByWhiteboardId(whiteboardId: string): Promise<Connection[]> {
  try {
    const connections = await db('connections').where({ whiteboardId }).select('*')
    return connections.map((connection) => ({
      ...connection,
      labelPosition: JSON.parse(connection.labelPosition),
      position: JSON.parse(connection.position),
      controlPoints: JSON.parse(connection.controlPoints),
      size: JSON.parse(connection.size)
    }))
  } catch (error) {
    console.error('后端→ 获取白板上的所有连线失败:', error)
    throw error
  }
}

// // 获取白板上的所有连线
// export async function getConnectionsByWhiteboardId(whiteboardId: string): Promise<Connection[]> {
//   try {
//     const connections = await db('connections').where({ whiteboardId }).select('*')
//     return connections.map((connection) => ({
//       ...connection,
//       labelPosition: JSON.parse(connection.labelPosition),
//       position: JSON.parse(connection.position),
//       controlPoints: JSON.parse(connection.controlPoints),
//       size: JSON.parse(connection.size)
//     }))
//   } catch (error) {
//     console.error('后端→ 获取白板上的所有连线失败:', error)
//     throw error
//   }
// }
