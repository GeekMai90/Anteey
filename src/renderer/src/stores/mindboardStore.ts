import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  MindBoard,
  TextCard,
  NoteCard,
  ImageCard,
  Group,
  MindBoardConnection
} from '../types/mindboard'

export const useMindBoardStore = defineStore('mindboard', () => {
  // ==================== 状态 ====================
  const mindBoards = ref<MindBoard[]>([])
  const currentMindBoard = ref<MindBoard | null>(null)
  const isLoading = ref(false)

  // ==================== 操作方法 ====================
  // 获取所有思维板
  const fetchAllMindBoards = async () => {
    try {
      isLoading.value = true
      const boards = await window.electronAPI.getAllMindBoards()
      mindBoards.value = boards
      return boards
    } catch (error) {
      console.error('获取所有思维板失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 获取单个思维板
  const fetchMindBoard = async (id: string) => {
    try {
      isLoading.value = true
      const board = await window.electronAPI.getMindBoard(id)
      if (board) {
        currentMindBoard.value = board
      }
      return board
    } catch (error) {
      console.error('获取思维板失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 创建思维板
  const createMindBoard = async (data: Partial<MindBoard>) => {
    try {
      const newBoard = await window.electronAPI.createMindBoard(data)
      await fetchAllMindBoards() // 刷新列表
      return newBoard
    } catch (error) {
      console.error('创建思维板失败:', error)
      throw error
    }
  }

  // 更新思维板
  const updateMindBoard = async (id: string, updateData: Partial<MindBoard>) => {
    try {
      const updatedBoard = await window.electronAPI.updateMindBoard(id, updateData)
      if (currentMindBoard.value?.id === id) {
        currentMindBoard.value = updatedBoard
      }
      await fetchAllMindBoards() // 刷新列表
      return updatedBoard
    } catch (error) {
      console.error('更新思维板失败:', error)
      throw error
    }
  }

  // 删除思维板
  const deleteMindBoard = async (id: string) => {
    try {
      await window.electronAPI.deleteMindBoard(id)
      if (currentMindBoard.value?.id === id) {
        currentMindBoard.value = null
      }
      await fetchAllMindBoards() // 刷新列表
    } catch (error) {
      console.error('删除思维板失败:', error)
      throw error
    }
  }

  // 元素操作
  const createElement = async (
    boardId: string,
    element: TextCard | NoteCard | ImageCard | Group
  ) => {
    try {
      const newElement = await window.electronAPI.createMindBoardElement(boardId, element)
      await fetchMindBoard(boardId) // 刷新当前思维板
      return newElement
    } catch (error) {
      console.error('创建元素失败:', error)
      throw error
    }
  }

  const updateElement = async (
    id: string,
    updateData: Partial<TextCard | NoteCard | ImageCard | Group>
  ) => {
    try {
      const updatedElement = await window.electronAPI.updateMindBoardElement(id, updateData)
      if (currentMindBoard.value) {
        await fetchMindBoard(currentMindBoard.value.id) // 刷新当前思维板
      }
      return updatedElement
    } catch (error) {
      console.error('更新元素失败:', error)
      throw error
    }
  }

  const deleteElement = async (id: string) => {
    try {
      await window.electronAPI.deleteMindBoardElement(id)
      if (currentMindBoard.value) {
        await fetchMindBoard(currentMindBoard.value.id) // 刷新当前思维板
      }
    } catch (error) {
      console.error('删除元素失败:', error)
      throw error
    }
  }

  // 连接操作
  const createConnection = async (boardId: string, connection: Omit<MindBoardConnection, 'id'>) => {
    try {
      const newConnection = await window.electronAPI.createMindBoardConnection(boardId, connection)
      await fetchMindBoard(boardId) // 刷新当前思维板
      return newConnection
    } catch (error) {
      console.error('创建连接失败:', error)
      throw error
    }
  }

  const updateConnection = async (id: string, updateData: Partial<MindBoardConnection>) => {
    try {
      const updatedConnection = await window.electronAPI.updateMindBoardConnection(id, updateData)
      if (currentMindBoard.value) {
        await fetchMindBoard(currentMindBoard.value.id) // 刷新当前思维板
      }
      return updatedConnection
    } catch (error) {
      console.error('更新连接失败:', error)
      throw error
    }
  }

  const deleteConnection = async (id: string) => {
    try {
      await window.electronAPI.deleteMindBoardConnection(id)
      if (currentMindBoard.value) {
        await fetchMindBoard(currentMindBoard.value.id) // 刷新当前思维板
      }
    } catch (error) {
      console.error('删除连接失败:', error)
      throw error
    }
  }

  return {
    // 状态
    mindBoards,
    currentMindBoard,
    isLoading,

    // 思维板操作
    fetchAllMindBoards,
    fetchMindBoard,
    createMindBoard,
    updateMindBoard,
    deleteMindBoard,

    // 元素操作
    createElement,
    updateElement,
    deleteElement,

    // 连接操作
    createConnection,
    updateConnection,
    deleteConnection
  }
})
