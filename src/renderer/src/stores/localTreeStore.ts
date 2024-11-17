import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Note } from '../types/Note'

interface LocalTreeData {
  current: Note
  parent: Note | null
  siblings: Note[]
  children: Note[]
}

export const useLocalTreeStore = defineStore('localTree', () => {
  // 状态
  const treeData = ref<LocalTreeData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 获取本地树数据
  const fetchLocalTree = async (noteId: string) => {
    try {
      loading.value = true
      error.value = null
      const data = await window.electronAPI.getLocalTree(noteId)
      treeData.value = data
    } catch (err) {
      console.error('获取本地树失败:', err)
      error.value = String(err)
    } finally {
      loading.value = false
    }
  }

  // 重置状态
  const reset = () => {
    treeData.value = null
    loading.value = false
    error.value = null
  }

  return {
    treeData,
    loading,
    error,
    fetchLocalTree,
    reset
  }
})
