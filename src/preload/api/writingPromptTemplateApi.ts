import { ipcRenderer } from 'electron'
import type { CreatePromptTemplateParams, PromptTemplateType } from '@shared/types'

export function setupWritingPromptTemplateApi() {
  return {
    // 获取指定类型的模板
    getPromptTemplateByType: (type: PromptTemplateType) => {
      return ipcRenderer.invoke('get-writing-prompt-template', type)
    },

    // 创建或更新模板
    upsertPromptTemplate: (params: CreatePromptTemplateParams) => {
      return ipcRenderer.invoke('upsert-writing-prompt-template', params)
    },

    // 删除模板
    deletePromptTemplate: (type: PromptTemplateType) => {
      return ipcRenderer.invoke('delete-writing-prompt-template', type)
    }
  }
}
