import { v4 as uuidv4 } from 'uuid'
import { db } from './config' // 假设你有一个 db 模块来处理数据库连接
import type {
  CreateWhiteboardInput,
  CreateWhiteboardNoteInput,
  Whiteboard,
  WhiteboardItem,
  WhiteboardNote,
  WhiteboardSubboard,
  WhiteboardGroup,
  Connection,
  RootWhiteboard
} from '../renderer/src/types/Note'
import { createNote } from './notes'

// 辅助函数：处理白板数据
function processWhiteboardData(whiteboard: any): Whiteboard {
  return {
    id: whiteboard.id,
    name: whiteboard.name,
    description: whiteboard.description,
    createdAt: new Date(whiteboard.createdAt),
    updatedAt: new Date(whiteboard.updatedAt),
    items: JSON.parse(whiteboard.items) as WhiteboardItem[],
    position: JSON.parse(whiteboard.position),
    size: JSON.parse(whiteboard.size),
    parentId: whiteboard.parentId,
    isRoot: whiteboard.isRoot,
    isStarred: whiteboard.isStarred,
    starredOrder: whiteboard.starredOrder,
    zoomLevel: whiteboard.zoomLevel,
    scrollPosition: whiteboard.scrollPosition ? JSON.parse(whiteboard.scrollPosition) : undefined,
    scale: whiteboard.scale,
    translateX: whiteboard.translateX,
    translateY: whiteboard.translateY
  }
}

//创建根白板
export async function createRootWhiteboard(): Promise<RootWhiteboard> {
  const id = uuidv4()
  const now = new Date()

  const newRootWhiteboard: RootWhiteboard = {
    id,
    createdAt: now,
    updatedAt: now,
    items: [],
    zoomLevel: 1,
    scrollPosition: { x: 0, y: 0 },
    scale: 1,
    translateX: 0,
    translateY: 0
  }

  try {
    await db('root_whiteboards').insert({
      ...newRootWhiteboard,
      scrollPosition: JSON.stringify(newRootWhiteboard.scrollPosition),
      items: JSON.stringify(newRootWhiteboard.items)
    })
    return newRootWhiteboard
  } catch (error) {
    console.error('后端→ 创建根白板失败:', error)
    throw error
  }
}

// 获取根白板
export async function getRootWhiteboard(): Promise<RootWhiteboard> {
  try {
    const rootWhiteboard = await db('root_whiteboards').select('*').first()
    return rootWhiteboard
      ? {
          ...rootWhiteboard,
          items: JSON.parse(rootWhiteboard.items),
          scrollPosition: JSON.parse(rootWhiteboard.scrollPosition)
        }
      : null
  } catch (error) {
    console.error('后端→ 获取根白板失败:', error)
    throw error
  }
}

//将视图状态保存到根白板
export async function saveViewStateToRootWhiteboard(
  scale: number,
  translateX: number,
  translateY: number
) {
  try {
    await db('root_whiteboards')
      .update({
        scale,
        translateX,
        translateY
      })
      .returning('*')

    return true
  } catch (error) {
    console.error('后端→ 保存视图状态到根白板失败:', error)
    throw error
  }
}

// 获取根白板的视图状态
export async function getRootWhiteboardViewState(): Promise<{
  scale: number
  translateX: number
  translateY: number
}> {
  try {
    const rootWhiteboard = await db('root_whiteboards').select('*').first()
    return {
      scale: rootWhiteboard.scale as number,
      translateX: rootWhiteboard.translateX as number,
      translateY: rootWhiteboard.translateY as number
    }
  } catch (error) {
    console.error('后端→ 获取根白板的视图状态失败:', error)
    throw error
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
    size: input.size || { width: 200, height: 200 },
    parentId: input.parentId ?? undefined, // 确保 parentId 是 undefined
    isRoot: input.isRoot,
    isStarred: input.isStarred || false,
    starredOrder: input.starredOrder || undefined, // 确保 starredOrder 是undefined
    zoomLevel: input.zoomLevel || 1,
    scrollPosition: input.scrollPosition || { x: 0, y: 0 },
    scale: input.scale || 1,
    translateX: input.translateX || 0,
    translateY: input.translateY || 0
  }

  try {
    await db('whiteboards').insert({
      ...newWhiteboard,
      items: JSON.stringify(newWhiteboard.items), // 确保 items 字段是一个 JSON 字符串
      position: JSON.stringify(newWhiteboard.position), // 确保 position 字段是一个 JSON 字符串
      size: newWhiteboard.size ? JSON.stringify(newWhiteboard.size) : null, // 确保 size 字段是一个 JSON 字符串或 null
      scrollPosition: JSON.stringify(newWhiteboard.scrollPosition)
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
    console.log('更新白板位置', id, x, y)
    const updatedWhiteboard = await db('whiteboards')
      .where({ id })
      .update({
        position: JSON.stringify({ x, y })
      })
      .returning('*')
    console.log('更新白板位置成功', updatedWhiteboard)
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
    const position = { x, y }
    const positionJson = JSON.stringify(position)
    console.log('后端→ 开始更新白板项位置', id, positionJson)

    const updatedItems = await db('whiteboard_items')
      .where({ id })
      .update({
        position: positionJson
      })
      .returning('*')

    if (!updatedItems || updatedItems.length === 0) {
      throw new Error(`未找到ID为 ${id} 的白板项`)
    }

    const updatedItem = updatedItems[0]
    console.log('后端→ 更新白板项位置成功', updatedItem)

    return processWhiteboardItemData(updatedItem)
  } catch (error) {
    console.error('后端→ 更新白板项位置失败:', error)
    throw error
  }
}

// 辅助函数：处理不同类型的 WhiteboardItem
// function processWhiteboardItemData(item: any): WhiteboardItem {
//   switch (item.type) {
//     case 'note':
//       return {
//         ...item,
//         position: JSON.parse(item.position),
//         size: JSON.parse(item.size)
//         // 其他 note 类型特有的处理
//       }
//     case 'subboard':
//       return {
//         ...item,
//         position: JSON.parse(item.position),
//         size: JSON.parse(item.size)
//         // 其他 subboard 类型特有的处理
//       }
//     case 'group':
//       return {
//         ...item,
//         position: JSON.parse(item.position),
//         size: JSON.parse(item.size)
//         // 其他 group 类型特有的处理
//       }
//     case 'connection':
//       return {
//         ...item,
//         position: JSON.parse(item.position)
//         // 其他 connection 类型特有的处理
//       }
//     default:
//       throw new Error(`未知的 WhiteboardItem 类型: ${item.type}`)
//   }
// }
function processWhiteboardItemData(item: any): WhiteboardItem {
  if (!item || typeof item !== 'object') {
    console.error('无效的白板项数据:', item)
    throw new Error('无效的白板项数据')
  }

  const baseItem = {
    id: item.id,
    position: JSON.parse(item.position),
    zIndex: item.zIndex,
    rotation: item.rotation
  }

  switch (item.type) {
    case 'note':
      return {
        ...baseItem,
        type: 'note',
        noteId: item.noteId,
        size: JSON.parse(item.size)
      } as WhiteboardNote

    case 'subboard':
      return {
        ...baseItem,
        type: 'subboard',
        whiteboardId: item.whiteboardId,
        size: JSON.parse(item.size)
      } as WhiteboardSubboard

    case 'group':
      return {
        ...baseItem,
        type: 'group',
        name: item.name,
        itemIds: JSON.parse(item.itemIds),
        size: JSON.parse(item.size),
        style: item.style ? JSON.parse(item.style) : undefined
      } as WhiteboardGroup

    case 'connection':
      return {
        ...baseItem,
        type: 'connection',
        startItemId: item.startItemId,
        endItemId: item.endItemId,
        startEdge: item.startEdge,
        endEdge: item.endEdge,
        color: item.color,
        thickness: item.thickness,
        label: item.label,
        labelPosition: item.labelPosition ? JSON.parse(item.labelPosition) : undefined,
        lineStyle: item.lineStyle,
        startArrow: item.startArrow,
        endArrow: item.endArrow,
        lineShape: item.lineShape,
        controlPoints: item.controlPoints ? JSON.parse(item.controlPoints) : undefined,
        size: JSON.parse(item.size)
      } as Connection

    default:
      console.error('未知的 WhiteboardItem 类型:', item.type)
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
