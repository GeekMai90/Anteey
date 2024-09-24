import { v4 as uuidv4 } from 'uuid'
import { db } from './config' // 假设你有一个 db 模块来处理数据库连接
import type {
  CreateWhiteboardInput,
  CreateWhiteboardNoteInput,
  Whiteboard,
  WhiteboardItem,
  WhiteboardNote
} from '../renderer/src/types/Note'
import { createNote } from './notes'

// 辅助函数：处理白板数据
function processWhiteboardData(whiteboard: any): Whiteboard {
  return {
    ...whiteboard,
    position: JSON.parse(whiteboard.position),
    items: JSON.parse(whiteboard.items),
    size: whiteboard.size ? JSON.parse(whiteboard.size) : null,
    createdAt: new Date(whiteboard.createdAt),
    updatedAt: new Date(whiteboard.updatedAt)
  }
}

export async function createWhiteboard(input: CreateWhiteboardInput): Promise<Whiteboard> {
  const id = uuidv4()
  const now = new Date().toISOString() // 确保日期格式正确

  const newWhiteboard: Whiteboard = {
    id,
    name: input.name || '新白板',
    description: input.description || '',
    createdAt: new Date(now),
    updatedAt: new Date(now),
    items: [],
    position: input.position,
    size: input.size,
    parentId: input.parentId ?? undefined, // 确保 parentId 是 undefined
    isRoot: input.isRoot,
    isStarred: input.isStarred || false,
    starredOrder: input.starredOrder || undefined // 确保 starredOrder 是undefined
  }

  try {
    await db('whiteboards').insert({
      ...newWhiteboard,
      items: JSON.stringify(newWhiteboard.items), // 确保 items 字段是一个 JSON 字符串
      position: JSON.stringify(newWhiteboard.position), // 确保 position 字段是一个 JSON 字符串
      size: newWhiteboard.size ? JSON.stringify(newWhiteboard.size) : null // 确保 size 字段是一个 JSON 字符串或 null
    })
    return newWhiteboard
  } catch (error) {
    console.error('后端→ 创建白板失败:', error)
    throw error
  }
}

// 获取所有顶层白板
// 顶层白板是指没有父白板的白板，isRoot 为 true
export async function getTopLevelWhiteboards(): Promise<Whiteboard[]> {
  try {
    console.log('开始获取顶层白板')
    const whiteboards = await db('whiteboards').where({ isRoot: true })

    // 处理返回的数据
    // const processedWhiteboards = whiteboards.map((whiteboard: any) => ({
    //   ...whiteboard,
    //   position: JSON.parse(whiteboard.position),
    //   items: JSON.parse(whiteboard.items),
    //   size: whiteboard.size ? JSON.parse(whiteboard.size) : null
    // }))
    const processedWhiteboards = whiteboards.map(processWhiteboardData)

    console.log('获取顶层白板成功', processedWhiteboards)
    return processedWhiteboards
  } catch (error) {
    console.error('后端→ 获取顶层白板失败:', error)
    throw error
  }
}

// 更新白板位置
export async function updateWhiteboardPosition(
  id: string,
  x: number,
  y: number
): Promise<Whiteboard> {
  try {
    const updatedWhiteboard = await db('whiteboards')
      .where({ id })
      .update({
        position: JSON.stringify({ x, y })
      })
      .returning('*')

    return processWhiteboardData(updatedWhiteboard[0])
  } catch (error) {
    console.error('后端→ 更新白板位置失败:', error)
    throw error
  }
}

// 更新白板项位置
export async function updateWhiteboardItemPosition(
  id: string,
  x: number,
  y: number
): Promise<WhiteboardItem> {
  try {
    const updatedItem = await db('whiteboard_items')
      .where({ id })
      .update({
        position: JSON.stringify({ x, y })
      })
      .returning('*')

    return processWhiteboardItemData(updatedItem[0])
  } catch (error) {
    console.error('后端→ 更新白板项位置失败:', error)
    throw error
  }
}

// 辅助函数：处理不同类型的 WhiteboardItem
function processWhiteboardItemData(item: any): WhiteboardItem {
  switch (item.type) {
    case 'note':
      return {
        ...item,
        position: JSON.parse(item.position),
        size: JSON.parse(item.size)
        // 其他 note 类型特有的处理
      }
    case 'subboard':
      return {
        ...item,
        position: JSON.parse(item.position),
        size: JSON.parse(item.size)
        // 其他 subboard 类型特有的处理
      }
    case 'group':
      return {
        ...item,
        position: JSON.parse(item.position),
        size: JSON.parse(item.size)
        // 其他 group 类型特有的处理
      }
    case 'connection':
      return {
        ...item,
        position: JSON.parse(item.position)
        // 其他 connection 类型特有的处理
      }
    default:
      throw new Error(`未知的 WhiteboardItem 类型: ${item.type}`)
  }
}

// 创建白板笔记
// 分成两个步骤，首先是创建一个卡片笔记，得到这个卡片笔记的 id
// 然后，将这个卡片笔记的 id 作为参数，创建一个白板笔记
export async function createWhiteboardNote(
  input: CreateWhiteboardNoteInput
): Promise<WhiteboardNote> {
  const note = await createNote()
  const newWhiteboardNote: WhiteboardNote = {
    id: uuidv4(),
    type: 'note',
    noteId: note.id,
    position: input.position,
    size: input.size,
    zIndex: input.zIndex,
    rotation: input.rotation
  }
  await db('whiteboard_items').insert({
    ...newWhiteboardNote,
    position: JSON.stringify(newWhiteboardNote.position),
    size: JSON.stringify(newWhiteboardNote.size),
    whiteboardId: input.whiteboardId
  })
  // 从数据库中获取刚插入的记录
  const [insertedNote] = await db('whiteboard_items')
    .where({ id: newWhiteboardNote.id })
    .select('*')

  // 将 JSON 字符串转换回对象
  return {
    ...insertedNote,
    position: JSON.parse(insertedNote.position),
    size: JSON.parse(insertedNote.size)
  }
}

// 获取白板上的所有白板项
// 通过白板ID获取白板内容，返回白板内容的数组

// 获取白板上的所有白板项
export async function getWhiteboardItems(whiteboardId: string): Promise<WhiteboardItem[]> {
  try {
    const items = await db('whiteboard_items').where({ whiteboardId }).select('*')

    return items.map((item) => ({
      ...item,
      position: JSON.parse(item.position),
      size: JSON.parse(item.size)
    })) as WhiteboardItem[]
  } catch (error) {
    console.error('后端→ 获取白板内容失败:', error)
    throw error
  }
}
