import { db } from '../../db/config'
import { Note } from '@shared/types'
import { KnowledgeTreeNode, AddressLevel } from '@shared/types'

// 定义 metadata 的接口
interface NoteMetadata {
  title: string
  content?: string
  tags?: string[]
  createdAt?: string
  updatedAt?: string
  // ... 其他可能的 metadata 字段
}
// 工具函数：将笔记数据转换为树节点
function convertToTreeNode(note: Note, level: number): KnowledgeTreeNode {
  // console.log('转换节点的原始数据:', note)

  // 解析 metadata JSON 字符串
  let metadata: NoteMetadata | null = null
  try {
    metadata = note.metadata ? JSON.parse(note.metadata as string) : null
    // console.log('解析后的 metadata:', metadata)
  } catch (error) {
    console.error('解析 metadata 失败:', error)
  }

  const node = {
    id: note.id,
    address: note.address,
    title: metadata?.title || '', // 使用解析后的 metadata
    childCount: 0,
    level,
    isExpanded: false,
    isFocused: false,
    noteId: note.id
  }

  console.log('转换后的节点:', node)
  return node
}

// 添加 getNextLevel 函数
function getNextLevel(level: AddressLevel): number {
  if (level === 'top') return 1
  if (level === 'second') return 2
  if (level === 'third') return 3

  // 修改分支层级的下一级计算逻辑
  if (level.startsWith('branch-')) {
    const currentLevel = parseInt(level.split('-')[1])
    return currentLevel + 3 // 基础层级(3) + 分支层级
  }

  return 0
}

// 获取地址层级
function getAddressLevel(address: string): AddressLevel {
  if (/^\d{4}$/.test(address)) {
    if (address.endsWith('000')) return 'top'
    if (address.endsWith('00')) return 'second'
    return 'third'
  }
  if (address.includes('-')) {
    // 修改分支层级判断逻辑
    const branchLevel = address.split('-').length - 1
    return `branch-${branchLevel}` as AddressLevel
  }
  throw new Error(`Invalid address format: ${address}`)
}

// 获取父地址
function getParentAddress(address: string): string | null {
  const level = getAddressLevel(address)

  if (level === 'top') return null
  if (level === 'second') return `${address[0]}000`
  if (level === 'third') return `${address.slice(0, 2)}00`

  // 修改分支地址的父地址获取逻辑
  if (level.startsWith('branch-')) {
    const parts = address.split('-')
    return parts.slice(0, -1).join('-')
  }

  return null
}

// 获取顶层节点
export async function getTopLevelNodes(): Promise<KnowledgeTreeNode[]> {
  try {
    const notes = await db('notes')
      .select('*')
      .where('address', 'like', '%000')
      .where('isDeleted', false)
      .where('cardType', 'Maincard')
      .orderBy('address', 'asc')

    // console.log('获取到的顶层笔记数据:', notes)

    const nodes = await Promise.all(
      notes.map(async (note) => {
        const childCount = await getChildCount(note.address)
        const node = {
          ...convertToTreeNode(note, 0),
          childCount
        }
        // console.log('转换后的节点数据:', node)
        return node
      })
    )

    // console.log('最终返回的节点数组:', nodes)
    return nodes
  } catch (error) {
    console.error('获取顶层节点失败:', error)
    throw error
  }
}

// 获取子节点数量
export async function getChildCount(parentAddress: string): Promise<number> {
  try {
    const level = getAddressLevel(parentAddress)
    let pattern: string

    switch (level) {
      case 'top':
        pattern = `${parentAddress[0]}%00`
        break
      case 'second':
        pattern = `${parentAddress.slice(0, 2)}__`
        break
      case 'third':
        pattern = `${parentAddress}-_%`
        break
      default:
        if (level.startsWith('branch-')) {
          // 对于任意层级的分支节点，只匹配直接子节点
          pattern = `${parentAddress}-%`
        } else {
          return 0
        }
    }

    const result = (await db('notes')
      .where('address', 'like', pattern)
      .whereNot('address', parentAddress)
      .where('isDeleted', false)
      .where('cardType', 'Maincard')
      // 对于分支节点，确保只计算直接子节点
      .whereRaw('(address NOT LIKE ? OR address = ?)', [
        `${parentAddress}-%-%`,
        `${parentAddress}-1`
      ])
      .count('* as count')
      .first()) as { count: number }

    return result ? Number(result.count) : 0
  } catch (error) {
    console.error('获取子节点数量失败:', error)
    throw error
  }
}

// 获取子节点
export async function getChildNodes(parentAddress: string): Promise<KnowledgeTreeNode[]> {
  try {
    console.log('开始获取子节点, 父地址:', parentAddress)
    const level = getAddressLevel(parentAddress)
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
          // 对于任意层级的分支节点，只匹配直接子节点
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

    console.log('SQL查询条件:', {
      pattern,
      parentAddress,
      level
    })
    console.log('查询到的笔记:', notes)

    // 对笔记进行排序
    notes.sort((a, b) => {
      const aLast = a.address.split('-').pop() || ''
      const bLast = b.address.split('-').pop() || ''

      const aMatch = aLast.match(/^(\d+)([a-z]*)$/)
      const bMatch = bLast.match(/^(\d+)([a-z]*)$/)

      if (!aMatch || !bMatch) return 0

      const aNum = parseInt(aMatch[1])
      const bNum = parseInt(bMatch[1])

      // 先比较数字部分
      if (aNum !== bNum) return aNum - bNum

      // 如果数字相同，比较字母部分
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

    console.log('最终返回的子节点数组:', nodes)
    return nodes
  } catch (error) {
    console.error('获取子节点失败:', error)
    throw error
  }
}

// 根据地址获取完整路径
export async function getNodePath(address: string): Promise<KnowledgeTreeNode[]> {
  try {
    const path: KnowledgeTreeNode[] = []
    let currentAddress: string | null = address
    let level = 0

    while (currentAddress !== null) {
      const note = await db('notes')
        .select('*')
        .where('address', currentAddress)
        .where('isDeleted', false)
        .where('cardType', 'Maincard')
        .first()

      if (note) {
        const childCount = await getChildCount(note.address)
        path.unshift({
          ...convertToTreeNode(note, level),
          childCount
        })
      }

      currentAddress = getParentAddress(currentAddress)
      level++
    }

    return path
  } catch (error) {
    console.error('获取节点路径失败:', error)
    throw error
  }
}
