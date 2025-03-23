import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import type { PromptTemplate, CreatePromptTemplateParams, PromptTemplateType } from '@shared/types'

// 获取指定类型的模板
export async function getPromptTemplateByType(
  type: PromptTemplateType
): Promise<PromptTemplate | null> {
  try {
    const template = await db('writing_prompt_templates').where({ type }).first()

    if (!template) return null

    return {
      ...template,
      createdAt: new Date(template.createdAt),
      updatedAt: new Date(template.updatedAt)
    }
  } catch (error) {
    console.error('获取提示词模板失败:', error)
    throw error
  }
}

// 创建或更新模板
export async function upsertPromptTemplate(
  params: CreatePromptTemplateParams
): Promise<PromptTemplate> {
  try {
    const now = new Date()

    // 尝试查找已存在的同类型模板
    const existingTemplate = await db('writing_prompt_templates')
      .where({ type: params.type })
      .first()

    if (existingTemplate) {
      // 如果存在，则更新
      const [updated] = await db('writing_prompt_templates')
        .where({ id: existingTemplate.id })
        .update({
          content: params.content,
          description: params.description,
          updatedAt: now
        })
        .returning('*')

      return {
        ...updated,
        createdAt: new Date(updated.createdAt),
        updatedAt: new Date(updated.updatedAt)
      }
    } else {
      // 如果不存在，则创建新的
      const [created] = await db('writing_prompt_templates')
        .insert({
          id: uuidv4(),
          ...params,
          createdAt: now,
          updatedAt: now
        })
        .returning('*')

      return {
        ...created,
        createdAt: new Date(created.createdAt),
        updatedAt: new Date(created.updatedAt)
      }
    }
  } catch (error) {
    console.error('创建/更新提示词模板失败:', error)
    throw error
  }
}

// 删除模板
export async function deletePromptTemplate(type: PromptTemplateType): Promise<void> {
  try {
    await db('writing_prompt_templates').where({ type }).delete()
  } catch (error) {
    console.error('删除提示词模板失败:', error)
    throw error
  }
}
