import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import type {
  MindEcho,
  CreateMindEchoParams,
  UpdateMindEchoParams,
  MindEchoWithRelations
} from '@shared/types/mind-echo'
import { LLMService } from '../rag/llmService'
import { convertTextToTiptapJson } from '../utils/textToJson'

// 数据库记录接口
interface MindEchoRecord {
  id: string
  noteId: string
  conversationId: string
  messageId: string
  title: string
  content: string
  summary: string
  order: number | null
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
}

// 转换函数：数据库记录 -> MindEcho对象
function convertToMindEcho(record: MindEchoRecord): MindEcho {
  return {
    ...record,
    // 确保 content 是解析后的 JSON 对象
    content: typeof record.content === 'string' ? JSON.parse(record.content) : record.content,
    order: record.order || undefined,
    isArchived: record.isArchived || false
  }
}

// 分别定义生成标题和摘要的提示词
const GENERATE_TITLE_PROMPT = `请为以下内容生成一个标题。
要求：
1. 简洁、准确，不超过20个字
2. 能够概括内容的核心主题
3. 直接返回标题文本即可，不需要任何额外格式

内容如下：
`

const GENERATE_SUMMARY_PROMPT = `请为以下内容生成一个简短摘要。
要求：
1. 概括核心内容，不超过50个字
2. 突出内容的关键信息和价值
3. 直接返回摘要文本即可，不需要任何额外格式

内容如下：
`

// 修改提示词，让AI更好地理解对话上下文
const SUMMARIZE_CONVERSATION_PROMPT = `请分析并总结以下对话内容，生成一个完整的、结构化的总结。

要求：
1. 理解用户的问题和需求
2. 提取对话中的关键信息和结论
3. 保持逻辑清晰，层次分明
4. 总结应该包含问题背景、分析过程和最终结论
5. 去除对话中的冗余内容
6. 使用Markdown格式组织内容：
   - 使用 # 表示一级标题
   - 使用 ## 表示二级标题
   - 使用 - 或 * 表示无序列表
   - 使用 1. 2. 3. 表示有序列表
   - 使用 > 表示引用内容
   - 使用 **文字** 表示加粗
   - 使用 *文字* 表示斜体
7. 直接返回Markdown格式的文本，不需要其他额外格式

对话内容如下：
`

// 修改从多轮对话创建思维共鸣的方法
export async function createMindEchoFromConversation(params: {
  noteId: string
  conversationId: string
  modelConfigId?: string
}): Promise<MindEcho> {
  try {
    // 1. 获取会话的所有消息，按时间顺序排列
    const messages = await db('chat_messages')
      .where('conversationId', params.conversationId)
      .orderBy('createdAt', 'asc')

    if (messages.length === 0) {
      throw new Error('未找到对话消息')
    }

    // 2. 构建完整的对话内容，保留对话的上下文
    const conversationText = messages
      .map((msg) => {
        const role = msg.role === 'user' ? '用户' : 'AI助手'
        return `${role}：${msg.content}`
      })
      .join('\n\n')

    const llmService = new LLMService()

    // 3. 让AI整理总结对话内容
    const summarizedContent = await llmService.generateResponse(
      SUMMARIZE_CONVERSATION_PROMPT + conversationText,
      params.modelConfigId
    )

    // 4. 使用整理后的内容创建思维共鸣
    return await createMindEchoFromContent({
      noteId: params.noteId,
      conversationId: params.conversationId,
      messageId: messages[messages.length - 1].id, // 使用最后一条消息的ID作为引用
      content: summarizedContent,
      modelConfigId: params.modelConfigId
    })
  } catch (error) {
    console.error('从对话创建思维共鸣失败:', error)
    throw new Error(`创建思维共鸣失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 修改原有的createMindEchoFromContent方法，添加content参数支持
export async function createMindEchoFromContent(params: {
  noteId: string
  conversationId: string
  messageId: string
  content?: string // 新增：可选的content参数
  modelConfigId?: string
}): Promise<MindEcho> {
  try {
    let content: string

    if (params.content) {
      // 如果提供了content，直接使用
      content = params.content
    } else {
      // 否则从数据库获取
      const message = await db('chat_messages').where('id', params.messageId).first()
      if (!message) {
        throw new Error(`消息不存在: ${params.messageId}`)
      }
      content = message.content
    }

    const llmService = new LLMService()

    // 生成标题和摘要的逻辑保持不变...
    const titleResponse = await llmService.generateResponse(
      GENERATE_TITLE_PROMPT + content,
      params.modelConfigId
    )
    const title = titleResponse.trim()

    const summaryResponse = await llmService.generateResponse(
      GENERATE_SUMMARY_PROMPT + content,
      params.modelConfigId
    )
    const summary = summaryResponse.trim()

    // 将内容转换为Tiptap JSON格式
    const contentJson = convertTextToTiptapJson(content)

    // 创建思维共鸣记录
    const createParams: CreateMindEchoParams = {
      noteId: params.noteId,
      conversationId: params.conversationId,
      messageId: params.messageId,
      title: title || '思维共鸣',
      content: JSON.stringify(contentJson),
      summary: summary || '无法生成摘要'
    }

    return await createMindEcho(createParams)
  } catch (error) {
    console.error('从AI内容创建思维共鸣失败:', error)
    throw new Error(`创建思维共鸣失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 创建思维共鸣
export async function createMindEcho(params: CreateMindEchoParams): Promise<MindEcho> {
  try {
    const id = uuidv4()
    const now = new Date()

    // 获取当前笔记的最大order
    const maxOrderResult = await db('mind_echoes')
      .where('noteId', params.noteId)
      .max('order as maxOrder')
      .first()

    const newOrder = (maxOrderResult?.maxOrder || 0) + 1

    // 确保 content 是字符串形式的 JSON
    const contentString =
      typeof params.content === 'string' ? params.content : JSON.stringify(params.content)

    const newMindEcho = {
      id,
      ...params,
      content: contentString, // 存储字符串形式的 JSON
      order: newOrder,
      isArchived: false,
      createdAt: now,
      updatedAt: now
    }

    const [created] = await db('mind_echoes').insert(newMindEcho).returning('*')

    return convertToMindEcho(created)
  } catch (error) {
    console.error('创建思维共鸣失败:', error)
    throw error
  }
}

// 获取笔记的所有思维共鸣
export async function getNoteMindEchoes(
  noteId: string,
  includeArchived: boolean = false
): Promise<MindEcho[]> {
  try {
    let query = db('mind_echoes').where('noteId', noteId)

    if (!includeArchived) {
      query = query.where('isArchived', false)
    }

    const echoes = await query.orderBy('order', 'asc')

    return echoes.map(convertToMindEcho)
  } catch (error) {
    console.error('获取笔记思维共鸣失败:', { noteId, error })
    throw error
  }
}

// 获取单个思维共鸣（带关联数据）
export async function getMindEchoWithRelations(id: string): Promise<MindEchoWithRelations | null> {
  try {
    const echo = await db('mind_echoes').where('id', id).first()
    if (!echo) return null

    // 获取关联的笔记
    const note = await db('notes').where('id', echo.noteId).first()

    // 获取关联的对话和消息
    const conversation = await db('chat_conversations').where('id', echo.conversationId).first()
    const message = await db('chat_messages').where('id', echo.messageId).first()

    return {
      ...convertToMindEcho(echo),
      note: note || undefined,
      conversation: conversation
        ? {
            id: conversation.id,
            title: conversation.title,
            message: message || undefined
          }
        : undefined
    }
  } catch (error) {
    console.error('获取思维共鸣详情失败:', { id, error })
    throw error
  }
}

// 更新思维共鸣
export async function updateMindEcho(params: UpdateMindEchoParams): Promise<MindEcho> {
  try {
    const { id, ...updateData } = params
    const now = new Date()

    // 确保存入数据库的是字符串形式的 JSON
    const processedUpdateData = {
      ...updateData,
      content: updateData.content
        ? typeof updateData.content === 'string'
          ? updateData.content
          : JSON.stringify(updateData.content)
        : undefined,
      updatedAt: now
    }

    const [updated] = await db('mind_echoes')
      .where('id', id)
      .update(processedUpdateData)
      .returning('*')

    if (!updated) {
      throw new Error(`思维共鸣不存在: ${id}`)
    }

    // 返回时确保 content 是解析后的 JSON 对象
    return convertToMindEcho(updated)
  } catch (error) {
    console.error('更新思维共鸣失败:', error)
    throw error
  }
}

// 删除思维共鸣
export async function deleteMindEcho(id: string): Promise<void> {
  try {
    const deleted = await db('mind_echoes').where('id', id).delete()
    if (!deleted) {
      throw new Error(`思维共鸣不存在: ${id}`)
    }
  } catch (error) {
    console.error('删除思维共鸣失败:', { id, error })
    throw error
  }
}

// 更新思维共鸣排序
export async function updateMindEchoOrder(id: string, newOrder: number): Promise<MindEcho> {
  try {
    return await db.transaction(async (trx) => {
      // 1. 获取当前思维共鸣
      const current = await trx('mind_echoes').where('id', id).first()
      if (!current) {
        throw new Error(`思维共鸣不存在: ${id}`)
      }

      // 2. 更新受影响的其他思维共鸣的顺序
      if (current.order !== null) {
        if (newOrder > current.order) {
          // 向下移动：更新中间项的顺序-1
          await trx('mind_echoes')
            .where('noteId', current.noteId)
            .whereBetween('order', [current.order + 1, newOrder])
            .decrement('order', 1)
        } else if (newOrder < current.order) {
          // 向上移动：更新中间项的顺序+1
          await trx('mind_echoes')
            .where('noteId', current.noteId)
            .whereBetween('order', [newOrder, current.order - 1])
            .increment('order', 1)
        }
      }

      // 3. 更新当前项的顺序
      const [updated] = await trx('mind_echoes')
        .where('id', id)
        .update({
          order: newOrder,
          updatedAt: new Date()
        })
        .returning('*')

      return convertToMindEcho(updated)
    })
  } catch (error) {
    console.error('更新思维共鸣顺序失败:', { id, newOrder, error })
    throw error
  }
}

// 归档/取消归档思维共鸣
export async function toggleMindEchoArchived(id: string, isArchived: boolean): Promise<MindEcho> {
  try {
    const [updated] = await db('mind_echoes')
      .where('id', id)
      .update({
        isArchived,
        updatedAt: new Date()
      })
      .returning('*')

    if (!updated) {
      throw new Error(`思维共鸣不存在: ${id}`)
    }

    return convertToMindEcho(updated)
  } catch (error) {
    console.error('更新思维共鸣归档状态失败:', { id, isArchived, error })
    throw error
  }
}

// 批量操作思维共鸣
export async function batchUpdateMindEchoes(
  ids: string[],
  updates: Partial<MindEcho>
): Promise<MindEcho[]> {
  try {
    const now = new Date()
    const updated = await db('mind_echoes')
      .whereIn('id', ids)
      .update({
        ...updates,
        updatedAt: now
      })
      .returning('*')

    return updated.map(convertToMindEcho)
  } catch (error) {
    console.error('批量更新思维共鸣失败:', { ids, updates, error })
    throw error
  }
}
