import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import type {
  Manuscript,
  ManuscriptCard,
  CreateManuscriptParams,
  UpdateManuscriptParams,
  PolishManuscriptParams
} from '@shared/types'
import { LLMService } from '../rag/llmService'
import { extractTextFromTiptapJson, convertTextToTiptapJson } from '../utils/textToJson'

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
    console.log('开始获取所有文稿')

    // 检查表是否存在
    const hasTable = await db.schema.hasTable('manuscripts')
    console.log(`manuscripts 表是否存在: ${hasTable}`)

    if (!hasTable) {
      console.error('manuscripts 表不存在！')
      return []
    }

    console.log('执行查询: SELECT * FROM manuscripts ORDER BY updatedAt DESC')
    const manuscripts = await db('manuscripts').orderBy('updatedAt', 'desc').select('*')
    console.log(`获取到 ${manuscripts.length} 个文稿`)

    if (manuscripts.length > 0) {
      console.log('第一个文稿示例:', manuscripts[0])
    }

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
    console.log(`开始获取文稿，ID: "${id}"，类型: ${typeof id}`)

    // 检查 ID 是否有效
    if (!id || typeof id !== 'string') {
      console.error(`无效的文稿ID: ${id}`)
      throw new Error(`无效的文稿ID: ${id}`)
    }

    // 检查数据库表是否存在
    const hasTable = await db.schema.hasTable('manuscripts')
    console.log(`manuscripts 表是否存在: ${hasTable}`)

    if (!hasTable) {
      console.error('manuscripts 表不存在！')
      throw new Error('manuscripts 表不存在！')
    }

    // 尝试简单查询获取所有文稿数量
    try {
      const count = await db('manuscripts').count('* as count').first()
      console.log(`现有文稿数量: ${count ? count.count : 0}`)
    } catch (e) {
      console.error('查询文稿数量失败:', e)
    }

    // 使用字符串参数直接查询
    console.log(`执行查询: SELECT * FROM manuscripts WHERE id = '${id}' LIMIT 1`)
    const manuscript = await db('manuscripts').whereRaw('id = ?', [id]).first()

    console.log(`查询结果: ${manuscript ? '找到文稿' : '未找到文稿'}`)

    if (!manuscript) {
      console.error(`文稿不存在: ${id}`)
      throw new Error(`文稿不存在: ${id}`)
    }

    // 同样使用 Raw 查询
    console.log(
      `查询文稿卡片: SELECT * FROM manuscript_cards WHERE manuscriptId = '${id}' ORDER BY order ASC`
    )
    const cards = await db('manuscript_cards')
      .whereRaw('manuscriptId = ?', [id])
      .orderBy('order', 'asc')
      .select('*')

    console.log(`找到 ${cards.length} 张卡片`)

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

// 生成初稿方法
export async function generateFirstDraft(params: PolishManuscriptParams): Promise<Manuscript> {
  try {
    console.log('开始生成初稿:', params.id)

    // 1. 获取文稿及其卡片
    const manuscript = await getManuscriptById(params.id)
    if (!manuscript.cards.length) {
      throw new Error('文稿中没有任何内容')
    }

    // 2. 提取所有卡片的内容并组合
    let combinedText = ''
    manuscript.cards.forEach((card, index) => {
      const cardText = extractTextFromTiptapJson(card.content)

      // 添加分隔符和序号，帮助AI理解文档结构
      if (index > 0) {
        combinedText += '\n---\n'
      }
      combinedText += `第${index + 1}部分：\n${cardText}\n`
    })

    console.log('提取的文本内容:', combinedText)

    // 3. 准备 AI 提示词
    const prompt = `
你是一位专业的文字编辑和作家，现在需要你帮我将以下分散的内容段落整合成一篇连贯、优美的文章。

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

以下是需要整合的内容：

${combinedText}

请直接返回优化后的完整文章，不需要解释修改过程。确保文章具有良好的可读性和专业性，同时保持内容的准确性和完整性。`

    // 4. 调用 AI 服务
    const llmService = new LLMService()
    console.log('开始调用 AI 服务...')
    const firstDraftText = await llmService.generateResponse(prompt)
    console.log('AI润色完成，获得响应')

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

// 润色生成终稿方法
export async function polishManuscript(params: PolishManuscriptParams): Promise<Manuscript> {
  try {
    console.log('开始润色终稿:', params.id)

    // 1. 获取文稿及其卡片
    const manuscript = await getManuscriptById(params.id)
    if (!manuscript.cards.length) {
      throw new Error('文稿中没有任何内容')
    }

    // 2. 提取所有卡片的内容并组合
    let combinedText = ''
    manuscript.cards.forEach((card, index) => {
      const cardText = extractTextFromTiptapJson(card.content)

      // 添加分隔符和序号，帮助AI理解文档结构
      if (index > 0) {
        combinedText += '\n---\n'
      }
      combinedText += `第${index + 1}部分：\n${cardText}\n`
    })

    console.log('提取的文本内容:', combinedText)

    // 3. 准备 AI 提示词
    const prompt = `
你是一位专业的文字编辑和作家，现在需要你帮我将以下分散的内容段落整合成一篇连贯、优美的文章。

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

以下是需要整合的内容：

${combinedText}

请直接返回优化后的完整文章，不需要解释修改过程。确保文章具有良好的可读性和专业性，同时保持内容的准确性和完整性。`

    // 4. 调用 AI 服务
    const llmService = new LLMService()
    console.log('开始调用 AI 服务...')
    const polishedText = await llmService.generateResponse(prompt)
    console.log('AI润色完成，获得响应')

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

// 获取润色历史
export async function getPolishHistory(manuscriptId: string): Promise<any[]> {
  try {
    const history = await db('manuscript_polish_history')
      .where({ manuscriptId })
      .orderBy('createdAt', 'desc')
      .select('*')

    return history.map((record) => ({
      ...record,
      polishedContent: JSON.parse(record.polishedContent)
    }))
  } catch (error) {
    console.error('获取润色历史失败:', error)
    throw error
  }
}

// 添加一个更详细的检查函数
export async function checkTables() {
  try {
    console.log('开始详细检查数据库表')

    // 获取所有表
    const tables = await db.raw("SELECT name FROM sqlite_master WHERE type='table'")
    console.log('数据库中的所有表:', tables)

    const hasManuscripts = await db.schema.hasTable('manuscripts')
    const hasManuscriptCards = await db.schema.hasTable('manuscript_cards')

    console.log('检查数据库表状态:')
    console.log('manuscripts 表是否存在:', hasManuscripts)
    console.log('manuscript_cards 表是否存在:', hasManuscriptCards)

    if (hasManuscripts) {
      const columns = await db.table('manuscripts').columnInfo()
      console.log('manuscripts 表结构:', columns)

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
