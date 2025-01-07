import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Draft, AppendDraftInput } from '@shared/types'
import { message } from '../utils/message'

export const useDraftsStore = defineStore('drafts', () => {
  // 状态
  const currentDraft = ref<Draft | null>(null)
  const isLoading = ref(false)

  // 获取草稿纸内容
  const fetchDraft = async () => {
    isLoading.value = true
    try {
      const draft = await window.electronAPI.drafts.getDraft()
      if (draft) {
        currentDraft.value = draft
      }
      return draft
    } catch (error) {
      console.error('draftsStore.ts→ 获取草稿纸内容失败:', error)
      message.error('获取草稿纸内容失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 创建草稿纸
  const createDraft = async () => {
    try {
      const draft = await window.electronAPI.drafts.createDraft()
      currentDraft.value = draft
      return draft
    } catch (error) {
      console.error('draftsStore.ts→ 创建草稿纸失败:', error)
      message.error('创建草稿纸失败')
      throw error
    }
  }

  // 更新草稿纸内容
  const updateDraft = async (content: object) => {
    if (!currentDraft.value) {
      console.error('draftsStore.ts→ 没有当前草稿纸')
      return
    }

    try {
      const draft = await window.electronAPI.drafts.updateDraft({
        id: currentDraft.value.id,
        content
      })
      currentDraft.value = draft
      return draft
    } catch (error) {
      console.error('draftsStore.ts→ 更新草稿纸内容失败:', error)
      message.error('更新草稿纸内容失败')
      throw error
    }
  }

  // 追加内容到草稿纸
  const appendDraft = async (input: AppendDraftInput | string) => {
    if (!currentDraft.value) {
      console.error('draftsStore.ts→ 没有当前草稿纸')
      return
    }

    try {
      // 处理不同类型的输入
      const appendInput: AppendDraftInput = typeof input === 'string' ? { content: input } : input

      const draft = await window.electronAPI.drafts.appendDraft(appendInput)
      currentDraft.value = draft
      return draft
    } catch (error) {
      console.error('draftsStore.ts→ 追加内容到草稿纸失败:', error)
      message.error('追加内容到草稿纸失败')
      throw error
    }
  }

  // 计算属性
  const isDraftEmpty = computed(() => {
    if (!currentDraft.value?.content) return true
    const content = currentDraft.value.content as any
    return !content.content || content.content.length === 0
  })

  return {
    // 状态
    currentDraft,
    isLoading,

    // 计算属性
    isDraftEmpty,

    // 方法
    fetchDraft,
    createDraft,
    updateDraft,
    appendDraft
  }
})
