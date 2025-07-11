/**
 * @file mcpService.ts
 * @description MCP (Multimodal Context Preservation) 服务实现
 * 允许外部AI助手(如Raycast、Cursor等)通过API访问Anteey的笔记内容作为上下文
 */

import { db } from '../../db/config'
// import log from 'electron-log'
import { v4 as uuidv4 } from 'uuid'
import { processNoteContentForMcp } from '../aiChat/ProcessNoteContent'
import { LLMService } from '../rag/llmService'
import http from 'http'

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

// AI搜索增强配置
interface AiSearchConfig {
  enabled: boolean
  maxKeywords: number
  timeoutMs: number
}

// 默认AI搜索配置
const DEFAULT_AI_SEARCH_CONFIG: AiSearchConfig = {
  enabled: true,
  maxKeywords: 6,
  timeoutMs: 5000 // 5秒超时
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

  // log.info(`已创建API密钥: ${apiKey.name}`)
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
  // log.info(`已删除API密钥: ${id}`)
}

/**
 * 更新API密钥状态
 * @param id API密钥ID
 * @param isActive 是否激活
 */
export async function updateApiKeyStatus(id: string, isActive: boolean): Promise<void> {
  await db('mcp_api_keys').where('id', id).update({ isActive })
  // log.info(`已更新API密钥状态: ${id}, isActive: ${isActive}`)
}

/**
 * 重命名API密钥
 * @param id API密钥ID
 * @param name 新名称
 */
export async function renameApiKey(id: string, name: string): Promise<void> {
  await db('mcp_api_keys').where('id', id).update({ name })
  // log.info(`已重命名API密钥: ${id}, name: ${name}`)
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
    // log.error('验证API密钥失败:', error)
    return false
  }
}

/**
 * 获取MCP服务状态
 * @returns 服务状态信息
 */
export async function getServiceStatus(): Promise<McpServiceStatus> {
  const apiKeysCount = await db('mcp_api_keys').count('* as count').first()

  // 实际检测API服务器是否在运行
  let isRunning = false
  try {
    await new Promise<void>((resolve) => {
      const req = http.get('http://127.0.0.1:43211/health', (res: any) => {
        if (res.statusCode === 200) {
          isRunning = true
        }
        resolve()
      })

      req.on('error', () => {
        isRunning = false
        resolve()
      })

      req.setTimeout(3000, () => {
        isRunning = false
        req.destroy()
        resolve()
      })
    })
  } catch (error) {
    // log.warn('检测MCP服务状态失败:', error)
    isRunning = false
  }

  return {
    isRunning,
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
    const processResult = await processNoteContentForMcp([id])
    const content = processResult.processedNotes[0]?.content || ''

    const result = {
      id: note.id,
      title: note.title || '',
      address: note.address || '',
      content,
      cardType: note.cardType || '',
      tags,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    }

    // 添加详细日志记录返回给MCP的笔记内容
    // log.info('MCP返回单个笔记详细内容:', {
    //   noteId: result.id,
    //   title: result.title,
    //   address: result.address,
    //   cardType: result.cardType,
    //   tags: result.tags,
    //   contentLength: result.content.length,
    //   contentPreview: result.content.substring(0, 200) + (result.content.length > 200 ? '...' : ''),
    //   fullContent: result.content, // 完整内容
    //   createdAt: result.createdAt,
    //   updatedAt: result.updatedAt
    // })

    return result
  } catch (error) {
    // log.error('获取笔记失败:', error)
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
      // 使用默认AI搜索配置
      const aiConfig = DEFAULT_AI_SEARCH_CONFIG
      const expandedKeywords = await expandQueryWithAI(query, aiConfig)

      notesQuery = notesQuery.where((builder) => {
        buildEnhancedQuery(query, expandedKeywords, builder)
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
    const processResult = await processNoteContentForMcp(noteIds)
    const contentByNoteId: Record<string, string> = {}

    // 使用processedNotes获取每个笔记的内容
    processResult.processedNotes.forEach((processedNote) => {
      contentByNoteId[processedNote.id] = processedNote.content
    })

    // 格式化响应
    const results = notes.map((note) => ({
      id: note.id,
      title: note.title || '',
      address: note.address || '',
      content: contentByNoteId[note.id] || '',
      cardType: note.cardType || '',
      tags: tagsByNoteId[note.id] || [],
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    }))

    // 添加详细日志记录返回给MCP的搜索结果
    // log.info('MCP搜索笔记结果概览:', {
    //   searchQuery: query,
    //   foundCount: results.length,
    //   requestedLimit: limit,
    //   offset,
    //   filterTags: tags,
    //   filterCardTypes: cardTypes,
    //   filterCardBoxId: cardBoxId,
    //   filterStartDate: startDate,
    //   filterEndDate: endDate
    // })

    // 记录每个笔记的详细内容
    // results.forEach((result, index) => {
    //   log.info(`MCP搜索结果[${index + 1}/${results.length}]详细内容:`, {
    //     noteId: result.id,
    //     title: result.title,
    //     address: result.address,
    //     cardType: result.cardType,
    //     tags: result.tags,
    //     contentLength: result.content.length,
    //     contentPreview:
    //       result.content.substring(0, 200) + (result.content.length > 200 ? '...' : ''),
    //     fullContent: result.content, // 完整内容
    //     createdAt: result.createdAt,
    //     updatedAt: result.updatedAt
    //   })
    // })

    // 记录最终API响应数据
    // log.info('MCP API最终响应数据:', {
    //   responseSize: JSON.stringify(finalResponse).length,
    //   notesCount: results.length,
    //   totalContentLength: results.reduce((sum, note) => sum + note.content.length, 0),
    //   responsePreview: JSON.stringify(finalResponse).substring(0, 500) + '...',
    //   fullResponse: finalResponse // 完整响应数据
    // })

    return results
  } catch (error) {
    // log.error('搜索笔记失败:', error)
    return []
  }
}

/**
 * 使用AI扩展搜索关键词
 * @param query 原始查询词
 * @param config AI搜索配置
 * @returns 扩展后的关键词数组
 */
async function expandQueryWithAI(query: string, config: AiSearchConfig): Promise<string[]> {
  if (!query.trim() || !config.enabled) {
    console.log('AI关键词扩展跳过:', { query: query.trim(), enabled: config.enabled })
    return [query]
  }

  try {
    console.log('开始AI关键词扩展:', { originalQuery: query, config })

    const llmService = new LLMService()

    const prompt = `你是一个专业的笔记搜索助手。用户想要搜索笔记，你需要帮助扩展搜索关键词以找到更多相关内容。

用户搜索: "${query}"

请生成${config.maxKeywords - 1}个相关的搜索关键词，要求：
✅ 同义词和近义词
✅ 相关的英文术语
✅ 上下位概念
✅ 常见的表达方式
❌ 避免过于宽泛的词
❌ 避免不相关的词

返回格式：纯文本，每行一个关键词，不要添加任何其他内容
示例：
护肤
肌肤保养
skincare
美容
化妆品`

    // 设置超时控制
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI调用超时')), config.timeoutMs)
    })

    const responsePromise = llmService.generateResponse(prompt)
    const response = await Promise.race([responsePromise, timeoutPromise])

    console.log('AI原始响应:', {
      originalQuery: query,
      responseLength: response.length,
      response: response.substring(0, 500) + (response.length > 500 ? '...' : ''),
      fullResponse: response
    })

    // 解析AI返回的关键词
    const aiKeywords = parseAIKeywords(response)

    console.log('AI关键词解析结果:', {
      originalQuery: query,
      aiKeywords,
      aiKeywordsCount: aiKeywords.length
    })

    // 返回原查询词 + AI扩展词，限制总数量
    const allKeywords = [query, ...aiKeywords]
    const finalKeywords = allKeywords.slice(0, config.maxKeywords)

    console.log('最终搜索关键词:', {
      originalQuery: query,
      finalKeywords,
      totalCount: finalKeywords.length,
      maxKeywords: config.maxKeywords
    })

    return finalKeywords
  } catch (error) {
    // AI调用失败时返回原查询词
    console.warn('AI关键词扩展失败，使用原查询词:', {
      originalQuery: query,
      error: error instanceof Error ? error.message : String(error)
    })
    return [query]
  }
}

/**
 * 解析AI返回的关键词
 * @param response AI响应文本
 * @returns 关键词数组
 */
function parseAIKeywords(response: string): string[] {
  try {
    // 首先尝试解析JSON格式
    if (response.includes('[') && response.includes(']')) {
      const jsonMatch = response.match(/\[.*?\]/s)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => typeof item === 'string' && item.trim().length > 0)
        }
      }
    }

    // 按行分割的纯文本格式
    const lines = response
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => {
        // 过滤掉空行、数字开头、特殊符号开头的行
        return (
          line.length > 0 &&
          !line.match(/^\d+[.)]\s*/) && // 数字列表
          !line.match(/^[-*+]\s*/) && // 符号列表
          !line.match(/^[：:：]\s*/) && // 冒号开头
          line.length <= 20
        ) // 避免过长的文本
      })

    return lines.slice(0, 8) // 最多返回8个关键词
  } catch (error) {
    console.warn('解析AI关键词失败:', error)
    return []
  }
}

/**
 * 构建增强查询条件
 * @param originalQuery 原始查询
 * @param expandedKeywords 扩展关键词
 * @param builder 查询构建器
 */
function buildEnhancedQuery(originalQuery: string, expandedKeywords: string[], builder: any) {
  if (expandedKeywords.length <= 1) {
    // 没有扩展关键词，使用原始查询逻辑
    builder
      .where('notes.title', 'like', `%${originalQuery}%`)
      .orWhere('notes.content', 'like', `%${originalQuery}%`)
      .orWhere('notes.address', 'like', `%${originalQuery}%`)
  } else {
    // 有扩展关键词，使用OR查询
    expandedKeywords.forEach((keyword, index) => {
      const method = index === 0 ? 'where' : 'orWhere'
      builder[method]((subBuilder: any) => {
        subBuilder
          .where('notes.title', 'like', `%${keyword}%`)
          .orWhere('notes.content', 'like', `%${keyword}%`)
          .orWhere('notes.address', 'like', `%${keyword}%`)
      })
    })
  }
}

/**
 * 获取AI搜索配置
 * @returns AI搜索配置
 */
export async function getAiSearchConfig(): Promise<AiSearchConfig> {
  // 直接返回默认配置，后续可以通过应用设置页面管理
  return DEFAULT_AI_SEARCH_CONFIG
}

/**
 * 更新AI搜索配置
 * @param config 新的配置
 */
export async function updateAiSearchConfig(
  config: Partial<AiSearchConfig>
): Promise<AiSearchConfig> {
  // 暂时返回合并后的配置，实际使用默认配置
  // 后续可以集成到应用设置中
  const newConfig = { ...DEFAULT_AI_SEARCH_CONFIG, ...config }
  return newConfig
}

/**
 * 测试AI搜索功能
 * @param testQuery 测试查询
 * @returns 测试结果
 */
export async function testAiSearch(testQuery: string = '测试'): Promise<{
  success: boolean
  originalQuery: string
  expandedKeywords: string[]
  error?: string
  duration: number
}> {
  const startTime = Date.now()

  try {
    const config = await getAiSearchConfig()
    const expandedKeywords = await expandQueryWithAI(testQuery, config)

    return {
      success: true,
      originalQuery: testQuery,
      expandedKeywords,
      duration: Date.now() - startTime
    }
  } catch (error) {
    return {
      success: false,
      originalQuery: testQuery,
      expandedKeywords: [testQuery],
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime
    }
  }
}
