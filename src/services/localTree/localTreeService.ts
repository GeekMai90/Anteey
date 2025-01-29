import { Note } from '@shared/types'
import { db } from '../../db/config'
import { KnowledgeTreeNode } from '@shared/types'
import { convertToNote } from '../notes/notesService'

/**
 * 本地树结果的数据结构
 * @interface LocalTreeResult
 * @property {Note} current - 当前笔记
 * @property {Note | null} parent - 父级笔记，如果是顶级笔记则为 null
 * @property {object} siblings - 兄弟笔记
 * @property {Note[]} siblings.all - 所有同级笔记
 * @property {Note[]} siblings.adjacent - 紧邻的前后兄弟笔记
 * @property {Note[]} children - 子笔记
 */
interface LocalTreeResult {
  current: Note
  parent: Note | null
  siblings: {
    all: Note[] // 所有同级节点
    adjacent: Note[] // 前后兄弟节点
  }
  children: Note[]
}

// 添加缓存机制
const noteCache = new Map<string, Note>()
const cacheTimeout = 5 * 60 * 1000 // 5分钟缓存

/**
 * 根据笔记 ID 查找笔记
 * @param {string} id - 笔记 ID
 * @returns {Promise<Note | null>} 返回笔记对象，如果未找到则返回 null
 */
export async function findNoteById(id: string) {
  try {
    // 检查缓存
    const cachedNote = noteCache.get(id)
    if (cachedNote) {
      return cachedNote
    }

    const note = await db('notes').where('id', id).where('isDeleted', false).first()

    if (note) {
      // 添加到缓存
      noteCache.set(id, note)
      // 设置缓存过期
      setTimeout(() => {
        noteCache.delete(id)
      }, cacheTimeout)
    }

    return note || null
  } catch (error) {
    console.error('查找笔记失败:', error)
    throw error
  }
}

/**
 * 解析卢曼地址
 * @param {string} address - 笔记地址，如 "1000" 或 "1201-1-1"
 * @returns {{base: string, branches: string[]}} 返回基础编码和分支编码
 * @example
 * parseAddress("1201-1-1") // returns { base: "1201", branches: ["1", "1"] }
 */
function parseAddress(address: string) {
  const parts = address.split('-')
  const base = parts[0] // 基础编码
  const branches = parts.slice(1) // 分支编码
  return { base, branches }
}

/**
 * 获取地址的层级类型
 * @param {string} address - 笔记地址
 * @returns {'top' | 'second' | 'third' | 'branch'} 返回地址层级
 * - top: 顶级节点，如 1000
 * - second: 二级节点，如 1100
 * - third: 三级节点，如 1101
 * - branch: 分支节点，如 1101-1
 */
function getAddressLevel(address: string): 'top' | 'second' | 'third' | 'branch' {
  const { base, branches } = parseAddress(address)

  if (branches.length > 0) return 'branch'

  if (base.endsWith('000')) return 'top'
  if (base.endsWith('00')) return 'second'
  return 'third'
}

/**
 * 获取笔记的本地树相关数据
 * 包括父节点、所有同级节点、前后兄弟节点和子节点
 * @param {string} noteId - 笔记 ID
 * @returns {Promise<LocalTreeResult>} 返回本地树数据
 *
 * @description
 * 处理流程：
 * 1. 获取当前笔记和所有笔记
 * 2. 根据地址层级处理父节点
 * 3. 筛选并排序同级节点
 * 4. 获取前后兄弟节点
 * 5. 处理子节点
 *
 * @example
 * const treeData = await getLocalTreeNotes('note-id-123')
 * console.log(treeData.parent) // 父节点
 * console.log(treeData.siblings.all) // 所有同级节点
 * console.log(treeData.siblings.adjacent) // 前后兄弟节点
 * console.log(treeData.children) // 子节点
 */
export async function getLocalTreeNotes(noteId: string): Promise<LocalTreeResult> {
  try {
    // 使用单次查询获取所有需要的笔记
    const [currentNote, allNotes] = await Promise.all([
      findNoteById(noteId),
      db('notes').where('isDeleted', false).select('*')
    ])

    if (!currentNote) throw new Error('笔记不存在')

    // 将笔记添加到缓存
    allNotes.forEach((note) => {
      if (!noteCache.has(note.id)) {
        noteCache.set(note.id, note)
      }
    })

    const result: LocalTreeResult = {
      current: currentNote,
      parent: null,
      siblings: {
        all: [],
        adjacent: []
      },
      children: []
    }

    const { base: currentBase } = parseAddress(currentNote.address)
    const level = getAddressLevel(currentNote.address)
    // console.log('当前笔记层级:', level)
    // console.log('当前笔记基础地址:', currentBase)

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

    // 2. 处理所有兄弟节点
    result.siblings.all = allNotes.filter((note) => {
      if (note.id === noteId) return false

      const { base: noteBase } = parseAddress(note.address)
      const noteLevel = getAddressLevel(note.address)

      // console.log('处理潜在的兄弟节点:', {
      //   address: note.address,
      //   noteBase,
      //   noteLevel,
      //   currentLevel: level
      // })

      // 必须是相同层级
      if (noteLevel !== level) {
        // console.log('层级不匹配，跳过:', note.address)
        return false
      }

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
        const currentParentAddress = currentNote.address.split('-').slice(0, -1).join('-')
        const noteParentAddress = note.address.split('-').slice(0, -1).join('-')

        // console.log('分支节点比较:', {
        //   currentParentAddress,
        //   noteParentAddress,
        //   isMatch: currentParentAddress === noteParentAddress
        // })

        return currentParentAddress === noteParentAddress
      }
    })

    // console.log('筛选后的兄弟节点:', result.siblings.all)

    // 对所有兄弟节点进行排序
    result.siblings.all.sort((a, b) => {
      const aLast = a.address.split('-').pop() || ''
      const bLast = b.address.split('-').pop() || ''

      const aMatch = aLast.match(/^(\d+)([a-z]*)$/)
      const bMatch = bLast.match(/^(\d+)([a-z]*)$/)

      // console.log('排序比较:', {
      //   aAddress: a.address,
      //   bAddress: b.address,
      //   aLast,
      //   bLast,
      //   aMatch,
      //   bMatch
      // })

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

    // console.log('排序后的兄弟节点:', result.siblings.all)

    // 3. 获取前后兄弟节点
    if (result.siblings.all.length > 0) {
      const currentLast = currentNote.address.split('-').pop() || ''
      const currentMatch = currentLast.match(/^(\d+)([a-z]*)$/)

      if (currentMatch) {
        const currentNum = parseInt(currentMatch[1])
        const currentAlpha = currentMatch[2]

        // 找到第一个大于当前节点的位置
        const nextIndex = result.siblings.all.findIndex((note) => {
          const noteLast = note.address.split('-').pop() || ''
          const noteMatch = noteLast.match(/^(\d+)([a-z]*)$/)

          if (!noteMatch) return false

          const noteNum = parseInt(noteMatch[1])
          const noteAlpha = noteMatch[2]

          // 比较数字部分
          if (noteNum !== currentNum) {
            return noteNum > currentNum
          }

          // 如果数字相同，比较字母部分
          if (!currentAlpha && noteAlpha) return true
          if (currentAlpha && !noteAlpha) return false
          return noteAlpha.localeCompare(currentAlpha) > 0
        })

        // 根据找到的位置获取前后节点
        const prevSibling =
          nextIndex > 0
            ? result.siblings.all[nextIndex - 1]
            : nextIndex === -1
              ? result.siblings.all[result.siblings.all.length - 1]
              : null
        const nextSibling = nextIndex !== -1 ? result.siblings.all[nextIndex] : null

        result.siblings.adjacent = [prevSibling, nextSibling].filter(
          (note): note is Note => note !== null
        )
      }
    }

    // 4. 处理子节点
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

    return result
  } catch (error) {
    console.error('获取本地树相关笔记失败:', error)
    throw error
  }
}

/**
 * 根据地址查找笔记
 * @param {string} address - 笔记地址
 * @returns {Promise<Note | null>} 返回笔记对象，如果未找到则返回 null
 */
export async function findNoteByAddress(address: string) {
  try {
    const note = await db('notes').where('address', address).where('isDeleted', false).first()

    return note || null
  } catch (error) {
    console.error('根据地址查找笔记失败:', error)
    throw error
  }
}

/**
 * 扩展的本地树数据结构，包含引用关系
 * @interface LocalTreeWithReferences
 * @extends LocalTreeResult
 * @property {object} references - 引用关系
 * @property {Note[]} references.incoming - 引用了当前笔记的笔记
 * @property {Note[]} references.outgoing - 被当前笔记引用的笔记
 */
interface LocalTreeWithReferences extends LocalTreeResult {
  references: {
    incoming: Note[]
    outgoing: Note[]
  }
}

/**
 * 获取包含引用关系的本地树数据
 * @param {string} noteId - 笔记 ID
 * @returns {Promise<LocalTreeWithReferences>} 返回包含引用关系的本地树数据
 *
 * @description
 * 处理流程：
 * 1. 获取基础的本地树数据
 * 2. 获取引用关系
 * 3. 获取相关笔记的完整信息
 * 4. 组合数据返回
 */
export async function getLocalTreeWithReferences(noteId: string): Promise<LocalTreeWithReferences> {
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

/**
 * 获取指定地址的子节点
 * @param {string} parentAddress - 父节点地址
 * @returns {Promise<KnowledgeTreeNode[]>} 返回子节点数组
 *
 * @description
 * 根据父节点的层级类型，使用不同的查询条件：
 * - top: 查找如 1100, 1200 这样的二级节点
 * - second: 查找如 1201, 1202 这样的三级节点
 * - third/branch: 查找直接子节点
 */
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

/**
 * 获取指定地址的子节点数量
 * @param {string} parentAddress - 父节点地址
 * @returns {Promise<number>} 返回子节点数量
 *
 * @description
 * 使用与 getChildNodes 相同的查询逻辑，但只返回数量
 */
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

/**
 * 将笔记对象转换为树节点对象
 * @param {Note} note - 笔记对象
 * @param {number} level - 节点层级
 * @returns {KnowledgeTreeNode} 返回树节点对象
 *
 * @description
 * 转换过程包括：
 * 1. 解析笔记的元数据获取标题
 * 2. 设置节点的基本属性
 * 3. 设置节点的展开和焦点状态
 */
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

/**
 * 获取下一层级的数字表示
 * @param {'top' | 'second' | 'third' | 'branch'} level - 当前层级
 * @returns {number} 返回下一层级的数字表示
 *
 * @description
 * 层级映射关系：
 * - top -> 1
 * - second -> 2
 * - third -> 3
 * - branch -> 4
 */
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

// 添加事务和错误处理
async function withTransaction<T>(callback: (trx: any) => Promise<T>): Promise<T> {
  const trx = await db.transaction()
  try {
    const result = await callback(trx)
    await trx.commit()
    return result
  } catch (error) {
    await trx.rollback()
    throw error
  }
}

// 获取局部知识树数据
export async function getLocalTree(noteId: string) {
  try {
    return await withTransaction(async (trx) => {
      // 获取当前笔记
      const currentNote = await trx('notes')
        .where('id', noteId)
        .andWhere('isDeleted', false)
        .first()

      if (!currentNote) return null

      // 获取父级笔记
      const parentNotes = await trx('notes')
        .where('address', '<', currentNote.address)
        .andWhere('isDeleted', false)
        .orderBy('address', 'desc')
        .limit(1)
        .select('*')

      // 获取同级笔记
      const siblingNotes = await trx('notes')
        .whereRaw('length(address) = ?', [currentNote.address.length])
        .andWhere('address', '!=', currentNote.address)
        .andWhere('isDeleted', false)
        .orderBy('address')
        .select('*')

      // 获取子级笔记
      const childNotes = await trx('notes')
        .where('address', 'like', `${currentNote.address}-%`)
        .andWhere('isDeleted', false)
        .orderBy('address')
        .select('*')

      return {
        current: convertToNote(currentNote),
        parents: parentNotes.map(convertToNote),
        siblings: siblingNotes.map(convertToNote),
        children: childNotes.map(convertToNote)
      }
    })
  } catch (error) {
    console.error('获取局部知识树失败:', error)
    throw error
  }
}

// 获取带引用关系的局部知识树数据
export async function getLocalTreeWithRefs(noteId: string) {
  try {
    return await withTransaction(async (trx) => {
      // 获取基本的局部知识树数据
      const treeData = await getLocalTree(noteId)
      if (!treeData) return null

      // 获取引用关系
      const incomingRefs = await trx('note_references')
        .join('notes', 'note_references.source_note_id', 'notes.id')
        .where('note_references.target_note_id', noteId)
        .andWhere('notes.isDeleted', false)
        .select('notes.*')

      const outgoingRefs = await trx('note_references')
        .join('notes', 'note_references.target_note_id', 'notes.id')
        .where('note_references.source_note_id', noteId)
        .andWhere('notes.isDeleted', false)
        .select('notes.*')

      return {
        ...treeData,
        incomingRefs: incomingRefs.map(convertToNote),
        outgoingRefs: outgoingRefs.map(convertToNote)
      }
    })
  } catch (error) {
    console.error('获取带引用关系的局部知识树失败:', error)
    throw error
  }
}
