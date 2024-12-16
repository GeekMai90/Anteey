import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import type {
  MindBoard,
  TextCard,
  NoteCard,
  ImageCard,
  Group,
  MindBoardConnection,
  ConnectionStyle
} from '../../renderer/src/types/mindboard'

// 思维板基础操作
export async function createMindBoard(data: Partial<MindBoard>): Promise<MindBoard> {
  const id = uuidv4()
  const now = Date.now()

  const newBoard = {
    id,
    name: data.name || '未命名思维板',
    description: data.description,
    viewState: JSON.stringify(
      data.viewState || {
        scale: 1,
        translateX: 0,
        translateY: 0
      }
    ),
    isStarred: false,
    starredOrder: null,
    createdAt: now,
    updatedAt: now
  }

  await db('mind_boards').insert(newBoard)
  return {
    ...newBoard,
    viewState: JSON.parse(newBoard.viewState),
    elements: [],
    connections: []
  }
}

export async function getMindBoard(id: string): Promise<MindBoard | null> {
  const board = await db('mind_boards').where({ id }).first()
  if (!board) return null

  // 获取所有元素
  const elements = await db('mind_board_elements').where({ boardId: id })

  // 获取所有连接
  const connections = await db('mind_board_connections').where({ boardId: id })

  return {
    ...board,
    viewState: JSON.parse(board.viewState),
    elements: elements.map((el) => ({
      ...el,
      position: JSON.parse(el.position),
      size: JSON.parse(el.size),
      style: el.style ? JSON.parse(el.style) : undefined,
      memberIds: el.memberIds ? JSON.parse(el.memberIds) : undefined
    })),
    connections: connections.map((conn) => ({
      ...conn,
      style: conn.style ? (JSON.parse(conn.style) as ConnectionStyle) : undefined
    }))
  }
}

// 元素操作
export async function createMindBoardElement(
  boardId: string,
  element: TextCard | NoteCard | ImageCard | Group
) {
  const now = Date.now()
  const id = uuidv4()

  // 基础数据
  const baseData = {
    id,
    boardId,
    type: element.type,
    position: JSON.stringify(element.position),
    size: JSON.stringify(element.size),
    rotation: element.rotation || 0,
    zIndex: element.zIndex,
    createdAt: now,
    updatedAt: now
  }

  // 根据元素类型添加特定属性
  let specificData = {}
  switch (element.type) {
    case 'text':
      specificData = {
        content: (element as TextCard).content,
        style: JSON.stringify((element as TextCard).style)
      }
      break
    case 'note':
      specificData = {
        noteId: (element as NoteCard).noteId
      }
      break
    case 'image':
      specificData = {
        imageId: (element as ImageCard).imageId
      }
      break
    case 'group':
      specificData = {
        name: (element as Group).name,
        memberIds: JSON.stringify((element as Group).memberIds),
        style: JSON.stringify((element as Group).style)
      }
      break
  }

  const elementData = {
    ...baseData,
    ...specificData
  }

  await db('mind_board_elements').insert(elementData)

  // 返回处理后的数据
  return {
    ...elementData,
    position: JSON.parse(elementData.position) as { x: number; y: number },
    size: JSON.parse(elementData.size) as { width: number; height: number },
    style:
      'style' in elementData
        ? (JSON.parse(elementData.style as string) as Record<string, unknown>)
        : undefined,
    memberIds:
      'memberIds' in elementData
        ? (JSON.parse(elementData.memberIds as string) as string[])
        : undefined
  }
}

// 连接操作
export async function createMindBoardConnection(
  boardId: string,
  connection: Omit<MindBoardConnection, 'id'>
): Promise<MindBoardConnection> {
  const now = Date.now()
  const id = uuidv4()

  const connectionData = {
    id,
    boardId,
    fromId: connection.fromId,
    toId: connection.toId,
    label: connection.label,
    style: connection.style ? JSON.stringify(connection.style) : null,
    createdAt: now,
    updatedAt: now
  }

  await db('mind_board_connections').insert(connectionData)
  return {
    ...connectionData,
    style: connectionData.style ? (JSON.parse(connectionData.style) as ConnectionStyle) : undefined
  }
}

// 更新思维板
export async function updateMindBoard(
  id: string,
  updateData: Partial<MindBoard>
): Promise<MindBoard> {
  const now = Date.now()
  const data = {
    ...updateData,
    viewState: updateData.viewState ? JSON.stringify(updateData.viewState) : undefined,
    updatedAt: now
  }

  const [updatedBoard] = await db('mind_boards').where({ id }).update(data).returning('*')

  if (!updatedBoard) {
    throw new Error(`思维板不存在: ${id}`)
  }

  const board = await getMindBoard(id)
  if (!board) {
    throw new Error(`更新后无法获取思维板: ${id}`)
  }
  return board
}

// 更新元素
export async function updateMindBoardElement(
  id: string,
  updateData: Partial<TextCard | NoteCard | ImageCard | Group>
): Promise<TextCard | NoteCard | ImageCard | Group> {
  const now = Date.now()
  const data = {
    ...updateData,
    position: updateData.position ? JSON.stringify(updateData.position) : undefined,
    size: updateData.size ? JSON.stringify(updateData.size) : undefined,
    style: 'style' in updateData ? JSON.stringify(updateData.style) : undefined,
    memberIds: 'memberIds' in updateData ? JSON.stringify(updateData.memberIds) : undefined,
    updatedAt: now
  }

  const [updatedElement] = await db('mind_board_elements').where({ id }).update(data).returning('*')

  if (!updatedElement) {
    throw new Error(`元素不存在: ${id}`)
  }

  return {
    ...updatedElement,
    position: JSON.parse(updatedElement.position),
    size: JSON.parse(updatedElement.size),
    style: updatedElement.style ? JSON.parse(updatedElement.style) : undefined,
    memberIds: updatedElement.memberIds ? JSON.parse(updatedElement.memberIds) : undefined
  }
}

// 更新连接
export async function updateMindBoardConnection(
  id: string,
  updateData: Partial<MindBoardConnection>
): Promise<MindBoardConnection> {
  const now = Date.now()
  const data = {
    ...updateData,
    style: updateData.style ? JSON.stringify(updateData.style) : undefined,
    updatedAt: now
  }

  const [updatedConnection] = await db('mind_board_connections')
    .where({ id })
    .update(data)
    .returning('*')

  if (!updatedConnection) {
    throw new Error(`连接不存在: ${id}`)
  }

  return {
    ...updatedConnection,
    style: updatedConnection.style ? JSON.parse(updatedConnection.style) : undefined
  }
}

// 删除思维板
export async function deleteMindBoard(id: string): Promise<void> {
  const deleted = await db('mind_boards').where({ id }).delete()
  if (!deleted) {
    throw new Error(`思维板不存在: ${id}`)
  }
}

// 删除元素
export async function deleteMindBoardElement(id: string): Promise<void> {
  const deleted = await db('mind_board_elements').where({ id }).delete()
  if (!deleted) {
    throw new Error(`元素不存在: ${id}`)
  }
}

// 删除连接
export async function deleteMindBoardConnection(id: string): Promise<void> {
  const deleted = await db('mind_board_connections').where({ id }).delete()
  if (!deleted) {
    throw new Error(`连接不存在: ${id}`)
  }
}

// 获取所有思维板
export async function getAllMindBoards(): Promise<MindBoard[]> {
  const boards = await db('mind_boards')
    .select('*')
    .orderBy([
      { column: 'isStarred', order: 'desc' },
      { column: 'starredOrder', order: 'asc' },
      { column: 'updatedAt', order: 'desc' }
    ])

  const mindBoards = await Promise.all(
    boards.map(async (board) => {
      const mindBoard = await getMindBoard(board.id)
      if (!mindBoard) {
        throw new Error(`无法获取思维板: ${board.id}`)
      }
      return mindBoard
    })
  )

  return mindBoards
}

// 更多方法...
