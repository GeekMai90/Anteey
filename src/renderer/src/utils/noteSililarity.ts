// import { Note, Keyword } from '../types/Note'

// /**
//  * 计算两组关键词的相似度
//  * @param keywords1 第一组关键词
//  * @param keywords2 第二组关键词
//  * @returns 相似度分数 (0-1)
//  */
// export function calculateSimilarity(keywords1: Keyword[], keywords2: Keyword[]): number {
//   if (!keywords1?.length || !keywords2?.length) return 0

//   // 创建关键词权重映射
//   const weightMap1 = new Map(keywords1.map((k) => [k.word, k.weight]))
//   const weightMap2 = new Map(keywords2.map((k) => [k.word, k.weight]))

//   // 计算共同关键词的权重贡献
//   let similarity = 0
//   let totalWeight1 = 0
//   let totalWeight2 = 0

//   // 累加所有权重
//   weightMap1.forEach((weight) => (totalWeight1 += weight))
//   weightMap2.forEach((weight) => (totalWeight2 += weight))

//   // 计算共同关键词的相似度贡献
//   weightMap1.forEach((weight1, word) => {
//     const weight2 = weightMap2.get(word)
//     if (weight2) {
//       // 使用归一化的权重计算相似度
//       similarity += (weight1 / totalWeight1) * (weight2 / totalWeight2)
//     }
//   })

//   return similarity
// }

// /**
//  * 查找与当前笔记相关的笔记
//  * @param currentNote 当前笔记
//  * @param allNotes 所有笔记
//  * @param limit 返回的相关笔记数量
//  * @returns 相关笔记数组
//  */
// export function findRelatedNotes(
//   currentNote: Note,
//   allNotes: Note[],
//   limit: number = 5
// ): { note: Note; similarity: number }[] {
//   if (!currentNote?.keywords?.length) return []

//   // 计算所有其他笔记与当前笔记的相似度
//   const notesWithSimilarity = allNotes
//     .filter(
//       (note) =>
//         note.id !== currentNote.id && // 排除当前笔记
//         !note.isDeleted && // 排除已删除的笔记
//         note.keywords &&
//         note.keywords.length > 0 // 确保有关键词
//     )
//     .map((note) => ({
//       note,
//       similarity: calculateSimilarity(currentNote.keywords!, note.keywords!)
//     }))
//     .filter((item) => item.similarity > 0) // 只保留有相似度的笔记
//     .sort((a, b) => b.similarity - a.similarity) // 按相似度降序排序
//     .slice(0, limit) // 只取前 N 个

//   return notesWithSimilarity
// }
interface Keyword {
  word: string
  weight: number
}

// 扩展同义词映射表
const SYNONYM_MAP = new Map<string, string[]>([
  ['react', ['reactjs', 'react.js', 'react开发']],
  ['nextjs', ['next.js', 'next', 'next开发']],
  ['javascript', ['js', 'typescript', 'ts']],
  ['性能', ['优化', 'performance', '提升', '改进']],
  ['组件', ['component', 'components', '模块']],
  ['服务端', ['server', 'ssr', 'server-side']],
  ['客户端', ['client', 'client-side', 'browser']],
  ['开发', ['实践', '应用', '使用']],
  ['配置', ['设置', '构建', 'config']],
  ['优化', ['performance', '提升', '改进']]
])

export function calculateSimilarity(keywords1: Keyword[], keywords2: Keyword[]): number {
  if (!keywords1?.length || !keywords2?.length) return 0

  // 1. 预处理关键词
  const normalizeKeywords = (keywords: Keyword[]): Map<string, number> => {
    const weightMap = new Map<string, number>()

    keywords.forEach(({ word, weight }) => {
      const normalizedWord = word.toLowerCase().trim()
      // 提高原始关键词的权重
      weightMap.set(normalizedWord, (weightMap.get(normalizedWord) || 0) + weight * 1.2)

      // 同义词权重提高到 0.9
      const synonyms = SYNONYM_MAP.get(normalizedWord) || []
      synonyms.forEach((synonym) => {
        weightMap.set(synonym, (weightMap.get(synonym) || 0) + weight * 0.9)
      })
    })

    return weightMap
  }

  const weightMap1 = normalizeKeywords(keywords1)
  const weightMap2 = normalizeKeywords(keywords2)

  // 2. 计算总权重
  let totalWeight1 = 0
  let totalWeight2 = 0
  weightMap1.forEach((weight) => (totalWeight1 += weight))
  weightMap2.forEach((weight) => (totalWeight2 += weight))

  // 3. 计算相似度
  let similarity = 0

  weightMap1.forEach((weight1, word1) => {
    // 完全匹配权重提高到 1.2
    if (weightMap2.has(word1)) {
      const weight2 = weightMap2.get(word1)!
      similarity += (weight1 / totalWeight1) * (weight2 / totalWeight2) * 1.2
    }
    // 部分匹配权重提高到 0.8
    else {
      weightMap2.forEach((weight2, word2) => {
        if (word1.includes(word2) || word2.includes(word1)) {
          similarity += (weight1 / totalWeight1) * (weight2 / totalWeight2) * 0.8
        }
        // 编辑距离匹配权重提高到 0.6
        else if (calculateLevenshteinDistance(word1, word2) <= 2) {
          similarity += (weight1 / totalWeight1) * (weight2 / totalWeight2) * 0.6
        }
      })
    }
  })

  // 4. 根据文本长度相似度进行额外加权
  const lengthSimilarity =
    Math.min(keywords1.length, keywords2.length) / Math.max(keywords1.length, keywords2.length)
  similarity = similarity * (0.8 + lengthSimilarity * 0.2)

  return Math.min(1, similarity)
}

// 计算编辑距离（Levenshtein Distance）
function calculateLevenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1, // 替换
          dp[i - 1][j] + 1, // 删除
          dp[i][j - 1] + 1 // 插入
        )
      }
    }
  }

  return dp[m][n]
}
