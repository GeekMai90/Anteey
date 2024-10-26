import { Keyword } from '../types/Note'
import nodejieba from 'nodejieba'

// 从 ProseMirror 文档中提取文本
function extractTextFromContent(content: any): string {
  if (!content) return ''

  // 如果是数组，递归处理每个元素
  if (Array.isArray(content)) {
    return content
      .map((item) => extractTextFromContent(item))
      .filter(Boolean)
      .join(' ')
  }

  // 如果是对象
  if (typeof content === 'object') {
    // 如果是文本节点
    if (content.type === 'text' && content.text) {
      return content.text
    }

    // 递归处理 content 属性
    if (content.content) {
      return extractTextFromContent(content.content)
    }
  }

  return ''
}

// 预处理文本
function preProcessText(text: string): string {
  // 技术术语列表
  const TECH_TERMS = [
    'React',
    'Next.js',
    'Vue',
    'Angular',
    'TypeScript',
    'JavaScript',
    'Node.js',
    'Markdown',
    'bug',
    'API',
    'UI',
    'UX',
    '优化',
    '修复',
    '新增',
    '功能'
  ]

  let processedText = text

  // 按长度排序，确保长词组优先匹配
  TECH_TERMS.sort((a, b) => b.length - a.length).forEach((term) => {
    const safePattern = term.replace(/\./g, '\\.')
    processedText = processedText.replace(
      new RegExp(safePattern, 'g'),
      term.replace(/\s+/g, '_').replace(/\./g, '_')
    )
  })

  return processedText
}

// 合并英文单词
function mergeEnglishWords(words: string[]): string[] {
  const result: string[] = []
  let currentWord = ''

  for (const word of words) {
    if (/^[a-zA-Z0-9. ]$/.test(word)) {
      currentWord += word
    } else {
      if (currentWord.trim()) {
        result.push(currentWord.trim())
        currentWord = ''
      }
      if (!/^[\n、，。：]$/.test(word)) {
        result.push(word)
      }
    }
  }

  if (currentWord.trim()) {
    result.push(currentWord.trim())
  }

  return result
}

// 后处理分词结果
function postProcessWords(words: string[]): string[] {
  return words.map((word) => word.replace(/_/g, '.'))
}

// 主函数：提取关键词
export function extractKeywords(content: any): Keyword[] {
  // 1. 提取纯文本
  const textContent = extractTextFromContent(content)

  // 2. 预处理文本
  const processedText = preProcessText(textContent)

  // 3. 分词
  const words = nodejieba.cut(processedText)

  // 4. 合并英文单词
  const mergedWords = mergeEnglishWords(words)

  // 5. 后处理
  const finalWords = postProcessWords(mergedWords)

  // 6. 提取关键词（取前10个）
  const keywordsWithWeight = nodejieba.extract(finalWords.join(' '), 10)

  return keywordsWithWeight as Keyword[]
}

export { preProcessText, mergeEnglishWords, postProcessWords, extractTextFromContent }
