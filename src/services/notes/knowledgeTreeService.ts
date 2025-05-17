import { db } from '../../db/config'
import { Note } from '@shared/types'
import { KnowledgeTreeNode, AddressLevel } from '@shared/types'
import { createNote } from './notesService'

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
    noteId: note.id,
    isIndexed: note.isIndexed || false // 添加索引状态
  }

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
export function getAddressLevel(address: string): AddressLevel | null {
  // 1. 基础验证
  if (!address || typeof address !== 'string') {
    console.warn('无效地址: 地址为空或非字符串类型')
    return null
  }

  // 2. 移除空白字符
  address = address.trim()

  // 3. 基础层级验证（4位数字）
  if (/^\d{4}$/.test(address)) {
    // 检查是否全为0
    if (parseInt(address) === 0) {
      console.warn(`无效地址: 地址不能全为0，当前地址: ${address}`)
      return null
    }

    // 检查各层级
    if (address.endsWith('000')) {
      // 验证第一位不能为0且不能大于9
      if (address[0] === '0' || parseInt(address[0]) > 9) {
        console.warn(`无效地址: 顶层地址第一位必须在1-9范围内，当前地址: ${address}`)
        return null
      }
      return 'top'
    }

    if (address.endsWith('00')) {
      // 验证前两位不能为0
      if (address.slice(0, 2) === '00') {
        console.warn(`无效地址: 二级地址前两位不能为0，当前地址: ${address}`)
        return null
      }
      return 'second'
    }

    // 所有其他4位数都是三级节点
    return 'third'
  }

  // 4. 分支层级验证
  if (address.includes('-')) {
    // 验证分支格式
    const pattern = /^\d{4}(-([1-9]\d{0,2}[a-z]?|[1-9]?\d{0,2}[a-z]))*$/
    if (!pattern.test(address)) {
      console.warn(
        `无效地址: 分支地址格式错误，应为"基础地址-分支号"格式，分支号可以是1-999的正整数或带小写字母，当前地址: ${address}`
      )
      return null
    }

    // 验证基础地址部分
    const baseAddress = address.split('-')[0]
    if (parseInt(baseAddress) === 0) {
      console.warn(`无效地址: 分支地址的基础地址不能全为0，当前地址: ${address}`)
      return null
    }

    // 计算分支层级
    const branchLevel = address.split('-').length - 1
    if (branchLevel > 10) {
      console.warn(
        `无效地址: 分支层级超出限制，最大支持10层分支，当前层级: ${branchLevel}，地址: ${address}`
      )
      return null
    }

    return `branch-${branchLevel}` as AddressLevel
  }

  console.warn(
    `无效地址: 地址格式不符合要求，地址必须是4位数字（如1000）或带分支号的格式（如1100-1），当前地址: ${address}`
  )
  return null
}

// 获取父地址
export function getParentAddress(address: string): string | null {
  const level = getAddressLevel(address)

  if (level === 'top') return null
  if (level === 'second') return `${address[0]}000`
  if (level === 'third') return `${address.slice(0, 2)}00`

  // 修改分支地址的父地址获取逻辑
  if (level && level.startsWith('branch-')) {
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

    // 过滤掉无效地址的节点
    const validNotes = notes.filter((note) => getAddressLevel(note.address) !== null)

    const nodes = await Promise.all(
      validNotes.map(async (note) => {
        const childCount = await getChildCount(note.address)
        const node = {
          ...convertToTreeNode(note, 0),
          childCount
        }
        return node
      })
    )

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
        if (level && level.startsWith('branch-')) {
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
    const level = getAddressLevel(parentAddress)
    // 如果父节点地址无效,返回空数组
    if (!level) {
      return []
    }

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
        if (level && level.startsWith('branch-')) {
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

    // 对笔记进行排序

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

    // 过滤掉无效地址的节点
    const validNotes = notes.filter((note) => getAddressLevel(note.address) !== null)

    const nodes = await Promise.all(
      validNotes.map(async (note) => {
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

// 定义添加方向的枚举
export enum AddDirection {
  Below = 'below', // 向下添加同级节点
  Child = 'child' // 添加子节点
}

/**
 * 创建相邻节点
 * @param noteId 参考笔记的ID
 * @param direction 添加方向
 * @returns Promise<Note> 返回新创建的笔记
 */
export async function createAdjacentNote(noteId: string, direction: AddDirection): Promise<Note> {
  try {
    // 1. 获取参考笔记
    const referenceNote = await db('notes')
      .select('*')
      .where('id', noteId)
      .where('isDeleted', false)
      .where('cardType', 'Maincard')
      .first()

    if (!referenceNote) {
      throw new Error('参考笔记不存在')
    }

    const referenceAddress = referenceNote.address

    // 2. 根据方向获取相关节点的地址
    let newAddress: string = ''

    if (direction === AddDirection.Child) {
      // 获取所有子节点地址
      const childNodes = await getChildNodes(referenceAddress)
      const childAddresses = childNodes.map((node) => node.address)
      newAddress = await generateChildAddress(referenceAddress, childAddresses)
    } else {
      // 获取同级节点地址
      const parentAddress = getParentAddress(referenceAddress)
      if (!parentAddress) {
        throw new Error('无法获取父节点地址')
      }

      const siblingNodes = await getChildNodes(parentAddress)
      const siblingAddresses = siblingNodes.map((node) => node.address)
      newAddress = await generateSiblingAddress(referenceAddress, siblingAddresses)
    }

    // 3. 创建新笔记
    return await createNote({
      address: newAddress,
      cardType: 'Maincard',
      metadata: {
        title: '新笔记'
      }
    })
  } catch (error) {
    console.error('创建相邻节点失败:', error)
    throw error
  }
}

/**
 * 生成同级节点地址
 * @param referenceAddress 参考节点地址
 * @param siblingAddresses 同级节点地址数组
 * @returns Promise<string> 新的同级节点地址
 */
async function generateSiblingAddress(
  referenceAddress: string,
  siblingAddresses: string[]
): Promise<string> {
  const level = getAddressLevel(referenceAddress)
  if (!level) {
    throw new Error('参考节点地址无效')
  }

  // 将参考地址加入到同级地址列表中进行排序
  const allAddresses = [...siblingAddresses, referenceAddress]

  // 对地址进行排序
  allAddresses.sort((a, b) => {
    if (level === 'top' || level === 'second' || level === 'third') {
      // 基础编码按数字大小排序
      return parseInt(a) - parseInt(b)
    } else {
      // 分支编码的排序
      const aParts = a.split('-')
      const bParts = b.split('-')
      const aLast = aParts[aParts.length - 1]
      const bLast = bParts[bParts.length - 1]

      // 解析最后一部分的数字和字母
      const aMatch = aLast.match(/^(\d+)([a-z]?)$/)
      const bMatch = bLast.match(/^(\d+)([a-z]?)$/)

      if (!aMatch || !bMatch) return 0

      const aNum = parseInt(aMatch[1])
      const bNum = parseInt(bMatch[1])

      // 先比较数字部分
      if (aNum !== bNum) return aNum - bNum

      // 如果数字相同，比较字母部分
      const aAlpha = aMatch[2] || ''
      const bAlpha = bMatch[2] || ''
      return aAlpha.localeCompare(bAlpha)
    }
  })

  // 找到参考地址在排序后列表中的位置
  const refIndex = allAddresses.indexOf(referenceAddress)
  if (refIndex === -1) {
    throw new Error('无法找到参考地址在排序列表中的位置')
  }

  // 检查是否是最后一个节点
  const isLastNode = refIndex === allAddresses.length - 1

  // 根据不同的编码类型生成新地址
  if (level === 'top') {
    // 顶级节点（X000）
    const currentNum = parseInt(referenceAddress[0])
    if (isLastNode) {
      if (currentNum >= 9) {
        throw new Error('无法添加更多顶级节点，已达到最大值9')
      }
      return `${currentNum + 1}000`
    } else {
      // 检查下一个节点
      const nextAddress = allAddresses[refIndex + 1]
      const nextNum = parseInt(nextAddress[0])
      if (nextNum - currentNum > 1) {
        // 如果有空隙，使用中间的数字
        return `${currentNum + 1}000`
      }
      throw new Error('无法在相邻的顶级节点之间插入节点')
    }
  }

  if (level === 'second') {
    // 二级节点（XX00）的同级节点是同一顶级节点下的其他二级节点（如4100的同级节点是4200, 4300等）
    const prefix = referenceAddress[0] // 获取顶级编码（第一位数字）
    const currentNum = parseInt(referenceAddress.slice(1, 2)) // 获取第二位数字

    // 检查是否是最后一个二级节点
    let isReallyLastNode = true
    for (const addr of allAddresses) {
      // 检查是否有其他相同顶级编码的二级节点，且编号更大
      if (addr[0] === prefix && parseInt(addr.slice(1, 2)) > currentNum) {
        isReallyLastNode = false
        break
      }
    }

    if (isReallyLastNode) {
      if (currentNum >= 9) {
        throw new Error('无法添加更多二级节点，已达到最大值9')
      }
      return `${prefix}${currentNum + 1}00`
    } else {
      // 检查下一个节点
      // 找到下一个同一顶级节点下的二级节点
      let nextNode: string | null = null
      let nextNodeNum = 10 // 设置一个较大的初始值

      for (const addr of allAddresses) {
        const addrNum = parseInt(addr.slice(1, 2))
        // 只考虑同一顶级节点下的二级节点，且编号大于当前节点
        if (addr[0] === prefix && addrNum > currentNum && addrNum < nextNodeNum) {
          nextNode = addr
          nextNodeNum = addrNum
        }
      }

      // 如果找到下一个节点，并且有空隙，使用中间的数字
      if (nextNode && nextNodeNum - currentNum > 1) {
        return `${prefix}${currentNum + 1}00`
      }

      // 如果没有找到下一个节点，则可以创建 currentNum+1 的节点
      if (!nextNode) {
        return `${prefix}${currentNum + 1}00`
      }

      throw new Error('无法在相邻的二级节点之间插入节点')
    }
  }

  if (level === 'third') {
    // 三级节点（如4101, 4102等）的同级节点应该是4103, 4104等
    // 获取前缀（如4101的前缀是41）
    const prefix = referenceAddress.slice(0, 2) // 获取前两位数字
    const currentNum = parseInt(referenceAddress.slice(2)) // 获取后两位数字

    // 获取所有同前缀的三级节点（例如，所有以"43"开头的四位数节点）
    const prefixSiblings = allAddresses.filter(
      (addr) => /^\d{4}$/.test(addr) && addr.slice(0, 2) === prefix && !addr.endsWith('00')
    )

    // 检查是否有编号更大的节点
    const hasLargerSibling = prefixSiblings.some((addr) => parseInt(addr.slice(2)) > currentNum)

    if (!hasLargerSibling) {
      // 如果没有编号更大的节点，直接创建下一个编号
      if (currentNum >= 99) {
        throw new Error('无法添加更多三级节点，已达到最大值99')
      }
      // 生成新的三级节点地址，确保两位数字格式
      const newLastDigits = (currentNum + 1).toString().padStart(2, '0')
      const newAddress = `${prefix}${newLastDigits}`
      return newAddress
    } else {
      // 找到下一个编号最小的节点
      let nextNum = 100 // 设一个较大的初始值

      for (const addr of prefixSiblings) {
        const num = parseInt(addr.slice(2))
        if (num > currentNum && num < nextNum) {
          nextNum = num
        }
      }

      // 检查是否有空隙可以插入
      if (nextNum > currentNum + 1) {
        // 使用中间的编号
        const newLastDigits = (currentNum + 1).toString().padStart(2, '0')
        const newAddress = `${prefix}${newLastDigits}`
        return newAddress
      }

      // 如果无法插入，抛出错误
      throw new Error(
        `无法在相邻的三级节点之间插入节点 (${referenceAddress} 和 ${prefix}${nextNum.toString().padStart(2, '0')})`
      )
    }
  }

  // 处理分支编码
  if (level.startsWith('branch-')) {
    const parts = referenceAddress.split('-')
    const baseParts = parts.slice(0, -1)
    const baseAddress = baseParts.join('-')
    const lastPart = parts[parts.length - 1]
    const match = lastPart.match(/^(\d+)([a-z]?)$/)

    if (!match) {
      throw new Error('无效的分支编码格式')
    }

    const currentNum = parseInt(match[1])
    const currentAlpha = match[2] || ''

    // 获取所有有相同父节点的兄弟节点
    const siblingsWithSameParent = allAddresses.filter((addr) => {
      const addrParts = addr.split('-')
      // 必须有相同的父地址部分
      return addrParts.length === parts.length && addrParts.slice(0, -1).join('-') === baseAddress
    })

    // 检查是否已经存在下一个数字节点
    const nextNumExists = siblingsWithSameParent.some((addr) => {
      const addrParts = addr.split('-')
      const addrLastPart = addrParts[addrParts.length - 1]
      const addrMatch = addrLastPart.match(/^(\d+)([a-z]?)$/)
      if (!addrMatch) return false

      // 判断是否是下一个数字节点（如4101-2是4101-1的下一个数字节点）
      return parseInt(addrMatch[1]) === currentNum + 1 && !addrMatch[2]
    })

    // 检查是否已存在字母后缀节点
    const maxAlphaSuffix =
      siblingsWithSameParent
        .filter((addr) => {
          const addrParts = addr.split('-')
          const addrLastPart = addrParts[addrParts.length - 1]
          const addrMatch = addrLastPart.match(/^(\d+)([a-z]?)$/)
          return addrMatch && parseInt(addrMatch[1]) === currentNum && addrMatch[2]
        })
        .map((addr) => {
          const addrParts = addr.split('-')
          const addrLastPart = addrParts[addrParts.length - 1]
          const addrMatch = addrLastPart.match(/^(\d+)([a-z]?)$/)
          return addrMatch ? addrMatch[2] : ''
        })
        .sort()
        .pop() || ''

    // 关键逻辑：如果下一个数字节点已存在（如4101-2），应该创建字母后缀节点（如4101-1a）
    if (nextNumExists) {
      // 如果已有字母后缀，创建下一个字母
      if (maxAlphaSuffix) {
        // 找到下一个字母
        const nextChar = String.fromCharCode(maxAlphaSuffix.charCodeAt(0) + 1)
        // 确保不超过'z'
        if (nextChar > 'z') {
          throw new Error('无法创建更多的字母后缀节点，已达到最大值z')
        }
        return `${baseAddress}-${currentNum}${nextChar}`
      } else {
        // 创建第一个字母后缀'a'
        return `${baseAddress}-${currentNum}a`
      }
    }

    // 确定是否真的是最后一个节点（按照编码规则的顺序）
    const isReallyLastNode = !siblingsWithSameParent.some((addr) => {
      const addrParts = addr.split('-')
      const addrLastPart = addrParts[addrParts.length - 1]
      const addrMatch = addrLastPart.match(/^(\d+)([a-z]?)$/)
      if (!addrMatch) return false

      const addrNum = parseInt(addrMatch[1])
      const addrAlpha = addrMatch[2] || ''

      // 如果存在编号更大的节点，或者编号相同但字母更大的节点
      return addrNum > currentNum || (addrNum === currentNum && addrAlpha > currentAlpha)
    })

    if (isReallyLastNode) {
      // 如果是最后一个节点，创建下一个数字节点
      return `${baseAddress}-${currentNum + 1}`
    } else {
      // 尝试找到下一个节点
      let nextNum = Infinity

      // 查找编号比当前大的最小编号
      for (const addr of siblingsWithSameParent) {
        const addrParts = addr.split('-')
        const addrLastPart = addrParts[addrParts.length - 1]
        const addrMatch = addrLastPart.match(/^(\d+)([a-z]?)$/)
        if (!addrMatch) continue

        const addrNum = parseInt(addrMatch[1])

        if (addrNum > currentNum && addrNum < nextNum) {
          nextNum = addrNum
        }
      }

      // 如果找到下一个编号，并且有空隙
      if (nextNum < Infinity && nextNum > currentNum + 1) {
        return `${baseAddress}-${currentNum + 1}`
      }

      // 如果没有找到下一个编号，创建新的
      if (nextNum === Infinity) {
        return `${baseAddress}-${currentNum + 1}`
      }

      // 找到相邻编号但已存在，使用字母后缀
      if (nextNum === currentNum + 1) {
        return `${baseAddress}-${currentNum}a`
      }

      // 其他情况
      throw new Error('无法在当前位置插入节点')
    }
  }

  throw new Error('不支持的节点层级类型')
}

/**
 * 生成子节点地址
 * @param parentAddress 父节点地址
 * @param existingAddresses 已存在的子节点地址数组
 * @returns Promise<string> 新的子节点地址
 */
async function generateChildAddress(
  parentAddress: string,
  existingAddresses: string[]
): Promise<string> {
  const parentLevel = getAddressLevel(parentAddress)
  if (!parentLevel) {
    throw new Error('父节点地址无效')
  }

  // 处理基础编码的情况
  if (parentLevel === 'top') {
    // 父节点是顶级节点（如1000），子节点应该是二级节点（如1100, 1200等）
    const prefix = parentAddress[0] // 获取第一位数字
    const existingSecondDigits = existingAddresses
      .map((addr) => parseInt(addr[1]))
      .filter((num) => !isNaN(num))

    // 找到最大的第二位数字
    const maxSecondDigit = Math.max(0, ...existingSecondDigits)
    if (maxSecondDigit >= 9) {
      throw new Error('无法创建更多的二级节点，已达到最大值9')
    }

    // 生成新的二级节点地址
    return `${prefix}${maxSecondDigit + 1}00`
  }

  if (parentLevel === 'second') {
    // 父节点是二级节点（如1100），子节点应该是三级节点（如1101, 1102等）
    const prefix = parentAddress.slice(0, 2) // 获取前两位数字
    const existingLastDigits = existingAddresses
      .map((addr) => parseInt(addr.slice(2)))
      .filter((num) => !isNaN(num))

    // 找到最大的后两位数字
    const maxLastDigits = Math.max(0, ...existingLastDigits)
    if (maxLastDigits >= 99) {
      throw new Error('无法创建更多的三级节点，已达到最大值99')
    }

    // 生成新的三级节点地址，确保两位数字格式
    const newLastDigits = (maxLastDigits + 1).toString().padStart(2, '0')
    return `${prefix}${newLastDigits}`
  }

  if (parentLevel === 'third') {
    // 父节点是三级节点（如4101, 4102等），子节点应该是分支节点（如4101-1, 4101-2等）
    // 注意：这里需要创建分支节点，而不是新的三级节点

    // 获取所有直接子节点
    const childBranches = existingAddresses.filter((addr) => {
      const parts = addr.split('-')
      // 确保只获取直接子节点，如4101-1，而不是4101-1-1
      return parts.length === 2 && parts[0] === parentAddress
    })

    if (childBranches.length === 0) {
      // 如果没有子节点，创建第一个分支
      return `${parentAddress}-1`
    }

    // 获取最大的分支编号
    let maxBranchNum = 0
    for (const childAddr of childBranches) {
      const branchNum = parseInt(childAddr.split('-')[1])
      if (!isNaN(branchNum) && branchNum > maxBranchNum) {
        maxBranchNum = branchNum
      }
    }

    // 创建下一个分支编号
    return `${parentAddress}-${maxBranchNum + 1}`
  }

  if (parentLevel.startsWith('branch-')) {
    // 父节点是分支节点（如4101-1），子节点应该是4101-1-1, 4101-1-2等
    if (existingAddresses.length === 0) {
      // 如果没有子节点，创建第一个分支
      return `${parentAddress}-1`
    }

    // 获取最后一个分支的编号
    const lastBranch = existingAddresses
      .map((addr) => {
        const parts = addr.split('-')
        const lastPart = parts[parts.length - 1]
        // 只匹配数字部分
        const match = lastPart.match(/^(\d+)$/)
        return match ? parseInt(match[1]) : null
      })
      .filter((num): num is number => num !== null)
      .sort((a, b) => b - a)[0]

    if (!lastBranch) {
      return `${parentAddress}-1`
    }

    // 直接增加数字
    return `${parentAddress}-${lastBranch + 1}`
  }

  throw new Error('不支持的父节点层级类型')
}
