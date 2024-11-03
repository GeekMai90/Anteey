import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Canvas, CanvasAsset, CreateCanvasInput, UpdateCanvasInput } from '../types/Note'

export const useCanvasStore = defineStore('canvas', () => {
  // ==================== 状态定义 ====================
  const canvases = ref<Canvas[]>([])
  const currentCanvas = ref<Canvas | null>(null)
  const isLoading = ref(false)
  const starredCanvases = ref<Canvas[]>([])
  const recentCanvases = ref<Canvas[]>([])
  const maxRecentCanvases = ref(6)

  // ==================== Getters ====================
  const sortedStarredCanvases = computed(() => {
    return [...starredCanvases.value].sort((a, b) => {
      if (a.starredOrder === undefined || b.starredOrder === undefined) return 0
      return a.starredOrder - b.starredOrder
    })
  })

  // ==================== 方法 ====================

  // 基础 CRUD 操作
  const createCanvas = async (input: CreateCanvasInput): Promise<Canvas> => {
    try {
      isLoading.value = true
      const canvas = await window.electronAPI.createCanvas(input)
      canvases.value.unshift(canvas)
      return canvas
    } catch (error) {
      console.error('创建画布失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const fetchCanvas = async (id: string): Promise<Canvas> => {
    try {
      isLoading.value = true
      const canvas = await window.electronAPI.getCanvas(id)
      currentCanvas.value = canvas
      return canvas
    } catch (error) {
      console.error('获取画布失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const fetchAllCanvases = async () => {
    try {
      isLoading.value = true
      const allCanvases = await window.electronAPI.getAllCanvases()
      canvases.value = allCanvases
      starredCanvases.value = allCanvases.filter((canvas) => canvas.isStarred)
    } catch (error) {
      console.error('获取所有画布失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const updateCanvas = async (id: string, data: UpdateCanvasInput): Promise<Canvas> => {
    try {
      const canvas = await window.electronAPI.updateCanvas(id, data)
      const index = canvases.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        canvases.value[index] = canvas
      }
      if (currentCanvas.value?.id === id) {
        currentCanvas.value = canvas
      }
      return canvas
    } catch (error) {
      console.error('更新画布失败:', error)
      throw error
    }
  }

  const deleteCanvas = async (id: string): Promise<boolean> => {
    try {
      const success = await window.electronAPI.deleteCanvas(id)
      if (success) {
        canvases.value = canvases.value.filter((c) => c.id !== id)
        if (currentCanvas.value?.id === id) {
          currentCanvas.value = null
        }
      }
      return success
    } catch (error) {
      console.error('删除画布失败:', error)
      throw error
    }
  }

  // 资产管理
  const addAssetToCanvas = async (canvasId: string, asset: CanvasAsset): Promise<Canvas> => {
    try {
      const canvas = await window.electronAPI.addAssetToCanvas(canvasId, asset)
      const index = canvases.value.findIndex((c) => c.id === canvasId)
      if (index !== -1) {
        canvases.value[index] = canvas
      }
      if (currentCanvas.value?.id === canvasId) {
        currentCanvas.value = canvas
      }
      return canvas
    } catch (error) {
      console.error('添加资产失败:', error)
      throw error
    }
  }

  const removeAssetFromCanvas = async (canvasId: string, assetId: string): Promise<Canvas> => {
    try {
      const canvas = await window.electronAPI.removeAssetFromCanvas(canvasId, assetId)
      const index = canvases.value.findIndex((c) => c.id === canvasId)
      if (index !== -1) {
        canvases.value[index] = canvas
      }
      if (currentCanvas.value?.id === canvasId) {
        currentCanvas.value = canvas
      }
      return canvas
    } catch (error) {
      console.error('移除资产失败:', error)
      throw error
    }
  }

  // 收藏管理
  const toggleCanvasStarred = async (id: string, starredOrder?: number): Promise<Canvas> => {
    try {
      const canvas = canvases.value.find((c) => c.id === id)
      if (!canvas) throw new Error('Canvas not found')

      const updatedCanvas = await window.electronAPI.updateCanvasStarred(
        id,
        !canvas.isStarred,
        starredOrder
      )

      // 更新状态
      const index = canvases.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        canvases.value[index] = updatedCanvas
      }
      if (currentCanvas.value?.id === id) {
        currentCanvas.value = updatedCanvas
      }

      // 更新收藏列表
      if (updatedCanvas.isStarred) {
        starredCanvases.value.push(updatedCanvas)
      } else {
        starredCanvases.value = starredCanvases.value.filter((c) => c.id !== id)
      }

      return updatedCanvas
    } catch (error) {
      console.error('更新画布收藏状态失败:', error)
      throw error
    }
  }

  // 最近访问管理
  const addToRecentCanvases = (canvas: Canvas) => {
    // 移除已存在的相同画布
    recentCanvases.value = recentCanvases.value.filter((c) => c.id !== canvas.id)

    // 添加到开头
    recentCanvases.value.unshift(canvas)

    // 限制数量
    if (recentCanvases.value.length > maxRecentCanvases.value) {
      recentCanvases.value = recentCanvases.value.slice(0, maxRecentCanvases.value)
    }
  }

  // 初始化
  const initializeStore = async () => {
    await fetchAllCanvases()
  }

  return {
    // 状态
    canvases,
    currentCanvas,
    isLoading,
    starredCanvases,
    recentCanvases,
    maxRecentCanvases,

    // Getters
    sortedStarredCanvases,

    // 方法
    createCanvas,
    fetchCanvas,
    fetchAllCanvases,
    updateCanvas,
    deleteCanvas,
    addAssetToCanvas,
    removeAssetFromCanvas,
    toggleCanvasStarred,
    addToRecentCanvases,
    initializeStore
  }
})
