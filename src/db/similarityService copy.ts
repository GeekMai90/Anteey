import { Segment, useDefault } from 'segmentit'
import { Keyword } from '../renderer/src/types/Embedding'
import log from 'electron-log/renderer'

// 初始化分词器
const segment = new Segment()
useDefault(segment)

// 技术领域词典
const DOMAIN_TERMS = new Map([
  // AI/机器学习相关
  ['机器学习', { standard: '机器学习', weight: 2.0 }],
  ['深度学习', { standard: '深度学习', weight: 2.0 }],
  ['神经网络', { standard: '神经网络', weight: 2.0 }],
  ['人工智能', { standard: '人工智能', weight: 2.0 }],
  ['自然语言处理', { standard: 'NLP', weight: 2.0 }],
  ['nlp', { standard: 'NLP', weight: 2.0 }],

  // 编程相关
  ['python', { standard: 'Python', weight: 1.5 }],
  ['javascript', { standard: 'JavaScript', weight: 1.5 }],
  ['typescript', { standard: 'TypeScript', weight: 1.5 }],

  // 数据结构算法
  ['数据结构', { standard: '数据结构', weight: 1.8 }],
  ['算法', { standard: '算法', weight: 1.8 }],
  ['数组', { standard: '数组', weight: 1.5 }],
  ['链表', { standard: '链表', weight: 1.5 }]
])

// 停用词表
const STOP_WORDS = new Set([
  '的',
  '了',
  '和',
  '与',
  '或',
  '在',
  '是',
  '都',
  '而',
  '还',
  '又',
  '也',
  '就',
  '但',
  '并',
  '很',
  '这',
  '那',
  '有',
  '会',
  '来',
  '去',
  '把',
  '到',
  '被',
  '让',
  '给',
  '从',
  '向',
  '它'
])

// 提取文本内容
function extractText(content: any): string {
  if (!content) return ''
  if (typeof content === 'string') return content

  if (Array.isArray(content)) {
    return content
      .map((item) => extractText(item))
      .filter(Boolean)
      .join(' ')
  }

  if (typeof content === 'object') {
    if (content.type === 'text' && content.text) {
      return content.text
    }
    if (content.content) {
      return extractText(content.content)
    }
  }
  return ''
}

// 预处理文本
function preProcessText(text: string): string {
  try {
    let processedText = text.toLowerCase().trim()

    // 处理技术术语
    DOMAIN_TERMS.forEach(({ standard }, term) => {
      const pattern = new RegExp(term, 'gi')
      processedText = processedText.replace(pattern, standard)
    })

    // 只保留中文、英文、数字和基本标点
    processedText = processedText.replace(/[^\u4e00-\u9fa5a-z0-9\s.,，。]/gi, ' ')
    processedText = processedText.replace(/\s+/g, ' ').trim()

    return processedText
  } catch (error) {
    log.error('文本预处理失败:', error)
    return ''
  }
}

// 提取关键词
export function extractKeywords(content: any): Keyword[] {
  try {
    const text = extractText(content)
    if (!text.trim()) return []

    const processedText = preProcessText(text)
    if (!processedText) return []

    // 分词并进行初步过滤
    const words = segment
      .doSegment(processedText, {
        simple: true,
        stripPunctuation: true
      })
      .filter(
        (word: string) => !STOP_WORDS.has(word) && word.length >= 2 && !/^\d+$/.test(word) // 过滤纯数字
      )

    // 使用 TF-IDF 思想计算词重要性
    const wordStats = new Map<
      string,
      {
        count: number // 词频
        weight: number // 权重
        positions: number[] // 词在文章中的位置
        firstOccurrence: number // 首次出现位置
      }
    >()

    words.forEach((word: string, index: number) => {
      const domainTerm = DOMAIN_TERMS.get(word.toLowerCase())
      const key = domainTerm ? domainTerm.standard : word

      const stats = wordStats.get(key) || {
        count: 0,
        weight: domainTerm ? domainTerm.weight : 1.0,
        positions: [],
        firstOccurrence: index
      }

      stats.count += 1
      stats.positions.push(index)
      wordStats.set(key, stats)
    })

    // 计算最终权重，考虑多个因素
    const totalWords = words.length
    const keywords = Array.from(wordStats.entries())
      .map(([word, stats]) => {
        // 基础权重
        const weight = (stats.count / totalWords) * stats.weight

        // 位置权重（标题和开头的词更重要）
        const positionBoost = Math.exp(-stats.firstOccurrence / totalWords)

        // 分布权重（分散分布的词可能更重要）
        const distribution =
          stats.positions.length > 1
            ? stats.positions.reduce(
                (acc, pos, i, arr) => (i > 0 ? acc + (pos - arr[i - 1]) : 0),
                0
              ) /
              (stats.positions.length - 1)
            : 0
        const distributionBoost = 1 + distribution / totalWords

        return {
          word,
          weight: weight * (1 + positionBoost) * distributionBoost
        }
      })
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10)

    log.info('关键词提取详情:', {
      文本信息: {
        原文长度: text.length,
        处理后长度: processedText.length,
        分词数量: words.length
      },
      关键词结果: keywords.map((k) => ({
        词: k.word,
        权重: k.weight.toFixed(4)
      }))
    })

    return keywords
  } catch (error) {
    log.error('关键词提取失败:', error)
    return []
  }
}

// 计算关键词相似度
export function calculateKeywordSimilarity(keywords1: Keyword[], keywords2: Keyword[]): number {
  try {
    const map1 = new Map(keywords1.map((k) => [k.word, k.weight]))
    const map2 = new Map(keywords2.map((k) => [k.word, k.weight]))

    // 计算余弦相似度
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    // 计算点积和范数
    map1.forEach((weight1, word) => {
      norm1 += weight1 * weight1
      const weight2 = map2.get(word)
      if (weight2) {
        dotProduct += weight1 * weight2
      }
    })

    map2.forEach((weight2) => {
      norm2 += weight2 * weight2
    })

    // 计算最终相似度
    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))

    log.info('关键词相似度计算:', {
      共同关键词: Array.from(map1.keys())
        .filter((word) => map2.has(word))
        .map((word) => ({
          词: word,
          权重1: map1.get(word)?.toFixed(4),
          权重2: map2.get(word)?.toFixed(4)
        })),
      相似度: similarity.toFixed(4)
    })

    return similarity
  } catch (error) {
    log.error('关键词相似度计算失败:', error)
    return 0
  }
}
