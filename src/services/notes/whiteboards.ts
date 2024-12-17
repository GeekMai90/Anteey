import { v4 as uuidv4 } from 'uuid'
import { db } from '../../db/config'
import type {
  CreateWhiteboardInput,
  CreateWhiteboardNoteInput,
  Whiteboard,
  WhiteboardNote,
  RootWhiteboard,
  WhiteboardGroup,
  Connection,
  WhiteboardTextCard
} from '../../renderer/src/types/Note'
import { createNote } from './notesService'

// 辅助函数：处理白板数据
function processWhiteboardData(whiteboard: any): Whiteboard {
  return {
    id: whiteboard.id,
    name: whiteboard.name,
    description: whiteboard.description,
    createdAt: new Date(whiteboard.createdAt),
    updatedAt: new Date(whiteboard.updatedAt),
    position: JSON.parse(whiteboard.position),
    size: JSON.parse(whiteboard.size),
    parentId: whiteboard.parentId,
    isTopLevel: whiteboard.isTopLevel,
    isStarred: whiteboard.isStarred,
    starredOrder: whiteboard.starredOrder,
    zoomLevel: whiteboard.zoomLevel,
    scrollPosition: whiteboard.scrollPosition ? JSON.parse(whiteboard.scrollPosition) : undefined,
    scale: whiteboard.scale,
    translateX: whiteboard.translateX,
    translateY: whiteboard.translateY
  }
}

// 白板数量
export async function getWhiteboardCount(): Promise<number> {
  try {
    const count = await db('whiteboards').count('* as count').first()
    return count ? (count.count as number) : 0
  } catch (error) {
    console.error('后端→ 获取白板数量失败:', error)
    throw error
  }
}

// 保存视图状态到白板
export async function saveViewStateToWhiteboard(
  whiteboardId: string,
  scale: number,
  translateX: number,
  translateY: number
) {
  try {
    await db('whiteboards')
      .update({
        scale,
        translateX,
        translateY
      })
      .where({ id: whiteboardId })
      .returning('*')
    console.log('后端→保存视图状态到白板成功', whiteboardId, scale, translateX, translateY)
    return true
  } catch (error) {
    console.error('后端→ 保存视图状态到白板失败:', error)
    throw error
  }
}

// 获取白板的视图状态
export async function getWhiteboardViewState(whiteboardId: string): Promise<{
  scale: number
  translateX: number
  translateY: number
}> {
  try {
    const whiteboard = await db('whiteboards').where({ id: whiteboardId }).select('*').first()
    console.log('后端→ 获取白板的视图状态成功', whiteboard)
    return {
      scale: whiteboard.scale as number,
      translateX: whiteboard.translateX as number,
      translateY: whiteboard.translateY as number
    }
  } catch (error) {
    console.error('后端→ 获取白板的视图状态失败:', error)
    throw error
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
    zoomLevel: 1,
    scrollPosition: { x: 0, y: 0 },
    scale: 1,
    translateX: 0,
    translateY: 0
  }

  try {
    await db('root_whiteboards').insert({
      ...newRootWhiteboard,
      scrollPosition: JSON.stringify(newRootWhiteboard.scrollPosition)
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
      : {
          id: uuidv4(),
          createdAt: new Date(),
          updatedAt: new Date(),
          zoomLevel: 1,
          scrollPosition: { x: 0, y: 0 },
          scale: 1,
          translateX: 0,
          translateY: 0
        }
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
// 创建白板
export async function createWhiteboard(input: CreateWhiteboardInput): Promise<Whiteboard> {
  const id = uuidv4()
  const now = new Date().toISOString() // 确保日期格式正确

  const newWhiteboard: Whiteboard = {
    id,
    name: input.name || '新白板',
    description: input.description || '',
    createdAt: new Date(now),
    updatedAt: new Date(now),
    position: input.position,
    size: input.size || { width: 200, height: 200 },
    parentId: input.parentId,
    isTopLevel: input.isTopLevel,
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
// 顶层白板是指没有父白板的白板，isTopLevel 为 true
export async function getTopLevelWhiteboards(): Promise<Whiteboard[]> {
  try {
    console.log('开始获取顶层白板')
    const whiteboards = await db('whiteboards').where({ isTopLevel: true })
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

// 更新白板笔记的位置
export async function updateWhiteboardNotePosition(
  id: string,
  x: number,
  y: number
): Promise<WhiteboardNote> {
  try {
    const updatedWhiteboardNote = await db('whiteboard_notes')
      .where({ id })
      .update({ position: JSON.stringify({ x, y }) })
      .returning('*')
    console.log('更新白板笔记位置成功', updatedWhiteboardNote)
    return processWhiteboardNoteData(updatedWhiteboardNote[0])
  } catch (error) {
    console.error('后端→ 更新白板笔记位置失败:', error)
    throw error
  }
}

// 更新白板笔记的大小
export async function updateWhiteboardNoteSize(
  id: string,
  width: number,
  height: number
): Promise<WhiteboardNote> {
  try {
    const updatedWhiteboardNote = await db('whiteboard_notes')
      .where({ id })
      .update({ size: JSON.stringify({ width, height }) })
      .returning('*')
    console.log('更新白板笔记大小成功', updatedWhiteboardNote)
    return processWhiteboardNoteData(updatedWhiteboardNote[0])
  } catch (error) {
    console.error('后端→ 更新白板笔记大小失败:', error)
    throw error
  }
}
// 白板笔记的辅助函数
function processWhiteboardNoteData(item: any): WhiteboardNote {
  return {
    ...item,
    position: JSON.parse(item.position),
    size: JSON.parse(item.size)
  }
}

// 创建白板笔记
// 输入一个白板的 id，一个白板笔记的数据，白板笔记的数据包括位置，大小，zIndex，旋转
// 分成两个步骤，首先是创建一个卡片笔记，得到这个卡片笔记的 id
// 然后，将这个卡片笔记的 id 作为参数，创建一个白板笔记
export async function createWhiteboardNote(
  input: CreateWhiteboardNoteInput
): Promise<WhiteboardNote> {
  let noteId: string
  if (input.noteId) {
    noteId = input.noteId
  } else {
    const note = await createNote()
    noteId = note.id
  }

  const newWhiteboardNote: WhiteboardNote = {
    id: uuidv4(),
    whiteboardId: input.whiteboardId,
    noteId: noteId,
    position: input.position,
    size: input.size,
    zIndex: input.zIndex,
    rotation: input.rotation,
    isAutoHeight: input.isAutoHeight || false,
    type: input.type || 'card',
    content: input.content || '',
    imageUrl: input.imageUrl || ''
  }
  await db('whiteboard_notes').insert({
    ...newWhiteboardNote,
    position: JSON.stringify(newWhiteboardNote.position),
    size: JSON.stringify(newWhiteboardNote.size)
  })
  // 从数据库中获取刚插入的记录
  const [insertedNote] = await db('whiteboard_notes')
    .where({ id: newWhiteboardNote.id })
    .select('*')

  // 将 JSON 字符串转换回对象
  return {
    ...insertedNote,
    position: JSON.parse(insertedNote.position),
    size: JSON.parse(insertedNote.size)
  }
}

// 删除白板笔记
// 删除白板笔记，同时删除连接该白板笔记的连线
export async function deleteWhiteboardNote(id: string): Promise<void> {
  try {
    console.log('后端→ 删除白板笔记', id)
    await db('whiteboard_notes').where({ id }).del()
    // 通过白板笔记的 id 去查找白板连线的  startItemId 或 endItemId 字段中是否包含该 id，如果包含，则删除该连线
    const connections = await db('connections')
      .where({ startItemId: id })
      .orWhere({ endItemId: id })
    for (const connection of connections) {
      await db('connections').where({ id: connection.id }).del()
    }
    console.log('后端→ 删除白板笔记成功', id)
    console.log('后端→ 删除白板连线成功', connections)
  } catch (error) {
    console.error('后端→ 删除白板笔记失败:', error)
    throw error
  }
}

// 获取白板上的所有笔记
export async function getWhiteboardNotes(whiteboardId: string): Promise<WhiteboardNote[]> {
  try {
    const notes = await db('whiteboard_notes').where({ whiteboardId }).select('*')
    return notes.map((note) => ({
      ...note,
      position: JSON.parse(note.position),
      size: JSON.parse(note.size)
    })) as WhiteboardNote[]
  } catch (error) {
    console.error('后端→ 获取白板笔记失败:', error)
    throw error
  }
}
// 获取白板上的所有分组
export async function getWhiteboardGroups(whiteboardId: string): Promise<WhiteboardGroup[]> {
  try {
    const groups = await db('whiteboard_groups').where({ whiteboardId }).select('*')
    return groups.map((group) => ({
      ...group,
      position: JSON.parse(group.position),
      size: JSON.parse(group.size)
    })) as WhiteboardGroup[]
  } catch (error) {
    console.error('后端→ 获取白板分组失败:', error)
    throw error
  }
}

// 获取白板上的所有连线
export async function getWhiteboardConnections(whiteboardId: string): Promise<Connection[]> {
  try {
    const connections = await db('whiteboard_connections').where({ whiteboardId }).select('*')
    return connections.map((connection) => ({
      ...connection,
      position: JSON.parse(connection.position),
      size: JSON.parse(connection.size)
    })) as Connection[]
  } catch (error) {
    console.error('后端→ 获取白板连线失败:', error)
    throw error
  }
}

// 获取白板上的所有白板
export async function getWhiteboardSubboards(whiteboardId: string): Promise<Whiteboard[]> {
  try {
    const subboards = await db('whiteboards').where({ parentId: whiteboardId }).select('*')
    return subboards.map((subboard) => ({
      ...subboard,
      position: JSON.parse(subboard.position),
      size: JSON.parse(subboard.size)
    })) as Whiteboard[]
  } catch (error) {
    console.error('后端→ 获取白板子白板失败:', error)
    throw error
  }
}

// 获取白板中的卡片数量
export async function getCardCount(whiteboardId: string): Promise<number> {
  try {
    const items = await db('whiteboard_notes').where({ whiteboardId }).select('*')
    const cardCount = items.length
    console.log('后端→ 获取白板中的卡片数量成功', cardCount)
    return cardCount
  } catch (error) {
    console.error('后端→ 获取白板中的卡片数量失败:', error)
    throw error
  }
}

// 更新白板笔记的自动高度
export async function updateWhiteboardNoteAutoHeight(
  id: string,
  isAutoHeight: boolean
): Promise<WhiteboardNote> {
  try {
    const updatedWhiteboardNote = await db('whiteboard_notes')
      .where({ id })
      .update({ isAutoHeight })
      .returning('*')

    return processWhiteboardNoteData(updatedWhiteboardNote[0])
  } catch (error) {
    console.error('后端→ 更新白板笔记自动高度失败:', error)
    throw error
  }
}

// 更新白板名称
export async function updateWhiteboardName(id: string, name: string): Promise<Whiteboard> {
  try {
    const updatedWhiteboard = await db('whiteboards').where({ id }).update({ name }).returning('*')
    return processWhiteboardData(updatedWhiteboard[0])
  } catch (error) {
    console.error('后端→ 更新白板名称失败:', error)
    throw error
  }
}

// 删除白板
// 删除白板，同时删除白板中的所有笔记，连线，分组，子白板
export async function deleteWhiteboard(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db('whiteboards').where({ id }).del()
    console.log('后端→ 删除白板成功', id)
    // 删除白板中的所有笔记
    const notes = await db('whiteboard_notes').where({ whiteboardId: id }).select('*')
    for (const note of notes) {
      await deleteWhiteboardNote(note.id)
    }
    // 删除白板中的所有连线
    const connections = await db('connections').where({ whiteboardId: id }).select('*')
    for (const connection of connections) {
      await db('connections').where({ id: connection.id }).del()
    }
    // 删除白板中的所有分组
    const groups = await db('whiteboard_groups').where({ whiteboardId: id }).select('*')
    for (const group of groups) {
      await db('whiteboard_groups').where({ id: group.id }).del()
    }
    // 删除白板中的所有子白板
    const subboards = await db('whiteboards').where({ parentId: id }).select('*')
    for (const subboard of subboards) {
      await deleteWhiteboard(subboard.id)
    }
    return { success: true }
  } catch (error) {
    console.error('后端→ 删除白板失败:', error)
    return { success: false, error: error as string }
  }
}

// 创建文本卡片
export async function createWhiteboardTextCard(input: {
  whiteboardId: string
  content: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  zIndex: number
  style?: {
    backgroundColor?: string
    textColor?: string
    fontSize?: number
    fontFamily?: string
  }
}): Promise<WhiteboardTextCard> {
  try {
    const now = new Date()
    const textCard = {
      id: uuidv4(),
      whiteboardId: input.whiteboardId,
      content: input.content,
      position: JSON.stringify(input.position),
      size: JSON.stringify(input.size),
      zIndex: input.zIndex,
      rotation: 0,
      style: input.style ? JSON.stringify(input.style) : null,
      createdAt: now,
      updatedAt: now
    }

    await db('whiteboard_text_cards').insert(textCard)

    return {
      ...textCard,
      position: input.position,
      size: input.size,
      style: input.style
    }
  } catch (error) {
    console.error('后端→ 创建文本卡片失败:', error)
    throw error
  }
}

// 获取白板的所有文本卡片
export async function getWhiteboardTextCards(whiteboardId: string): Promise<WhiteboardTextCard[]> {
  try {
    const textCards = await db('whiteboard_text_cards')
      .where({ whiteboardId })
      .orderBy('zIndex', 'asc')

    return textCards.map((card) => ({
      ...card,
      position: JSON.parse(card.position),
      size: JSON.parse(card.size),
      style: card.style ? JSON.parse(card.style) : undefined
    }))
  } catch (error) {
    console.error('后端→ 获取白板文本卡片失败:', error)
    throw error
  }
}

// 更新文本卡片
export async function updateWhiteboardTextCard(
  id: string,
  updates: Partial<WhiteboardTextCard>
): Promise<WhiteboardTextCard> {
  try {
    const updateData: any = {
      updatedAt: new Date()
    }

    if (updates.content !== undefined) {
      updateData.content = updates.content
    }
    if (updates.position) {
      updateData.position = JSON.stringify(updates.position)
    }
    if (updates.size) {
      updateData.size = JSON.stringify(updates.size)
    }
    if (updates.zIndex !== undefined) {
      updateData.zIndex = updates.zIndex
    }
    if (updates.rotation !== undefined) {
      updateData.rotation = updates.rotation
    }
    if (updates.style !== undefined) {
      updateData.style = updates.style ? JSON.stringify(updates.style) : null
    }

    const [updatedCard] = await db('whiteboard_text_cards')
      .where({ id })
      .update(updateData)
      .returning('*')

    return {
      ...updatedCard,
      position: JSON.parse(updatedCard.position),
      size: JSON.parse(updatedCard.size),
      style: updatedCard.style ? JSON.parse(updatedCard.style) : undefined
    }
  } catch (error) {
    console.error('后端→ 更新文本卡片失败:', error)
    throw error
  }
}

// 删除文本卡片
export async function deleteWhiteboardTextCard(id: string): Promise<boolean> {
  try {
    await db('whiteboard_text_cards').where({ id }).delete()
    return true
  } catch (error) {
    console.error('后端→ 删除文本卡片失败:', error)
    throw error
  }
}

// 批量更新文本卡片的 zIndex
export async function updateTextCardsZIndex(
  updates: { id: string; zIndex: number }[]
): Promise<boolean> {
  try {
    await db.transaction(async (trx) => {
      for (const update of updates) {
        await trx('whiteboard_text_cards')
          .where({ id: update.id })
          .update({ zIndex: update.zIndex })
      }
    })
    return true
  } catch (error) {
    console.error('后端→ 批量更新文本卡片 zIndex 失败:', error)
    throw error
  }
}
