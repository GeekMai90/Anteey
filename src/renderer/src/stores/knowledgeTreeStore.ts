import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  KnowledgeTreeNode,
  KnowledgeTreeViewState,
  FocusHistory
} from '../types/knowledgeTree'

export const useKnowledgeTreeStore = defineStore('knowledgeTree', () => {
  // ==================== 状态 ====================
  const nodes = ref<KnowledgeTreeNode[]>([])
  const currentNode = ref<KnowledgeTreeNode | null>(null)
  const expandedNodes = ref(new Set<string>())
  const focusedNode = ref<KnowledgeTreeNode | null>(null)
  const parentPath = ref<KnowledgeTreeNode[]>([])

  // 视图状态
  const viewState = ref<KnowledgeTreeViewState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
    isInFocusMode: false
  })

  // 聚焦历史
  const focusHistory = ref<FocusHistory>({
    nodes: [],
    currentIndex: -1
  })

  // ==================== 计算属性 ====================
  const isNodeExpanded = computed(() => (nodeId: string) => expandedNodes.value.has(nodeId))

  const isNodeFocused = computed(() => (nodeId: string) => focusedNode.value?.id === nodeId)

  // ==================== 方法 ====================
  // ���层节点
  const fetchTopLevelNodes = async () => {
    try {
      nodes.value = await window.electronAPI.getTopLevelNodes()
    } catch (error) {
      console.error('获取顶层节点失败:', error)
      throw error
    }
  }

  // 获取子节点
  const fetchChildNodes = async (parentAddress: string) => {
    try {
      const childNodes = await window.electronAPI.getChildNodes(parentAddress)
      // 找到父节点并添加子节点
      const updateNodeChildren = (node: KnowledgeTreeNode) => {
        if (node.address === parentAddress) {
          node.children = childNodes
          node.isLoading = false
          return true
        }
        return node.children?.some(updateNodeChildren) || false
      }
      nodes.value.some(updateNodeChildren)
      return childNodes
    } catch (error) {
      console.error('获取子节点失败:', error)
      throw error
    }
  }

  // 更新节点的辅助函数
  const updateNodeInTree = (
    nodes: KnowledgeTreeNode[],
    address: string,
    updater: (node: KnowledgeTreeNode) => void
  ): boolean => {
    for (const node of nodes) {
      if (node.address === address) {
        updater(node)
        return true
      }
      if (node.children?.length) {
        if (updateNodeInTree(node.children, address, updater)) {
          return true
        }
      }
    }
    return false
  }

  // 展开/折叠节点
  const toggleNode = async (node: KnowledgeTreeNode) => {
    try {
      console.log('开始切换节点状态:', node)
      console.log('当前展开的节点:', Array.from(expandedNodes.value))

      if (expandedNodes.value.has(node.id)) {
        console.log('正在折叠节点')
        // 折叠节点
        expandedNodes.value.delete(node.id)
        updateNodeInTree(nodes.value, node.address, (targetNode) => {
          targetNode.children = []
          targetNode.isExpanded = false
        })
      } else {
        console.log('正在展开节点')
        // 展开节点
        expandedNodes.value.add(node.id)
        const childNodes = await window.electronAPI.getChildNodes(node.address)
        console.log('获取到的子节点:', childNodes)

        updateNodeInTree(nodes.value, node.address, (targetNode) => {
          targetNode.children = childNodes
          targetNode.isExpanded = true
        })
        console.log('更新后的节点树:', nodes.value)
      }
    } catch (error) {
      console.error('切换节点状态失败:', error)
      throw error
    }
  }

  // 聚焦节点
  const focusNode = async (address: string) => {
    try {
      const path = await window.electronAPI.getNodePath(address)
      parentPath.value = path
      focusedNode.value = path[path.length - 1]
      viewState.value.isInFocusMode = true

      // 更新聚焦历史
      focusHistory.value.nodes = [...focusHistory.value.nodes, focusedNode.value]
      focusHistory.value.currentIndex = focusHistory.value.nodes.length - 1
    } catch (error) {
      console.error('聚焦节点失败:', error)
      throw error
    }
  }

  // 取消聚焦
  const unfocusNode = () => {
    focusedNode.value = null
    parentPath.value = []
    viewState.value.isInFocusMode = false
  }

  // 更新视图状态
  const updateViewState = (newState: Partial<KnowledgeTreeViewState>) => {
    viewState.value = { ...viewState.value, ...newState }
  }

  // 前进/后退聚焦历史
  const navigateFocusHistory = (direction: 'forward' | 'back') => {
    const { nodes: historyNodes, currentIndex } = focusHistory.value
    const newIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1

    if (newIndex >= 0 && newIndex < historyNodes.length) {
      focusHistory.value.currentIndex = newIndex
      const node = historyNodes[newIndex]
      focusedNode.value = node
      focusNode(node.address)
    }
  }

  // 重置状态
  const reset = () => {
    nodes.value = []
    currentNode.value = null
    expandedNodes.value.clear()
    focusedNode.value = null
    parentPath.value = []
    viewState.value = {
      scale: 1,
      translateX: 0,
      translateY: 0,
      isInFocusMode: false
    }
    focusHistory.value = {
      nodes: [],
      currentIndex: -1
    }
  }

  // 在 store 中添加查找节点的方法
  const findNodeByAddress = (address: string): KnowledgeTreeNode | null => {
    const findNode = (nodes: KnowledgeTreeNode[]): KnowledgeTreeNode | null => {
      for (const node of nodes) {
        if (node.address === address) return node
        if (node.children) {
          const found = findNode(node.children)
          if (found) return found
        }
      }
      return null
    }
    return findNode(nodes.value)
  }

  // 聚焦节点并加载其子节点
  const focusNodeWithChildren = async (node: KnowledgeTreeNode) => {
    try {
      console.log('开始聚焦节点:', node)

      // 获取子节点
      const childNodes = await window.electronAPI.getChildNodes(node.address)
      console.log('获取到的子节点:', childNodes)

      // 创建聚焦的树节点，确保 id 属性存在
      const focusedTree: KnowledgeTreeNode = {
        ...node,
        id: node.address, // 确保 id 存在且与 address 一致
        children: childNodes.map((child) => ({
          ...child,
          id: child.address, // 确保子节点的 id 存在且与 address 一致
          isExpanded: true,
          children: [] // 初始化空的子节点数组
        })),
        isExpanded: true
      }

      // 确保当前节点和所有子节点都被添加到展开集合中
      expandedNodes.value.add(focusedTree.address)
      childNodes.forEach((child) => {
        expandedNodes.value.add(child.address)
      })

      // 更新状态
      nodes.value = [focusedTree]
      focusedNode.value = focusedTree // 使用更新后的节点
      viewState.value.isInFocusMode = true

      // 保存到历史记录
      focusHistory.value.nodes.push(focusedTree)
      focusHistory.value.currentIndex = focusHistory.value.nodes.length - 1

      // 保存父节点路径，用于返回上层
      const path = await window.electronAPI.getNodePath(node.address)
      parentPath.value = path

      console.log('聚焦后的树结构:', focusedTree)
    } catch (error) {
      console.error('聚焦节点失败:', error)
      throw error
    }
  }

  // 返回上一层
  const backToParent = async () => {
    if (parentPath.value.length > 1) {
      // 获取父节点
      const parentNode = parentPath.value[parentPath.value.length - 2]
      // 聚焦到父节点
      await focusNodeWithChildren(parentNode)
    } else {
      // 如果已经是顶层，则返回初始视图
      await fetchTopLevelNodes()
      focusedNode.value = null
      viewState.value.isInFocusMode = false
      parentPath.value = []
    }
  }

  return {
    // 状态
    nodes,
    currentNode,
    expandedNodes,
    focusedNode,
    parentPath,
    viewState,
    focusHistory,

    // 计算属性
    isNodeExpanded,
    isNodeFocused,

    // 方法
    fetchTopLevelNodes,
    fetchChildNodes,
    toggleNode,
    focusNode,
    unfocusNode,
    updateViewState,
    navigateFocusHistory,
    reset,
    findNodeByAddress,
    focusNodeWithChildren,
    backToParent
  }
})
