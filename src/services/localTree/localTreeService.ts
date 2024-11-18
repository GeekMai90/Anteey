import { Note } from '../../renderer/src/types/Note'
import { db } from '../../db/config'

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

// 获取本地树相关笔记
export async function getLocalTreeNotes(noteId: string) {
  try {
    // 1. 先获取当前笔记
    const currentNote = await findNoteById(noteId)
    if (!currentNote) {
      throw new Error('笔记不存在')
    }

    // 2. 在数据库中查找所有笔记
    const allNotes = await db('notes').where('isDeleted', false).select('*')

    // 3. 根据地址规则筛选出相关笔记
    const result = {
      current: currentNote,
      parent: null as Note | null,
      siblings: [] as Note[],
      children: [] as Note[]
    }

    // 获取当前笔记的层级和父级地址
    const currentParts = currentNote.address.split('-')
    const parentAddress = currentParts.slice(0, -1).join('-')

    allNotes.forEach((note) => {
      // 父级：当前地址是否以某个笔记地址为前缀，且层级差为1
      if (
        currentNote.address.startsWith(note.address + '-') &&
        note.address.split('-').length === currentParts.length - 1
      ) {
        result.parent = note
      }

      // 兄弟级：如果是顶级节点，就找同层级的，如果不是，就找当前地址有相同的父级前缀

      if (note.id !== noteId && note.address.split('-').length === currentParts.length) {
        // 如果是顶级节点（没有父级地址），直接添加同层级节点
        if (!parentAddress) {
          result.siblings.push(note)
        }
        // 如果有父级地址，则检查是否有相同的父级前缀
        else if (note.address.startsWith(parentAddress + '-')) {
          result.siblings.push(note)
        }
      }

      // 子级：以当前地址为前缀，且层级差为1
      if (
        note.address.startsWith(currentNote.address + '-') &&
        note.address.split('-').length === currentParts.length + 1
      ) {
        result.children.push(note)
      }
    })

    // 对兄弟节点进行排序
    result.siblings.sort((a, b) => {
      const aLast = a.address.split('-').pop() || ''
      const bLast = b.address.split('-').pop() || ''

      const aMatch = aLast.match(/^(\d+)([a-z]*)$/)
      const bMatch = bLast.match(/^(\d+)([a-z]*)$/)

      if (!aMatch || !bMatch) return 0

      const aNum = parseInt(aMatch[1])
      const bNum = parseInt(bMatch[1])

      // 先比较数字
      if (aNum !== bNum) return aNum - bNum

      // 数字相同时，无字母的排在前面
      const aAlpha = aMatch[2]
      const bAlpha = bMatch[2]
      if (!aAlpha && bAlpha) return -1
      if (aAlpha && !bAlpha) return 1
      return aAlpha.localeCompare(bAlpha)
    })

    // 找到当前节点在排序后的数组中的位置
    const currentIndex = result.siblings.findIndex((note) => {
      const noteLast = note.address.split('-').pop() || ''
      const noteMatch = noteLast.match(/^(\d+)([a-z]*)$/)
      const currentLast = currentNote.address.split('-').pop() || ''
      const currentMatch = currentLast.match(/^(\d+)([a-z]*)$/)

      if (!noteMatch || !currentMatch) return false

      const noteNum = parseInt(noteMatch[1])
      const currentNum = parseInt(currentMatch[1])

      if (noteNum !== currentNum) return noteNum > currentNum

      const noteAlpha = noteMatch[2]
      const currentAlpha = currentMatch[2]

      if (!noteAlpha && !currentAlpha) return false
      if (!noteAlpha) return false
      if (!currentAlpha) return true
      return noteAlpha.localeCompare(currentAlpha) > 0
    })

    // 获取前一个和后一个节点
    const prevSibling =
      currentIndex > 0
        ? result.siblings[currentIndex - 1]
        : currentIndex === -1
          ? result.siblings[result.siblings.length - 1]
          : null
    const nextSibling =
      currentIndex !== -1
        ? result.siblings[currentIndex]
        : result.siblings.length > 0
          ? result.siblings[0]
          : null

    result.siblings = [prevSibling, nextSibling].filter((note): note is Note => note !== null)

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
