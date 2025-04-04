import { LocalTreeData, Note } from '@shared/types'
import { db } from '../../db/config'
import { KnowledgeTreeNode, AddressLevel } from '@shared/types'

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

/**
 * 根据笔记 ID 查找笔记
 * @param {string} id - 笔记 ID
 * @returns {Promise<Note | null>} 返回笔记对象，如果未找到则返回 null
 */
export async function findNoteById(id: string) {
  try {
    const note = await db('notes').where('id', id).where('isDeleted', false).first()

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
function getAddressLevel(address: string): AddressLevel | null {
  // 1. 基础验证
  if (!address || typeof address !== 'string') {
    // console.warn('无效地址: 地址为空或非字符串类型')
    return null
  }

  address = address.trim()

  // 3. 基础层级验证（4位数字）
  if (/^\d{4}$/.test(address)) {
    if (parseInt(address) === 0) {
      // console.warn(`无效地址: 地址不能全为0，当前地址: ${address}`)
      return null
    }

    if (address.endsWith('000')) {
      if (address[0] === '0') {
        // console.warn(`无效地址: 顶层地址第一位不能为0，当前地址: ${address}`)
        return null
      }
      return 'top'
    }

    if (address.endsWith('00')) {
      if (address.slice(0, 2) === '00') {
        // console.warn(`无效地址: 二级地址前两位不能为0，当前地址: ${address}`)
        return null
      }
      return 'second'
    }

    return 'third'
  }

  // 4. 分支层级验证
  if (address.includes('-')) {
    const pattern = /^\d{4}(-([1-9]\d*[a-z]?|\d*[a-z]))+$/
    if (!pattern.test(address)) {
      // console.warn(`无效地址: 分支地址格式错误`)
      return null
    }

    const baseAddress = address.split('-')[0]
    if (parseInt(baseAddress) === 0) {
      // console.warn(`无效地址: 分支地址的基础地址不能全为0`)
      return null
    }

    const branchLevel = address.split('-').length - 1
    if (branchLevel > 10) {
      // console.warn(`无效地址: 分支层级超出限制`)
      return null
    }

    return `branch-${branchLevel}` as AddressLevel
  }

  return null
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
    // console.group('获取本地树数据')
    const currentNote = await findNoteById(noteId)
    if (!currentNote) throw new Error('笔记不存在')

    // console.log('当前笔记:', currentNote)
    // console.log('当前笔记地址:', currentNote.address)

    // 1. 先获取当前节点的层级
    const level = getAddressLevel(currentNote.address)
    // console.log('当前节点层级:', level)

    // 2. 获取父节点地址
    const parentAddress = getParentAddress(currentNote.address)
    // console.log('计算得到的父节点地址:', parentAddress)

    // 3. 初始化结果对象
    const result: LocalTreeResult = {
      current: currentNote,
      parent: null,
      siblings: {
        all: [],
        adjacent: []
      },
      children: []
    }

    // 4. 获取父节点
    if (parentAddress) {
      const parent = await db('notes')
        .where('address', parentAddress)
        .where('isDeleted', false)
        .where('cardType', 'Maincard')
        .first()

      // console.log('从数据库获取到的父节点:', parent)
      result.parent = parent || null
    }

    const allNotes = await db('notes').where('isDeleted', false).select('*')
    // console.log('所有笔记:', allNotes)

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
          Math.floor(parseInt(noteBase) / 1000) ===
            Math.floor(parseInt(currentNote.address.slice(0, 4)) / 1000)
        )
      } else if (level === 'third') {
        return noteBase.slice(0, 2) === currentNote.address.slice(0, 2) && !noteBase.endsWith('00')
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
          note.address.startsWith(currentNote.address[0]) &&
          note.address.endsWith('00') &&
          note.address !== currentNote.address
        )
      } else if (level === 'second') {
        // 二级节点(1200)的子节点是对应的三级节点(1201,1202等)
        return (
          note.address.startsWith(currentNote.address.slice(0, 2)) &&
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

    // console.groupEnd()
    return result
  } catch (error) {
    console.error('获取本地树相关笔记失败:', error)
    // console.groupEnd()
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
    const level = getAddressLevel(parentAddress)
    if (!level) return []

    let pattern: string

    switch (level) {
      case 'top':
        pattern = `${parentAddress[0]}%00`
        break
      case 'second':
        pattern = `${parentAddress.slice(0, 2)}__`
        break
      case 'third':
        pattern = `${parentAddress}-%`
        break
      default:
        if (level.startsWith('branch-')) {
          pattern = `${parentAddress}-%`
        } else {
          throw new Error(`Invalid address level: ${level}`)
        }
    }

    const notes = await db('notes')
      .select('*')
      .where('address', 'like', pattern)
      .whereNot('address', parentAddress)
      .where('isDeleted', false)
      .where('cardType', 'Maincard')
      .whereRaw('(address NOT LIKE ? OR address = ?)', [
        `${parentAddress}-%-%`,
        `${parentAddress}-1`
      ])

    // 对笔记进行排序（与知识树保持一致）
    notes.sort((a, b) => {
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
    if (!level) return 0

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

      default:
        if (level.startsWith('branch-')) {
          query = query
            .where('address', 'like', `${parentAddress}-%`)
            .whereRaw('address NOT LIKE ?', [`${parentAddress}-%-%`])
        }
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
function getNextLevel(level: AddressLevel): number {
  if (level === 'top') return 1
  if (level === 'second') return 2
  if (level === 'third') return 3

  // 修改分支层级的处理
  if (level.startsWith('branch-')) {
    const currentLevel = parseInt(level.split('-')[1])
    return currentLevel + 3 // 基础层级(3) + 分支层级
  }

  return 0
}

/**
 * 使用与知识树服务相同的 getParentAddress 函数
 * @param {string} address - 笔记地址
 * @returns {string | null} 返回父节点地址，如果无父节点则返回 null
 */
function getParentAddress(address: string): string | null {
  const level = getAddressLevel(address)
  // console.log('获取父地址 - 当前地址:', address, '层级:', level)

  if (!level) return null
  if (level === 'top') return null
  if (level === 'second') {
    // 对于二级节点（如1200），返回其父节点地址（1000）
    return `${address[0]}000`
  }
  if (level === 'third') return `${address.slice(0, 2)}00`

  if (level.startsWith('branch-')) {
    const parts = address.split('-')
    return parts.slice(0, -1).join('-')
  }

  return null
}

/**
 * 添加获取兄弟节点的函数
 * @param {Note} currentNote - 当前笔记
 * @returns {Promise<{ all: Note[], adjacent: Note[] }>} 返回兄弟节点数组和相邻节点数组
 */
async function getSiblingNodes(currentNote: Note): Promise<{
  all: Note[]
  adjacent: Note[]
}> {
  try {
    const level = getAddressLevel(currentNote.address)
    if (!level) return { all: [], adjacent: [] }

    let query = db('notes')
      .where('isDeleted', false)
      .where('cardType', 'Maincard')
      .whereNot('id', currentNote.id)

    // 根据不同层级设置查询条件
    switch (level) {
      case 'top':
        query = query.where('address', 'like', '%000')
        break
      case 'second': {
        const parentBase = `${currentNote.address[0]}000`
        query = query
          .where('address', 'like', `${currentNote.address[0]}%00`)
          .whereNot('address', parentBase)
        break
      }
      case 'third': {
        const base = currentNote.address.slice(0, 2)
        query = query
          .where('address', 'like', `${base}__`)
          .whereNot('address', 'like', '%00')
          .whereNot('address', 'like', '%-%')
        break
      }
      default:
        if (level.startsWith('branch-')) {
          const parentAddress = currentNote.address.split('-').slice(0, -1).join('-')
          query = query
            .where('address', 'like', `${parentAddress}-%`)
            .whereRaw('address NOT LIKE ?', [`${parentAddress}-%-%`])
        }
        break
    }

    const siblings = await query

    // 排序兄弟节点
    siblings.sort((a, b) => {
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

    // 获取相邻节点
    const currentIndex = siblings.findIndex((s) => s.address.localeCompare(currentNote.address) > 0)
    const adjacent: Note[] = []

    if (currentIndex > 0) {
      adjacent.push(siblings[currentIndex - 1]) // 前一个
    }
    if (currentIndex !== -1 && currentIndex < siblings.length) {
      adjacent.push(siblings[currentIndex]) // 后一个
    }

    return {
      all: siblings,
      adjacent
    }
  } catch (error) {
    console.error('获取兄弟节点失败:', error)
    return { all: [], adjacent: [] }
  }
}

/**
 * 修改获取本地树数据的方法
 * @param {string} noteId - 笔记 ID
 * @returns {Promise<LocalTreeData>} 返回本地树数据
 */
export async function getLocalTree(noteId: string): Promise<LocalTreeData> {
  try {
    // console.group('开始获取本地树数据')
    // console.log('请求笔记ID:', noteId)

    // 1. 获取当前笔记
    const currentNote = await db('notes')
      .where('id', noteId)
      .where('isDeleted', false)
      .where('cardType', 'Maincard') // 添加这个条件
      .first()

    if (!currentNote) {
      throw new Error('笔记不存在')
    }

    // console.log('当前笔记:', currentNote)
    // console.log('当前笔记地址:', currentNote.address)

    // 2. 获取父节点
    const level = getAddressLevel(currentNote.address)
    // console.log('当前节点层级:', level)

    let parentNote = null
    if (level) {
      // 确保有有效的层级
      const parentAddress = getParentAddress(currentNote.address)
      // console.log('计算得到的父节点地址:', parentAddress)

      if (parentAddress) {
        parentNote = await db('notes')
          .where('address', parentAddress)
          .where('isDeleted', false)
          .where('cardType', 'Maincard')
          .first()
        // console.log('获取到的父节点:', parentNote)
      }
    }

    // 3. 获取子节点
    const childrenNodes = await getChildNodes(currentNote.address)
    // console.log('获取到的子节点数组:', childrenNodes)

    const children = await Promise.all(
      childrenNodes.map(async (node) => {
        const note = await db('notes')
          .where('id', node.id)
          .where('isDeleted', false)
          .where('cardType', 'Maincard')
          .first()
        return note as Note
      })
    )
    // console.log('转换后的子节点:', children)

    // 4. 获取兄弟节点
    const siblings = await getSiblingNodes(currentNote)
    // console.log('获取到的兄弟节点:', siblings)

    const result = {
      current: currentNote,
      parent: parentNote,
      children: children.filter((note): note is Note => note !== null),
      siblings
    }

    // console.log('最终返回的数据:', result)
    // console.groupEnd()
    return result
  } catch (error) {
    console.error('获取本地树数据失败:', error)
    // console.groupEnd()
    throw error
  }
}
