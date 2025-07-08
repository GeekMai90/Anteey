/**
 * @file mcpService.ts
 * @description MCP (Multimodal Context Preservation) 服务实现
 * 允许外部AI助手(如Raycast、Cursor等)通过API访问Anteey的笔记内容作为上下文
 */

import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { processNoteContent } from '../aiChat/ProcessNoteContent'
import type { Note } from '@shared/types'

// MCP API密钥类型
export interface McpApiKey {
  id: string
  name: string
  key: string
  createdAt: Date
  lastUsedAt: Date | null
  isActive: boolean
}

// MCP查询参数类型
export interface McpQueryParams {
  query?: string
  limit?: number
  offset?: number
  tags?: string[]
  cardTypes?: string[]
  cardBoxId?: string
  startDate?: string
  endDate?: string
}

// MCP笔记响应类型
export interface McpNoteResponse {
  id: string
  title: string
  address: string
  content: string
  cardType: string
  tags: string[]
  createdAt: string
  updatedAt: string
  metadata: Record<string, any>
}

/**
 * 简单递归提取文本
 * @param node 节点对象
 * @returns 提取的文本
 */
function extractText(node: any): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (node.text) return node.text

  if (node.content && Array.isArray(node.content)) {
    return node.content.map(extractText).join(' ')
  }

  return ''
}

/**
 * 生成新的API密钥
 * @param name 密钥名称
 * @returns 生成的API密钥
 */
export async function generateApiKey(name: string): Promise<McpApiKey> {
  const now = new Date()
  const apiKey: McpApiKey = {
    id: uuidv4(),
    name,
    key: `anteey_mcp_${uuidv4().replace(/-/g, '')}`,
    createdAt: now,
    lastUsedAt: null,
    isActive: true
  }

  await db('mcp_api_keys').insert(apiKey)
  log.info('生成了新的MCP API密钥:', { name, id: apiKey.id })

  return apiKey
}

/**
 * 验证API密钥
 * @param key API密钥
 * @returns 密钥是否有效
 */
export async function validateApiKey(key: string): Promise<boolean> {
  try {
    const apiKey = await db('mcp_api_keys').where({ key, isActive: true }).first()

    if (apiKey) {
      // 更新最后使用时间
      await db('mcp_api_keys').where({ id: apiKey.id }).update({ lastUsedAt: new Date() })

      return true
    }

    return false
  } catch (error) {
    log.error('验证API密钥失败:', error)
    return false
  }
}

/**
 * 获取所有API密钥
 * @returns API密钥列表
 */
export async function getAllApiKeys(): Promise<McpApiKey[]> {
  return await db('mcp_api_keys').select('*').orderBy('createdAt', 'desc')
}

/**
 * 停用API密钥
 * @param id 密钥ID
 */
export async function deactivateApiKey(id: string): Promise<void> {
  await db('mcp_api_keys').where({ id }).update({ isActive: false })
}

/**
 * 从笔记内容中提取纯文本
 * @param note 笔记对象
 * @returns 提取的纯文本内容
 */
async function extractNoteText(note: Note): Promise<string> {
  try {
    // processNoteContent 接受笔记ID数组，返回处理结果
    const result = await processNoteContent([note.id])

    // 返回处理后的上下文文本
    return result.contextText || ''
  } catch (error) {
    log.error('提取笔记文本失败:', error)

    // 如果处理失败，尝试从笔记内容中提取基本文本
    try {
      const content = typeof note.content === 'string' ? JSON.parse(note.content) : note.content

      // 尝试提取标题和内容的简单文本
      const title = note.title || note.metadata?.title || ''
      const textContent = extractText(content)

      return `${title}\n\n${textContent}`.trim()
    } catch (innerError) {
      log.error('备用文本提取也失败:', innerError)
      return '无法提取笔记内容'
    }
  }
}

/**
 * 搜索笔记
 * @param params 搜索参数
 * @returns 符合条件的笔记
 */
export async function searchNotes(params: McpQueryParams): Promise<McpNoteResponse[]> {
  try {
    const {
      query = '',
      limit = 10,
      offset = 0,
      tags = [],
      cardTypes = [],
      cardBoxId,
      startDate,
      endDate
    } = params

    // 构建查询
    let notesQuery = db('notes')
      .select('notes.*')
      .where('notes.isDeleted', false)
      .orderBy('notes.updatedAt', 'desc')
      .limit(limit)
      .offset(offset)

    // 添加全文搜索条件
    if (query) {
      notesQuery = notesQuery.whereRaw(
        `(notes.title LIKE ? OR json_extract(notes.content, '$.content') LIKE ?)`,
        [`%${query}%`, `%${query}%`]
      )
    }

    // 添加标签过滤
    if (tags.length > 0) {
      notesQuery = notesQuery
        .join('note_tags', 'notes.id', 'note_tags.noteId')
        .join('tags', 'note_tags.tagId', 'tags.id')
        .whereIn('tags.name', tags)
    }

    // 添加卡片类型过滤
    if (cardTypes.length > 0) {
      notesQuery = notesQuery.whereIn('notes.cardType', cardTypes)
    }

    // 添加卡片盒过滤
    if (cardBoxId) {
      notesQuery = notesQuery.where('notes.cardBoxId', cardBoxId)
    }

    // 添加日期范围过滤
    if (startDate) {
      notesQuery = notesQuery.where('notes.createdAt', '>=', startDate)
    }
    if (endDate) {
      notesQuery = notesQuery.where('notes.createdAt', '<=', endDate)
    }

    // 执行查询
    const notes = (await notesQuery) as Note[]

    // 获取笔记标签
    const noteIds = notes.map((note) => note.id)
    const noteTags = await db('note_tags')
      .join('tags', 'note_tags.tagId', 'tags.id')
      .whereIn('note_tags.noteId', noteIds)
      .select('note_tags.noteId', 'tags.name')

    // 将标签信息组织成以noteId为键的映射
    const noteTagsMap: Record<string, string[]> = {}
    noteTags.forEach((tag: { noteId: string; name: string }) => {
      if (!noteTagsMap[tag.noteId]) {
        noteTagsMap[tag.noteId] = []
      }
      noteTagsMap[tag.noteId].push(tag.name)
    })

    // 转换笔记为MCP响应格式
    const responses: McpNoteResponse[] = []

    for (const note of notes) {
      // 处理笔记内容，提取纯文本
      const processedContent = await extractNoteText(note)

      responses.push({
        id: note.id,
        title: note.title || '',
        address: note.address || '',
        content: processedContent,
        cardType: note.cardType,
        tags: noteTagsMap[note.id] || [],
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        metadata: note.metadata || {}
      })
    }

    return responses
  } catch (error) {
    log.error('MCP搜索笔记失败:', error)
    throw error
  }
}

/**
 * 获取单个笔记详情
 * @param noteId 笔记ID
 * @returns 笔记详情
 */
export async function getNoteById(noteId: string): Promise<McpNoteResponse | null> {
  try {
    const note = (await db('notes').where({ id: noteId, isDeleted: false }).first()) as Note

    if (!note) {
      return null
    }

    // 获取笔记标签
    const tags = await db('note_tags')
      .join('tags', 'note_tags.tagId', 'tags.id')
      .where('note_tags.noteId', noteId)
      .select('tags.name')
      .then((rows) => rows.map((row) => row.name))

    // 处理笔记内容，提取纯文本
    const processedContent = await extractNoteText(note)

    return {
      id: note.id,
      title: note.title || '',
      address: note.address || '',
      content: processedContent,
      cardType: note.cardType,
      tags,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      metadata: note.metadata || {}
    }
  } catch (error) {
    log.error('MCP获取笔记详情失败:', error)
    throw error
  }
}

/**
 * 初始化MCP服务
 * 创建必要的数据库表
 */
export async function initMcpService(): Promise<void> {
  try {
    // 检查并创建API密钥表
    const hasTable = await db.schema.hasTable('mcp_api_keys')
    if (!hasTable) {
      await db.schema.createTable('mcp_api_keys', (table) => {
        table.string('id').primary()
        table.string('name').notNullable()
        table.string('key').notNullable().unique()
        table.datetime('createdAt').notNullable()
        table.datetime('lastUsedAt').nullable()
        table.boolean('isActive').notNullable().defaultTo(true)
      })

      log.info('创建MCP API密钥表成功')
    }
  } catch (error) {
    log.error('初始化MCP服务失败:', error)
    throw error
  }
}
