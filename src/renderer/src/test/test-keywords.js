const nodejieba = require('nodejieba')

// 只保留最基本和最常用的技术术语
const TECH_TERMS = [
  // 框架和库（按使用频率排序）
  'React',
  'Next.js',
  'Vue',
  'Angular',
  'TypeScript',
  'JavaScript',
  'Node.js',

  // 常见技术组合
  'React Server Components',
  'Server Components',
  'App Router',
  'SSR',

  // 常见概念
  '服务器组件',
  '性能优化',
  '代码分割',
  '动态导入',
  '首屏加载'
]

// 简化的预处理函数
function preProcessText(text) {
  // 将技术术语转换为单个token
  let processedText = text
  TECH_TERMS.sort((a, b) => b.length - a.length) // 优先处理较长的术语
    .forEach((term) => {
      const safePattern = term.replace(/\./g, '\\.')
      processedText = processedText.replace(
        new RegExp(safePattern, 'g'),
        term.replace(/\s+/g, '_').replace(/\./g, '_')
      )
    })
  return processedText
}

// 简化的后处理函数
function postProcessWords(words) {
  return words.map((word) => word.replace(/_/g, '.'))
}

// 合并连续的英文字母和数字
function mergeEnglishWords(words) {
  const result = []
  let currentWord = ''

  for (const word of words) {
    // 如果是英文字母、数字、点号或空格
    if (/^[a-zA-Z0-9. ]$/.test(word)) {
      currentWord += word
    } else {
      // 如果当前有累积的单词，先添加到结果中
      if (currentWord.trim()) {
        result.push(currentWord.trim())
        currentWord = ''
      }
      // 添加非英文内容
      if (!/^[\n、，。：]$/.test(word)) {
        result.push(word)
      }
    }
  }

  // 处理最后一个单词
  if (currentWord.trim()) {
    result.push(currentWord.trim())
  }

  return result
}

// 识别代码块
function separateCodeBlocks(text) {
  const blocks = []
  let isCodeBlock = false
  let currentBlock = ''
  let braceCount = 0

  // 代码特征正则表达式
  const codePatterns = [
    /^const\s+/,
    /^let\s+/,
    /^function\s+/,
    /^interface\s+/,
    /^type\s+/,
    /^class\s+/,
    /^import\s+/,
    /^export\s+/,
    /=>/,
    /^\/\// // 注释
  ]

  const lines = text.split('\n')

  for (const line of lines) {
    const trimmedLine = line.trim()

    // 计算花括号数量
    const openBraces = (trimmedLine.match(/{/g) || []).length
    const closeBraces = (trimmedLine.match(/}/g) || []).length

    // 检测代码块开始
    const isCodeLine =
      codePatterns.some((pattern) => pattern.test(trimmedLine)) ||
      trimmedLine.includes('{') ||
      trimmedLine.includes('(') ||
      trimmedLine.endsWith(';')

    if (isCodeLine && !isCodeBlock) {
      isCodeBlock = true
      braceCount = openBraces - closeBraces
      currentBlock = line + '\n'
      continue
    }

    if (isCodeBlock) {
      currentBlock += line + '\n'
      braceCount += openBraces - closeBraces

      // 检测代码块结束
      if (
        braceCount === 0 &&
        (trimmedLine.endsWith(';') ||
          trimmedLine.endsWith('}') ||
          /^type\s+.*=.*$/.test(trimmedLine) ||
          (currentBlock.includes(';') &&
            !trimmedLine.match(/^[a-zA-Z0-9_$]/) &&
            !trimmedLine.includes('(')))
      ) {
        blocks.push({
          type: 'code',
          content: currentBlock.trim()
        })
        isCodeBlock = false
        currentBlock = ''
      }
    } else if (trimmedLine) {
      // 检查是否是代码示例的标记或者是否包含代码特征
      if (
        !trimmedLine.includes('代码示例') &&
        !trimmedLine.includes('示例代码') &&
        !codePatterns.some((pattern) => pattern.test(trimmedLine))
      ) {
        blocks.push({
          type: 'text',
          content: trimmedLine
        })
      }
    }
  }

  // 处理未闭合的代码块或剩余文本
  if (currentBlock) {
    // 检查最后的内容是否真的是代码
    const isLastBlockCode = codePatterns.some((pattern) =>
      currentBlock.split('\n').some((line) => pattern.test(line.trim()))
    )

    blocks.push({
      type: isLastBlockCode ? 'code' : 'text',
      content: currentBlock.trim()
    })
  }

  return blocks
}

// 测试文本
const text = `今天深入学习了前端开发的几个重要主题。

首先是 React 的性能优化，使用 useMemo 和 useCallback 来避免不必要的重渲染。
代码示例：
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
const memoizedCallback = useCallback(() => handleClick(param), [param]);

然后研究了 TypeScript 的高级类型，包括泛型、联合类型和交叉类型。interface 和 type 的区别也很有趣：
interface User {
  name: string;
  age: number;
}
type UserWithRole = User & { role: string };

最后看了 Next.js 13 的 App Router 和服务器组件，这种新的开发模式确实能提升应用性能。
特别是 React Server Components 和 Streaming SSR 的结合使用，可以显著改善首屏加载时间。

准备明天继续学习 Webpack 和 Vite 的构建优化，重点是代码分割和动态导入。`

// 1. 先分离代码块和文本
const blocks = separateCodeBlocks(text)

// 2. 对文本块进行分词和英文单词合并
const textOnlyBlocks = blocks
  .filter((block) => block.type === 'text')
  .map((block) => {
    // 预处理
    const processedText = preProcessText(block.content)
    // 分词
    const words = nodejieba.cut(processedText)
    // 合并英文单词
    const mergedWords = mergeEnglishWords(words)
    // 后处理
    const finalWords = postProcessWords(mergedWords)
    return finalWords.join(' ')
  })
  .join('\n')

// 3. 提取关键词
const keywordsWithWeight = nodejieba.extract(textOnlyBlocks, 10)

console.log('文档结构：')
console.log(
  blocks.map((block) => ({
    type: block.type,
    preview: block.content.slice(0, 50) + '...'
  }))
)

console.log('\n分词结果：')
console.log(textOnlyBlocks)

console.log('\n关键词提取结果：')
console.log(keywordsWithWeight)
