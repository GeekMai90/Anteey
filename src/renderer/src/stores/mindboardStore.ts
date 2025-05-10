import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Mindboard } from '@shared/types'

export const useMindboardStore = defineStore('mindboard', () => {
  // ==================== 状态 ====================
  const mindboards = ref<Mindboard[]>([])
  const currentMindboard = ref<Mindboard | null>(null)
  const isLoading = ref(false)
  const mindboardCount = ref(0)

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
      // 更新本地状态
      const index = mindboards.value.findIndex((board) => board.id === id)
      if (index !== -1) {
        mindboards.value[index] = {
          ...mindboards.value[index],
          name
        }
      }
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

  // 更新思维板预览图
  const updatePreviewImage = async (id: string, previewImage: string) => {
    try {
      // 调用 API 更新预览图
      await window.electronAPI.mindboard.updatePreviewImage(id, previewImage)

      // 更新本地状态
      const index = mindboards.value.findIndex((m) => m.id === id)
      if (index !== -1) {
        mindboards.value[index] = {
          ...mindboards.value[index],
          preview_image: previewImage
        }
      }

      // 如果是当前打开的思维板,也更新 currentMindboard
      if (currentMindboard.value?.id === id) {
        currentMindboard.value = {
          ...currentMindboard.value,
          preview_image: previewImage
        }
      }
    } catch (error) {
      console.error('更新思维板预览图失败:', error)
      throw error
    }
  }

  // 添加图片压缩工具方法
  const compressImage = async (canvas: HTMLCanvasElement): Promise<string> => {
    // 设置压缩参数
    const MAX_WIDTH = 300
    const MAX_HEIGHT = 200
    const QUALITY = 0.8

    // 创建临时 canvas 用于压缩
    const tempCanvas = document.createElement('canvas')
    const ctx = tempCanvas.getContext('2d')

    // 计算压缩后的尺寸
    let width = canvas.width
    let height = canvas.height

    if (width > MAX_WIDTH) {
      height = Math.round((height * MAX_WIDTH) / width)
      width = MAX_WIDTH
    }
    if (height > MAX_HEIGHT) {
      width = Math.round((width * MAX_HEIGHT) / height)
      height = MAX_HEIGHT
    }

    // 设置压缩后的尺寸
    tempCanvas.width = width
    tempCanvas.height = height

    // 绘制压缩后的图像
    ctx?.drawImage(canvas, 0, 0, width, height)

    // 转换为 base64,使用 jpeg 格式和较低质量
    return tempCanvas.toDataURL('image/jpeg', QUALITY)
  }

  // 保存思维板预览图
  const saveMindboardPreview = async (id: string, canvas: HTMLCanvasElement) => {
    try {
      // 压缩图片
      const compressedImage = await compressImage(canvas)

      // 更新预览图
      await updatePreviewImage(id, compressedImage)
    } catch (error) {
      console.error('保存思维板预览图失败:', error)
      throw error
    }
  }

  // 切换思维板收藏状态
  const toggleFavorite = async (id: string) => {
    try {
      await window.electronAPI.mindboard.toggleFavorite(id)
      // 更新本地状态
      const index = mindboards.value.findIndex((m) => m.id === id)
      if (index !== -1) {
        mindboards.value[index] = {
          ...mindboards.value[index],
          is_favorite: !mindboards.value[index].is_favorite
        }
      }
      // 如果是当前打开的思维板，也更新 currentMindboard
      if (currentMindboard.value?.id === id) {
        currentMindboard.value = {
          ...currentMindboard.value,
          is_favorite: !currentMindboard.value.is_favorite
        }
      }
    } catch (error) {
      console.error('切换思维板收藏状态失败:', error)
      throw error
    }
  }

  // 批量添加笔记到思维板
  const addNotesToMindboard = async (mindboardId: string, noteIds: string[]) => {
    try {
      // 1. 获取思维板数据
      const mindboard = await fetchMindboard(mindboardId)
      if (!mindboard) {
        throw new Error('思维板不存在')
      }

      // 2. 准备思维板的flow_data（如果是空对象则初始化）
      const flowData = mindboard.flow_data || {}
      const nodes = flowData.nodes || []
      const edges = flowData.edges || []

      // 3. 为每个笔记创建节点
      const newNodes = noteIds.map((noteId, index) => {
        // 自动计算位置偏移，避免节点重叠
        const position = {
          x: 100 + (index % 3) * 400,
          y: 100 + Math.floor(index / 3) * 350
        }

        // 生成唯一ID
        const id = `card-${crypto.randomUUID()}`

        return {
          id,
          type: 'card',
          position,
          data: {
            noteId,
            toolbarPosition: 'top',
            width: 350,
            height: 300,
            backgroundColor: 'transparent',
            borderColor: 'var(--color-border)'
          }
        }
      })

      // 4. 合并节点数据
      const updatedFlowData = {
        ...flowData,
        nodes: [...nodes, ...newNodes],
        edges
      }

      // 5. 更新思维板
      await updateMindboard(mindboardId, { flow_data: updatedFlowData })

      return true
    } catch (error) {
      console.error('批量添加笔记到思维板失败:', error)
      throw error
    }
  }

  // 获取所有收藏的思维板
  const getFavoriteMindboards = async () => {
    try {
      return await window.electronAPI.mindboard.getFavoriteMindboards()
    } catch (error) {
      console.error('获取收藏的思维板失败:', error)
      throw error
    }
  }

  // 获取思维板数量
  const getMindboardCount = async () => {
    try {
      const count = await window.electronAPI.mindboard.getMindboardCount()
      mindboardCount.value = count
      return count
    } catch (error) {
      console.error('获取思维板数量失败:', error)
      throw error
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
    loadMindboardData,

    // 添加新方法
    updatePreviewImage,
    saveMindboardPreview,
    compressImage,

    // 收藏相关
    toggleFavorite,
    getFavoriteMindboards,

    // 获取思维板数量
    getMindboardCount,
    mindboardCount,

    // 笔记添加到思维板
    addNotesToMindboard
  }
})
