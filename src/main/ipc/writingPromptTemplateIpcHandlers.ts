import { ipcMain } from 'electron'
import {
  getPromptTemplateByType,
  upsertPromptTemplate,
  deletePromptTemplate
} from '../../services/writingDesk/writingPromptTemplateService'
import type { CreatePromptTemplateParams, PromptTemplateType } from '@shared/types'

export function setupWritingPromptTemplateHandlers() {
  // 获取指定类型的模板
  ipcMain.handle('get-writing-prompt-template', async (_event, type: PromptTemplateType) => {
    try {
      console.log('主进程→ 获取提示词模板, 类型:', type)
      const template = await getPromptTemplateByType(type)
      return { success: true, template }
    } catch (error) {
      console.error('主进程→ 获取提示词模板失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 创建或更新模板
  ipcMain.handle(
    'upsert-writing-prompt-template',
    async (_event, params: CreatePromptTemplateParams) => {
      try {
        console.log('主进程→ 创建/更新提示词模板, 参数:', params)
        const template = await upsertPromptTemplate(params)
        return { success: true, template }
      } catch (error) {
        console.error('主进程→ 创建/更新提示词模板失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 删除模板
  ipcMain.handle('delete-writing-prompt-template', async (_event, type: PromptTemplateType) => {
    try {
      console.log('主进程→ 删除提示词模板, 类型:', type)
      await deletePromptTemplate(type)
      return { success: true }
    } catch (error) {
      console.error('主进程→ 删除提示词模板失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
