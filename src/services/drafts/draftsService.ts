import { db } from '../../db/config'
import { Draft, UpdateDraftInput, AppendDraftInput } from '@shared/types'
import { v4 as uuidv4 } from 'uuid'

// 辅助函数：将数据库记录转换为 Draft 对象
function convertToDraft(record: any): Draft {
  return {
    id: record.id,
    content: typeof record.content === 'string' ? JSON.parse(record.content) : record.content,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt)
  }
}

// 获取草稿纸内容
export async function getDraft(): Promise<Draft | null> {
  try {
    const draft = await db('drafts').first()
    return draft ? convertToDraft(draft) : null
  } catch (error) {
    console.error('后端→ 获取草稿纸内容失败:', error)
    throw error
  }
}

// 创建草稿纸
export async function createDraft(): Promise<Draft> {
  try {
    const now = new Date()
    const draft: Draft = {
      id: uuidv4(),
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph'
          }
        ]
      },
      createdAt: now,
      updatedAt: now
    }

    // 序列化 content
    const draftToInsert = {
      ...draft,
      content: JSON.stringify(draft.content)
    }

    const [createdDraft] = await db('drafts').insert(draftToInsert).returning('*')
    return convertToDraft(createdDraft)
  } catch (error) {
    console.error('后端→ 创建草稿纸失败:', error)
    throw error
  }
}

// 更新草稿纸内容
export async function updateDraft(input: UpdateDraftInput): Promise<Draft> {
  try {
    const now = new Date()
    const [updatedDraft] = await db('drafts')
      .where({ id: input.id })
      .update({
        content: JSON.stringify(input.content),
        updatedAt: now
      })
      .returning('*')

    if (!updatedDraft) {
      throw new Error(`草稿纸不存在: ${input.id}`)
    }

    return convertToDraft(updatedDraft)
  } catch (error) {
    console.error('后端→ 更新草稿纸内容失败:', error)
    throw error
  }
}

// 追加内容到草稿纸
export async function appendDraft(input: AppendDraftInput): Promise<Draft> {
  try {
    const draft = await db('drafts').first()
    if (!draft) {
      throw new Error('草稿纸不存在')
    }

    const currentContent =
      typeof draft.content === 'string' ? JSON.parse(draft.content) : draft.content

    // 找到最后一个非空段落的索引
    const paragraphs = currentContent.content || []
    let lastNonEmptyIndex = paragraphs.length - 1
    while (lastNonEmptyIndex >= 0) {
      const paragraph = paragraphs[lastNonEmptyIndex]
      if (paragraph.type === 'paragraph' && paragraph.content && paragraph.content.length > 0) {
        break
      }
      lastNonEmptyIndex--
    }

    // 构建新的内容数组
    const newParagraphs = [
      ...paragraphs.slice(0, lastNonEmptyIndex + 1), // 保留到最后一个非空段落
      {
        type: 'paragraph',
        content: [{ type: 'text', text: input.content }]
      }
    ]

    // 如果这是最后一行，添加一个空段落
    if (!input.hasMoreLines) {
      newParagraphs.push({
        type: 'paragraph' // 添加一个空段落
      })
    }

    // 构建新的内容
    const newContent = {
      type: 'doc',
      content: newParagraphs
    }

    const now = new Date()
    const [updatedDraft] = await db('drafts')
      .where({ id: draft.id })
      .update({
        content: JSON.stringify(newContent),
        updatedAt: now
      })
      .returning('*')

    return convertToDraft(updatedDraft)
  } catch (error) {
    console.error('后端→ 追加内容到草稿纸失败:', error)
    throw error
  }
}
