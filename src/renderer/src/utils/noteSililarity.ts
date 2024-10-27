import { Keyword } from '../types/Note'

// 定义核心概念及其相关词
const CORE_CONCEPTS = new Map([
  ['卢曼', ['luhmann', '卢曼卡片盒', 'zettelkasten', '尼克拉斯']],
  ['卡片盒', ['卡片', 'zettelkasten', '笔记系统', '笔记工具']],
  ['笔记', ['笔记法', '记录', '卡片', '记笔记']],
  ['知识', ['知识管理', '学习', '思维', '认知']],
  ['方法', ['方法论', '系统', '工具', '技巧']],
  ['链接', ['关联', '连接', '引用', '网络']],
  ['索引', ['检索', '查找', '目录', '搜索']],
  ['写作', ['创作', '写文章', '写书', '著作']]
])

export function calculateSimilarity(keywords1: Keyword[], keywords2: Keyword[]): number {
  if (!keywords1?.length || !keywords2?.length) return 0

  // 1. 预处理关键词，确保权重归一化
  const normalizeKeywords = (keywords: Keyword[]) => {
    const totalWeight = keywords.reduce((sum, k) => sum + k.weight, 0)
    return keywords.map((k) => ({
      word: k.word.toLowerCase(),
      weight: k.weight / totalWeight
    }))
  }

  const words1 = normalizeKeywords(keywords1)
  const words2 = normalizeKeywords(keywords2)

  // 2. 计算核心主题匹配
  let coreThemeScore = 0
  const coreThemes = ['卢曼', '卡片盒', 'zettelkasten']
  const hasCommonCore = coreThemes.some((theme) => {
    const inWords1 = words1.some((w) => w.word.includes(theme))
    const inWords2 = words2.some((w) => w.word.includes(theme))
    return inWords1 && inWords2
  })
  if (hasCommonCore) {
    coreThemeScore = 0.4
  }

  // 3. 计算匹配分数
  let totalScore = coreThemeScore
  const matched = new Set<string>()

  // 完全匹配（权重2.0）
  words1.forEach((k1) => {
    if (matched.has(k1.word)) return
    const match = words2.find((k2) => !matched.has(k2.word) && k1.word === k2.word)
    if (match) {
      totalScore += Math.min(k1.weight, match.weight) * 2.0
      matched.add(k1.word)
      matched.add(match.word)
    }
  })

  // 核心概念匹配（权重1.5）
  words1.forEach((k1) => {
    if (matched.has(k1.word)) return
    words2.forEach((k2) => {
      if (matched.has(k2.word)) return

      for (const [concept, related] of CORE_CONCEPTS.entries()) {
        const isWord1Related = concept === k1.word || related.includes(k1.word)
        const isWord2Related = concept === k2.word || related.includes(k2.word)

        if (isWord1Related && isWord2Related) {
          totalScore += Math.min(k1.weight, k2.weight) * 1.5
          matched.add(k1.word)
          matched.add(k2.word)
          break
        }
      }
    })
  })

  // 包含关系（权重1.0）
  words1.forEach((k1) => {
    if (matched.has(k1.word)) return
    const match = words2.find(
      (k2) => !matched.has(k2.word) && (k1.word.includes(k2.word) || k2.word.includes(k1.word))
    )
    if (match) {
      totalScore += Math.min(k1.weight, match.weight) * 1.0
      matched.add(k1.word)
      matched.add(match.word)
    }
  })

  // 4. 应用相似度提升因子
  const matchedRatio = matched.size / Math.min(words1.length, words2.length)
  const boostFactor = Math.pow(matchedRatio, 0.5)

  // 5. 计算最终相似度
  const rawSimilarity = totalScore * boostFactor * 100

  // 6. 调整相似度分档
  if (hasCommonCore) {
    if (rawSimilarity >= 60) return Math.min(98, Math.max(85, rawSimilarity))
    if (rawSimilarity >= 40) return Math.min(95, Math.max(75, rawSimilarity))
    return Math.min(85, Math.max(65, rawSimilarity))
  } else {
    if (rawSimilarity >= 70) return Math.min(98, rawSimilarity)
    if (rawSimilarity >= 50) return Math.min(90, rawSimilarity)
    if (rawSimilarity >= 30) return Math.min(80, rawSimilarity)
    return Math.min(60, rawSimilarity)
  }
}
