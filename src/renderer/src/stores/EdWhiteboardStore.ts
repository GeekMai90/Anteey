import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  EdWhiteboard,
  EdWhiteboardNoteRef,
  CreateEdWhiteboardParams,
  UpdateEdWhiteboardParams,
  EdWhiteboardQueryParams
} from '@shared/types/edWhiteboard'

export const useEdWhiteboardStore = defineStore('edWhiteboard', () => {
  // ==================== 状态 ====================
  const whiteboards = ref<EdWhiteboard[]>([])
  const currentWhiteboard = ref<EdWhiteboard | null>(null)
  const currentNoteRefs = ref<EdWhiteboardNoteRef[]>([])
  const isLoading = ref(false)
  const totalCount = ref(0)

  // ==================== 操作方法 ====================
  // 获取白板列表
  const fetchWhiteboards = async (params: EdWhiteboardQueryParams) => {
    try {
      isLoading.value = true
      const result = await window.electronAPI.edWhiteboard.getEdWhiteboards(params)
      whiteboards.value = result.items
      totalCount.value = result.total
      return result
    } catch (error) {
      console.error('获取白板列表失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 获取单个白板
  const fetchWhiteboardById = async (id: string) => {
    try {
      const whiteboard = await window.electronAPI.edWhiteboard.getEdWhiteboardById(id)
      if (whiteboard) {
        currentWhiteboard.value = whiteboard
        // 同时获取笔记引用
        await fetchNoteRefs(id)
      }
      return whiteboard
    } catch (error) {
      console.error('获取白板失败:', error)
      throw error
    }
  }

  // 创建白板
  const createWhiteboard = async (params: CreateEdWhiteboardParams) => {
    try {
      const newWhiteboard = await window.electronAPI.edWhiteboard.createEdWhiteboard(params)
      whiteboards.value.unshift(newWhiteboard)
      totalCount.value++
      return newWhiteboard
    } catch (error) {
      console.error('创建白板失败:', error)
      throw error
    }
  }

  // 更新白板
  const updateWhiteboard = async (params: UpdateEdWhiteboardParams) => {
    try {
      const updatedWhiteboard = await window.electronAPI.edWhiteboard.updateEdWhiteboard(params)
      const index = whiteboards.value.findIndex((w) => w.id === params.id)
      if (index !== -1) {
        whiteboards.value[index] = updatedWhiteboard
      }
      if (currentWhiteboard.value?.id === params.id) {
        currentWhiteboard.value = updatedWhiteboard
      }
      return updatedWhiteboard
    } catch (error) {
      console.error('更新白板失败:', error)
      throw error
    }
  }

  // 删除白板
  const deleteWhiteboard = async (id: string) => {
    try {
      await window.electronAPI.edWhiteboard.deleteEdWhiteboard(id)
      whiteboards.value = whiteboards.value.filter((w) => w.id !== id)
      totalCount.value--
      if (currentWhiteboard.value?.id === id) {
        currentWhiteboard.value = null
      }
    } catch (error) {
      console.error('删除白板失败:', error)
      throw error
    }
  }

  // 获取白板的笔记引用
  const fetchNoteRefs = async (whiteboardId: string) => {
    try {
      const refs = await window.electronAPI.edWhiteboard.getEdWhiteboardNoteRefs(whiteboardId)
      currentNoteRefs.value = refs
      return refs
    } catch (error) {
      console.error('获取白板笔记引用失败:', error)
      throw error
    }
  }

  // 创建笔记引用
  const createNoteRef = async (params: {
    note_id: string
    whiteboard_id: string
    position: { x: number; y: number }
  }) => {
    try {
      const newRef = await window.electronAPI.edWhiteboard.createEdWhiteboardNoteRef(params)
      currentNoteRefs.value.push(newRef)
      return newRef
    } catch (error) {
      console.error('创建笔记引用失败:', error)
      throw error
    }
  }

  // 更新笔记引用位置
  const updateNoteRefPosition = async (params: {
    id: string
    position: { x: number; y: number }
  }) => {
    try {
      const updatedRef =
        await window.electronAPI.edWhiteboard.updateEdWhiteboardNoteRefPosition(params)
      const index = currentNoteRefs.value.findIndex((ref) => ref.id === params.id)
      if (index !== -1) {
        currentNoteRefs.value[index] = updatedRef
      }
      return updatedRef
    } catch (error) {
      console.error('更新笔记引用位置失败:', error)
      throw error
    }
  }

  // 删除笔记引用
  const deleteNoteRef = async (id: string) => {
    try {
      await window.electronAPI.edWhiteboard.deleteEdWhiteboardNoteRef(id)
      currentNoteRefs.value = currentNoteRefs.value.filter((ref) => ref.id !== id)
    } catch (error) {
      console.error('删除笔记引用失败:', error)
      throw error
    }
  }

  // 清理状态
  const clearState = () => {
    whiteboards.value = []
    currentWhiteboard.value = null
    currentNoteRefs.value = []
    totalCount.value = 0
  }

  return {
    // 状态
    whiteboards,
    currentWhiteboard,
    currentNoteRefs,
    isLoading,
    totalCount,

    // 方法
    fetchWhiteboards,
    fetchWhiteboardById,
    createWhiteboard,
    updateWhiteboard,
    deleteWhiteboard,
    fetchNoteRefs,
    createNoteRef,
    updateNoteRefPosition,
    deleteNoteRef,
    clearState
  }
})
