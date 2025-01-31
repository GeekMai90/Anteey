import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Mindboard } from '@shared/types'

export const useMindboardStore = defineStore('mindboard', () => {
  // ==================== 状态 ====================
  const mindboards = ref<Mindboard[]>([])
  const currentMindboard = ref<Mindboard | null>(null)
  const isLoading = ref(false)

  // ==================== 思维板操作 ====================
  // 获取所有思维板
  const fetchAllMindboards = async () => {
    try {
      isLoading.value = true
      const fetchedMindboards = await window.electronAPI.mindboard.getAllMindboards()
      mindboards.value = fetchedMindboards
      return fetchedMindboards
    } catch (error) {
      console.error('获取所有思维板失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 获取单个思维板
  const fetchMindboard = async (id: string) => {
    try {
      isLoading.value = true
      const mindboard = await window.electronAPI.mindboard.getMindboard(id)
      currentMindboard.value = mindboard
      return mindboard
    } catch (error) {
      console.error('获取思维板失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 创建思维板
  const createMindboard = async (data: Omit<Mindboard, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newMindboard = await window.electronAPI.mindboard.createMindboard(data)
      mindboards.value.push(newMindboard)
      return newMindboard
    } catch (error) {
      console.error('创建思维板失败:', error)
      throw error
    }
  }

  // 更新思维板
  const updateMindboard = async (id: string, data: Partial<Mindboard>) => {
    try {
      const updatedMindboard = await window.electronAPI.mindboard.updateMindboard(id, data)
      const index = mindboards.value.findIndex((m) => m.id === id)
      if (index !== -1) {
        mindboards.value[index] = updatedMindboard
      }
      if (currentMindboard.value?.id === id) {
        currentMindboard.value = updatedMindboard
      }
      return updatedMindboard
    } catch (error) {
      console.error('更新思维板失败:', error)
      throw error
    }
  }

  // 删除思维板
  const deleteMindboard = async (id: string) => {
    try {
      await window.electronAPI.mindboard.deleteMindboard(id)
      mindboards.value = mindboards.value.filter((m) => m.id !== id)
      if (currentMindboard.value?.id === id) {
        currentMindboard.value = null
      }
    } catch (error) {
      console.error('删除思维板失败:', error)
      throw error
    }
  }

  // 更新思维板名称
  const updateMindboardName = async (id: string, name: string) => {
    try {
      await window.electronAPI.mindboard.updateMindboardName(id, name)
    } catch (error) {
      console.error('更新思维板名称失败:', error)
      throw error
    }
  }

  // ==================== 加载思维板数据 ====================
  const loadMindboardData = async (mindboardId: string) => {
    try {
      isLoading.value = true
      await fetchMindboard(mindboardId)
    } catch (error) {
      console.error('加载思维板数据失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  return {
    // 状态
    mindboards,
    currentMindboard,
    isLoading,

    // 思维板操作
    fetchAllMindboards,
    fetchMindboard,
    createMindboard,
    updateMindboard,
    deleteMindboard,
    updateMindboardName,

    // 加载数据
    loadMindboardData
  }
})
