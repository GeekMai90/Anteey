export interface AddressStructure {
  segments: string[]
  level: number
  isRoot: boolean
}

export function parseAddress(address: string): AddressStructure {
  const segments = address.split('-')

  return {
    segments,
    level: segments.length,
    isRoot: segments.length === 1
  }
}

export function getRelatedAddresses(address: string) {
  const structure = parseAddress(address)
  const results = {
    parent: '',
    siblings: [] as string[],
    children: [] as string[]
  }

  // 获取父地址
  if (!structure.isRoot) {
    results.parent = structure.segments.slice(0, -1).join('-')
  }

  // 获取同级地址
  const lastSegment = structure.segments[structure.segments.length - 1]
  const parentSegments = structure.segments.slice(0, -1)

  // 处理不同类型的编码
  if (/^\d+$/.test(lastSegment)) {
    // 纯数字编码: 1212, 1212-1, 1212-2
    const num = parseInt(lastSegment)
    if (num > 1) {
      results.siblings.push([...parentSegments, (num - 1).toString()].join('-'))
    }
    results.siblings.push([...parentSegments, (num + 1).toString()].join('-'))

    // 添加可能的子地址
    results.children.push(`${address}-1`)
    results.children.push(`${address}a`)
  } else if (/^[1-9]\d*[a-z]$/.test(lastSegment)) {
    // 数字+字母编码: 1212-1a, 1212-1b
    // 同级地址应该是同一个数字下的其他字母
    const baseNum = lastSegment.slice(0, -1)
    const letter = lastSegment.slice(-1)
    if (letter !== 'a') {
      const prevLetter = String.fromCharCode(letter.charCodeAt(0) - 1)
      results.siblings.push([...parentSegments, `${baseNum}${prevLetter}`].join('-'))
    }
    const nextLetter = String.fromCharCode(letter.charCodeAt(0) + 1)
    results.siblings.push([...parentSegments, `${baseNum}${nextLetter}`].join('-'))

    // 添加可能的子地址
    results.children.push(`${address}-1`)
  }

  return results
}
