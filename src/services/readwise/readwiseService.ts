import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import {
  ReadwiseHighlight,
  ReadwiseSyncRecord,
  ReadwiseSyncConfig,
  ReadwiseSyncStats,
  ReadwiseApiResponse,
  ReadwiseBook
} from '@shared/types'

// 计时器实例
let syncInterval: NodeJS.Timeout | null = null

// 获取同步配置
export async function getSyncConfig(trx?: any): Promise<ReadwiseSyncConfig> {
  try {
    const config = await (trx || db)('readwise_sync_config').first()
    if (!config) {
      throw new Error('同步配置不存在')
    }
    return config
  } catch (error) {
    console.error('获取 Readwise 同步配置失败:', error)
    throw error
  }
}

// 更新同步配置
export async function updateSyncConfig(
  config: Partial<ReadwiseSyncConfig>,
  trx?: any
): Promise<ReadwiseSyncConfig> {
  try {
    const query = (trx || db)('readwise_sync_config')
      .update({
        ...config,
        updatedAt: new Date()
      })
      .returning('*')

    const [updatedConfig] = await query
    return updatedConfig
  } catch (error) {
    console.error('更新 Readwise 同步配置失败:', error)
    throw error
  }
}

// 获取同步记录
export async function getSyncRecord(
  readwiseHighlightId: string,
  trx?: any
): Promise<ReadwiseSyncRecord | null> {
  try {
    const query = (trx || db)('readwise_sync_records')
      .where('readwiseHighlightId', readwiseHighlightId)
      .first()
    const record = await query
    return record || null
  } catch (error) {
    console.error('获取同步记录失败:', error)
    throw error
  }
}

// 创建同步记录
export async function createSyncRecord(
  record: Omit<ReadwiseSyncRecord, 'id' | 'createdAt' | 'updatedAt'>,
  trx?: any
): Promise<ReadwiseSyncRecord> {
  try {
    const now = new Date()
    const query = (trx || db)('readwise_sync_records')
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
  record: Partial<ReadwiseSyncRecord>,
  trx?: any
): Promise<ReadwiseSyncRecord> {
  try {
    const query = (trx || db)('readwise_sync_records')
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

// 添加延迟函数
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// 添加重试函数
async function fetchWithRetry<T>(
  fetcher: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 2000
): Promise<T> {
  try {
    return await fetcher()
  } catch (error) {
    if (retries > 0) {
      console.log(`请求失败，${delayMs}ms 后重试，剩余重试次数：${retries - 1}`)
      await delay(delayMs)
      return fetchWithRetry(fetcher, retries - 1, delayMs * 1.5) // 指数退避
    }
    throw error
  }
}

// 从 Readwise 获取增量高亮内容（使用 highlights 端点）
async function fetchReadwiseHighlights(
  token: string,
  lastSyncTime: string,
  pageSize: number = 1000
): Promise<ReadwiseHighlight[]> {
  try {
    console.log('开始请求 Readwise API 增量高亮...')

    if (!token || token.trim() === '') {
      throw new Error('Token 不能为空')
    }

    // 格式化日期为 ISO 格式
    const date = new Date(lastSyncTime)
    const formattedDate = date.toISOString()

    console.log('请求参数:', {
      url: 'https://readwise.io/api/v2/highlights',
      token: token ? `${token.slice(0, 5)}...${token.slice(-5)}` : '未设置',
      lastSyncTime: formattedDate,
      pageSize
    })

    let allHighlights: ReadwiseHighlight[] = []
    let nextPageCursor: string | undefined = undefined
    let pageCount = 0

    do {
      pageCount++
      console.log(`正在获取第 ${pageCount} 页增量数据，cursor: ${nextPageCursor || '首页'}`)

      const url = new URL('https://readwise.io/api/v2/highlights')
      url.searchParams.append('updated__gt', formattedDate)
      url.searchParams.append('page_size', pageSize.toString())
      if (nextPageCursor) {
        url.searchParams.append('pageCursor', nextPageCursor)
      }

      const response = await fetchWithRetry(async () => {
        return await fetch(url.toString(), {
          method: 'GET',
          headers: {
            Authorization: `Token ${token.trim()}`,
            'Content-Type': 'application/json'
          }
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `请求失败: ${response.status} ${response.statusText}\n响应内容: ${errorText}`
        )
      }

      const result: ReadwiseApiResponse = await response.json()

      // 详细记录每条高亮的信息
      result.results.forEach((highlight: any, index: number) => {
        console.log(`第 ${pageCount} 页第 ${index + 1} 条高亮:`, {
          id: highlight.id,
          book_id: highlight.book_id,
          url: highlight.url,
          source_type: highlight.source_type,
          title: highlight.title,
          text: highlight.text.slice(0, 50) + (highlight.text.length > 50 ? '...' : ''),
          note: highlight.note
            ? highlight.note.slice(0, 50) + (highlight.note.length > 50 ? '...' : '')
            : null,
          highlighted_at: highlight.highlighted_at,
          updated_at: highlight.updated_at
        })
      })

      allHighlights = allHighlights.concat(result.results)
      nextPageCursor = result.next_page_cursor || undefined

      console.log(`第 ${pageCount} 页获取完成:`, {
        本页数量: result.results.length,
        累计获取: allHighlights.length,
        是否有下一页: Boolean(nextPageCursor),
        有url的数量: result.results.filter((h: any) => h.url).length,
        无url的数量: result.results.filter((h: any) => !h.url).length
      })

      if (nextPageCursor) {
        console.log('等待 1 秒后获取下一页...')
        await delay(1000)
      }
    } while (nextPageCursor)

    console.log('增量高亮统计信息:', {
      总数量: allHighlights.length,
      有url的数量: allHighlights.filter((h) => h.url).length,
      无url的数量: allHighlights.filter((h) => !h.url).length,
      来源类型统计: Object.entries(
        allHighlights.reduce(
          (acc, h) => {
            acc[h.source_type] = (acc[h.source_type] || 0) + 1
            return acc
          },
          {} as Record<string, number>
        )
      )
    })

    return allHighlights
  } catch (error) {
    console.error('从 Readwise 获取增量高亮失败:', error)
    throw error
  }
}

// 优化：从 Readwise 获取全量高亮内容（使用 export 端点）
async function fetchReadwiseAllHighlights(token: string): Promise<ReadwiseHighlight[]> {
  try {
    console.log('开始请求 Readwise API 全量高亮...')

    if (!token || token.trim() === '') {
      throw new Error('Token 不能为空')
    }

    console.log('请求参数:', {
      url: 'https://readwise.io/api/v2/export/',
      token: token ? `${token.slice(0, 5)}...${token.slice(-5)}` : '未设置'
    })

    let allHighlights: ReadwiseHighlight[] = []
    let nextPageCursor: string | undefined = undefined
    let pageCount = 0
    let totalBooksWithHighlights = 0

    do {
      pageCount++
      console.log(`正在获取第 ${pageCount} 页全量数据，cursor: ${nextPageCursor || '首页'}`)

      // 构建请求 URL 和参数
      const url = new URL('https://readwise.io/api/v2/export/')
      if (nextPageCursor) {
        url.searchParams.append('pageCursor', nextPageCursor)
      }

      const response = await fetchWithRetry(
        async () => {
          return await fetch(url.toString(), {
            method: 'GET',
            headers: {
              Authorization: `Token ${token.trim()}`,
              'Content-Type': 'application/json'
            }
          })
        },
        3,
        2000
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `请求失败: ${response.status} ${response.statusText}\n响应内容: ${errorText}`
        )
      }

      // 解析导出 API 返回的数据结构
      const result = await response.json()
      console.log(`第 ${pageCount} 页全量数据获取成功，包含 ${result.count} 本书的高亮`)

      // 获取此页所有书籍的所有高亮
      const pageHighlights: ReadwiseHighlight[] = []
      totalBooksWithHighlights += result.results.length

      // 遍历每本书及其高亮
      for (const book of result.results) {
        console.log(
          `处理书籍: ${book.title} (ID: ${book.user_book_id})，包含 ${book.highlights.length} 条高亮`
        )

        // 转换高亮格式以匹配我们的 ReadwiseHighlight 接口
        const bookHighlights: ReadwiseHighlight[] = book.highlights.map((h: any) => ({
          id: h.id.toString(),
          book_id: book.user_book_id,
          text: h.text,
          title: book.title,
          note: h.note,
          location: h.location,
          location_type: h.location_type,
          highlighted_at: h.highlighted_at,
          updated_at: h.updated_at,
          url:
            h.url ||
            book.source_url ||
            book.unique_url ||
            `https://readwise.io/bookreview/${book.user_book_id}`,
          color: h.color,
          source_type: book.source,
          source_url: book.source_url,
          readwise_url: h.readwise_url,
          // 关键改进：直接保存完整的书籍信息，避免后续需要再次获取
          book_info: {
            user_book_id: book.user_book_id,
            title: book.title,
            author: book.author,
            readable_title: book.readable_title,
            source: book.source,
            cover_image_url: book.cover_image_url,
            unique_url: book.unique_url,
            summary: book.summary,
            category: book.category,
            source_url: book.source_url,
            book_tags: book.book_tags || []
          }
        }))

        pageHighlights.push(...bookHighlights)
      }

      // 统计此页高亮信息
      console.log(`第 ${pageCount} 页全量高亮统计:`, {
        书籍数量: result.results.length,
        高亮数量: pageHighlights.length,
        有url的数量: pageHighlights.filter((h) => h.url).length,
        无url的数量: pageHighlights.filter((h) => !h.url).length
      })

      // 添加此页高亮到总集合
      allHighlights = allHighlights.concat(pageHighlights)

      // 获取下一页的游标
      nextPageCursor = result.nextPageCursor

      console.log(
        `第 ${pageCount} 页处理完成，累计获取 ${allHighlights.length} 条高亮，${
          nextPageCursor ? '有' : '没有'
        }下一页`
      )

      // 页面之间添加延迟
      if (nextPageCursor) {
        console.log('等待 2 秒后获取下一页...')
        await delay(2000)
      }
    } while (nextPageCursor)

    // 最终统计
    console.log('所有全量高亮获取完成，统计信息:', {
      总页数: pageCount,
      总书籍数: totalBooksWithHighlights,
      总高亮数: allHighlights.length,
      有url的数量: allHighlights.filter((h) => h.url).length,
      无url的数量: allHighlights.filter((h) => !h.url).length,
      来源类型统计: Object.entries(
        allHighlights.reduce(
          (acc, h) => {
            acc[h.source_type] = (acc[h.source_type] || 0) + 1
            return acc
          },
          {} as Record<string, number>
        )
      )
    })

    return allHighlights
  } catch (error) {
    console.error('从 Readwise 获取全量高亮失败:', error)
    throw error
  }
}

// 修改获取书籍信息的方法
async function fetchBookInfo(token: string, bookId: number): Promise<ReadwiseBook> {
  return fetchWithRetry(async () => {
    console.log(`开始获取书籍信息，bookId: ${bookId}...`)

    if (!token || token.trim() === '') {
      throw new Error('Token 不能为空')
    }

    const url = `https://readwise.io/api/v2/books/${bookId}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Token ${token.trim()}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`请求失败: ${response.status} ${response.statusText}\n响应内容: ${errorText}`)
    }

    const bookInfo = await response.json()
    console.log('获取到的书籍信息:', JSON.stringify(bookInfo, null, 2))
    return bookInfo
  })
}

// 专门用于同步的笔记创建方法
async function createSyncNote(
  highlight: ReadwiseHighlight,
  bookInfo: ReadwiseBook,
  trx: any
): Promise<any> {
  const id = uuidv4()
  // 使用高亮的创建时间
  const highlightDate = new Date(highlight.highlighted_at)

  // 生成地址编码
  const addressCode = `Readwise-${highlightDate.getFullYear()}${String(
    highlightDate.getMonth() + 1
  ).padStart(2, '0')}${String(highlightDate.getDate()).padStart(2, '0')}${String(
    highlightDate.getHours()
  ).padStart(2, '0')}${String(highlightDate.getMinutes()).padStart(2, '0')}`

  // 构建笔记内容
  const content = {
    type: 'doc',
    content: [
      // 高亮内容
      {
        type: 'paragraph',
        attrs: {
          textAlign: 'left'
        },
        content: [
          {
            type: 'text',
            text: highlight.text
          }
        ]
      }
    ]
  }

  // 如果有笔记，添加笔记部分
  if (highlight.note) {
    // 添加"笔记："标题
    content.content.push({
      type: 'paragraph',
      attrs: {
        textAlign: 'left'
      },
      content: [
        {
          type: 'text',
          text: '笔记：'
        }
      ]
    })

    // 添加笔记内容
    content.content.push({
      type: 'paragraph',
      attrs: {
        textAlign: 'left'
      },
      content: [
        {
          type: 'text',
          text: highlight.note
        }
      ]
    })
  }

  // 添加日志检查 highlight 和 bookInfo 的内容
  console.log('创建笔记时的数据:', {
    highlightId: highlight.id,
    highlightUrl: highlight.url,
    bookId: highlight.book_id,
    bookTitle: bookInfo.title,
    bookUrl: bookInfo.source_url
  })

  // 修改原文链接部分，使用 highlight.url 或 bookInfo.source_url
  content.content.push({
    type: 'paragraph',
    attrs: {
      textAlign: 'left'
    },
    content: [
      {
        type: 'text',
        text: '原文链接：'
      },
      {
        type: 'text',
        text: bookInfo.title,
        marks: [
          {
            type: 'link',
            attrs: {
              href: highlight.url || bookInfo.source_url || '#', // 使用 highlight.url 或 fallback 到 bookInfo.source_url
              rel: 'noopener noreferrer nofollow',
              class: null,
              'data-note-id': null,
              target: null
            }
          }
        ]
      } as { type: string; text: string; marks: any[] }
    ]
  })

  const newNote = {
    id,
    type: 'note',
    address: addressCode,
    cardType: 'Draftcard',
    content,
    // 使用高亮的创建时间
    createdAt: highlightDate,
    // 更新时间仍然使用当前时间
    updatedAt: new Date(),
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
    metadata: {
      title: bookInfo.title || '未命名高亮',
      summary: '',
      readwiseHighlightId: highlight.id,
      readwiseBookId: highlight.book_id,
      readwiseHighlightedAt: highlight.highlighted_at
    },
    isFlashcard: false
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

// 执行增量同步优化版
export async function syncHighlights(batchSize: number = 20): Promise<ReadwiseSyncStats> {
  try {
    const stats = {
      total: 0,
      added: 0,
      updated: 0,
      skipped: 0
    }

    // 获取同步配置
    const config = await getSyncConfig()
    if (!config.token) {
      throw new Error('未配置 Readwise token')
    }

    // 获取高亮内容
    console.log('正在获取增量高亮...')
    const highlights = await fetchReadwiseHighlights(config.token, config.lastSyncTime)
    stats.total = highlights.length

    if (highlights.length === 0) {
      console.log('没有需要同步的增量高亮')
      return stats
    }

    console.log(`获取到 ${highlights.length} 条增量高亮，准备同步`)

    // 优化1: 提前获取所有需要的书籍信息（去重）
    // 收集所有不同的书籍ID
    const allBookIds = new Set(highlights.map((h) => h.book_id))
    console.log(`需要获取 ${allBookIds.size} 本书籍的信息`)

    // 创建书籍信息缓存
    const bookInfoCache = new Map<number, ReadwiseBook>()

    // 分批获取书籍信息以避免一次性请求过多
    const bookIdBatchSize = 10
    const bookIdArray = Array.from(allBookIds)

    for (let i = 0; i < bookIdArray.length; i += bookIdBatchSize) {
      const batchBookIds = bookIdArray.slice(i, i + bookIdBatchSize)
      console.log(
        `正在获取第 ${i + 1} 到 ${Math.min(i + bookIdBatchSize, bookIdArray.length)} 本书籍信息`
      )

      // 并行获取这批书籍信息 (使用Promise.all提高效率)
      const bookInfoPromises = batchBookIds.map(async (bookId) => {
        try {
          const bookInfo = await fetchBookInfo(config.token, bookId)
          return { bookId, bookInfo }
        } catch (error) {
          console.error(`获取书籍 ${bookId} 信息失败:`, error)
          return { bookId, bookInfo: null }
        }
      })

      // 等待所有请求完成
      const results = await Promise.all(bookInfoPromises)

      // 将结果存入缓存
      for (const { bookId, bookInfo } of results) {
        if (bookInfo) {
          bookInfoCache.set(bookId, bookInfo)
        }
      }

      // 批次之间稍作等待，避免API限制
      if (i + bookIdBatchSize < bookIdArray.length) {
        await delay(1000)
      }
    }

    console.log(`成功获取 ${bookInfoCache.size}/${allBookIds.size} 本书籍信息`)

    // 优化2: 增加批次大小（因为不再需要在每个批次内请求书籍信息）
    const highightBatchSize = Math.min(50, batchSize * 2) // 增大到50或原来的2倍

    // 分批处理高亮
    for (let i = 0; i < highlights.length; i += highightBatchSize) {
      const batch = highlights.slice(i, i + highightBatchSize)
      const batchEnd = Math.min(i + highightBatchSize, highlights.length)
      console.log(
        `处理第 ${i + 1} 到 ${batchEnd} 条高亮，进度: ${Math.floor((i / highlights.length) * 100)}%`
      )

      // 使用事务处理这一批数据
      await db.transaction(async (trx) => {
        for (const highlight of batch) {
          // 从缓存获取书籍信息
          const bookInfo = bookInfoCache.get(highlight.book_id)
          if (!bookInfo) {
            console.error(`未找到书籍信息，跳过处理高亮: ${highlight.id}`)
            stats.skipped++
            continue
          }

          // 简化日志，减少输出
          if (batch.indexOf(highlight) % 5 === 0) {
            console.log('处理高亮:', {
              id: highlight.id,
              book_title: bookInfo.title
            })
          }

          const syncRecord = await getSyncRecord(highlight.id, trx)

          if (syncRecord) {
            // 检查笔记类型
            const existingNote = await trx('notes').where('id', syncRecord.antinoteId).first()
            if (existingNote && existingNote.cardType !== 'Draftcard') {
              stats.skipped++
              continue
            }
          }

          try {
            if (!syncRecord) {
              // 处理新高亮
              const newNote = await createSyncNote(highlight, bookInfo, trx)
              await createSyncRecord(
                {
                  readwiseHighlightId: highlight.id,
                  antinoteId: newNote.id,
                  lastSyncTime: new Date()
                },
                trx
              )
              stats.added++
            } else {
              // 更新现有高亮
              const content = {
                type: 'doc',
                content: [
                  // 高亮内容
                  {
                    type: 'paragraph',
                    attrs: {
                      textAlign: 'left'
                    },
                    content: [
                      {
                        type: 'text',
                        text: highlight.text
                      }
                    ]
                  }
                ]
              }

              // 如果有笔记，添加笔记部分
              if (highlight.note) {
                content.content.push({
                  type: 'paragraph',
                  attrs: {
                    textAlign: 'left'
                  },
                  content: [
                    {
                      type: 'text',
                      text: '笔记：'
                    }
                  ]
                })

                content.content.push({
                  type: 'paragraph',
                  attrs: {
                    textAlign: 'left'
                  },
                  content: [
                    {
                      type: 'text',
                      text: highlight.note
                    }
                  ]
                })
              }

              // 添加原文链接
              content.content.push({
                type: 'paragraph',
                attrs: {
                  textAlign: 'left'
                },
                content: [
                  {
                    type: 'text',
                    text: '原文链接：'
                  },
                  {
                    type: 'text',
                    text: bookInfo.title,
                    marks: [
                      {
                        type: 'link',
                        attrs: {
                          href: highlight.url || bookInfo.source_url || '#',
                          rel: 'noopener noreferrer nofollow',
                          class: null,
                          'data-note-id': null,
                          target: null
                        }
                      }
                    ]
                  } as { type: string; text: string; marks: any[] }
                ]
              })

              await trx('notes')
                .where('id', syncRecord.antinoteId)
                .update({
                  content: JSON.stringify(content),
                  metadata: JSON.stringify({
                    title: highlight.title || bookInfo.title || '未命名高亮',
                    summary: '',
                    readwiseHighlightId: highlight.id,
                    readwiseBookId: highlight.book_id,
                    readwiseHighlightedAt: highlight.highlighted_at
                  }),
                  updatedAt: new Date()
                })

              await updateSyncRecord(
                syncRecord.id,
                {
                  lastSyncTime: new Date()
                },
                trx
              )

              stats.updated++
            }
          } catch (error) {
            console.error(`处理高亮 ${highlight.id} 失败:`, error)
            stats.skipped++
          }
        }

        // 更新同步时间
        await updateSyncConfig(
          {
            lastSyncTime: new Date().toISOString()
          },
          trx
        )
      })

      // 批次之间的延迟减少
      if (i + highightBatchSize < highlights.length) {
        await delay(1000) // 从2000ms减少到1000ms
      }

      // 每处理几个批次，输出一次进度统计
      if ((i / highightBatchSize) % 3 === 0 || i + highightBatchSize >= highlights.length) {
        console.log(
          `同步进度: ${Math.floor(((i + batch.length) / highlights.length) * 100)}%, 已添加: ${stats.added}, 已更新: ${stats.updated}, 已跳过: ${stats.skipped}`
        )
      }
    }

    console.log('增量同步完成:', stats)
    return stats
  } catch (error) {
    console.error('同步 Readwise 高亮失败:', error)
    throw error
  }
}

// 启动自动同步计时器
export async function startReadwiseSyncTimer() {
  try {
    // 先停止现有的计时器
    stopReadwiseSyncTimer()

    // 获取配置
    const config = await getSyncConfig()

    // 如果启用了自动同步
    if (config.autoSync) {
      const intervalMinutes = config.autoSyncInterval || 30 // 默认30分钟
      const intervalMs = intervalMinutes * 60 * 1000

      console.log(`主进程→ 启动 Readwise 自动同步计时器，间隔: ${intervalMinutes} 分钟`)

      syncInterval = setInterval(async () => {
        try {
          console.log('主进程→ 执行 Readwise 自动同步...')
          const stats = await syncHighlights()
          console.log(
            `主进程→ Readwise 自动同步完成: 新增 ${stats.added}，更新 ${stats.updated}，跳过 ${stats.skipped}`
          )
        } catch (error) {
          console.error('主进程→ Readwise 自动同步失败:', error)
        }
      }, intervalMs)

      return true
    }

    return false
  } catch (error) {
    console.error('主进程→ 启动 Readwise 自动同步计时器失败:', error)
    return false
  }
}

// 停止自动同步计时器
export function stopReadwiseSyncTimer() {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
    console.log('主进程→ 已停止 Readwise 自动同步计时器')
    return true
  }
  return false
}

// 重启自动同步计时器
export async function restartReadwiseSyncTimer() {
  stopReadwiseSyncTimer()
  return await startReadwiseSyncTimer()
}

// 执行全量同步
export async function fullSync(): Promise<ReadwiseSyncStats> {
  try {
    console.log('开始执行全量同步...')

    const stats = {
      total: 0,
      added: 0,
      updated: 0,
      skipped: 0
    }

    // 获取同步配置
    const config = await getSyncConfig()
    if (!config.token) {
      throw new Error('未配置 Readwise token')
    }

    // 使用 export 端点获取所有高亮
    console.log('正在获取所有 Readwise 高亮...')
    const highlights = await fetchReadwiseAllHighlights(config.token)
    stats.total = highlights.length
    console.log(`成功获取 ${highlights.length} 条高亮，准备同步到数据库...`)

    // 优化：增大批次大小，由于不需要外部API调用，可以处理更多数据
    const batchSize = 50 // 从 20 增加到 50

    // 分批处理高亮
    for (let i = 0; i < highlights.length; i += batchSize) {
      const batch = highlights.slice(i, i + batchSize)
      const batchEnd = Math.min(i + batchSize, highlights.length)
      console.log(
        `处理第 ${i + 1} 到 ${batchEnd} 条高亮，批次进度: ${Math.floor((i / highlights.length) * 100)}%`
      )

      // 使用事务处理这一批数据
      await db.transaction(async (trx) => {
        for (const highlight of batch) {
          // 检查 book_info 是否存在
          if (!highlight.book_info) {
            console.error(`高亮 ${highlight.id} 缺少书籍信息，跳过处理`)
            stats.skipped++
            continue
          }

          const bookInfo = highlight.book_info

          // 简化日志输出，减少控制台负担
          if (i % 10 === 0) {
            console.log('正在处理高亮:', {
              id: highlight.id,
              book_title: bookInfo.title
            })
          }

          const syncRecord = await getSyncRecord(highlight.id, trx)

          if (syncRecord) {
            // 检查笔记类型
            const existingNote = await trx('notes').where('id', syncRecord.antinoteId).first()
            if (existingNote && existingNote.cardType !== 'Draftcard') {
              stats.skipped++
              continue
            }
          }

          if (!syncRecord) {
            // 处理新高亮
            const newNote = await createSyncNote(highlight, bookInfo, trx)
            await createSyncRecord(
              {
                readwiseHighlightId: highlight.id,
                antinoteId: newNote.id,
                lastSyncTime: new Date()
              },
              trx
            )
            stats.added++
          } else {
            // 更新现有高亮
            // ...原有更新逻辑...
            stats.updated++
          }
        }
      })

      // 优化：减少批次间等待时间
      // 由于不再需要请求 Readwise API，可以减少或移除等待
      // 仅保留少量延迟，让数据库有喘息的机会
      await delay(1000) // 从 5000ms 减少到 1000ms

      // 每处理 5 个批次，输出一次进度统计
      if ((i / batchSize) % 5 === 0) {
        console.log(
          `同步进度: ${Math.floor((i / highlights.length) * 100)}%, 已添加: ${stats.added}, 已更新: ${stats.updated}, 已跳过: ${stats.skipped}`
        )
      }
    }

    // 更新同步时间
    await updateSyncConfig({
      lastSyncTime: new Date().toISOString()
    })

    console.log('全量同步完成:', stats)
    return stats
  } catch (error) {
    console.error('全量同步失败:', error)
    throw error
  }
}
