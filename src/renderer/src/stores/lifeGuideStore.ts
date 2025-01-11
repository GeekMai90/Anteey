import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Note } from '@shared/types'

export const useLifeGuideStore = defineStore('lifeGuide', () => {
  // ==================== 状态 ====================
  const currentNote = ref<Note | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ==================== 操作方法 ====================
  // 获取随机人生指南笔记
  const fetchRandomNote = async () => {
    try {
      isLoading.value = true
      error.value = null
      const note = await window.electronAPI.lifeGuide.getRandomLifeGuideNote()
      currentNote.value = note
      return note
    } catch (err) {
      console.error('获取随机人生指南笔记失败:', err)
      error.value = err instanceof Error ? err.message : '获取笔记失败'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 刷新当前笔记
  const refreshNote = async () => {
    return await fetchRandomNote()
  }

  return {
    // 状态
    currentNote,
    isLoading,
    error,

    // 方法
    fetchRandomNote,
    refreshNote
  }
})
