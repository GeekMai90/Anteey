// import { Keyword } from '../types/Note'
// import nodejieba from 'nodejieba'

// // 从 ProseMirror 文档中提取文本
// function extractTextFromContent(content: any): string {
//   if (!content) return ''

//   // 如果是数组，递归处理每个元素
//   if (Array.isArray(content)) {
//     return content
//       .map((item) => extractTextFromContent(item))
//       .filter(Boolean)
//       .join(' ')
//   }

//   // 如果是对象
//   if (typeof content === 'object') {
//     // 如果是文本节点
//     if (content.type === 'text' && content.text) {
//       return content.text
//     }

//     // 递归处理 content 属性
//     if (content.content) {
//       return extractTextFromContent(content.content)
//     }
//   }

//   return ''
// }

// // 预处理文本
// function preProcessText(text: string): string {
//   // 技术术语列表
//   const TECH_TERMS = [
//     'React',
//     'Next.js',
//     'Vue',
//     'Angular',
//     'TypeScript',
//     'JavaScript',
//     'Node.js',
//     'Markdown',
//     'bug',
//     'API',
//     'UI',
//     'UX',
//     '优化',
//     '修复',
//     '新增',
//     '功能'
//   ]

//   let processedText = text

//   // 按长度排序，确保长词组优先匹配
//   TECH_TERMS.sort((a, b) => b.length - a.length).forEach((term) => {
//     const safePattern = term.replace(/\./g, '\\.')
//     processedText = processedText.replace(
//       new RegExp(safePattern, 'g'),
//       term.replace(/\s+/g, '_').replace(/\./g, '_')
//     )
//   })

//   return processedText
// }

// // 合并英文单词
// function mergeEnglishWords(words: string[]): string[] {
//   const result: string[] = []
//   let currentWord = ''

//   for (const word of words) {
//     if (/^[a-zA-Z0-9. ]$/.test(word)) {
//       currentWord += word
//     } else {
//       if (currentWord.trim()) {
//         result.push(currentWord.trim())
//         currentWord = ''
//       }
//       if (!/^[\n、，。：]$/.test(word)) {
//         result.push(word)
//       }
//     }
//   }

//   if (currentWord.trim()) {
//     result.push(currentWord.trim())
//   }

//   return result
// }

// // 后处理分词结果
// function postProcessWords(words: string[]): string[] {
//   return words.map((word) => word.replace(/_/g, '.'))
// }

// // 主函数：提取关键词
// export function extractKeywords(content: any): Keyword[] {
//   // 1. 提取纯文本
//   const textContent = extractTextFromContent(content)

//   // 2. 预处理文本
//   const processedText = preProcessText(textContent)

//   // 3. 分词
//   const words = nodejieba.cut(processedText)

//   // 4. 合并英文单词
//   const mergedWords = mergeEnglishWords(words)

//   // 5. 后处理
//   const finalWords = postProcessWords(mergedWords)

//   // 6. 提取关键词（取前10个）
//   const keywordsWithWeight = nodejieba.extract(finalWords.join(' '), 10)

//   return keywordsWithWeight as Keyword[]
// }

// export { preProcessText, mergeEnglishWords, postProcessWords, extractTextFromContent }

import { Keyword } from '../types/Note'
import nodejieba from 'nodejieba'

// 技术术语词典
const TECH_TERMS = new Map([
  // React 相关
  ['react', { standard: 'React', weight: 1.5 }],
  ['nextjs', { standard: 'Next.js', weight: 1.5 }],
  ['next.js', { standard: 'Next.js', weight: 1.5 }],
  ['next', { standard: 'Next.js', weight: 1.5 }],
  ['rsc', { standard: 'RSC', weight: 1.4 }],
  ['server components', { standard: 'Server Components', weight: 1.4 }],

  // JavaScript 相关
  ['typescript', { standard: 'TypeScript', weight: 1.3 }],
  ['javascript', { standard: 'JavaScript', weight: 1.3 }],
  ['js', { standard: 'JavaScript', weight: 1.3 }],
  ['ts', { standard: 'TypeScript', weight: 1.3 }],
  ['nodejs', { standard: 'Node.js', weight: 1.3 }],
  ['node.js', { standard: 'Node.js', weight: 1.3 }],

  // 构建工具
  ['webpack', { standard: 'Webpack', weight: 1.2 }],
  ['vite', { standard: 'Vite', weight: 1.2 }],
  ['rollup', { standard: 'Rollup', weight: 1.2 }],
  ['babel', { standard: 'Babel', weight: 1.2 }],

  // 性能优化相关
  ['性能优化', { standard: '性能优化', weight: 1.4 }],
  ['优化', { standard: '优化', weight: 1.3 }],
  ['服务端渲染', { standard: 'SSR', weight: 1.4 }],
  ['ssr', { standard: 'SSR', weight: 1.4 }],
  ['代码分割', { standard: 'Code Splitting', weight: 1.3 }],
  ['code splitting', { standard: 'Code Splitting', weight: 1.3 }],
  ['懒加载', { standard: 'Lazy Loading', weight: 1.3 }],
  ['lazy loading', { standard: 'Lazy Loading', weight: 1.3 }],

  // 开发相关
  ['组件', { standard: 'Component', weight: 1.3 }],
  ['component', { standard: 'Component', weight: 1.3 }],
  ['开发', { standard: '开发', weight: 1.2 }],
  ['实践', { standard: '实践', weight: 1.2 }],
  ['配置', { standard: '配置', weight: 1.2 }],
  ['部署', { standard: '部署', weight: 1.2 }]
])

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
  let processedText = text.toLowerCase()

  // 1. 替换技术术语
  TECH_TERMS.forEach(({ standard }, term) => {
    const pattern = new RegExp(term.replace(/\./g, '\\.'), 'gi')
    processedText = processedText.replace(pattern, standard.replace(/\s+/g, '_'))
  })

  // 2. 清理特殊字符，但保留中文、英文、数字和一些必要的标点
  processedText = processedText.replace(/[^\u4e00-\u9fa5a-z0-9\s.,_-]/gi, ' ')

  // 3. 规范化空白字符
  processedText = processedText.replace(/\s+/g, ' ').trim()

  return processedText
}

// 分词后处理
function postProcessWords(words: string[]): Keyword[] {
  const wordFreq = new Map<string, number>()
  const standardWords = new Map<string, string>()

  // 1. 统计词频和标准化术语
  words.forEach((word) => {
    const normalizedWord = word.toLowerCase().trim()

    // 跳过空白和单字符
    if (!normalizedWord || normalizedWord.length < 2) return

    // 检查是否是技术术语
    const techTerm = TECH_TERMS.get(normalizedWord)

    if (techTerm) {
      // 使用标准术语名称和权重
      wordFreq.set(techTerm.standard, (wordFreq.get(techTerm.standard) || 0) + techTerm.weight)
      standardWords.set(normalizedWord, techTerm.standard)
    } else {
      // 普通词汇使用原始权重
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
      standardWords.set(normalizedWord, word)
    }
  })

  // 2. 计算权重
  const totalFreq = Array.from(wordFreq.values()).reduce((a, b) => a + b, 0)

  // 3. 生成最终的关键词列表
  return Array.from(wordFreq.entries())
    .map(([word, freq]) => ({
      word,
      weight: freq / totalFreq
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10) // 保留权重最高的10个关键词
}

// 主函数：提取关键词
export function extractKeywords(content: any): Keyword[] {
  try {
    // 1. 提取纯文本
    const textContent = extractTextFromContent(content)
    if (!textContent.trim()) return []

    // 2. 预处理文本
    const processedText = preProcessText(textContent)

    // 3. 使用结巴分词
    const words = nodejieba.cut(processedText)

    // 4. 提取关键词（不再使用 add 方法）
    const extractedWords = nodejieba.extract(processedText, 15)

    // 5. 后处理并返回结果
    const keywords = postProcessWords(
      extractedWords.map((word) => (typeof word === 'string' ? word : word.word))
    )

    console.log('提取的关键词:', {
      原文: textContent,
      处理后文本: processedText,
      分词结果: words,
      关键词: keywords
    })

    return keywords
  } catch (error) {
    console.error('关键词提取失败:', error)
    return []
  }
}

export { preProcessText, postProcessWords, extractTextFromContent }
