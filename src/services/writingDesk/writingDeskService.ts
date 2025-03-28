import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import type {
  Manuscript,
  ManuscriptCard,
  CreateManuscriptParams,
  UpdateManuscriptParams,
  PolishManuscriptParams,
  AIFeatureType
} from '@shared/types'
import { LLMService } from '../rag/llmService'
import { extractTextFromTiptapJson, convertTextToTiptapJson } from '../utils/textToJson'
import { getPromptTemplateByType } from './writingPromptTemplateService'
import JSZip from 'jszip'
import path from 'path'
import { format } from 'date-fns'
import { dialog } from 'electron'
import fs from 'fs'
import { app } from 'electron'
import { convertContentToMarkdown, downloadImage, sanitizeFileName } from '../export/exportService'
import { clipboard } from 'electron'

// 添加默认提示词常量
const DEFAULT_PROMPTS = {
  firstDraft: `你是一位专业的文字编辑和作家，现在需要你帮我将以下分散的内容段落整合成一篇连贯、优美的文章。

这些内容来自我的写作素材，每个部分都包含重要的观点或论述。请你：

1. 内容整合：
   - 理解每个部分的核心观点
   - 找出各部分之间的逻辑关联
   - 合理安排内容顺序，创造流畅的过渡
   - 适当添加过渡语句，使段落之间衔接自然

2. 表达优化：
   - 统一文章的语言风格和表达方式
   - 优化句式结构，使行文更加优美
   - 选用准确、优雅的词语
   - 适当运用修辞手法，增强文章表现力

3. 结构完善：
   - 确保文章结构完整（开头、主体、结尾）
   - 合理划分段落，突出层次感
   - 重点内容要有详略得当的展开
   - 适当添加总结性语句，加强文章的连贯性

4. 保持原意：
   - 严格保持原有内容的核心观点
   - 不改变事实和论据
   - 保留专业术语和关键概念
   - 确保优化后的内容准确传达原意
5. 使用Markdown格式组织内容：
   - 使用 # 表示一级标题
   - 使用 ## 表示二级标题
   - 使用 - 或 * 表示无序列表
   - 使用 1. 2. 3. 表示有序列表
   - 使用 > 表示引用内容
   - 使用 **文字** 表示加粗
   - 使用 *文字* 表示斜体
6. 直接返回Markdown格式的文本，不需要其他额外格式，不需要放在代码块中。

以下是需要整合的内容：`,

  polish: `你是一位资深的文字编辑，现在需要你对一篇文章的初稿进行润色和优化。请注意以下几点：

1. 语言表达：
   - 提升语言的优美度和文学性
   - 优化句式结构，使行文更加流畅
   - 适当使用修辞手法，增强表现力
   - 保持语言风格的一致性

2. 段落结构：
   - 优化段落之间的过渡
   - 确保逻辑层次清晰
   - 调整段落长度，保持节奏感
   - 加强段落之间的连贯性

3. 细节完善：
   - 润色不恰当的表达
   - 消除冗余的内容
   - 补充必要的细节
   - 强化关键论点的表达

4. 原则要求：
   - 保持原文的核心观点不变
   - 不改变事实和论据
   - 保留专业术语和关键概念
   - 确保修改后的内容准确传达原意

5. 使用Markdown格式组织内容：
   - 使用 # 表示一级标题
   - 使用 ## 表示二级标题
   - 使用 - 或 * 表示无序列表
   - 使用 1. 2. 3. 表示有序列表
   - 使用 > 表示引用内容
   - 使用 **文字** 表示加粗
   - 使用 *文字* 表示斜体
6. 直接返回Markdown格式的文本，不需要其他额外格式，不需要放在代码块中。

以下是需要润色的初稿内容：`
}

// 工具函数：转换数据库记录为 Manuscript 对象
function convertToManuscript(record: any): Manuscript {
  return {
    ...record,
    polishedContent: record.polishedContent ? JSON.parse(record.polishedContent) : null,
    firstDraftContent: record.firstDraftContent ? JSON.parse(record.firstDraftContent) : null
  }
}

// 工具函数：转换数据库记录为 ManuscriptCard 对象
function convertToManuscriptCard(record: any): ManuscriptCard {
  return {
    ...record,
    content: JSON.parse(record.content)
  }
}

// 添加新的类型定义
interface WritingDeskAIConfig {
  id: string
  featureType: AIFeatureType
  modelConfigId: string
  createdAt: Date
  updatedAt: Date
}

// 创建新文稿
export async function createManuscript(params: CreateManuscriptParams): Promise<Manuscript> {
  return db.transaction(async (trx) => {
    try {
      // 设置事务超时
      await trx.raw('PRAGMA busy_timeout = 5000;')

      const id = uuidv4()
      const now = new Date()

      const manuscript = {
        id,
        title: params.title,
        status: 'draft',
        polishedContent: null,
        createdAt: now,
        updatedAt: now,
        lastPolishedAt: null
      }

      const [created] = await trx('manuscripts').insert(manuscript).returning('*')

      return convertToManuscript(created)
    } catch (error) {
      console.error('创建文稿失败:', error)
      throw error
    }
  })
}

// 获取所有文稿
export async function getAllManuscripts(): Promise<Manuscript[]> {
  try {
    // console.log('开始获取所有文稿')

    // 检查表是否存在
    const hasTable = await db.schema.hasTable('manuscripts')
    // console.log(`manuscripts 表是否存在: ${hasTable}`)

    if (!hasTable) {
      console.error('manuscripts 表不存在！')
      return []
    }

    // console.log('执行查询: SELECT * FROM manuscripts ORDER BY updatedAt DESC')
    const manuscripts = await db('manuscripts').orderBy('updatedAt', 'desc').select('*')
    // console.log(`获取到 ${manuscripts.length} 个文稿`)

    // if (manuscripts.length > 0) {
    //   console.log('第一个文稿示例:', manuscripts[0])
    // }

    return manuscripts.map(convertToManuscript)
  } catch (error) {
    console.error('获取所有文稿失败:', error)
    throw error
  }
}

// 获取单个文稿及其卡片
export async function getManuscriptById(
  id: string
): Promise<Manuscript & { cards: ManuscriptCard[] }> {
  try {
    // console.log(`开始获取文稿，ID: "${id}"，类型: ${typeof id}`)

    // 检查 ID 是否有效
    if (!id || typeof id !== 'string') {
      console.error(`无效的文稿ID: ${id}`)
      throw new Error(`无效的文稿ID: ${id}`)
    }

    // 检查数据库表是否存在
    const hasTable = await db.schema.hasTable('manuscripts')
    // console.log(`manuscripts 表是否存在: ${hasTable}`)

    if (!hasTable) {
      console.error('manuscripts 表不存在！')
      throw new Error('manuscripts 表不存在！')
    }

    // 尝试简单查询获取所有文稿数量
    try {
      // const count = await db('manuscripts').count('* as count').first()
      // console.log(`现有文稿数量: ${count ? count.count : 0}`)
    } catch (e) {
      console.error('查询文稿数量失败:', e)
    }

    // 使用字符串参数直接查询
    // console.log(`执行查询: SELECT * FROM manuscripts WHERE id = '${id}' LIMIT 1`)
    const manuscript = await db('manuscripts').whereRaw('id = ?', [id]).first()

    // console.log(`查询结果: ${manuscript ? '找到文稿' : '未找到文稿'}`)

    if (!manuscript) {
      console.error(`文稿不存在: ${id}`)
      throw new Error(`文稿不存在: ${id}`)
    }

    // 同样使用 Raw 查询
    // console.log(
    //   `查询文稿卡片: SELECT * FROM manuscript_cards WHERE manuscriptId = '${id}' ORDER BY order ASC`
    // )
    const cards = await db('manuscript_cards')
      .whereRaw('manuscriptId = ?', [id])
      .orderBy('order', 'asc')
      .select('*')

    // console.log(`找到 ${cards.length} 张卡片`)

    // 转换并返回数据
    return {
      ...convertToManuscript(manuscript),
      cards: cards.map(convertToManuscriptCard)
    }
  } catch (error) {
    console.error('获取文稿失败:', error)
    // 检查是否存在 manuscripts 表
    try {
      const tables = await db.raw("SELECT name FROM sqlite_master WHERE type='table'")
      console.error('当前数据库中的表:', tables)
    } catch (e) {
      console.error('查询数据库表失败:', e)
    }
    throw error
  }
}

// 更新文稿
export async function updateManuscript(params: UpdateManuscriptParams): Promise<Manuscript> {
  try {
    const updateData = {
      ...params,
      updatedAt: new Date(),
      // 同时处理 polishedContent 和 firstDraftContent 的 JSON 字符串转换
      polishedContent: params.polishedContent ? JSON.stringify(params.polishedContent) : undefined,
      firstDraftContent: params.firstDraftContent
        ? JSON.stringify(params.firstDraftContent)
        : undefined
    }

    const [updated] = await db('manuscripts')
      .where({ id: params.id })
      .update(updateData)
      .returning('*')

    if (!updated) {
      throw new Error(`文稿不存在: ${params.id}`)
    }

    return convertToManuscript(updated)
  } catch (error) {
    console.error('更新文稿失败:', error)
    throw error
  }
}

// 删除文稿
export async function deleteManuscript(id: string): Promise<void> {
  try {
    await db.transaction(async (trx) => {
      // 由于设置了外键 CASCADE，manuscript_cards 会自动删除
      const deleted = await trx('manuscripts').where({ id }).delete()
      if (!deleted) {
        throw new Error(`文稿不存在: ${id}`)
      }
    })
  } catch (error) {
    console.error('删除文稿失败:', error)
    throw error
  }
}

// 添加卡片
export async function addManuscriptCard(
  manuscriptId: string,
  content: any,
  order: number,
  noteId?: string
): Promise<ManuscriptCard> {
  return db.transaction(async (trx) => {
    try {
      // 设置事务超时
      await trx.raw('PRAGMA busy_timeout = 5000;')

      // 先检查文稿是否存在
      const manuscript = await trx('manuscripts').where('id', manuscriptId).first()
      if (!manuscript) {
        throw new Error(`文稿不存在: ${manuscriptId}`)
      }

      // 将目标位置及之后的卡片的 order 值加 1
      await trx('manuscript_cards')
        .where('manuscriptId', manuscriptId)
        .where('order', '>=', order)
        .increment('order', 1)

      const now = new Date()
      const id = uuidv4()

      const card = {
        id,
        manuscriptId,
        type: noteId ? 'reference' : 'paragraph',
        content: JSON.stringify(content),
        order,
        noteId,
        createdAt: now,
        updatedAt: now
      }

      // 插入新卡片
      const [created] = await trx('manuscript_cards').insert(card).returning('*')

      return convertToManuscriptCard(created)
    } catch (error) {
      console.error('添加卡片失败:', error)
      throw error
    }
  })
}

// 更新卡片
export async function updateManuscriptCard(
  cardId: string,
  content?: any,
  order?: number
): Promise<ManuscriptCard> {
  return db.transaction(async (trx) => {
    try {
      // 设置事务超时
      await trx.raw('PRAGMA busy_timeout = 5000;')

      const updateData = {
        ...(content && { content: JSON.stringify(content) }),
        ...(typeof order === 'number' && { order }),
        updatedAt: new Date()
      }

      const [updated] = await trx('manuscript_cards')
        .where('id', cardId)
        .update(updateData)
        .returning('*')

      if (!updated) {
        throw new Error(`卡片不存在: ${cardId}`)
      }

      return convertToManuscriptCard(updated)
    } catch (error) {
      console.error('更新卡片失败:', error)
      throw error
    }
  })
}

// 移动卡片
export async function moveManuscriptCard(cardId: string, order: number): Promise<ManuscriptCard> {
  try {
    const [moved] = await db('manuscript_cards')
      .where({ id: cardId })
      .update({
        order,
        updatedAt: new Date()
      })
      .returning('*')

    if (!moved) {
      throw new Error(`卡片不存在: ${cardId}`)
    }

    return convertToManuscriptCard(moved)
  } catch (error) {
    console.error('移动卡片失败:', error)
    throw error
  }
}

// 修改删除卡片的方法
export async function deleteManuscriptCard(cardId: string): Promise<void> {
  return db.transaction(async (trx) => {
    try {
      // 获取要删除的卡片信息
      const card = await trx('manuscript_cards').where({ id: cardId }).first()
      if (!card) {
        throw new Error(`卡片不存在: ${cardId}`)
      }

      // 删除卡片
      await trx('manuscript_cards').where({ id: cardId }).delete()

      // 更新后续卡片的顺序
      await trx('manuscript_cards')
        .where('manuscriptId', card.manuscriptId)
        .where('order', '>', card.order)
        .decrement('order', 1)
    } catch (error) {
      console.error('删除卡片失败:', error)
      throw error
    }
  })
}

// 批量添加卡片（用于从笔记批量导入）
export async function batchAddManuscriptCards(
  manuscriptId: string,
  cards: { noteId: string; content: any }[]
): Promise<ManuscriptCard[]> {
  try {
    const now = new Date()

    // 获取当前最大的 order
    const maxOrder = await db('manuscript_cards')
      .where({ manuscriptId })
      .max('order as maxOrder')
      .first()

    const startOrder = (maxOrder?.maxOrder || -1) + 1

    const cardRecords = cards.map((card, index) => ({
      id: uuidv4(),
      manuscriptId,
      type: 'reference',
      content: JSON.stringify(card.content),
      order: startOrder + index,
      noteId: card.noteId,
      createdAt: now,
      updatedAt: now
    }))

    const created = await db('manuscript_cards').insert(cardRecords).returning('*')

    return created.map(convertToManuscriptCard)
  } catch (error) {
    console.error('批量添加卡片失败:', error)
    throw error
  }
}

// 获取文稿中的所有卡片
export async function getManuscriptCards(manuscriptId: string): Promise<ManuscriptCard[]> {
  try {
    const cards = await db('manuscript_cards')
      .where({ manuscriptId })
      .orderBy('order', 'asc')
      .select('*')

    return cards.map(convertToManuscriptCard)
  } catch (error) {
    console.error('获取文稿卡片失败:', error)
    throw error
  }
}

// 获取单个卡片
export async function getManuscriptCardById(cardId: string): Promise<ManuscriptCard> {
  try {
    const card = await db('manuscript_cards').where({ id: cardId }).first()

    if (!card) {
      throw new Error(`卡片不存在: ${cardId}`)
    }

    return convertToManuscriptCard(card)
  } catch (error) {
    console.error('获取卡片失败:', error)
    throw error
  }
}

// 获取所有 AI 功能配置
export async function getAllAIConfigs(): Promise<WritingDeskAIConfig[]> {
  try {
    const configs = await db('writing_desk_ai_configs').select('*').orderBy('featureType')

    return configs.map((config) => ({
      ...config,
      createdAt: new Date(config.createdAt),
      updatedAt: new Date(config.updatedAt)
    }))
  } catch (error) {
    console.error('获取写作台 AI 功能配置失败:', error)
    throw error
  }
}

// 获取指定功能的配置
export async function getAIConfigByFeature(
  featureType: AIFeatureType
): Promise<WritingDeskAIConfig | null> {
  try {
    const config = await db('writing_desk_ai_configs').where({ featureType }).first()

    if (!config) return null

    return {
      ...config,
      createdAt: new Date(config.createdAt),
      updatedAt: new Date(config.updatedAt)
    }
  } catch (error) {
    console.error(`获取 ${featureType} 功能配置失败:`, error)
    throw error
  }
}

// 更新 AI 功能配置
export async function updateAIConfig(
  featureType: AIFeatureType,
  modelConfigId: string
): Promise<WritingDeskAIConfig> {
  return db.transaction(async (trx) => {
    try {
      // 检查模型配置是否存在
      const modelConfig = await trx('model_configs').where('id', modelConfigId).first()

      if (!modelConfig) {
        throw new Error('模型配置不存在')
      }

      const now = new Date()

      // 更新或创建配置
      const [config] = await trx('writing_desk_ai_configs')
        .insert({
          id: uuidv4(),
          featureType,
          modelConfigId,
          createdAt: now,
          updatedAt: now
        })
        .onConflict('featureType')
        .merge({
          modelConfigId,
          updatedAt: now
        })
        .returning('*')

      return {
        ...config,
        createdAt: new Date(config.createdAt),
        updatedAt: new Date(config.updatedAt)
      }
    } catch (error) {
      console.error(`更新 ${featureType} 功能配置失败:`, error)
      throw error
    }
  })
}

// 修改生成初稿方法
export async function generateFirstDraft(params: PolishManuscriptParams): Promise<Manuscript> {
  try {
    // console.log('开始生成初稿:', params.id)

    // 获取初稿功能的模型配置
    const aiConfig = await getAIConfigByFeature('firstDraft')
    if (!aiConfig) {
      throw new Error('未找到初稿功能的模型配置')
    }

    // 1. 获取文稿及其卡片
    const manuscript = await getManuscriptById(params.id)
    if (!manuscript.cards.length) {
      throw new Error('文稿中没有任何内容')
    }

    // 2. 提取所有卡片的内容并组合
    let combinedText = ''
    manuscript.cards.forEach((card, index) => {
      const cardText = extractTextFromTiptapJson(card.content)
      if (index > 0) {
        combinedText += '\n---\n'
      }
      combinedText += `第${index + 1}部分：\n${cardText}\n`
    })

    // 3. 获取提示词模板
    let prompt: string
    const customTemplate = await getPromptTemplateByType('firstDraft')
    if (customTemplate) {
      prompt = customTemplate.content + '\n\n' + combinedText
    } else {
      prompt = DEFAULT_PROMPTS.firstDraft + '\n\n' + combinedText
    }

    // 4. 使用配置的模型调用 AI 服务
    const llmService = new LLMService()
    const firstDraftText = await llmService.generateResponse(prompt, aiConfig.modelConfigId)

    // 5. 将润色后的文本转换为 Tiptap JSON 格式
    const firstDraftContent = convertTextToTiptapJson(firstDraftText)

    const now = new Date()

    // 6. 记录润色历史
    await db('manuscript_first_draft_history').insert({
      id: uuidv4(),
      manuscriptId: params.id,
      firstDraftContent: JSON.stringify(firstDraftContent),
      style: params.style || 'default',
      createdAt: now
    })

    // 7. 更新文稿状态
    const [updated] = await db('manuscripts')
      .where({ id: params.id })
      .update({
        status: 'first_draft',
        firstDraftContent: JSON.stringify(firstDraftContent),
        lastFirstDraftAt: now,
        updatedAt: now
      })
      .returning('*')

    return convertToManuscript(updated)
  } catch (error) {
    console.error('生成初稿失败:', error)
    throw error
  }
}

// 修改润色终稿方法
export async function polishManuscript(params: PolishManuscriptParams): Promise<Manuscript> {
  try {
    // console.log('开始润色终稿:', params.id)

    // 获取润色功能的模型配置
    const aiConfig = await getAIConfigByFeature('polish')
    if (!aiConfig) {
      throw new Error('未找到润色功能的模型配置')
    }

    // 1. 获取文稿
    const manuscript = await getManuscriptById(params.id)
    if (!manuscript.firstDraftContent) {
      throw new Error('文稿还没有初稿内容')
    }

    // 2. 提取初稿的文本内容
    const firstDraftText = extractTextFromTiptapJson(manuscript.firstDraftContent)
    // console.log('提取的初稿文本内容:', firstDraftText)

    // 3. 获取提示词模板
    let prompt: string
    const customTemplate = await getPromptTemplateByType('polish')
    if (customTemplate) {
      prompt = customTemplate.content + '\n\n' + firstDraftText
    } else {
      prompt = DEFAULT_PROMPTS.polish + '\n\n' + firstDraftText
    }

    // 4. 使用配置的模型调用 AI 服务
    const llmService = new LLMService()
    const polishedText = await llmService.generateResponse(prompt, aiConfig.modelConfigId)

    // 5. 将润色后的文本转换为 Tiptap JSON 格式
    const polishedContent = convertTextToTiptapJson(polishedText)

    const now = new Date()

    // 6. 记录润色历史
    await db('manuscript_polish_history').insert({
      id: uuidv4(),
      manuscriptId: params.id,
      polishedContent: JSON.stringify(polishedContent),
      style: params.style || 'default',
      createdAt: now
    })

    // 7. 更新文稿状态
    const [updated] = await db('manuscripts')
      .where({ id: params.id })
      .update({
        status: 'polished',
        polishedContent: JSON.stringify(polishedContent),
        lastPolishedAt: now,
        updatedAt: now
      })
      .returning('*')

    return convertToManuscript(updated)
  } catch (error) {
    console.error('文稿润色失败:', error)
    throw error
  }
}

// 获取初稿历史记录
export async function getFirstDraftHistory(manuscriptId: string): Promise<any[]> {
  try {
    const history = await db('manuscript_first_draft_history')
      .where({ manuscriptId })
      .orderBy('createdAt', 'desc')
      .select('*')

    return history.map((record) => ({
      id: record.id,
      manuscriptId: record.manuscriptId,
      firstDraftContent: JSON.parse(record.firstDraftContent),
      style: record.style,
      createdAt: record.createdAt
    }))
  } catch (error) {
    console.error('获取初稿历史失败:', error)
    throw error
  }
}

// 恢复初稿历史版本
export async function restoreFirstDraftHistory(
  manuscriptId: string,
  historyId: string
): Promise<Manuscript> {
  return db.transaction(async (trx) => {
    try {
      // 获取历史版本内容
      const history = await trx('manuscript_first_draft_history')
        .where({
          id: historyId,
          manuscriptId
        })
        .first()

      if (!history) {
        throw new Error('历史版本不存在')
      }

      // 更新文稿的初稿内容
      const [updated] = await trx('manuscripts')
        .where({ id: manuscriptId })
        .update({
          firstDraftContent: history.firstDraftContent,
          updatedAt: new Date()
        })
        .returning('*')

      return convertToManuscript(updated)
    } catch (error) {
      console.error('恢复初稿历史版本失败:', error)
      throw error
    }
  })
}

// 获取终稿历史记录
export async function getPolishHistory(manuscriptId: string): Promise<any[]> {
  try {
    const history = await db('manuscript_polish_history')
      .where({ manuscriptId })
      .orderBy('createdAt', 'desc')
      .select('*')

    return history.map((record) => ({
      id: record.id,
      manuscriptId: record.manuscriptId,
      polishedContent: JSON.parse(record.polishedContent),
      style: record.style,
      createdAt: record.createdAt
    }))
  } catch (error) {
    console.error('获取终稿历史失败:', error)
    throw error
  }
}

// 恢复终稿历史版本
export async function restorePolishHistory(
  manuscriptId: string,
  historyId: string
): Promise<Manuscript> {
  return db.transaction(async (trx) => {
    try {
      // 获取历史版本内容
      const history = await trx('manuscript_polish_history')
        .where({
          id: historyId,
          manuscriptId
        })
        .first()

      if (!history) {
        throw new Error('历史版本不存在')
      }

      // 更新文稿的终稿内容
      const [updated] = await trx('manuscripts')
        .where({ id: manuscriptId })
        .update({
          polishedContent: history.polishedContent,
          updatedAt: new Date()
        })
        .returning('*')

      return convertToManuscript(updated)
    } catch (error) {
      console.error('恢复终稿历史版本失败:', error)
      throw error
    }
  })
}

// 添加一个更详细的检查函数
export async function checkTables() {
  try {
    console.log('开始详细检查数据库表')

    // 获取所有表
    await db.raw("SELECT name FROM sqlite_master WHERE type='table'")
    // console.log('数据库中的所有表:', tables)

    const hasManuscripts = await db.schema.hasTable('manuscripts')
    const hasManuscriptCards = await db.schema.hasTable('manuscript_cards')

    // console.log('检查数据库表状态:')
    // console.log('manuscripts 表是否存在:', hasManuscripts)
    // console.log('manuscript_cards 表是否存在:', hasManuscriptCards)

    if (hasManuscripts) {
      await db.table('manuscripts').columnInfo()
      // console.log('manuscripts 表结构:', columns)

      // 尝试获取一条记录
      try {
        const sample = await db('manuscripts').limit(1).first()
        console.log('manuscripts 表样本数据:', sample)
      } catch (e) {
        console.error('获取 manuscripts 表样本失败:', e)
      }
    }

    if (hasManuscriptCards) {
      const columns = await db.table('manuscript_cards').columnInfo()
      console.log('manuscript_cards 表结构:', columns)
    }

    // 检查是否能执行原始 SQL
    try {
      const result = await db.raw('SELECT 1 as test')
      console.log('原始 SQL 测试结果:', result)
    } catch (e) {
      console.error('执行原始 SQL 测试失败:', e)
    }
  } catch (error) {
    console.error('检查数据库表失败:', error)
    throw error
  }
}

// 导出润色后的文稿
export async function exportPolishedManuscript(
  manuscriptId: string
): Promise<{ filePath: string; fileName: string }> {
  try {
    // 1. 获取文稿数据
    const manuscript = await getManuscriptById(manuscriptId)
    if (!manuscript) {
      throw new Error(`文稿不存在: ${manuscriptId}`)
    }

    // 2. 检查是否有润色后的内容
    if (!manuscript.polishedContent) {
      throw new Error('文稿还没有润色内容')
    }

    // 3. 创建 ZIP 实例
    const zip = new JSZip()

    // 4. 转换为 Markdown
    const { markdown, images } = convertContentToMarkdown(manuscript.polishedContent)

    // 5. 处理图片
    let processedMarkdown = markdown
    for (const imageUrl of images) {
      try {
        const imageData = await downloadImage(imageUrl)
        const imageName = path.basename(imageUrl)
        zip.file(`images/${imageName}`, imageData)

        // 更新 markdown 中的图片链接
        processedMarkdown = processedMarkdown.replace(
          new RegExp(
            `!\\[([^\\]]*)\\]\\(${imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`,
            'g'
          ),
          `![$1](./images/${imageName})`
        )
      } catch (error) {
        console.error(`处理图片失败: ${imageUrl}`, error)
      }
    }

    // 6. 添加 markdown 文件到 zip
    const timeString = format(new Date(), 'yyyyMMddHHmm')
    const fileName = `${sanitizeFileName(manuscript.title)}_${timeString}.md`
    zip.file(fileName, processedMarkdown)

    // 7. 生成 zip 文件
    const content = await zip.generateAsync({ type: 'nodebuffer' })

    // 8. 让用户选择保存位置
    const zipFileName = `Antinet_manuscript_${timeString}.zip`
    const result = await dialog.showSaveDialog({
      defaultPath: path.join(app.getPath('downloads'), zipFileName),
      filters: [{ name: 'ZIP 文件', extensions: ['zip'] }]
    })

    if (result.canceled || !result.filePath) {
      throw new Error('用户取消了保存')
    }

    // 9. 保存文件并设置修改时间
    await fs.promises.writeFile(result.filePath, content)
    const now = new Date()
    await fs.promises.utimes(result.filePath, now, now)

    return {
      filePath: result.filePath,
      fileName: path.basename(result.filePath)
    }
  } catch (error) {
    console.error('导出润色文稿失败:', error)
    throw error
  }
}

// 将润色后的文稿复制为 Markdown 格式到剪贴板
export async function copyPolishedManuscriptToClipboard(
  manuscriptId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // 1. 获取文稿数据
    const manuscript = await getManuscriptById(manuscriptId)
    if (!manuscript) {
      throw new Error(`文稿不存在: ${manuscriptId}`)
    }

    // 2. 检查是否有润色后的内容
    if (!manuscript.polishedContent) {
      throw new Error('文稿还没有润色内容')
    }

    // 3. 获取应用数据目录
    const userDataPath = app.getPath('userData')
    const imagesPath = path.join(userDataPath, 'UserData', 'images')

    // 4. 转换为 Markdown
    const { markdown, images } = convertContentToMarkdown(manuscript.polishedContent)
    let processedMarkdown = markdown

    // 5. 处理图片路径
    for (const imageUrl of images) {
      try {
        if (imageUrl.startsWith('app-image://')) {
          // 获取图片文件名
          const imageName = imageUrl.replace('app-image:///images/', '')
          // 构建完整的本地文件路径
          const localImagePath = path.join(imagesPath, imageName)

          // 替换图片链接为本地路径，并添加注释
          processedMarkdown = processedMarkdown.replace(
            new RegExp(
              `!\\[([^\\]]*)\\]\\(${imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`,
              'g'
            ),
            (_match, alt) => `![${alt}](${localImagePath})\n<!-- 本地图片路径 -->`
          )
        }
      } catch (error) {
        console.error(`处理图片失败: ${imageUrl}`, error)
      }
    }

    // 6. 添加文章标题、元数据和图片存储位置说明
    const timeString = format(new Date(), 'yyyy-MM-dd HH:mm:ss')
    const headerContent =
      `# ${manuscript.title}\n\n` +
      `> 导出时间：${timeString}\n\n` +
      `> 图片存储位置：${imagesPath}\n\n` +
      `---\n\n`

    const finalContent = headerContent + processedMarkdown

    // 7. 复制到剪贴板
    clipboard.writeText(finalContent)

    return {
      success: true,
      message: '文稿已复制到剪贴板'
    }
  } catch (error) {
    console.error('复制文稿到剪贴板失败:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '复制文稿失败'
    }
  }
}
