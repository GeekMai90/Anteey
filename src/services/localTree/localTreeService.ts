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

// 辅助函数：解析地址
function parseAddress(address: string) {
  const parts = address.split('-')
  const base = parts[0] // 基础编码
  const branches = parts.slice(1) // 分支编码
  return { base, branches }
}

// 辅助函数：判断是否是有效的基础编码
function isValidBaseAddress(address: string): boolean {
  // 必须是4位数字
  if (!/^\d{4}$/.test(address)) return false

  const num = parseInt(address)

  // 顶级编码 (X000)
  if (address.endsWith('000')) {
    return num >= 1000 && num <= 5000 && num % 1000 === 0
  }

  // 二级编码 (XX00)
  if (address.endsWith('00')) {
    const firstDigit = Math.floor(num / 1000)
    const secondDigit = Math.floor((num % 1000) / 100)
    return firstDigit >= 1 && firstDigit <= 5 && secondDigit >= 1 && secondDigit <= 9
  }

  // 三级编码 (XXXX)
  const firstTwoDigits = Math.floor(num / 100)
  const lastTwoDigits = num % 100
  return firstTwoDigits >= 11 && firstTwoDigits <= 59 && lastTwoDigits >= 1 && lastTwoDigits <= 99
}

// 辅助函数：判断是否是有效的分支编码
function isValidBranchPart(part: string): boolean {
  // 数字分支：1-99
  if (/^\d+$/.test(part)) {
    const num = parseInt(part)
    return num >= 1 && num <= 99
  }

  // 字母分支：数字+小写字母
  return /^\d+[a-z]$/.test(part)
}

// 获取本地树相关笔记
export async function getLocalTreeNotes(noteId: string) {
  try {
    const currentNote = await findNoteById(noteId)
    if (!currentNote) throw new Error('笔记不存在')

    // 验证当前笔记地址的有效性
    const { base: currentBase, branches: currentBranches } = parseAddress(currentNote.address)

    // 验证基础编码
    if (!isValidBaseAddress(currentBase)) {
      throw new Error(`无效的基础编码: ${currentBase}`)
    }

    // 验证分支编码
    if (currentBranches.length > 0) {
      for (const branch of currentBranches) {
        if (!isValidBranchPart(branch)) {
          throw new Error(`无效的分支编码: ${branch}`)
        }
      }
    }

    const allNotes = await db('notes').where('isDeleted', false).select('*')

    const result = {
      current: currentNote,
      parent: null as Note | null,
      siblings: [] as Note[],
      children: [] as Note[]
    }

    // 1. 处理基础编码关系
    if (currentBranches.length === 0) {
      // 如果是基础编码
      if (currentBase.endsWith('00')) {
        // 如果是顶级或二级编码，父节点是上一级
        const parentBase = currentBase.endsWith('000')
          ? null
          : `${Math.floor(parseInt(currentBase) / 1000)}000`

        if (parentBase) {
          result.parent = allNotes.find((n) => n.address === parentBase) || null
        }
      } else {
        // 如果是三级编码，父节点是对应的二级编码
        const parentBase = `${currentBase.slice(0, 2)}00`
        result.parent = allNotes.find((n) => n.address === parentBase) || null
      }
    } else {
      // 2. 处理分支编码关系
      const parentAddress = currentNote.address.split('-').slice(0, -1).join('-')
      result.parent = allNotes.find((n) => n.address === parentAddress) || null
    }

    // 3. 查找兄弟节点
    result.siblings = allNotes.filter((note) => {
      if (note.id === noteId) return false

      const { base: noteBase, branches: noteBranches } = parseAddress(note.address)

      // 基础编码的兄弟规则
      if (currentBranches.length === 0 && noteBranches.length === 0) {
        if (currentBase.endsWith('000')) {
          // 顶级编码的兄弟
          return noteBase.endsWith('000')
        } else if (currentBase.endsWith('00')) {
          // 二级编码的兄弟
          return (
            noteBase.endsWith('00') &&
            Math.floor(parseInt(noteBase) / 1000) === Math.floor(parseInt(currentBase) / 1000)
          )
        } else {
          // 三级编码的兄弟
          return noteBase.slice(0, 2) === currentBase.slice(0, 2) && !noteBase.endsWith('00')
        }
      }

      // 分支编码的兄弟规则
      const parentAddress = currentNote.address.split('-').slice(0, -1).join('-')
      return (
        note.address.startsWith(parentAddress + '-') &&
        note.address.split('-').length === currentNote.address.split('-').length
      )
    })

    // 4. 查找子节点
    result.children = allNotes.filter((note) => {
      const noteParts = note.address.split('-')
      const currentParts = currentNote.address.split('-')

      // 必须比当前地址多一层
      if (noteParts.length !== currentParts.length + 1) return false

      // 必须以当前地址为前缀
      return note.address.startsWith(currentNote.address + '-')
    })

    // 5. 对兄弟节点进行排序
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

    // 6. 只保留当前节点的前后兄弟节点
    const currentIndex = result.siblings.findIndex((note) => {
      const noteLast = note.address.split('-').pop() || ''
      const currentLast = currentNote.address.split('-').pop() || ''

      return noteLast.localeCompare(currentLast) > 0
    })

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
