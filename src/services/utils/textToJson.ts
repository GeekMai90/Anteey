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
  let inTable = false
  let tableContent: any = null
  let inCodeBlock = false
  let codeBlockContent = ''
  let codeBlockLanguage = ''
  let inList = false
  let listContent: any = null
  let inQuote = false
  let quoteContent: any = null

  // 添加一个辅助函数来检查内容是否为空
  const isEmptyContent = (content: any[]): boolean => {
    return !content.some((item) => {
      if (item.type === 'text') {
        return item.text.trim() !== ''
      }
      if (item.content) {
        return !isEmptyContent(item.content)
      }
      return false
    })
  }

  // 添加一个辅助函数来创建段落
  const createParagraph = (line: string, forceCreate: boolean = false) => {
    const inlineContent = processInlineStyles(line)
    if (inlineContent.length > 0 || forceCreate) {
      // 检查内容是否真的为空
      if (!isEmptyContent(inlineContent)) {
        return {
          type: 'paragraph',
          attrs: { textAlign: 'left' },
          content: inlineContent
        }
      }
    }
    return null
  }

  // 添加一个辅助函数来计算缩进级别
  function getIndentLevel(indent: string): number {
    return Math.floor(indent.length / 2) // 假设每个缩进级别是2个空格
  }

  // 修改类型定义，使其更符合实际的 Tiptap JSON 结构
  interface TiptapText {
    type: 'text'
    text: string
  }

  interface TiptapParagraph {
    type: 'paragraph'
    attrs: { textAlign: string }
    content: TiptapText[]
  }

  interface TiptapListItem {
    type: 'listItem'
    content: (TiptapParagraph | TiptapList)[]
  }

  interface TiptapList {
    type: 'bulletList' | 'orderedList'
    attrs: { start?: number; tight: boolean }
    content: TiptapListItem[]
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isEmptyLine = line.trim() === ''

    // 处理空行：在段落之间添加空段落
    if (isEmptyLine && !inCodeBlock && !inTable && !inList && !inQuote) {
      if (content.length > 0 && i < lines.length - 1) {
        const nextLine = lines[i + 1].trim()
        if (nextLine !== '') {
          // 只在两个非空段落之间添加空段落
          content.push({
            type: 'paragraph',
            attrs: { textAlign: 'left' },
            content: []
          })
        }
      }
      continue
    }

    // 处理代码块
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true
        codeBlockLanguage = line.slice(3).trim() || 'plaintext'
        codeBlockContent = ''
      } else if (codeBlockContent.trim()) {
        // 只有当有内容时才添加代码块
        content.push({
          type: 'codeBlock',
          attrs: { language: codeBlockLanguage },
          content: [{ type: 'text', text: codeBlockContent.trim() }]
        })
        inCodeBlock = false
        codeBlockContent = ''
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockContent += line + '\n'
      continue
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
        content: [{ type: 'text', text: headingMatch[2].trim() }]
      })
      continue
    }

    // 处理引用块
    if (line.startsWith('>')) {
      const quoteText = line.slice(1).trim()
      if (quoteText) {
        // 只处理非空引用
        if (!inQuote) {
          inQuote = true
          quoteContent = {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                attrs: { textAlign: 'left' },
                content: [{ type: 'text', text: quoteText }]
              }
            ]
          }
        } else {
          quoteContent.content.push({
            type: 'paragraph',
            attrs: { textAlign: 'left' },
            content: [{ type: 'text', text: quoteText }]
          })
        }
      }
      continue
    }

    // 处理表格
    if (line.includes('|')) {
      const cells = line
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell) => cell) // 过滤掉空单元格

      if (cells.length > 0) {
        if (!inTable) {
          inTable = true
          tableContent = {
            type: 'table',
            content: []
          }
        }

        // 忽略分隔行（包含 -）
        if (line.includes('---')) continue

        const rowContent = cells.map((cell) => ({
          type: tableContent.content.length === 0 ? 'tableHeader' : 'tableCell',
          attrs: { colspan: 1, colwidth: null, rowspan: 1 },
          content: [
            {
              type: 'paragraph',
              attrs: { textAlign: 'left' },
              content: [{ type: 'text', text: cell }]
            }
          ]
        }))

        if (rowContent.length > 0) {
          tableContent.content.push({
            type: 'tableRow',
            content: rowContent
          })
        }
      }
      continue
    }

    // 处理列表
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/)
    if (listMatch) {
      const [, indent, marker, text] = listMatch
      const indentLevel = getIndentLevel(indent)
      const isOrdered = /\d+\./.test(marker)
      const orderNumber = isOrdered ? parseInt(marker) : 1

      if (text.trim()) {
        // 处理顶级列表
        if (indentLevel === 0) {
          if (
            inList &&
            ((isOrdered && listContent?.type !== 'orderedList') ||
              (!isOrdered && listContent?.type !== 'bulletList'))
          ) {
            content.push(listContent)
            inList = false
          }

          if (!inList) {
            inList = true
            listContent = {
              type: isOrdered ? 'orderedList' : 'bulletList',
              attrs: {
                ...(isOrdered && { start: orderNumber }),
                tight: true
              },
              content: []
            } as TiptapList
          }
        }

        // 创建列表项
        const listItem: TiptapListItem = {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              attrs: { textAlign: 'left' },
              content: processInlineStyles(text.trim())
            }
          ]
        }

        // 处理嵌套列表
        if (indentLevel > 0 && listContent) {
          const parentItem = listContent.content[listContent.content.length - 1]
          if (parentItem) {
            // 检查是否已经有子列表
            const existingSubList = parentItem.content.find(
              (node: TiptapParagraph | TiptapList): node is TiptapList =>
                node.type === 'bulletList' || node.type === 'orderedList'
            )

            if (!existingSubList) {
              // 创建新的子列表，根据标记类型决定列表类型
              const subList: TiptapList = {
                type: isOrdered ? 'orderedList' : 'bulletList',
                attrs: {
                  ...(isOrdered && { start: orderNumber }),
                  tight: true
                },
                content: [listItem]
              }
              parentItem.content.push(subList)
            } else {
              // 如果子列表类型不匹配，创建新的子列表
              if (
                (isOrdered && existingSubList.type !== 'orderedList') ||
                (!isOrdered && existingSubList.type !== 'bulletList')
              ) {
                const newSubList: TiptapList = {
                  type: isOrdered ? 'orderedList' : 'bulletList',
                  attrs: {
                    ...(isOrdered && { start: orderNumber }),
                    tight: true
                  },
                  content: [listItem]
                }
                parentItem.content.push(newSubList)
              } else {
                // 类型匹配，添加到现有子列表
                existingSubList.content.push(listItem)
              }
            }
          }
        } else {
          // 添加顶级列表项
          listContent.content.push(listItem)
        }
      }
      continue
    }

    // 如果不是列表项且当前在列表中，结束当前列表
    if (inList && !line.match(/^(\s*)([-*+]|\d+\.)\s+/)) {
      if (listContent && listContent.content.length > 0) {
        content.push(listContent)
      }
      inList = false
      listContent = null
    }

    // 修改无序列表的处理
    if (line.startsWith('- ') && !line.startsWith('- [')) {
      const text = line.slice(2).trim()
      if (text) {
        if (!inList || listContent?.type !== 'bulletList') {
          if (inList && listContent) {
            content.push(listContent)
          }
          inList = true
          listContent = {
            type: 'bulletList',
            attrs: { tight: true },
            content: []
          }
        }

        listContent.content.push({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              attrs: { textAlign: 'left' },
              content: processInlineStyles(text)
            }
          ]
        })
        continue
      }
    }

    // 处理任务列表
    const taskMatch = line.match(/^(\s*)-\s+\[([ x])\]\s+(.+)$/)
    if (taskMatch) {
      const [, , checked, text] = taskMatch

      if (text.trim()) {
        // 只处理非空任务项
        if (!inList) {
          inList = true
          listContent = {
            type: 'taskList',
            content: []
          }
        }

        listContent.content.push({
          type: 'taskItem',
          attrs: { checked: checked === 'x' },
          content: [
            {
              type: 'paragraph',
              attrs: { textAlign: 'left' },
              content: processInlineStyles(text.trim())
            }
          ]
        })
      }
      continue
    }

    // 修改普通段落的处理
    if (!inCodeBlock && !inTable && !inList && !inQuote) {
      const paragraph = createParagraph(line)
      if (paragraph) {
        content.push(paragraph)
      }
    }
  }

  // 处理最后一个未闭合的块
  if (inTable && tableContent && tableContent.content.length > 0) {
    if (!isEmptyContent(tableContent.content)) {
      content.push(tableContent)
    }
  } else if (inCodeBlock && codeBlockContent.trim()) {
    content.push({
      type: 'codeBlock',
      attrs: { language: codeBlockLanguage },
      content: [{ type: 'text', text: codeBlockContent.trim() }]
    })
  } else if (inList && listContent && listContent.content.length > 0) {
    if (!isEmptyContent(listContent.content)) {
      content.push(listContent)
    }
  } else if (inQuote && quoteContent && quoteContent.content.length > 0) {
    if (!isEmptyContent(quoteContent.content)) {
      content.push(quoteContent)
    }
  }

  // 确保文档至少有一个有效的段落
  if (content.length === 0) {
    content.push({
      type: 'paragraph',
      attrs: { textAlign: 'left' },
      content: [{ type: 'text', text: '' }]
    })
  }

  // 最后一次过滤，移除所有空内容
  const filteredContent = content.filter((node) => {
    if (node.content) {
      return !isEmptyContent(node.content)
    }
    return true
  })

  return {
    type: 'doc',
    content: filteredContent
  }
}

// 处理行内样式的辅助函数
function processInlineStyles(text: string): any[] {
  const content: any[] = []
  let currentText = ''
  let isBold = false
  let isItalic = false

  const flushText = () => {
    if (currentText) {
      const marks: any[] = []
      if (isBold) marks.push({ type: 'bold' })
      if (isItalic) marks.push({ type: 'italic' })

      content.push({
        type: 'text',
        text: currentText,
        ...(marks.length > 0 && { marks })
      })
      currentText = ''
    }
  }

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '*' || text[i] === '_') {
      if (i + 1 < text.length && text[i + 1] === text[i]) {
        flushText()
        isBold = !isBold
        i++
      } else {
        flushText()
        isItalic = !isItalic
      }
    } else {
      currentText += text[i]
    }
  }

  flushText()
  return content
}
