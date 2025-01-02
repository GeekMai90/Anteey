import { Note } from '../../renderer/src/types/Note'
import { db } from '../../db/config'
import { KnowledgeTreeNode } from '../../renderer/src/types/knowledgeTree'

// 根据 ID 查找笔记
export async function findNoteById(id: string) {
  try {
    const note = await db('notes').where('id', id).where('isDeleted', false).first()

    return note || null
  } catch (error) {
    console.error('查找笔记失败:', error)
    throw error
  }
}

// 辅助函数：解析地址
function parseAddress(address: string) {
  const parts = address.split('-')
  const base = parts[0] // 基础编码
  const branches = parts.slice(1) // 分支编码
  return { base, branches }
}

// 辅助函数：获取地址层级
function getAddressLevel(address: string): 'top' | 'second' | 'third' | 'branch' {
  const { base, branches } = parseAddress(address)

  if (branches.length > 0) return 'branch'

  if (base.endsWith('000')) return 'top'
  if (base.endsWith('00')) return 'second'
  return 'third'
}

// 获取本地树相关笔记
export async function getLocalTreeNotes(noteId: string) {
  try {
    const currentNote = await findNoteById(noteId)
    if (!currentNote) throw new Error('笔记不存在')

    const allNotes = await db('notes').where('isDeleted', false).select('*')

    const result = {
      current: currentNote,
      parent: null as Note | null,
      siblings: [] as Note[],
      children: [] as Note[]
    }

    const { base: currentBase } = parseAddress(currentNote.address)
    const level = getAddressLevel(currentNote.address)

    // 1. 处理父节点
    if (level === 'top') {
      result.parent = null
    } else if (level === 'second') {
      const parentBase = `${Math.floor(parseInt(currentBase) / 1000)}000`
      result.parent = allNotes.find((n) => n.address === parentBase) || null
    } else if (level === 'third') {
      const parentBase = `${currentBase.slice(0, 2)}00`
      result.parent = allNotes.find((n) => n.address === parentBase) || null
    } else {
      // 分支节点
      const parentAddress = currentNote.address.split('-').slice(0, -1).join('-')
      result.parent = allNotes.find((n) => n.address === parentAddress) || null
    }

    // 2. 处理兄弟节点
    result.siblings = allNotes.filter((note) => {
      if (note.id === noteId) return false

      const { base: noteBase } = parseAddress(note.address)
      const noteLevel = getAddressLevel(note.address)

      // 必须是相同层级
      if (noteLevel !== level) return false

      if (level === 'top') {
        return noteBase.endsWith('000')
      } else if (level === 'second') {
        return (
          noteBase.endsWith('00') &&
          Math.floor(parseInt(noteBase) / 1000) === Math.floor(parseInt(currentBase) / 1000)
        )
      } else if (level === 'third') {
        return noteBase.slice(0, 2) === currentBase.slice(0, 2) && !noteBase.endsWith('00')
      } else {
        // 分支节点：同一父节点下的同层级节点
        const parentAddress = currentNote.address.split('-').slice(0, -1).join('-')
        return (
          note.address.startsWith(parentAddress + '-') &&
          note.address.split('-').length === currentNote.address.split('-').length
        )
      }
    })

    // 3. 处理子节点
    result.children = allNotes.filter((note) => {
      if (level === 'top') {
        // 顶级节点(1000)的子节点是对应的二级节点(1100,1200等)
        return (
          note.address.startsWith(currentBase[0]) &&
          note.address.endsWith('00') &&
          note.address !== currentBase
        )
      } else if (level === 'second') {
        // 二级节点(1200)的子节点是对应的三级节点(1201,1202等)
        return (
          note.address.startsWith(currentBase.slice(0, 2)) &&
          !note.address.endsWith('00') &&
          !note.address.includes('-') &&
          note.address.length === 4
        )
      } else {
        // 三级及分支节点的子节点
        return (
          note.address.startsWith(currentNote.address + '-') &&
          note.address.split('-').length === currentNote.address.split('-').length + 1
        )
      }
    })

    // 4. 对兄弟节点排序
    result.siblings.sort((a, b) => {
      const aLast = a.address.split('-').pop() || ''
      const bLast = b.address.split('-').pop() || ''

      const aMatch = aLast.match(/^(\d+)([a-z]*)$/)
      const bMatch = bLast.match(/^(\d+)([a-z]*)$/)

      if (!aMatch || !bMatch) return 0

      const aNum = parseInt(aMatch[1])
      const bNum = parseInt(bMatch[1])

      if (aNum !== bNum) return aNum - bNum

      const aAlpha = aMatch[2]
      const bAlpha = bMatch[2]
      if (!aAlpha && bAlpha) return -1
      if (aAlpha && !bAlpha) return 1
      return aAlpha.localeCompare(bAlpha)
    })

    // 5. 只在真实存在同级节点时才获取前后节点
    if (result.siblings.length > 0) {
      const currentIndex = result.siblings.findIndex((note) => {
        const noteLast = note.address.split('-').pop() || ''
        const currentLast = currentNote.address.split('-').pop() || ''
        return noteLast.localeCompare(currentLast) > 0
      })

      // 只在确实找到了同级节点时才设置前后节点
      const prevSibling = currentIndex > 0 ? result.siblings[currentIndex - 1] : null
      const nextSibling = currentIndex !== -1 ? result.siblings[currentIndex] : null

      result.siblings = [prevSibling, nextSibling].filter((note): note is Note => note !== null)
    } else {
      // 如果没有同级节点，直接设置为空数组
      result.siblings = []
    }

    return result
  } catch (error) {
    console.error('获取本地树相关笔记失败:', error)
    throw error
  }
}

// 根据地址查找笔记
export async function findNoteByAddress(address: string) {
  try {
    const note = await db('notes').where('address', address).where('isDeleted', false).first()

    return note || null
  } catch (error) {
    console.error('根据地址查找笔记失败:', error)
    throw error
  }
}

// src/services/localTree/localTreeService.ts 中添加
export async function getLocalTreeWithReferences(noteId: string) {
  try {
    // 1. 获取基础的本地树数据
    const treeData = await getLocalTreeNotes(noteId)

    // 2. 获取当前笔记
    const currentNote = await findNoteById(noteId)
    if (!currentNote) {
      throw new Error('笔记不存在')
    }

    // 3. 获取引用关系
    // 获取引用了当前笔记的笔记(incoming)
    const incomingRefs = await db('note_references')
      .where('targetNoteId', noteId)
      .where('type', 'reference')

    // 获取被当前笔记引用的笔记(outgoing)
    const outgoingRefs = await db('note_references')
      .where('sourceNoteId', noteId)
      .where('type', 'reference')

    // 4. 获取相关笔记的完整信息
    const incomingNotes = await Promise.all(
      incomingRefs.map((ref) => findNoteById(ref.sourceNoteId))
    )

    const outgoingNotes = await Promise.all(
      outgoingRefs.map((ref) => findNoteById(ref.targetNoteId))
    )

    // 5. 组合数据
    return {
      ...treeData,
      references: {
        incoming: incomingNotes.filter((note): note is Note => note !== null),
        outgoing: outgoingNotes.filter((note): note is Note => note !== null)
      }
    }
  } catch (error) {
    console.error('获取本地树与引用数据失败:', error)
    throw error
  }
}

export async function getChildNodes(parentAddress: string): Promise<KnowledgeTreeNode[]> {
  try {
    console.log('开始获取子节点, 父地址:', parentAddress)
    const level = getAddressLevel(parentAddress)
    let query = db('notes')
      .select('*')
      .where('isDeleted', false)
      .where('cardType', 'Maincard')
      .orderBy('address', 'asc')

    switch (level) {
      case 'top': // 例如：1000
        query = query
          .where('address', 'like', `${parentAddress[0]}%00`)
          .whereRaw('LENGTH(address) = 4')
          .whereNot('address', parentAddress)
          .where('address', 'not like', '%000')
        break

      case 'second': // 例如：1200
        query = query
          .where('address', 'like', `${parentAddress.slice(0, 2)}__`)
          .whereRaw('LENGTH(address) = 4')
          .whereNot('address', parentAddress)
          .whereNot('address', 'like', '%00')
          .whereRaw('address NOT LIKE ?', [`%-%`])
        break

      case 'third': // 例如：1201
        query = query
          .where('address', 'like', `${parentAddress}-%`)
          .whereRaw('address NOT LIKE ?', [`${parentAddress}-%-%`])
        break

      case 'branch':
        query = query
          .where('address', 'like', `${parentAddress}-%`)
          .whereRaw('address NOT LIKE ?', [`${parentAddress}-%-%`])
        break
    }

    const notes = await query
    console.log('查询到的笔记:', notes)

    const nodes = await Promise.all(
      notes.map(async (note) => {
        const childCount = await getChildCount(note.address)
        const node = convertToTreeNode(note, getNextLevel(level))
        return {
          ...node,
          childCount
        }
      })
    )

    console.log('最终返回的子节点数组:', nodes)
    return nodes
  } catch (error) {
    console.error('获取子节点失败:', error)
    throw error
  }
}

export async function getChildCount(parentAddress: string): Promise<number> {
  try {
    const level = getAddressLevel(parentAddress)
    let query = db('notes')
      .where('isDeleted', false)
      .where('cardType', 'Maincard')
      .whereNot('address', parentAddress)

    switch (level) {
      case 'top':
        query = query
          .where('address', 'like', `${parentAddress[0]}%00`)
          .whereRaw('LENGTH(address) = 4')
          .where('address', 'not like', '%000')
        break

      case 'second':
        query = query
          .where('address', 'like', `${parentAddress.slice(0, 2)}__`)
          .whereRaw('LENGTH(address) = 4')
          .whereNot('address', 'like', '%00')
          .whereRaw('address NOT LIKE ?', [`%-%`])
        break

      case 'third':
        query = query
          .where('address', 'like', `${parentAddress}-%`)
          .whereRaw('address NOT LIKE ?', [`${parentAddress}-%-%`])
        break

      case 'branch':
        query = query
          .where('address', 'like', `${parentAddress}-%`)
          .whereRaw('address NOT LIKE ?', [`${parentAddress}-%-%`])
        break
    }

    const result = (await query.count('* as count').first()) as { count: number }
    return result ? Number(result.count) : 0
  } catch (error) {
    console.error('获取子节点数量失败:', error)
    throw error
  }
}

// 添加转换树节点的函数
function convertToTreeNode(note: Note, level: number): KnowledgeTreeNode {
  let metadata: { title: string } | null = null
  try {
    metadata = note.metadata ? JSON.parse(note.metadata as string) : null
  } catch (error) {
    console.error('解析 metadata 失败:', error)
  }

  return {
    id: note.id,
    address: note.address,
    title: metadata?.title || '',
    childCount: 0,
    level,
    isExpanded: false,
    isFocused: false,
    noteId: note.id
  }
}

// 添加获取下一层级的函数
function getNextLevel(level: 'top' | 'second' | 'third' | 'branch'): number {
  switch (level) {
    case 'top':
      return 1
    case 'second':
      return 2
    case 'third':
      return 3
    case 'branch':
      return 4
    default:
      return 0
  }
}
