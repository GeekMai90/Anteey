import { Note, Keyword } from '../types/Note'

/**
 * 计算两组关键词的相似度
 * @param keywords1 第一组关键词
 * @param keywords2 第二组关键词
 * @returns 相似度分数 (0-1)
 */
export function calculateSimilarity(keywords1: Keyword[], keywords2: Keyword[]): number {
  if (!keywords1?.length || !keywords2?.length) return 0

  // 创建关键词权重映射
  const weightMap1 = new Map(keywords1.map((k) => [k.word, k.weight]))
  const weightMap2 = new Map(keywords2.map((k) => [k.word, k.weight]))

  // 计算共同关键词的权重贡献
  let similarity = 0
  let totalWeight1 = 0
  let totalWeight2 = 0

  // 累加所有权重
  weightMap1.forEach((weight) => (totalWeight1 += weight))
  weightMap2.forEach((weight) => (totalWeight2 += weight))

  // 计算共同关键词的相似度贡献
  weightMap1.forEach((weight1, word) => {
    const weight2 = weightMap2.get(word)
    if (weight2) {
      // 使用归一化的权重计算相似度
      similarity += (weight1 / totalWeight1) * (weight2 / totalWeight2)
    }
  })

  return similarity
}

/**
 * 查找与当前笔记相关的笔记
 * @param currentNote 当前笔记
 * @param allNotes 所有笔记
 * @param limit 返回的相关笔记数量
 * @returns 相关笔记数组
 */
export function findRelatedNotes(
  currentNote: Note,
  allNotes: Note[],
  limit: number = 5
): { note: Note; similarity: number }[] {
  if (!currentNote?.keywords?.length) return []

  // 计算所有其他笔记与当前笔记的相似度
  const notesWithSimilarity = allNotes
    .filter(
      (note) =>
        note.id !== currentNote.id && // 排除当前笔记
        !note.isDeleted && // 排除已删除的笔记
        note.keywords &&
        note.keywords.length > 0 // 确保有关键词
    )
    .map((note) => ({
      note,
      similarity: calculateSimilarity(currentNote.keywords!, note.keywords!)
    }))
    .filter((item) => item.similarity > 0) // 只保留有相似度的笔记
    .sort((a, b) => b.similarity - a.similarity) // 按相似度降序排序
    .slice(0, limit) // 只取前 N 个

  return notesWithSimilarity
}
