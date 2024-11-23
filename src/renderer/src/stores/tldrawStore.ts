import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  TldrawBoard,
  CreateBoardDto,
  UpdateBoardDto,
  TldrawBoardFilter,
  TldrawBoardSort
} from '../types/Tldraw'

export const useTldrawStore = defineStore('tldraw', () => {
  // 状态
  const boards = ref<TldrawBoard[]>([])
  const currentBoardId = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const currentBoard = computed(() =>
    boards.value.find((board) => board.id === currentBoardId.value)
  )

  const starredBoards = computed(() =>
    boards.value
      .filter((board) => board.isStarred)
      .sort((a, b) => (a.starredOrder || 0) - (b.starredOrder || 0))
  )

  const rootBoards = computed(() =>
    boards.value
      .filter((board) => !board.parentId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  )

  // 方法
  const fetchBoards = async (filter: TldrawBoardFilter = {}, sort?: TldrawBoardSort) => {
    try {
      isLoading.value = true
      error.value = null
      boards.value = await window.electronAPI.getTldrawBoards(filter, sort)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取白板列表失败'
      console.error('获取白板列表失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const createBoard = async (data: CreateBoardDto) => {
    try {
      isLoading.value = true
      error.value = null
      const newBoard = await window.electronAPI.createTldrawBoard(data)
      boards.value.push(newBoard)
      return newBoard
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建白板失败'
      console.error('创建白板失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const updateBoard = async (id: string, data: UpdateBoardDto) => {
    try {
      isLoading.value = true
      error.value = null
      await window.electronAPI.updateTldrawBoard(id, data)
      const index = boards.value.findIndex((board) => board.id === id)
      if (index !== -1) {
        boards.value[index] = { ...boards.value[index], ...data }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新白板失败'
      console.error('更新白板失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const deleteBoard = async (id: string) => {
    try {
      isLoading.value = true
      error.value = null
      await window.electronAPI.deleteTldrawBoard(id)
      boards.value = boards.value.filter((board) => board.id !== id)
      if (currentBoardId.value === id) {
        currentBoardId.value = null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除白板失败'
      console.error('删除白板失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const toggleStarred = async (id: string) => {
    try {
      isLoading.value = true
      error.value = null
      await window.electronAPI.toggleTldrawBoardStarred(id)
      const board = boards.value.find((b) => b.id === id)
      if (board) {
        board.isStarred = !board.isStarred
        board.starredOrder = board.isStarred ? starredBoards.value.length : undefined
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '切换收藏状态失败'
      console.error('切换收藏状态失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const updateBoardsOrder = async (boardIds: string[]) => {
    try {
      isLoading.value = true
      error.value = null
      await window.electronAPI.updateTldrawBoardsOrder(boardIds)
      // 更新本地排序
      boards.value = boards.value.map((board) => ({
        ...board,
        sortOrder: boardIds.indexOf(board.id)
      }))
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新排序失败'
      console.error('更新排序失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const setCurrentBoard = (boardId: string | null) => {
    currentBoardId.value = boardId
  }

  // 获取单个白板
  const getBoard = (id: string) => {
    return boards.value.find((board) => board.id === id)
  }

  return {
    // 状态
    boards,
    currentBoardId,
    isLoading,
    error,

    // 计算属性
    currentBoard,
    starredBoards,
    rootBoards,

    // 方法
    fetchBoards,
    createBoard,
    updateBoard,
    deleteBoard,
    toggleStarred,
    updateBoardsOrder,
    setCurrentBoard,
    getBoard
  }
})
