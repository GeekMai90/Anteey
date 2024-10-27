import { Keyword } from '../types/Note'
import { Segment, useDefault } from 'segmentit'
import log from 'electron-log/renderer'

// 初始化分词器
const segment = new Segment()
useDefault(segment) // 使用默认的字典和规则

// 在文件开头添加检查
log.info('segmentit 加载状态:', {
  segment是否存在: !!segment,
  doSegment方法: typeof segment?.doSegment === 'function'
})

// 技术术语词典保持不变
const TECH_TERMS = new Map([
  // React 相关
  ['react', { standard: 'React', weight: 1.5 }],
  ['nextjs', { standard: 'Next.js', weight: 1.5 }],
  ['next.js', { standard: 'Next.js', weight: 1.5 }],
  ['next', { standard: 'Next.js', weight: 1.5 }],
  ['rsc', { standard: 'RSC', weight: 1.4 }],
  ['server components', { standard: 'Server Components', weight: 1.4 }]
  // ... 其他技术术语保持不变 ...
])

// extractTextFromContent 函数保持不变
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

// preProcessText 函数保持不变
function preProcessText(text: string): string {
  try {
    if (typeof text !== 'string') {
      log.error('预处理输入不是字符串:', typeof text)
      return ''
    }

    let processedText = text.toLowerCase()

    if (processedText.length > 1000000) {
      log.warn('文本过长，将被截断')
      processedText = processedText.slice(0, 1000000)
    }

    TECH_TERMS.forEach(({ standard }, term) => {
      const pattern = new RegExp(term.replace(/\./g, '\\.'), 'gi')
      processedText = processedText.replace(pattern, standard.replace(/\s+/g, '_'))
    })

    processedText = processedText.replace(/[^\u4e00-\u9fa5a-z0-9\s.,_-]/gi, ' ')
    processedText = processedText.replace(/\s+/g, ' ').trim()

    return processedText
  } catch (error) {
    log.error('文本预处理失败:', error)
    return ''
  }
}

// postProcessWords 函数保持不变
function postProcessWords(words: string[]): Keyword[] {
  const wordFreq = new Map<string, number>()
  const standardWords = new Map<string, string>()

  words.forEach((word) => {
    const normalizedWord = word.toLowerCase().trim()
    if (!normalizedWord || normalizedWord.length < 2) return

    const techTerm = TECH_TERMS.get(normalizedWord)
    if (techTerm) {
      wordFreq.set(techTerm.standard, (wordFreq.get(techTerm.standard) || 0) + techTerm.weight)
      standardWords.set(normalizedWord, techTerm.standard)
    } else {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
      standardWords.set(normalizedWord, word)
    }
  })

  const totalFreq = Array.from(wordFreq.values()).reduce((a, b) => a + b, 0)

  return Array.from(wordFreq.entries())
    .map(([word, freq]) => ({
      word,
      weight: freq / totalFreq
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10)
}

// 主函数：提取关键词
export function extractKeywords(content: any): Keyword[] {
  log.info('extractKeywords 被调用')
  try {
    if (!content) {
      log.info('内容为空，跳过关键词提取')
      return []
    }

    const textContent = extractTextFromContent(content)
    if (!textContent.trim()) {
      log.info('提取的文本内容为空，跳过关键词提取')
      return []
    }

    const processedText = preProcessText(textContent)
    if (!processedText) {
      log.info('预处理后的文本为空，跳过关键词提取')
      return []
    }

    // 使用 segmentit 进行分词
    const segmentResult = segment.doSegment(processedText, {
      simple: true,
      stripPunctuation: true
    })

    // 提取关键词（取最常见的词）
    const words = segmentResult
      .filter((word: string) => word.length > 1) // 过滤单字
      .slice(0, 15) // 取前15个词

    const keywords = postProcessWords(words)

    log.info('关键词提取完成:', {
      原文长度: textContent.length,
      处理后文本长度: processedText.length,
      分词结果数量: segmentResult.length,
      最终关键词数量: keywords.length
    })

    return keywords
  } catch (error) {
    log.error('关键词提取失败:', error)
    return []
  }
}

export { preProcessText, postProcessWords, extractTextFromContent }
