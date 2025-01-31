import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import { MindboardNodeType } from '@shared/types/mindboard'
import type {
  Mindboard,
  MindboardNode,
  MindboardEdge,
  TextMindboardNode,
  NoteMindboardNode,
  ImageMindboardNode
} from '@shared/types/mindboard'

// 工具函数：转换思维板数据
function convertMindboardData(record: any): Mindboard {
  return {
    ...record,
    viewport: JSON.parse(record.viewport)
  }
}

// 工具函数：转换节点数据
function convertNodeData(record: any): MindboardNode {
  const baseNode = {
    id: record.id,
    mindboard_id: record.mindboard_id,
    parent_id: record.parent_id,
    type: record.type as MindboardNodeType,
    position: JSON.parse(record.position),
    draggable: record.draggable,
    selected: record.selected,
    created_at: record.created_at,
    updated_at: record.updated_at
  }

  const data = JSON.parse(record.data)

  switch (record.type) {
    case MindboardNodeType.TEXT:
      return {
        ...baseNode,
        type: MindboardNodeType.TEXT,
        data
      } as TextMindboardNode

    case MindboardNodeType.NOTE:
      return {
        ...baseNode,
        type: MindboardNodeType.NOTE,
        data
      } as NoteMindboardNode

    case MindboardNodeType.IMAGE:
      return {
        ...baseNode,
        type: MindboardNodeType.IMAGE,
        data
      } as ImageMindboardNode

    default:
      throw new Error(`未知的节点类型: ${record.type}`)
  }
}

// 获取所有思维板
export async function getAllMindboards(): Promise<Mindboard[]> {
  try {
    const mindboards = await db('mindboards').select('*').orderBy('updated_at', 'desc')

    return mindboards.map(convertMindboardData)
  } catch (error) {
    console.error('获取所有思维板失败:', error)
    throw error
  }
}

// 思维板操作
export async function createMindboard(
  data: Omit<Mindboard, 'id' | 'created_at' | 'updated_at'>
): Promise<Mindboard> {
  try {
    const now = new Date()
    const id = uuidv4()

    const [mindboard] = await db('mindboards')
      .insert({
        id,
        name: data.name,
        description: data.description,
        viewport: JSON.stringify(data.viewport),
        created_at: now,
        updated_at: now
      })
      .returning('*')

    return {
      ...mindboard,
      viewport: JSON.parse(mindboard.viewport)
    }
  } catch (error) {
    console.error('创建思维板失败:', error)
    throw error
  }
}

export async function getMindboard(id: string): Promise<Mindboard> {
  try {
    const mindboard = await db('mindboards').where({ id }).first()
    if (!mindboard) {
      throw new Error(`思维板不存在: ${id}`)
    }

    return {
      ...mindboard,
      viewport: JSON.parse(mindboard.viewport)
    }
  } catch (error) {
    console.error('获取思维板失败:', error)
    throw error
  }
}

export async function updateMindboard(id: string, data: Partial<Mindboard>): Promise<Mindboard> {
  try {
    const updateData: any = {
      ...data,
      updated_at: new Date()
    }

    if (data.viewport) {
      updateData.viewport = JSON.stringify(data.viewport)
    }

    const [mindboard] = await db('mindboards').where({ id }).update(updateData).returning('*')

    return {
      ...mindboard,
      viewport: JSON.parse(mindboard.viewport)
    }
  } catch (error) {
    console.error('更新思维板失败:', error)
    throw error
  }
}

export async function deleteMindboard(id: string): Promise<void> {
  try {
    await db.transaction(async (trx) => {
      // 由于设置了级联删除，只需要删除思维板本身
      await trx('mindboards').where({ id }).delete()
    })
  } catch (error) {
    console.error('删除思维板失败:', error)
    throw error
  }
}

// 节点操作
export async function createNode(
  data: Omit<MindboardNode, 'id' | 'created_at' | 'updated_at'>
): Promise<MindboardNode> {
  try {
    const now = new Date()
    const id = uuidv4()

    const [node] = await db('mindboard_nodes')
      .insert({
        id,
        mindboard_id: data.mindboard_id,
        parent_id: data.parent_id,
        type: data.type,
        position: JSON.stringify(data.position),
        draggable: data.draggable,
        selected: data.selected,
        data: JSON.stringify(data.data),
        created_at: now,
        updated_at: now
      })
      .returning('*')

    return convertNodeData(node)
  } catch (error) {
    console.error('创建节点失败:', error)
    throw error
  }
}

export async function getNodes(mindboardId: string): Promise<MindboardNode[]> {
  try {
    const nodes = await db('mindboard_nodes').where({ mindboard_id: mindboardId })
    return nodes.map(convertNodeData)
  } catch (error) {
    console.error('获取节点失败:', error)
    throw error
  }
}

export async function updateNode(id: string, data: Partial<MindboardNode>): Promise<MindboardNode> {
  try {
    const updateData: any = {
      ...data,
      updated_at: new Date()
    }

    if (data.position) {
      updateData.position = JSON.stringify(data.position)
    }
    if (data.data) {
      updateData.data = JSON.stringify(data.data)
    }

    const [node] = await db('mindboard_nodes').where({ id }).update(updateData).returning('*')

    return convertNodeData(node)
  } catch (error) {
    console.error('更新节点失败:', error)
    throw error
  }
}

export async function deleteNode(id: string): Promise<void> {
  try {
    await db('mindboard_nodes').where({ id }).delete()
  } catch (error) {
    console.error('删除节点失败:', error)
    throw error
  }
}

// 连线操作
export async function createEdge(
  data: Omit<MindboardEdge, 'id' | 'created_at' | 'updated_at'>
): Promise<MindboardEdge> {
  try {
    const now = new Date()
    const id = uuidv4()

    const [edge] = await db('mindboard_edges')
      .insert({
        id,
        mindboard_id: data.mindboard_id,
        source: data.source,
        target: data.target,
        source_handle: data.sourceHandle,
        target_handle: data.targetHandle,
        label: data.label,
        type: data.type,
        style: data.style ? JSON.stringify(data.style) : null,
        created_at: now,
        updated_at: now
      })
      .returning('*')

    return {
      ...edge,
      style: edge.style ? JSON.parse(edge.style) : undefined
    }
  } catch (error) {
    console.error('创建连线失败:', error)
    throw error
  }
}

export async function getEdges(mindboardId: string): Promise<MindboardEdge[]> {
  try {
    const edges = await db('mindboard_edges').where({ mindboard_id: mindboardId })
    return edges.map((edge) => ({
      ...edge,
      style: edge.style ? JSON.parse(edge.style) : undefined
    }))
  } catch (error) {
    console.error('获取连线失败:', error)
    throw error
  }
}

export async function updateEdge(id: string, data: Partial<MindboardEdge>): Promise<MindboardEdge> {
  try {
    const updateData: any = {
      ...data,
      updated_at: new Date()
    }

    if (data.style) {
      updateData.style = JSON.stringify(data.style)
    }

    const [edge] = await db('mindboard_edges').where({ id }).update(updateData).returning('*')

    return {
      ...edge,
      style: edge.style ? JSON.parse(edge.style) : undefined
    }
  } catch (error) {
    console.error('更新连线失败:', error)
    throw error
  }
}

export async function deleteEdge(id: string): Promise<void> {
  try {
    await db('mindboard_edges').where({ id }).delete()
  } catch (error) {
    console.error('删除连线失败:', error)
    throw error
  }
}
