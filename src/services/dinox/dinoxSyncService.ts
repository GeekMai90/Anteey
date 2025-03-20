import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import { DinoxNote, DinoxSyncRecord, DinoxSyncConfig } from '@shared/types'

// 计时器实例
let syncInterval: NodeJS.Timeout | null = null

// 获取同步配置
export async function getSyncConfig(trx?: any): Promise<DinoxSyncConfig> {
  try {
    const config = await (trx || db)('dinox_sync_config').first()
    if (!config) {
      throw new Error('同步配置不存在')
    }
    return config
  } catch (error) {
    console.error('获取 Dinox 同步配置失败:', error)
    throw error
  }
}

// 更新同步配置
export async function updateSyncConfig(
  config: Partial<DinoxSyncConfig>,
  trx?: any
): Promise<DinoxSyncConfig> {
  try {
    const query = (trx || db)('dinox_sync_config')
      .update({
        ...config,
        updatedAt: new Date()
      })
      .returning('*')

    const [updatedConfig] = await query
    return updatedConfig
  } catch (error) {
    console.error('更新 Dinox 同步配置失败:', error)
    throw error
  }
}

// 获取同步记录
export async function getSyncRecord(
  dinoxNoteId: string,
  trx?: any
): Promise<DinoxSyncRecord | null> {
  try {
    const query = (trx || db)('dinox_sync_records').where('dinoxNoteId', dinoxNoteId).first()
    const record = await query
    return record || null
  } catch (error) {
    console.error('获取同步记录失败:', error)
    throw error
  }
}

// 创建同步记录
export async function createSyncRecord(
  record: Omit<DinoxSyncRecord, 'id' | 'createdAt' | 'updatedAt'>,
  trx?: any
): Promise<DinoxSyncRecord> {
  try {
    const now = new Date()
    const query = (trx || db)('dinox_sync_records')
      .insert({
        id: uuidv4(),
        ...record,
        createdAt: now,
        updatedAt: now
      })
      .returning('*')

    const [newRecord] = await query
    return newRecord
  } catch (error) {
    console.error('创建同步记录失败:', error)
    throw error
  }
}

// 更新同步记录
export async function updateSyncRecord(
  id: string,
  record: Partial<DinoxSyncRecord>,
  trx?: any
): Promise<DinoxSyncRecord> {
  try {
    const query = (trx || db)('dinox_sync_records')
      .where({ id })
      .update({
        ...record,
        updatedAt: new Date()
      })
      .returning('*')

    const [updatedRecord] = await query
    return updatedRecord
  } catch (error) {
    console.error('更新同步记录失败:', error)
    throw error
  }
}

// 标记笔记为已毕业
export async function graduateNote(dinoxNoteId: string): Promise<void> {
  try {
    await db('dinox_sync_records').where('dinoxNoteId', dinoxNoteId).update({
      graduated: true,
      updatedAt: new Date()
    })
  } catch (error) {
    console.error('标记笔记毕业状态失败:', error)
    throw error
  }
}

// 从 Dinox 获取笔记
async function fetchDinoxNotes(token: string, lastSyncTime: string): Promise<DinoxNote[]> {
  try {
    console.log('开始请求 Dinox API...')

    // 确保 token 格式正确
    if (!token || token.trim() === '') {
      throw new Error('Token 不能为空')
    }

    // 格式化日期为 YYYY-MM-DD HH:mm:ss
    const date = new Date(lastSyncTime)
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`

    console.log('请求参数:', {
      url: 'https://dinoai.chatgo.pro/openapi/v5/notes',
      token: token ? `${token.slice(0, 5)}...${token.slice(-5)}` : '未设置',
      lastSyncTime: formattedDate
    })

    const requestBody = {
      template: '',
      noteId: 0,
      lastSyncTime: formattedDate
    }

    console.log('请求体:', requestBody)

    // 使用 fetch API 进行网络请求
    const response = await fetch('https://dinoai.chatgo.pro/openapi/v5/notes', {
      method: 'POST',
      headers: {
        Authorization: token.trim(),
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    console.log('API 响应状态:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API 错误响应:', errorText)
      throw new Error(`请求失败: ${response.status} ${response.statusText}\n响应内容: ${errorText}`)
    }

    const result = await response.json()

    // 打印完整的响应数据结构
    console.log('API 完整响应数据:', JSON.stringify(result, null, 2))

    console.log('API 响应结果:', {
      code: result.code,
      msg: result.msg,
      dataLength: result.data?.length || 0
    })

    if (result.code !== '000000') {
      throw new Error(result.msg || '获取笔记失败')
    }

    // 将所有日期的笔记合并成一个数组
    const notes: DinoxNote[] = []
    for (const dayNote of result.data) {
      console.log('处理日期:', dayNote.date)
      console.log('该日期下的笔记数量:', dayNote.notes.length)
      console.log('第一条笔记示例:', JSON.stringify(dayNote.notes[0], null, 2))
      notes.push(...dayNote.notes)
    }

    console.log(`成功获取 ${notes.length} 条笔记`)
    return notes
  } catch (error) {
    console.error('从 Dinox 获取笔记失败:', error)
    throw error
  }
}

// 添加类型定义
interface ListItem {
  type: string
  content: Array<{
    type: string
    attrs?: Record<string, any>
    content?: Array<{
      type: string
      text: string
      marks?: Array<{ type: string }>
    }>
  }>
}

interface TaskItem {
  type: string
  attrs: {
    checked: boolean
  }
  content: Array<{
    type: string
    attrs: {
      textAlign: string
    }
    content: Array<{
      type: string
      text: string
    }>
  }>
}

interface TextContent {
  type: string
  text: string
  marks?: Array<{ type: string }>
}

// 修改函数定义
function convertMarkdownToContent(markdownContent: string): any[] {
  if (!markdownContent) return []

  // 预处理：将连续的多个换行符替换为单个换行符
  const normalizedContent = markdownContent.replace(/\n\s*\n/g, '\n')
  const lines = normalizedContent.split('\n')
  const content: any[] = []

  let i = 0
  let inCodeBlock = false
  let codeContent = ''
  let codeLanguage = ''
  let inBlockquote = false
  let blockquoteContent: any[] = []
  let tableLines: string[] = []
  let inTable = false

  while (i < lines.length) {
    let line = lines[i].trim()

    // 处理表格
    if (line.startsWith('|') && line.endsWith('|')) {
      inTable = true
      tableLines.push(line)
      i++
      continue
    } else if (inTable && line === '') {
      // 遇到空行，结束表格
      inTable = false
      const tableContent = processTableLines(tableLines)
      if (tableContent) {
        content.push(tableContent)
      }
      tableLines = []
      i++
      continue
    } else if (inTable) {
      // 如果还在表格中且不是空行，继续收集表格行
      if (line !== '') {
        tableLines.push(line)
      }
      i++
      continue
    }

    // 处理分隔线
    if (line.match(/^-{3,}$/)) {
      if (inBlockquote) {
        // 如果在引用块内，先结束引用块
        inBlockquote = false
        if (blockquoteContent.length > 0) {
          content.push({
            type: 'blockquote',
            content: blockquoteContent
          })
        }
        blockquoteContent = []
      }
      content.push({
        type: 'horizontalRule'
      })
      i++
      continue
    }

    // 处理引用块
    if (line.startsWith('>')) {
      if (!inBlockquote) {
        inBlockquote = true
        blockquoteContent = []
      }
      // 移除引用标记并处理剩余内容
      line = line.substring(1).trim()

      // 处理引用块内的内容
      const inlineContent = processInlineContent(line)
      if (inlineContent.length > 0) {
        // 只有当内容不为空时才添加
        blockquoteContent.push({
          type: 'paragraph',
          attrs: {
            textAlign: 'left'
          },
          content: inlineContent
        })
      }

      i++
      continue
    } else if (inBlockquote) {
      // 结束引用块
      inBlockquote = false
      if (blockquoteContent.length > 0) {
        content.push({
          type: 'blockquote',
          content: blockquoteContent
        })
      }
      blockquoteContent = []
    }

    // 处理代码块
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true
        codeContent = ''
        codeLanguage = line.slice(3).trim()
      } else {
        inCodeBlock = false
        if (codeContent.trim()) {
          // 只有当代码内容不为空时才添加
          content.push({
            type: 'codeBlock',
            attrs: {
              language: codeLanguage || 'plaintext'
            },
            content: [
              {
                type: 'text',
                text: codeContent.trim()
              }
            ]
          })
        }
      }
      i++
      continue
    }

    if (inCodeBlock) {
      codeContent += line + '\n'
      i++
      continue
    }

    // 跳过空行
    if (line === '') {
      i++
      continue
    }

    // 处理标题
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2].trim()
      const inlineContent = processInlineContent(text)
      if (inlineContent.length > 0) {
        // 只有当内容不为空时才添加
        content.push({
          type: 'heading',
          attrs: {
            level,
            textAlign: 'left'
          },
          content: inlineContent
        })
      }
      i++
      continue
    }

    // 处理无序列表
    if (line.match(/^\*\s+(.+)$/) && !line.match(/^\*\s+\[[ x]\]/)) {
      const listItems: ListItem[] = []

      while (i < lines.length && lines[i].trim().match(/^\*\s+(.+)$/)) {
        const itemMatch = lines[i].trim().match(/^\*\s+(.+)$/)
        if (itemMatch) {
          const text = itemMatch[1].trim()
          // 检查是否包含加粗文本
          const boldRegex = /\*\*(.*?)\*\*/g
          const paraContent: TextContent[] = []
          let lastIndex = 0
          let boldMatch

          // 检查是否有粗体文本
          const hasBold = boldRegex.test(text)
          // 重置正则表达式
          boldRegex.lastIndex = 0

          if (hasBold) {
            while ((boldMatch = boldRegex.exec(text)) !== null) {
              // 添加粗体前的普通文本
              if (boldMatch.index > lastIndex) {
                const beforeText = text.substring(lastIndex, boldMatch.index)
                if (beforeText) {
                  paraContent.push({
                    type: 'text',
                    text: beforeText
                  })
                }
              }

              // 添加粗体文本
              paraContent.push({
                type: 'text',
                text: boldMatch[1],
                marks: [{ type: 'bold' }]
              })

              lastIndex = boldMatch.index + boldMatch[0].length
            }

            // 添加最后一个粗体后的文本
            if (lastIndex < text.length) {
              paraContent.push({
                type: 'text',
                text: text.substring(lastIndex)
              })
            }
          } else {
            paraContent.push({
              type: 'text',
              text
            })
          }

          listItems.push({
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                attrs: {
                  textAlign: 'left'
                },
                content: paraContent
              }
            ]
          })
        }
        i++
      }

      if (listItems.length > 0) {
        content.push({
          type: 'bulletList',
          attrs: {
            tight: true
          },
          content: listItems
        })
      }
      continue
    }

    // 处理有序列表
    const orderedListMatch = line.match(/^(\d+)\.(?:\s*\d+\.)?\s+(.+)$/)
    if (orderedListMatch) {
      const listItems: ListItem[] = []
      const startNum = parseInt(orderedListMatch[1])

      while (i < lines.length && lines[i].trim().match(/^\d+\.(?:\s*\d+\.)?\s+(.+)$/)) {
        const itemMatch = lines[i].trim().match(/^\d+\.(?:\s*\d+\.)?\s+(.+)$/)
        if (itemMatch) {
          // 获取实际的文本内容，忽略所有的编号
          const text = itemMatch[itemMatch.length - 1].trim()
          // 检查是否包含加粗文本
          const boldRegex = /\*\*(.*?)\*\*/g
          const paraContent: TextContent[] = []
          let lastIndex = 0
          let boldMatch

          // 检查是否有粗体文本
          const hasBold = boldRegex.test(text)
          // 重置正则表达式
          boldRegex.lastIndex = 0

          if (hasBold) {
            while ((boldMatch = boldRegex.exec(text)) !== null) {
              // 添加粗体前的普通文本
              if (boldMatch.index > lastIndex) {
                const beforeText = text.substring(lastIndex, boldMatch.index)
                if (beforeText) {
                  paraContent.push({
                    type: 'text',
                    text: beforeText
                  })
                }
              }

              // 添加粗体文本
              paraContent.push({
                type: 'text',
                text: boldMatch[1],
                marks: [{ type: 'bold' }]
              })

              lastIndex = boldMatch.index + boldMatch[0].length
            }

            // 添加最后一个粗体后的文本
            if (lastIndex < text.length) {
              paraContent.push({
                type: 'text',
                text: text.substring(lastIndex)
              })
            }
          } else {
            paraContent.push({
              type: 'text',
              text
            })
          }

          listItems.push({
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                attrs: {
                  textAlign: 'left'
                },
                content: paraContent
              }
            ]
          })
        }
        i++
      }

      if (listItems.length > 0) {
        content.push({
          type: 'orderedList',
          attrs: {
            start: startNum,
            tight: true
          },
          content: listItems
        })
      }
      continue
    }

    // 处理任务列表
    if (line.match(/^\*\s+\[[ x]\]\s+(.+)$/)) {
      const taskItems: TaskItem[] = []

      while (i < lines.length && lines[i].trim().match(/^\*\s+\[[ x]\]\s+(.+)$/)) {
        const itemMatch = lines[i].trim().match(/^\*\s+\[([x| ])\]\s+(.+)$/)
        if (itemMatch) {
          const checked = itemMatch[1] === 'x'
          const text = itemMatch[2].trim()
          taskItems.push({
            type: 'taskItem',
            attrs: {
              checked
            },
            content: [
              {
                type: 'paragraph',
                attrs: {
                  textAlign: 'left'
                },
                content: [
                  {
                    type: 'text',
                    text
                  }
                ]
              }
            ]
          })
        }
        i++
      }

      if (taskItems.length > 0) {
        content.push({
          type: 'taskList',
          content: taskItems
        })
      }
      continue
    }

    // 处理图片
    const imageMatch = line.match(/!\[(.*?)\]\((.*?)\)/)
    if (imageMatch) {
      content.push({
        type: 'image',
        attrs: {
          align: 'center',
          alt: imageMatch[1] || '',
          src: imageMatch[2],
          title: null,
          width: '100%'
        }
      })
      i++
      continue
    }

    // 处理普通段落
    if (line !== '') {
      const inlineContent = processInlineContent(line)
      if (inlineContent.length > 0) {
        // 只有当内容不为空时才添加
        content.push({
          type: 'paragraph',
          attrs: {
            textAlign: 'left'
          },
          content: inlineContent
        })
      }
    }

    i++
  }

  // 如果最后还在引用块中，添加最后的引用块
  if (inBlockquote && blockquoteContent.length > 0) {
    content.push({
      type: 'blockquote',
      content: blockquoteContent
    })
  }

  // 处理最后可能剩余的表格
  if (tableLines.length > 0) {
    const tableContent = processTableLines(tableLines)
    if (tableContent) {
      content.push(tableContent)
    }
  }

  return content
}

// 修改表格处理函数
function processTableLines(lines: string[]): any | null {
  // 移除空行和空白字符
  lines = lines.filter((line) => line.trim() !== '')

  if (lines.length < 3) return null // 至少需要表头、分隔行和数据行

  // 解析表格行
  const rows = lines.map((line) => {
    return line
      .trim()
      .replace(/^\||\|$/g, '') // 移除首尾的 |
      .split('|')
      .map((cell) => cell.trim())
  })

  // 检查是否是分隔行（包含 - 的行）
  const separatorIndex = rows.findIndex((row) => row.every((cell) => /^[-:|]+$/.test(cell.trim())))

  if (separatorIndex === -1 || separatorIndex === 0 || separatorIndex === rows.length - 1) {
    return null
  }

  // 提取表头和数据行
  const headerRow = rows[0]
  const dataRows = rows.slice(separatorIndex + 1)

  // 检查所有行的列数是否一致
  const columnCount = headerRow.length
  if (!rows.every((row) => row.length === columnCount)) {
    return null
  }

  // 创建表格结构
  return {
    type: 'table',
    content: [
      // 表头行
      {
        type: 'tableRow',
        content: headerRow.map((cell) => ({
          type: 'tableHeader',
          attrs: {
            colspan: 1,
            colwidth: null,
            rowspan: 1
          },
          content: [
            {
              type: 'paragraph',
              attrs: { textAlign: 'left' },
              content: [{ type: 'text', text: cell }]
            }
          ]
        }))
      },
      // 数据行
      ...dataRows.map((row) => ({
        type: 'tableRow',
        content: row.map((cell) => ({
          type: 'tableCell',
          attrs: {
            colspan: 1,
            colwidth: null,
            rowspan: 1
          },
          content: [
            {
              type: 'paragraph',
              attrs: { textAlign: 'left' },
              content: [{ type: 'text', text: cell }]
            }
          ]
        }))
      }))
    ]
  }
}

// 处理行内格式（加粗、斜体、内联代码、链接等）
function processInlineContent(text: string): any[] {
  if (!text || typeof text !== 'string') {
    return []
  }

  const content: any[] = []
  let currentText = ''
  let pos = 0

  const flushCurrentText = () => {
    if (currentText.trim()) {
      // 只有当文本不为空时才添加
      content.push({ type: 'text', text: currentText })
    }
    currentText = ''
  }

  try {
    while (pos < text.length) {
      // 处理内联代码
      if (text[pos] === '`' && pos + 1 < text.length) {
        flushCurrentText()
        pos++
        let code = ''
        while (pos < text.length && text[pos] !== '`') {
          code += text[pos]
          pos++
        }
        if (pos < text.length) pos++ // skip closing backtick
        if (code.trim()) {
          // 只有当代码不为空时才添加
          content.push({
            type: 'text',
            text: code,
            marks: [{ type: 'code' }]
          })
        }
        continue
      }

      // 处理链接
      if (text[pos] === '[' && text.indexOf('](', pos) > -1) {
        const linkMatch = text.slice(pos).match(/\[([^\]]+)\]\(([^)]+)\)/)
        if (linkMatch) {
          flushCurrentText()
          content.push({
            type: 'text',
            text: linkMatch[1],
            marks: [
              {
                type: 'link',
                attrs: {
                  href: linkMatch[2],
                  target: '_blank'
                }
              }
            ]
          })
          pos += linkMatch[0].length
          continue
        }
      }

      // 处理加粗
      if (text[pos] === '*' && text[pos + 1] === '*' && pos + 2 < text.length) {
        flushCurrentText()
        pos += 2
        let boldText = ''
        while (pos < text.length - 1 && !(text[pos] === '*' && text[pos + 1] === '*')) {
          boldText += text[pos]
          pos++
        }
        if (pos < text.length - 1) {
          pos += 2
          if (boldText.trim()) {
            // 只有当文本不为空时才添加
            content.push({
              type: 'text',
              text: boldText,
              marks: [{ type: 'bold' }]
            })
          }
          continue
        } else {
          pos -= 2
        }
      }

      // 处理斜体
      if (
        text[pos] === '*' &&
        (pos === 0 || text[pos - 1] !== '*') &&
        (pos === text.length - 1 || text[pos + 1] !== '*')
      ) {
        flushCurrentText()
        pos++
        let italicText = ''
        let foundClosing = false
        while (pos < text.length) {
          if (text[pos] === '*' && (pos === text.length - 1 || text[pos + 1] !== '*')) {
            foundClosing = true
            break
          }
          italicText += text[pos]
          pos++
        }
        if (foundClosing) {
          pos++
          if (italicText.trim()) {
            // 只有当文本不为空时才添加
            content.push({
              type: 'text',
              text: italicText,
              marks: [{ type: 'italic' }]
            })
          }
          continue
        } else {
          pos = pos - italicText.length - 1
        }
      }

      currentText += text[pos]
      pos++
    }

    flushCurrentText()

    return content
  } catch (error) {
    console.error('处理行内格式时出错:', error)
    return text.trim() ? [{ type: 'text', text: text.trim() }] : [] // 如果有错误，返回去除空格后的文本
  }
}

// 解析 Dinox 时间字符串为 Date 对象
function parseDinoxTime(timeStr: string): Date {
  // 解析 Dinox 时间格式 "YYYY-MM-DD HH:mm:ss"
  const [datePart, timePart] = timeStr.split(' ')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes, seconds] = timePart.split(':').map(Number)

  // 创建一个新的 Date 对象，使用 UTC 时间
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds))

  // 调整为本地时间
  const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000)

  console.log('时间转换:', {
    input: timeStr,
    utc: date.toISOString(),
    local: localDate.toISOString(),
    timestamp: localDate.getTime()
  })

  return localDate
}

// 专门用于同步的笔记创建方法
async function createSyncNote(
  options: {
    cardType: string
    createdAt: Date
    address: string
    metadata: any
  },
  trx: any
): Promise<any> {
  const id = uuidv4()
  const now = new Date()

  const newNote = {
    id,
    type: 'note',
    address: options.address,
    cardType: options.cardType,
    content: {
      type: 'doc',
      content: [
        {
          attrs: {
            textAlign: 'left'
          },
          content: [],
          type: 'paragraph'
        }
      ]
    },
    createdAt: options.createdAt || now,
    updatedAt: now,
    references: {
      outgoing: [],
      incoming: []
    },
    relationshipTree: {
      parents: [],
      children: [],
      siblings: []
    },
    graphData: {
      x: 0,
      y: 0
    },
    cardBoxId: undefined,
    parentId: undefined,
    isDeleted: false,
    isStarred: false,
    starredOrder: undefined,
    rightBarOrder: undefined,
    metadata: {
      title: '',
      summary: '',
      ...options.metadata
    },
    isFlashcard: false,
    flashcard: undefined,
    nextReviewAt: undefined
  }

  await trx('notes').insert({
    ...newNote,
    content: JSON.stringify(newNote.content),
    references: JSON.stringify(newNote.references),
    relationshipTree: JSON.stringify(newNote.relationshipTree),
    graphData: JSON.stringify(newNote.graphData),
    metadata: JSON.stringify(newNote.metadata)
  })

  return newNote
}

// 修改 syncNotes 函数中创建笔记的部分
export async function syncNotes(batchSize: number = 50): Promise<{
  total: number
  added: number
  updated: number
  deleted: number
  skipped: number
}> {
  try {
    const stats = {
      total: 0,
      added: 0,
      updated: 0,
      deleted: 0,
      skipped: 0
    }

    // 获取同步配置
    const config = await getSyncConfig()
    if (!config.token) {
      throw new Error('未配置 Dinox token')
    }

    // 获取笔记
    const notes = await fetchDinoxNotes(config.token, config.lastSyncTime)
    stats.total = notes.length

    // 分批处理笔记
    for (let i = 0; i < notes.length; i += batchSize) {
      const batch = notes.slice(i, i + batchSize)
      console.log(
        `处理第 ${i + 1} 到 ${Math.min(i + batchSize, notes.length)} 条笔记，共 ${notes.length} 条`
      )

      // 使用事务处理每一批数据
      await db.transaction(async (trx) => {
        for (const note of batch) {
          const syncRecord = await getSyncRecord(note.noteId, trx)

          if (syncRecord) {
            // 检查笔记类型
            const existingNote = await trx('notes').where('id', syncRecord.antinoteId).first()
            if (existingNote && existingNote.cardType !== 'Draftcard') {
              stats.skipped++
              continue
            }
          }

          if (note.isDel) {
            if (syncRecord) {
              await trx('notes').where('id', syncRecord.antinoteId).update({ isDeleted: true })
              stats.deleted++
            }
          } else if (!syncRecord) {
            // 处理新笔记 - 使用新的 createSyncNote 方法
            const dinoxCreateTime = parseDinoxTime(note.createTime)
            const addressCode = `Dinox-${dinoxCreateTime.getFullYear()}${String(
              dinoxCreateTime.getMonth() + 1
            ).padStart(2, '0')}${String(dinoxCreateTime.getDate()).padStart(2, '0')}${String(
              dinoxCreateTime.getHours()
            ).padStart(2, '0')}${String(dinoxCreateTime.getMinutes()).padStart(2, '0')}`

            const newNote = await createSyncNote(
              {
                cardType: 'Draftcard',
                createdAt: dinoxCreateTime,
                address: addressCode,
                metadata: {
                  title: note.title || '未命名笔记',
                  dinoxNoteId: note.noteId,
                  dinoxCreateTime: note.createTime
                }
              },
              trx
            )

            const content = {
              type: 'doc',
              content: [
                {
                  type: 'heading',
                  attrs: {
                    level: 1,
                    textAlign: 'left'
                  },
                  content: [
                    {
                      type: 'text',
                      text: note.title || '未命名笔记'
                    }
                  ]
                },
                ...convertMarkdownToContent(note.contentMd || '')
              ]
            }

            const metadata = {
              title: note.title || '未命名笔记',
              summary: '',
              references: [],
              attachments: [],
              dinoxNoteId: note.noteId,
              dinoxCreateTime: note.createTime
            }

            await trx('notes')
              .where('id', newNote.id)
              .update({
                content: JSON.stringify(content),
                metadata: JSON.stringify(metadata),
                updatedAt: new Date()
              })

            await createSyncRecord(
              {
                dinoxNoteId: note.noteId,
                antinoteId: newNote.id,
                lastSyncTime: new Date(),
                graduated: false
              },
              trx
            ) // 传入事务对象

            stats.added++
          } else {
            // 更新现有笔记
            const content = {
              type: 'doc',
              content: [
                {
                  type: 'heading',
                  attrs: {
                    level: 1,
                    textAlign: 'left'
                  },
                  content: [
                    {
                      type: 'text',
                      text: note.title || '未命名笔记'
                    }
                  ]
                },
                ...convertMarkdownToContent(note.contentMd || '')
              ]
            }

            const metadata = {
              title: note.title || '未命名笔记',
              summary: '',
              references: [],
              attachments: [],
              dinoxNoteId: note.noteId,
              dinoxCreateTime: note.createTime
            }

            await trx('notes')
              .where('id', syncRecord.antinoteId)
              .update({
                content: JSON.stringify(content),
                metadata: JSON.stringify(metadata),
                updatedAt: new Date()
              })

            await updateSyncRecord(
              syncRecord.id,
              {
                lastSyncTime: new Date()
              },
              trx
            ) // 传入事务对象

            stats.updated++
          }
        }

        // 在事务内更新同步时间
        await updateSyncConfig(
          {
            lastSyncTime: new Date().toISOString()
          },
          trx
        )
      })

      // 添加适当的延迟，避免过度占用系统资源
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    return stats
  } catch (error) {
    console.error('同步 Dinox 笔记失败:', error)
    throw error
  }
}

/**
 * 启动 Dinox 自动同步计时器
 */
export async function startDinoxSyncTimer() {
  try {
    // 先停止现有的计时器
    stopDinoxSyncTimer()

    // 获取配置
    const config = await getSyncConfig()

    // 如果启用了自动同步
    if (config.autoSync) {
      const intervalMinutes = config.autoSyncInterval || 30 // 默认30分钟
      const intervalMs = intervalMinutes * 60 * 1000

      console.log(`主进程→ 启动 Dinox 自动同步计时器，间隔: ${intervalMinutes} 分钟`)

      syncInterval = setInterval(async () => {
        try {
          console.log('主进程→ 执行 Dinox 自动同步...')
          const stats = await syncNotes()
          console.log(
            `主进程→ Dinox 自动同步完成: 新增 ${stats.added}，更新 ${stats.updated}，删除 ${stats.deleted}，跳过 ${stats.skipped}`
          )
        } catch (error) {
          console.error('主进程→ Dinox 自动同步失败:', error)
        }
      }, intervalMs)

      return true
    }

    return false
  } catch (error) {
    console.error('主进程→ 启动 Dinox 自动同步计时器失败:', error)
    return false
  }
}

/**
 * 停止 Dinox 自动同步计时器
 */
export function stopDinoxSyncTimer() {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
    console.log('主进程→ 已停止 Dinox 自动同步计时器')
    return true
  }
  return false
}

/**
 * 重启 Dinox 自动同步计时器
 */
export async function restartDinoxSyncTimer() {
  stopDinoxSyncTimer()
  return await startDinoxSyncTimer()
}

/**
 * 重置同步时间以进行全量同步
 */
export async function resetSyncTime(): Promise<void> {
  try {
    // 设置一个较早的时间，比如2023年1月1日
    const resetTime = new Date('2023-01-01T00:00:00Z').toISOString()

    await db('dinox_sync_config').update({
      lastSyncTime: resetTime,
      updatedAt: new Date()
    })

    console.log('同步时间已重置为:', resetTime)
  } catch (error) {
    console.error('重置同步时间失败:', error)
    throw error
  }
}

/**
 * 执行全量同步
 * 会先重置同步时间，然后执行同步操作
 */
export async function fullSync(): Promise<{
  total: number
  added: number
  updated: number
  deleted: number
  skipped: number
}> {
  try {
    console.log('开始执行全量同步...')

    // 1. 重置同步时间到 2023 年初
    const resetTime = new Date('2023-01-01T00:00:00Z').toISOString()
    await db('dinox_sync_config').update({
      lastSyncTime: resetTime,
      updatedAt: new Date()
    })
    console.log('同步时间已重置为:', resetTime)

    // 2. 执行同步操作
    const stats = await syncNotes()
    console.log('全量同步完成:', stats)

    return stats
  } catch (error) {
    console.error('全量同步失败:', error)
    throw error
  }
}
