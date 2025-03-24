import { db } from '../../db/config'
import log from 'electron-log'
import { JsonContent, Note } from '@shared/types/note'
import type { ChatResponse } from '@shared/types/ai-chat'

// 处理结果接口
interface ProcessResult {
  // 给 AI 服务使用的文本
  contextText: string
  // 给前端显示用的引用信息
  references: {
    notes: Array<{
      noteId: string
      title: string
      address: string
    }>
  }
  // 内容类型标记
  sourceTypes: ChatResponse['sourceTypes']
}

// 内部使用的笔记处理结果接口
interface ProcessedNoteResult {
  id: string
  title: string
  content: string
  address: string
}

// 扩展 JsonContent 接口以包含所有需要的属性
interface ExtendedJsonContent extends JsonContent {
  attrs?: {
    level?: number
    textAlign?: string
    src?: string
    alt?: string
    title?: string
    language?: string
    checked?: boolean
  }
}

// 处理 JsonContent 数组
function processContent(content: JsonContent[]): string {
  if (!content || !Array.isArray(content)) return ''

  return content
    .map((node) => {
      const nodeContent = node.content || []

      switch (node.type) {
        case 'heading': {
          const extendedNode = node as ExtendedJsonContent
          const level = extendedNode.attrs?.level || 1
          const prefix = '#'.repeat(level) + ' '
          return `${prefix}${processTextContent(nodeContent)}\n`
        }

        case 'paragraph': {
          const text = processTextContent(nodeContent)
          return text ? `${text}\n` : ''
        }

        case 'bulletList': {
          return processListItems(nodeContent, '- ')
        }

        case 'orderedList': {
          return processListItems(nodeContent, null, true)
        }

        case 'taskList': {
          return processTaskItems(nodeContent)
        }

        case 'blockquote': {
          const quoteContent = processTextContent(nodeContent)
          return quoteContent ? `> ${quoteContent}\n` : ''
        }

        case 'codeBlock': {
          const extendedNode = node as ExtendedJsonContent
          const code = nodeContent[0]?.text || ''
          const language = extendedNode.attrs?.language || ''
          return `\`\`\`${language}\n${code}\n\`\`\`\n`
        }

        case 'table': {
          return processTable(nodeContent)
        }

        case 'image': {
          const extendedNode = node as ExtendedJsonContent
          const alt = extendedNode.attrs?.alt || ''
          const title = extendedNode.attrs?.title || ''
          return `[图片${alt ? `: ${alt}` : ''}${title ? ` - ${title}` : ''}]\n`
        }

        default:
          return ''
      }
    })
    .join('\n')
    .trim()
}

// 处理文本内容
function processTextContent(content: JsonContent[]): string {
  if (!content) return ''

  return content
    .map((node) => {
      if (node.type === 'text') {
        return node.text || ''
      }
      return ''
    })
    .join('')
    .trim()
}

// 处理列表项
function processListItems(items: JsonContent[], prefix: string | null, ordered = false): string {
  if (!items || !items.length) return ''

  return items
    .map((item, index) => {
      const itemContent = item.content || []
      const itemPrefix = ordered ? `${index + 1}. ` : prefix
      const content = itemContent
        .map((node) => {
          if (node.type === 'paragraph') {
            return processTextContent(node.content || [])
          } else if (['bulletList', 'orderedList'].includes(node.type)) {
            const nestedContent = node.content || []
            const nestedPrefix = ordered ? null : '  - '
            return processListItems(nestedContent, nestedPrefix, node.type === 'orderedList')
              .split('\n')
              .map((line) => `  ${line}`)
              .join('\n')
          }
          return ''
        })
        .filter(Boolean)
        .join('\n')

      return `${itemPrefix}${content}`
    })
    .join('\n')
}

// 处理任务列表项
function processTaskItems(items: JsonContent[]): string {
  if (!items || !items.length) return ''

  return items
    .map((item) => {
      const extendedItem = item as ExtendedJsonContent
      const checked = extendedItem.attrs?.checked ? '[x]' : '[ ]'
      const content = processTextContent(item.content?.[0]?.content || [])
      return `- ${checked} ${content}`
    })
    .join('\n')
}

// 处理表格
function processTable(rows: JsonContent[]): string {
  if (!rows || !rows.length) return ''

  const tableRows = rows.map((row) => {
    const cells = row.content || []
    return cells
      .map((cell) => {
        const cellContent = processTextContent(cell.content?.[0]?.content || [])
        return cellContent.padEnd(20)
      })
      .join(' | ')
  })

  if (!tableRows.length) return ''

  // 添加表格分隔符
  const separator = '-'.repeat(20)
  const separatorRow =
    tableRows[0]
      ?.split('|')
      .map(() => separator)
      .join(' | ') || ''

  if (!separatorRow) return tableRows.join('\n')

  tableRows.splice(1, 0, separatorRow)
  return tableRows.join('\n')
}

// 修改主处理函数
export async function processNoteContent(noteIds: string[]): Promise<ProcessResult> {
  try {
    log.info('开始处理笔记内容:', { noteCount: noteIds.length })

    // 从数据库获取笔记
    const notes = await db('notes')
      .select('id', 'content', 'address', 'metadata')
      .whereIn('id', noteIds)
      .where('isDeleted', false)

    log.info('成功获取笔记:', {
      foundCount: notes.length,
      requestedCount: noteIds.length
    })

    // 处理每个笔记的内容
    const processedNotes: ProcessedNoteResult[] = notes.map((note: Note) => {
      try {
        // 解析 JSON 内容
        const contentObj =
          typeof note.content === 'string' ? JSON.parse(note.content) : note.content
        // 获取标题
        const title = note.metadata?.title || '无标题'
        // 处理内容
        const plainContent = processContent(contentObj.content)

        return {
          id: note.id,
          title,
          content: plainContent,
          address: note.address
        }
      } catch (error) {
        log.error('处理笔记内容失败:', {
          noteId: note.id,
          error
        })
        return {
          id: note.id,
          title: '处理失败的笔记',
          content: '该笔记内容处理失败',
          address: note.address
        }
      }
    })

    // 1. 生成给 AI 的上下文文本
    const contextText = processedNotes
      .map((note) => `# ${note.address}\n${note.title}\n\n${note.content}`)
      .join('\n\n---\n\n')

    // 2. 生成给前端的引用信息
    const references = {
      notes: processedNotes.map((note) => ({
        noteId: note.id,
        title: note.title,
        address: note.address
      }))
    }

    // 3. 生成内容类型标记
    const sourceTypes: ChatResponse['sourceTypes'] = {
      hasNotes: processedNotes.length > 0,
      hasImages: false,
      hasPdfs: false
    }

    log.info('笔记内容处理完成:', {
      processedCount: processedNotes.length,
      totalLength: contextText.length,
      referencesCount: references.notes.length
    })

    return {
      contextText,
      references,
      sourceTypes
    }
  } catch (error) {
    log.error('处理笔记内容时发生错误:', error)
    throw new Error('处理笔记内容失败')
  }
}
