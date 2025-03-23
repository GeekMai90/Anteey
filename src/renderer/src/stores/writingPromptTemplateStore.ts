import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PromptTemplate, PromptTemplateType, CreatePromptTemplateParams } from '@shared/types'
import { useEventBus } from '@vueuse/core'

export const useWritingPromptTemplateStore = defineStore('writingPromptTemplate', () => {
  // ==================== 状态 ====================
  const currentTemplate = ref<PromptTemplate | null>(null)
  const isTemplateModalOpen = ref(false)

  // ==================== 操作方法 ====================
  // 获取指定类型的模板
  const getTemplateByType = async (type: PromptTemplateType) => {
    try {
      const response = await window.electronAPI.writingPromptTemplate.getPromptTemplateByType(type)
      if (response.success) {
        currentTemplate.value = response.template || null
        return response.template
      }
      throw new Error(response.error || '获取提示词模板失败')
    } catch (error) {
      console.error('获取提示词模板失败:', error)
      throw error
    }
  }

  // 创建或更新模板
  const upsertTemplate = async (params: CreatePromptTemplateParams) => {
    try {
      const response = await window.electronAPI.writingPromptTemplate.upsertPromptTemplate(params)
      if (response.success && response.template) {
        currentTemplate.value = response.template
        // 发送模板变更事件
        const templateChangeEventBus = useEventBus('templateChange')
        templateChangeEventBus.emit()
        return response.template
      }
      throw new Error(response.error || '创建/更新提示词模板失败')
    } catch (error) {
      console.error('创建/更新提示词模板失败:', error)
      throw error
    }
  }

  // 删除模板
  const deleteTemplate = async (type: PromptTemplateType) => {
    try {
      const response = await window.electronAPI.writingPromptTemplate.deletePromptTemplate(type)
      if (response.success) {
        if (currentTemplate.value?.type === type) {
          currentTemplate.value = null
        }
        // 发送模板变更事件
        const templateChangeEventBus = useEventBus('templateChange')
        templateChangeEventBus.emit()
      } else {
        throw new Error(response.error || '删除提示词模板失败')
      }
    } catch (error) {
      console.error('删除提示词模板失败:', error)
      throw error
    }
  }

  // 模态框控制
  const openTemplateModal = () => (isTemplateModalOpen.value = true)
  const closeTemplateModal = () => (isTemplateModalOpen.value = false)

  return {
    // 状态
    currentTemplate,
    isTemplateModalOpen,

    // 方法
    getTemplateByType,
    upsertTemplate,
    deleteTemplate,
    openTemplateModal,
    closeTemplateModal
  }
})
