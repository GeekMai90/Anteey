import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Mindboard, MindboardNode, MindboardEdge } from '@shared/types'

export const useMindboardStore = defineStore('mindboard', () => {
  // ==================== 状态 ====================
  const mindboards = ref<Mindboard[]>([])
  const currentMindboard = ref<Mindboard | null>(null)
  const nodes = ref<MindboardNode[]>([])
  const edges = ref<MindboardEdge[]>([])
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

  // ==================== 节点操作 ====================
  // 获取节点列表
  const fetchNodes = async (mindboardId: string) => {
    try {
      const fetchedNodes = await window.electronAPI.mindboard.getNodes(mindboardId)
      nodes.value = fetchedNodes
      return fetchedNodes
    } catch (error) {
      console.error('获取节点失败:', error)
      throw error
    }
  }

  // 创建节点
  const createNode = async (data: Omit<MindboardNode, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newNode = await window.electronAPI.mindboard.createNode(data)
      nodes.value.push(newNode)
      return newNode
    } catch (error) {
      console.error('创建节点失败:', error)
      throw error
    }
  }

  // 更新节点
  const updateNode = async (id: string, data: Partial<MindboardNode>) => {
    try {
      const updatedNode = await window.electronAPI.mindboard.updateNode(id, data)
      const index = nodes.value.findIndex((n) => n.id === id)
      if (index !== -1) {
        nodes.value[index] = updatedNode
      }
      return updatedNode
    } catch (error) {
      console.error('更新节点失败:', error)
      throw error
    }
  }

  // 删除节点
  const deleteNode = async (id: string) => {
    try {
      await window.electronAPI.mindboard.deleteNode(id)
      nodes.value = nodes.value.filter((n) => n.id !== id)
    } catch (error) {
      console.error('删除节点失败:', error)
      throw error
    }
  }

  // ==================== 连线操作 ====================
  // 获取连线列表
  const fetchEdges = async (mindboardId: string) => {
    try {
      const fetchedEdges = await window.electronAPI.mindboard.getEdges(mindboardId)
      edges.value = fetchedEdges
      return fetchedEdges
    } catch (error) {
      console.error('获取连线失败:', error)
      throw error
    }
  }

  // 创建连线
  const createEdge = async (data: Omit<MindboardEdge, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newEdge = await window.electronAPI.mindboard.createEdge(data)
      edges.value.push(newEdge)
      return newEdge
    } catch (error) {
      console.error('创建连线失败:', error)
      throw error
    }
  }

  // 更新连线
  const updateEdge = async (id: string, data: Partial<MindboardEdge>) => {
    try {
      const updatedEdge = await window.electronAPI.mindboard.updateEdge(id, data)
      const index = edges.value.findIndex((e) => e.id === id)
      if (index !== -1) {
        edges.value[index] = updatedEdge
      }
      return updatedEdge
    } catch (error) {
      console.error('更新连线失败:', error)
      throw error
    }
  }

  // 删除连线
  const deleteEdge = async (id: string) => {
    try {
      await window.electronAPI.mindboard.deleteEdge(id)
      edges.value = edges.value.filter((e) => e.id !== id)
    } catch (error) {
      console.error('删除连线失败:', error)
      throw error
    }
  }

  // ==================== 加载思维板数据 ====================
  const loadMindboardData = async (mindboardId: string) => {
    try {
      isLoading.value = true
      await Promise.all([
        fetchMindboard(mindboardId),
        fetchNodes(mindboardId),
        fetchEdges(mindboardId)
      ])
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
    nodes,
    edges,
    isLoading,

    // 思维板操作
    fetchAllMindboards,
    fetchMindboard,
    createMindboard,
    updateMindboard,
    deleteMindboard,

    // 节点操作
    fetchNodes,
    createNode,
    updateNode,
    deleteNode,

    // 连线操作
    fetchEdges,
    createEdge,
    updateEdge,
    deleteEdge,

    // 加载数据
    loadMindboardData
  }
})
