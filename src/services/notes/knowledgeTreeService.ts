import { db } from '../../db/config'
import { Note } from '../../renderer/src/types/Note'
import { KnowledgeTreeNode, AddressLevel } from '../../renderer/src/types/knowledgeTree'

// 工具函数：将笔记数据转换为树节点
function convertToTreeNode(note: Note, level: number): KnowledgeTreeNode {
  console.log('转换节点的原始数据:', note)

  // 解析 metadata JSON 字符串
  let metadata = null
  try {
    metadata = note.metadata ? JSON.parse(note.metadata as string) : null
    console.log('解析后的 metadata:', metadata)
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
    isFocused: false
  }

  console.log('转换后的节点:', node)
  return node
}

// 添加 getNextLevel 函数
function getNextLevel(level: AddressLevel): number {
  switch (level) {
    case 'top':
      return 1
    case 'second':
      return 2
    case 'third':
      return 3
    case 'branch-1':
      return 4
    case 'branch-2':
      return 5
    default:
      return 0
  }
}

// 获取地址层级
function getAddressLevel(address: string): AddressLevel {
  if (/^\d{4}$/.test(address)) {
    if (address.endsWith('000')) return 'top'
    if (address.endsWith('00')) return 'second'
    return 'third'
  }
  if (address.includes('-')) {
    return address.split('-').length === 2 ? 'branch-1' : 'branch-2'
  }
  throw new Error(`Invalid address format: ${address}`)
}

// 获取父地址
function getParentAddress(address: string): string | null {
  const level = getAddressLevel(address)

  switch (level) {
    case 'top':
      return null
    case 'second':
      return `${address[0]}000`
    case 'third':
      return `${address.slice(0, 2)}00`
    case 'branch-1':
      return address.split('-')[0]
    case 'branch-2':
      return address.split('-').slice(0, 2).join('-')
    default:
      return null
  }
}

// 获取顶层节点
export async function getTopLevelNodes(): Promise<KnowledgeTreeNode[]> {
  try {
    const notes = await db('notes')
      .select('*')
      .where('address', 'like', '%000')
      .where('isDeleted', false)
      .orderBy('address', 'asc')

    console.log('获取到的顶层笔记数据:', notes)

    const nodes = await Promise.all(
      notes.map(async (note) => {
        const childCount = await getChildCount(note.address)
        const node = {
          ...convertToTreeNode(note, 0),
          childCount
        }
        console.log('转换后的节点数据:', node)
        return node
      })
    )

    console.log('最终返回的节点数组:', nodes)
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
        pattern = `${parentAddress[0]}___`
        break
      case 'second':
        pattern = `${parentAddress.slice(0, 2)}__`
        break
      case 'third':
        pattern = `${parentAddress}-_%`
        break
      case 'branch-1':
        pattern = `${parentAddress}-_%`
        break
      default:
        return 0
    }

    const result = (await db('notes')
      .where('address', 'like', pattern)
      .where('isDeleted', false)
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
      case 'branch-1':
        pattern = `${parentAddress}-%`
        break
      default:
        throw new Error(`Invalid address level: ${level}`)
    }

    const notes = await db('notes')
      .select('*')
      .where('address', 'like', pattern)
      .whereNot('address', parentAddress)
      .where('isDeleted', false)
      .whereRaw('(address NOT LIKE ? OR address = ?)', [
        `${parentAddress}-%-%`,
        `${parentAddress}-1`
      ])
      .orderBy('address', 'asc')

    console.log('SQL查询条件:', {
      pattern,
      parentAddress,
      level
    })
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
