import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import { DinoxNote, DinoxSyncRecord, DinoxSyncConfig } from '@shared/types'
import { createNote } from '../notes/notesService'

// 计时器实例
let syncInterval: NodeJS.Timeout | null = null

// 获取同步配置
export async function getSyncConfig(): Promise<DinoxSyncConfig> {
  try {
    const config = await db('dinox_sync_config').first()
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
export async function updateSyncConfig(config: Partial<DinoxSyncConfig>): Promise<DinoxSyncConfig> {
  try {
    const [updatedConfig] = await db('dinox_sync_config')
      .update({
        ...config,
        updatedAt: new Date()
      })
      .returning('*')

    return updatedConfig
  } catch (error) {
    console.error('更新 Dinox 同步配置失败:', error)
    throw error
  }
}

// 获取同步记录
export async function getSyncRecord(dinoxNoteId: string): Promise<DinoxSyncRecord | null> {
  try {
    const record = await db('dinox_sync_records').where('dinoxNoteId', dinoxNoteId).first()
    return record || null
  } catch (error) {
    console.error('获取同步记录失败:', error)
    throw error
  }
}

// 创建同步记录
export async function createSyncRecord(
  record: Omit<DinoxSyncRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DinoxSyncRecord> {
  try {
    const now = new Date()
    const [newRecord] = await db('dinox_sync_records')
      .insert({
        id: uuidv4(),
        ...record,
        createdAt: now,
        updatedAt: now
      })
      .returning('*')

    return newRecord
  } catch (error) {
    console.error('创建同步记录失败:', error)
    throw error
  }
}

// 更新同步记录
export async function updateSyncRecord(
  id: string,
  record: Partial<DinoxSyncRecord>
): Promise<DinoxSyncRecord> {
  try {
    const [updatedRecord] = await db('dinox_sync_records')
      .where({ id })
      .update({
        ...record,
        updatedAt: new Date()
      })
      .returning('*')

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

  const lines = markdownContent.split('\n')
  const content: any[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()

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
      content.push({
        type: 'heading',
        attrs: {
          level,
          textAlign: 'left'
        },
        content: [
          {
            type: 'text',
            text
          }
        ]
      })
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
    const orderedListMatch = line.match(/^(\d+)\.\s+(.+)$/)
    if (orderedListMatch) {
      const listItems: ListItem[] = []
      const startNum = parseInt(orderedListMatch[1])

      while (i < lines.length && lines[i].trim().match(/^\d+\.\s+(.+)$/)) {
        const itemMatch = lines[i].trim().match(/^\d+\.\s+(.+)$/)
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

    // 处理普通段落（可能包含粗体和斜体）
    const textContent = line
    const paraContent: TextContent[] = []

    // 处理粗体
    const boldRegex = /\*\*(.*?)\*\*/g
    let boldMatch
    let lastIndex = 0

    // 检查是否有粗体文本
    const hasBold = boldRegex.test(textContent)
    // 重置正则表达式
    boldRegex.lastIndex = 0

    if (hasBold) {
      while ((boldMatch = boldRegex.exec(textContent)) !== null) {
        // 添加粗体前的普通文本
        if (boldMatch.index > lastIndex) {
          const beforeText = textContent.substring(lastIndex, boldMatch.index)
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
      if (lastIndex < textContent.length) {
        paraContent.push({
          type: 'text',
          text: textContent.substring(lastIndex)
        })
      }
    } else if (/\*[^*]+\*/g.test(textContent)) {
      // 处理斜体
      const italicRegex = /\*([^*]+)\*/g
      let italicMatch
      lastIndex = 0

      while ((italicMatch = italicRegex.exec(textContent)) !== null) {
        // 添加斜体前的普通文本
        if (italicMatch.index > lastIndex) {
          const beforeText = textContent.substring(lastIndex, italicMatch.index)
          if (beforeText) {
            paraContent.push({
              type: 'text',
              text: beforeText
            })
          }
        }

        // 添加斜体文本
        paraContent.push({
          type: 'text',
          text: italicMatch[1],
          marks: [{ type: 'italic' }]
        })

        lastIndex = italicMatch.index + italicMatch[0].length
      }

      // 添加最后一个斜体后的文本
      if (lastIndex < textContent.length) {
        paraContent.push({
          type: 'text',
          text: textContent.substring(lastIndex)
        })
      }
    } else {
      // 普通文本
      paraContent.push({
        type: 'text',
        text: textContent
      })
    }

    // 创建段落
    content.push({
      type: 'paragraph',
      attrs: {
        textAlign: 'left'
      },
      content: paraContent
    })

    i++
  }

  return content
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

// 执行同步
export async function syncNotes(): Promise<{
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

    // 处理每个笔记
    for (const note of notes) {
      const syncRecord = await getSyncRecord(note.noteId)

      if (syncRecord) {
        // 检查笔记类型
        const existingNote = await db('notes').where('id', syncRecord.antinoteId).first()
        if (existingNote && existingNote.cardType !== 'Draftcard') {
          // 如果笔记类型不是 Draftcard，说明已经被处理过，跳过同步
          stats.skipped++
          continue
        }
      }

      if (note.isDel) {
        // 处理删除的笔记
        if (syncRecord) {
          await db('notes').where('id', syncRecord.antinoteId).update({ isDeleted: true })
          stats.deleted++
        }
      } else if (!syncRecord) {
        // 处理新笔记 - 使用 createNote 方法创建 Draftcard 类型的笔记
        const dinoxCreateTime = parseDinoxTime(note.createTime)
        console.log('解析的时间:', {
          original: note.createTime,
          parsed: dinoxCreateTime,
          timestamp: dinoxCreateTime.getTime()
        })
        // 生成地址编码：Dinox-YYYYMMDDHHmm
        const addressCode = `Dinox-${dinoxCreateTime.getFullYear()}${String(
          dinoxCreateTime.getMonth() + 1
        ).padStart(2, '0')}${String(dinoxCreateTime.getDate()).padStart(2, '0')}${String(
          dinoxCreateTime.getHours()
        ).padStart(2, '0')}${String(dinoxCreateTime.getMinutes()).padStart(2, '0')}`

        const newNote = await createNote({
          cardType: 'Draftcard',
          createdAt: dinoxCreateTime,
          address: addressCode,
          metadata: {
            title: note.title || '未命名笔记',
            dinoxNoteId: note.noteId,
            dinoxCreateTime: note.createTime
          }
        })

        // 构建笔记内容 - 将 Markdown 内容转换为 ProseMirror 文档格式
        const content = {
          type: 'doc',
          content: [
            // 标题部分
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
            // 转换内容，包括图片处理
            ...convertMarkdownToContent(note.contentMd || '')
          ]
        }

        // 构建元数据
        const metadata = {
          title: note.title || '未命名笔记',
          summary: '',
          references: [],
          attachments: [],
          // 只保留必要的 Dinox 元数据
          dinoxNoteId: note.noteId,
          dinoxCreateTime: note.createTime
        }

        // 更新笔记内容和元数据
        await db('notes')
          .where('id', newNote.id)
          .update({
            content: JSON.stringify(content),
            metadata: JSON.stringify(metadata),
            updatedAt: new Date()
          })

        // 创建同步记录
        await createSyncRecord({
          dinoxNoteId: note.noteId,
          antinoteId: newNote.id,
          lastSyncTime: new Date(),
          graduated: false
        })

        stats.added++
      } else {
        // 更新现有的 Draftcard 笔记
        const content = {
          type: 'doc',
          content: [
            // 标题部分
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
            // 转换内容，包括图片处理
            ...convertMarkdownToContent(note.contentMd || '')
          ]
        }

        // 构建元数据
        const metadata = {
          title: note.title || '未命名笔记',
          summary: '',
          references: [],
          attachments: [],
          // 只保留必要的 Dinox 元数据
          dinoxNoteId: note.noteId,
          dinoxCreateTime: note.createTime
        }

        await db('notes')
          .where('id', syncRecord.antinoteId)
          .update({
            content: JSON.stringify(content),
            metadata: JSON.stringify(metadata),
            updatedAt: new Date()
          })

        await updateSyncRecord(syncRecord.id, {
          lastSyncTime: new Date()
        })

        stats.updated++
      }
    }

    // 更新最后同步时间
    await updateSyncConfig({
      lastSyncTime: new Date().toISOString()
    })

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
