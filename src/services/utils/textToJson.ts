// 添加一个辅助函数来将 Tiptap JSON 转换为 Markdown 格式文本
export function extractTextFromTiptapJson(content: any): string {
  let text = ''

  if (!content || !content.content) return text

  const traverse = (node: any, level: number = 0, listIndex: number = 1) => {
    if (!node) return

    switch (node.type) {
      case 'text':
        // 处理带标记的文本
        if (node.marks) {
          node.marks.forEach((mark: any) => {
            switch (mark.type) {
              case 'bold':
                text += `**${node.text}**`
                break
              case 'italic':
                text += `*${node.text}*`
                break
              case 'code':
                text += `\`${node.text}\``
                break
              default:
                text += node.text
            }
          })
        } else {
          text += node.text
        }
        break

      case 'heading':
        text += '\n' + '#'.repeat(node.attrs.level) + ' '
        if (node.content) node.content.forEach((n: any) => traverse(n))
        text += '\n'
        break

      case 'paragraph':
        text += '\n'
        if (node.content) node.content.forEach((n: any) => traverse(n))
        text += '\n'
        break

      case 'bulletList':
        text += '\n'
        if (node.content) {
          node.content.forEach((n: any) => {
            text += '  '.repeat(level) + '* '
            traverse(n, level + 1)
          })
        }
        break

      case 'orderedList':
        text += '\n'
        if (node.content) {
          node.content.forEach((n: any, index: number) => {
            text += '  '.repeat(level) + `${listIndex + index}. `
            traverse(n, level + 1, listIndex + index)
          })
        }
        break

      case 'listItem':
        if (node.content) node.content.forEach((n: any) => traverse(n, level))
        break

      case 'taskList':
        text += '\n'
        if (node.content) {
          node.content.forEach((n: any) => {
            text += '  '.repeat(level) + `- [${n.attrs.checked ? 'x' : ' '}] `
            traverse(n, level + 1)
          })
        }
        break

      case 'table':
        text += '\n'
        if (node.content) {
          // 处理表头
          const headerRow = node.content[0]
          if (headerRow && headerRow.content) {
            headerRow.content.forEach((cell: any) => {
              text += '| '
              traverse(cell)
              text += ' '
            })
            text += '|\n'
            // 添加分隔行
            headerRow.content.forEach(() => {
              text += '| --- '
            })
            text += '|\n'
          }
          // 处理数据行
          node.content.slice(1).forEach((row: any) => {
            if (row.content) {
              row.content.forEach((cell: any) => {
                text += '| '
                traverse(cell)
                text += ' '
              })
              text += '|\n'
            }
          })
        }
        break

      case 'blockquote':
        text += '\n> '
        if (node.content) node.content.forEach((n: any) => traverse(n))
        text += '\n'
        break

      case 'codeBlock':
        text += '\n```' + (node.attrs.language || '') + '\n'
        if (node.content) node.content.forEach((n: any) => traverse(n))
        text += '\n```\n'
        break

      case 'image':
        text += `\n![${node.attrs.alt || ''}](${node.attrs.src})\n`
        break

      default:
        if (node.content) node.content.forEach((n: any) => traverse(n))
    }
  }

  content.content.forEach((node: any) => traverse(node))
  return text.trim()
}

// 将润色后的文本转换回 Tiptap JSON 格式
export function convertTextToTiptapJson(text: string): any {
  const content: any[] = []
  // 改进分行处理，保留有意义的空行
  const lines = text.split('\n').map((line) => line.replace(/\r/g, ''))
  let i = 0

  // 存储块级元素的状态
  let inCodeBlock = false
  let codeBlockLanguage = ''
  let codeBlockContent = ''
  let inQuote = false
  let quoteContent: any = null

  // 处理逐行内容
  while (i < lines.length) {
    const line = lines[i]
    const isEmptyLine = line.trim() === ''

    // 处理代码块
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true
        codeBlockLanguage = line.slice(3).trim() || 'plaintext'
        codeBlockContent = ''
      } else {
        content.push({
          type: 'codeBlock',
          attrs: { language: codeBlockLanguage },
          content: [{ type: 'text', text: codeBlockContent.trim() }]
        })
        inCodeBlock = false
      }
      i++
      continue
    }

    if (inCodeBlock) {
      codeBlockContent += line + '\n'
      i++
      continue
    }

    // 处理引用块
    if (line.startsWith('>')) {
      const quoteText = line.slice(1).trim()

      if (!inQuote) {
        inQuote = true
        quoteContent = {
          type: 'blockquote',
          content: []
        }
      }

      if (quoteText) {
        quoteContent.content.push({
          type: 'paragraph',
          attrs: { textAlign: 'left' },
          content: processInlineStyles(quoteText)
        })
      }

      i++
      continue
    }

    // 结束当前引用块
    if (inQuote && !line.startsWith('>') && !isEmptyLine) {
      if (quoteContent && quoteContent.content.length > 0) {
        content.push(quoteContent)
      }
      inQuote = false
      quoteContent = null
    }

    // 处理标题
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch && headingMatch[2].trim()) {
      content.push({
        type: 'heading',
        attrs: {
          level: headingMatch[1].length,
          textAlign: 'left'
        },
        content: processInlineStyles(headingMatch[2].trim())
      })
      i++
      continue
    }

    // 处理列表（有序、无序和任务列表）
    const listResult = processLists(lines, i)
    if (listResult.processed) {
      content.push(listResult.node)
      i = listResult.nextIndex
      continue
    }

    // 处理表格
    const tableResult = processTables(lines, i)
    if (tableResult.processed) {
      content.push(tableResult.node)
      i = tableResult.nextIndex
      continue
    }

    // 处理普通段落，完全跳过空行
    if (!isEmptyLine) {
      content.push({
        type: 'paragraph',
        attrs: { textAlign: 'left' },
        content: processInlineStyles(line)
      })
    }

    i++
  }

  // 处理末尾未闭合的块
  if (inQuote && quoteContent && quoteContent.content.length > 0) {
    content.push(quoteContent)
  } else if (inCodeBlock && codeBlockContent.trim()) {
    content.push({
      type: 'codeBlock',
      attrs: { language: codeBlockLanguage },
      content: [{ type: 'text', text: codeBlockContent.trim() }]
    })
  }

  // 确保文档至少有一个有效的段落
  if (content.length === 0) {
    content.push({
      type: 'paragraph',
      attrs: { textAlign: 'left' },
      content: [{ type: 'text', text: '' }]
    })
  }

  // 移除所有空段落
  const filteredContent = content.filter((node) => {
    // 跳过所有空段落
    if (node.type === 'paragraph') {
      // 检查段落是否为空
      const isEmpty =
        !node.content ||
        node.content.length === 0 ||
        (node.content.length === 1 &&
          node.content[0].type === 'text' &&
          (!node.content[0].text || node.content[0].text.trim() === ''))

      // 保留非空段落
      return !isEmpty
    }
    // 保留所有其他类型的节点
    return true
  })

  return {
    type: 'doc',
    content: filteredContent
  }
}

// 处理行内样式的辅助函数（重写以支持更多样式）
function processInlineStyles(text: string): any[] {
  const content: any[] = []
  let currentText = ''
  let isBold = false
  let isItalic = false
  let isCode = false

  const flushText = () => {
    if (currentText) {
      const marks: any[] = []
      if (isBold) marks.push({ type: 'bold' })
      if (isItalic) marks.push({ type: 'italic' })
      if (isCode) marks.push({ type: 'code' })

      content.push({
        type: 'text',
        text: currentText,
        ...(marks.length > 0 && { marks })
      })
      currentText = ''
    }
  }

  for (let i = 0; i < text.length; i++) {
    // 处理代码样式
    if (text[i] === '`' && !isCode) {
      flushText()
      isCode = true
      continue
    } else if (text[i] === '`' && isCode) {
      flushText()
      isCode = false
      continue
    }

    // 处理粗体样式
    if (
      (text[i] === '*' || text[i] === '_') &&
      i + 1 < text.length &&
      text[i + 1] === text[i] &&
      !isCode
    ) {
      flushText()
      isBold = !isBold
      i++
      continue
    }

    // 处理斜体样式
    if ((text[i] === '*' || text[i] === '_') && !isCode) {
      flushText()
      isItalic = !isItalic
      continue
    }

    currentText += text[i]
  }

  flushText()
  return content
}

// 处理列表的辅助函数
function processLists(
  lines: string[],
  startIndex: number
): { processed: boolean; node: any; nextIndex: number } {
  // 检查是否是列表开始
  const line = lines[startIndex]
  const bulletListMatch = line.match(/^(\s*)[-*+]\s+(.+)$/)
  const orderedListMatch = line.match(/^(\s*)\d+\.\s+(.+)$/)
  const taskListMatch = line.match(/^(\s*)-\s+\[([ x])\]\s+(.+)$/)

  if (!bulletListMatch && !orderedListMatch && !taskListMatch) {
    return { processed: false, node: null, nextIndex: startIndex }
  }

  let listType = ''
  if (bulletListMatch) listType = 'bulletList'
  else if (orderedListMatch) listType = 'orderedList'
  else listType = 'taskList'

  const listNode: any = {
    type: listType,
    attrs: listType === 'orderedList' ? { start: 1, tight: true } : { tight: true },
    content: []
  }

  let i = startIndex
  const currentIndentLevel = 0

  // 递归处理列表项及其嵌套
  const processListItems = (parentNode: any, indentLevel: number): number => {
    while (i < lines.length) {
      const currentLine = lines[i]

      // 检查当前行是否为列表项
      const bulletMatch = currentLine.match(/^(\s*)[-*+]\s+(.+)$/)
      const orderedMatch = currentLine.match(/^(\s*)\d+\.\s+(.+)$/)
      const taskMatch = currentLine.match(/^(\s*)-\s+\[([ x])\]\s+(.+)$/)

      // 如果不是列表项或空行，结束列表处理
      if (!bulletMatch && !orderedMatch && !taskMatch && currentLine.trim() !== '') {
        return i
      }

      // 处理空行
      if (currentLine.trim() === '') {
        i++
        continue
      }

      // 确定当前行的缩进级别
      const match = bulletMatch || orderedMatch || taskMatch
      if (!match) {
        i++
        continue
      }

      const currentIndent = match[1].length
      const currentIndentLevel = Math.floor(currentIndent / 2)

      // 如果缩进级别小于当前处理的级别，返回上一级列表处理
      if (currentIndentLevel < indentLevel) {
        return i
      }

      // 如果缩进级别大于当前处理的级别，开始处理子列表
      if (currentIndentLevel > indentLevel) {
        i++
        continue
      }

      // 处理当前级别的列表项
      const itemContent = match[match.length - 1].trim()
      const listItem: any = {
        type: listType === 'taskList' ? 'taskItem' : 'listItem',
        content: [
          {
            type: 'paragraph',
            attrs: { textAlign: 'left' },
            content: processInlineStyles(itemContent)
          }
        ]
      }

      // 为任务列表项添加checked属性
      if (listType === 'taskList') {
        listItem.attrs = { checked: match[2] === 'x' }
      }

      parentNode.content.push(listItem)
      i++
    }

    return i
  }

  i = processListItems(listNode, currentIndentLevel)

  return {
    processed: true,
    node: listNode,
    nextIndex: i
  }
}

// 处理表格的辅助函数
function processTables(
  lines: string[],
  startIndex: number
): { processed: boolean; node: any; nextIndex: number } {
  // 检查是否是表格开始
  if (!lines[startIndex].includes('|')) {
    return { processed: false, node: null, nextIndex: startIndex }
  }

  const tableNode: any = {
    type: 'table',
    content: []
  }

  let i = startIndex
  let inTable = true
  let isHeader = true

  while (i < lines.length && inTable) {
    const line = lines[i].trim()

    // 空行或不包含|的行结束表格
    if (line === '' || !line.includes('|')) {
      inTable = false
      continue
    }

    // 跳过分隔行
    if (line.includes('---')) {
      i++
      continue
    }

    // 处理表格行
    const cells = line
      .split('|')
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0)

    if (cells.length > 0) {
      const rowContent = cells.map((cell) => ({
        type: isHeader ? 'tableHeader' : 'tableCell',
        attrs: { colspan: 1, colwidth: null, rowspan: 1 },
        content: [
          {
            type: 'paragraph',
            attrs: { textAlign: 'left' },
            content: processInlineStyles(cell)
          }
        ]
      }))

      tableNode.content.push({
        type: 'tableRow',
        content: rowContent
      })

      // 第一行处理后，后续行都是普通单元格
      isHeader = false
    }

    i++
  }

  // 确保表格至少有一行
  if (tableNode.content.length === 0) {
    return { processed: false, node: null, nextIndex: startIndex }
  }

  return {
    processed: true,
    node: tableNode,
    nextIndex: i
  }
}
