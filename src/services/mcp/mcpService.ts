/**
 * @file mcpService.ts
 * @description MCP (Multimodal Context Preservation) 服务实现
 * 允许外部AI助手(如Raycast、Cursor等)通过API访问Anteey的笔记内容作为上下文
 */

import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { processNoteContent } from '../aiChat/ProcessNoteContent'

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
}

// MCP服务状态类型
export interface McpServiceStatus {
  isRunning: boolean
  apiKeysCount: number
  port: number
  url: string
}

/**
 * 创建新的API密钥
 * @param name API密钥名称
 * @returns 创建的API密钥对象
 */
export async function createApiKey(name: string): Promise<McpApiKey> {
  const apiKey: McpApiKey = {
    id: uuidv4(),
    name,
    key: generateApiKey(),
    createdAt: new Date(),
    lastUsedAt: null,
    isActive: true
  }

  await db('mcp_api_keys').insert({
    id: apiKey.id,
    name: apiKey.name,
    key: apiKey.key,
    createdAt: apiKey.createdAt,
    lastUsedAt: apiKey.lastUsedAt,
    isActive: apiKey.isActive
  })

  log.info(`已创建API密钥: ${apiKey.name}`)
  return apiKey
}

/**
 * 生成随机API密钥
 * @returns 随机生成的API密钥字符串
 */
function generateApiKey(): string {
  // 生成32字符的随机字符串
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const prefix = 'anteey_'
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return prefix + result
}

/**
 * 获取所有API密钥
 * @returns API密钥列表
 */
export async function getApiKeys(): Promise<McpApiKey[]> {
  const apiKeys = await db('mcp_api_keys').select('*')
  return apiKeys.map((key) => ({
    ...key,
    createdAt: new Date(key.createdAt),
    lastUsedAt: key.lastUsedAt ? new Date(key.lastUsedAt) : null
  }))
}

/**
 * 删除API密钥
 * @param id API密钥ID
 */
export async function deleteApiKey(id: string): Promise<void> {
  await db('mcp_api_keys').where('id', id).delete()
  log.info(`已删除API密钥: ${id}`)
}

/**
 * 更新API密钥状态
 * @param id API密钥ID
 * @param isActive 是否激活
 */
export async function updateApiKeyStatus(id: string, isActive: boolean): Promise<void> {
  await db('mcp_api_keys').where('id', id).update({ isActive })
  log.info(`已更新API密钥状态: ${id}, isActive: ${isActive}`)
}

/**
 * 重命名API密钥
 * @param id API密钥ID
 * @param name 新名称
 */
export async function renameApiKey(id: string, name: string): Promise<void> {
  await db('mcp_api_keys').where('id', id).update({ name })
  log.info(`已重命名API密钥: ${id}, name: ${name}`)
}

/**
 * 验证API密钥是否有效
 * @param key API密钥字符串
 * @returns 是否有效
 */
export async function validateApiKey(key: string): Promise<boolean> {
  try {
    const apiKey = await db('mcp_api_keys').where('key', key).first()

    if (!apiKey || !apiKey.isActive) {
      return false
    }

    // 更新最后使用时间
    await db('mcp_api_keys').where('id', apiKey.id).update({ lastUsedAt: new Date() })

    return true
  } catch (error) {
    log.error('验证API密钥失败:', error)
    return false
  }
}

/**
 * 获取MCP服务状态
 * @returns 服务状态信息
 */
export async function getServiceStatus(): Promise<McpServiceStatus> {
  const apiKeysCount = await db('mcp_api_keys').count('* as count').first()

  return {
    isRunning: true,
    apiKeysCount: apiKeysCount ? Number(apiKeysCount.count) : 0,
    port: 43211,
    url: 'http://localhost:43211/api/mcp'
  }
}

/**
 * 根据ID获取笔记
 * @param id 笔记ID
 * @returns 格式化的笔记响应
 */
export async function getNoteById(id: string): Promise<McpNoteResponse | null> {
  try {
    const note = await db('notes').where('id', id).first()

    if (!note) {
      return null
    }

    // 获取笔记标签
    const noteTags = await db('note_tags')
      .join('tags', 'note_tags.tagId', '=', 'tags.id')
      .where('note_tags.noteId', id)
      .select('tags.name')

    const tags = noteTags.map((tag) => tag.name)

    // 处理笔记内容
    const processResult = await processNoteContent([id])
    const content = processResult.contextText

    return {
      id: note.id,
      title: note.title || '',
      address: note.address || '',
      content,
      cardType: note.cardType || '',
      tags,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    }
  } catch (error) {
    log.error('获取笔记失败:', error)
    return null
  }
}

/**
 * 搜索笔记
 * @param params 搜索参数
 * @returns 笔记列表
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
    let notesQuery = db('notes').select('notes.*')

    // 应用标签过滤
    if (tags.length > 0) {
      notesQuery = notesQuery
        .join('note_tags', 'notes.id', '=', 'note_tags.noteId')
        .join('tags', 'note_tags.tagId', '=', 'tags.id')
        .whereIn('tags.name', tags)
    }

    // 应用卡片类型过滤
    if (cardTypes.length > 0) {
      notesQuery = notesQuery.whereIn('notes.cardType', cardTypes)
    }

    // 应用卡片盒过滤
    if (cardBoxId) {
      notesQuery = notesQuery.where('notes.cardBoxId', cardBoxId)
    }

    // 应用日期过滤
    if (startDate) {
      notesQuery = notesQuery.where('notes.updatedAt', '>=', startDate)
    }

    if (endDate) {
      notesQuery = notesQuery.where('notes.updatedAt', '<=', endDate)
    }

    // 应用文本搜索
    if (query) {
      notesQuery = notesQuery.where((builder) => {
        builder
          .where('notes.title', 'like', `%${query}%`)
          .orWhere('notes.content', 'like', `%${query}%`)
          .orWhere('notes.address', 'like', `%${query}%`)
      })
    }

    // 分页
    notesQuery = notesQuery.orderBy('notes.updatedAt', 'desc').limit(limit).offset(offset)

    // 执行查询
    const notes = await notesQuery

    // 获取笔记的标签
    const noteIds = notes.map((note) => note.id)
    const allTags = await db('note_tags')
      .join('tags', 'note_tags.tagId', '=', 'tags.id')
      .whereIn('note_tags.noteId', noteIds)
      .select('note_tags.noteId', 'tags.name')

    // 组织标签数据
    const tagsByNoteId: Record<string, string[]> = {}
    allTags.forEach((tag) => {
      if (!tagsByNoteId[tag.noteId]) {
        tagsByNoteId[tag.noteId] = []
      }
      tagsByNoteId[tag.noteId].push(tag.name)
    })

    // 处理笔记内容
    const processResult = await processNoteContent(noteIds)
    const contentByNoteId: Record<string, string> = {}

    // 假设processNoteContent返回的内容顺序与noteIds相同
    noteIds.forEach((noteId, index) => {
      contentByNoteId[noteId] = processResult.contextText.split('\n\n')[index] || ''
    })

    // 格式化响应
    return notes.map((note) => ({
      id: note.id,
      title: note.title || '',
      address: note.address || '',
      content: contentByNoteId[note.id] || '',
      cardType: note.cardType || '',
      tags: tagsByNoteId[note.id] || [],
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    }))
  } catch (error) {
    log.error('搜索笔记失败:', error)
    return []
  }
}
