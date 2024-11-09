import { Segment, useDefault } from 'segmentit'
import log from 'electron-log/renderer'

// 初始化分词器
const segment = new Segment()
useDefault(segment)

// 技术术语词典
const TECH_TERMS = new Map<string, string>([
  ['react', 'React'],
  ['nextjs', 'Next.js'],
  ['next.js', 'Next.js'],
  ['next', 'Next.js'],
  ['rsc', 'RSC'],
  ['server components', 'Server Components']
  // ... 其他技术术语
])

// 从内容中提取文本
function extractTextFromContent(content: any): string {
  if (!content) return ''
  if (Array.isArray(content)) {
    return content
      .map((item) => extractTextFromContent(item))
      .filter(Boolean)
      .join(' ')
  }
  if (typeof content === 'object') {
    if (content.type === 'text' && content.text) {
      return content.text
    }
    if (content.content) {
      return extractTextFromContent(content.content)
    }
  }
  return ''
}

// 预处理文本
function preProcessText(text: string): string {
  try {
    if (typeof text !== 'string') {
      log.error('预处理输入不是字符串:', typeof text)
      return ''
    }

    let processedText = text.toLowerCase()

    // 截断过长文本
    if (processedText.length > 1000000) {
      log.warn('文本过长，将被截断')
      processedText = processedText.slice(0, 1000000)
    }

    // 标准化技术术语
    TECH_TERMS.forEach((standard, term) => {
      const pattern = new RegExp(term.replace(/\./g, '\\.'), 'gi')
      processedText = processedText.replace(pattern, standard)
    })

    // 清理特殊字符
    processedText = processedText.replace(/[^\u4e00-\u9fa5a-z0-9\s.,_-]/gi, ' ')
    processedText = processedText.replace(/\s+/g, ' ').trim()

    return processedText
  } catch (error) {
    log.error('文本预处理失败:', error)
    return ''
  }
}

// 处理分词结果
function postProcessWords(words: string[]): string[] {
  const wordFreq = new Map<string, number>()

  // 统计词频并标准化技术术语
  words.forEach((word) => {
    const normalizedWord = word.toLowerCase().trim()
    if (!normalizedWord || normalizedWord.length < 2) return

    const standardTerm = TECH_TERMS.get(normalizedWord)
    const finalWord = standardTerm || word
    wordFreq.set(finalWord, (wordFreq.get(finalWord) || 0) + 1)
  })

  // 按词频排序并返回前10个关键词
  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word)
}

// 主函数：提取关键词
export function extractKeywords(content: any): string[] {
  log.info('开始提取关键词')
  try {
    // 1. 提取文本
    const text = extractTextFromContent(content)
    if (!text.trim()) {
      log.info('文本内容为空，跳过关键词提取')
      return []
    }

    // 2. 预处理文本
    const processedText = preProcessText(text)
    if (!processedText) {
      log.info('预处理后文本为空，跳过关键词提取')
      return []
    }

    // 3. 分词
    const segmentResult = segment.doSegment(processedText, {
      simple: true,
      stripPunctuation: true,
      convertSynonym: true,
      stripStopword: true
    })

    // 4. 后处理并返回关键词
    const keywords = postProcessWords(segmentResult)

    log.info('关键词提取完成:', {
      原文长度: text.length,
      处理后文本长度: processedText.length,
      分词结果数量: segmentResult.length,
      关键词数量: keywords.length,
      关键词: keywords.join(', ')
    })

    return keywords
  } catch (error) {
    log.error('关键词提取失败:', error)
    return []
  }
}

export { extractTextFromContent, preProcessText }
