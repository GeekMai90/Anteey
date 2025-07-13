import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { KnowledgeTreeNode, KnowledgeTreeViewState, FocusHistory } from '@shared/types'

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
  // 获取顶层节点
  const fetchTopLevelNodes = async () => {
    try {
      nodes.value = await window.electronAPI.knowledgeTree.getTopLevelNodes()
    } catch (error) {
      console.error('获取顶层节点失败:', error)
      throw error
    }
  }

  // 获取子节点
  const fetchChildNodes = async (parentAddress: string) => {
    try {
      const childNodes = await window.electronAPI.knowledgeTree.getChildNodes(parentAddress)
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
      if (expandedNodes.value.has(node.id)) {
        // 折叠节点
        expandedNodes.value.delete(node.id)
        updateNodeInTree(nodes.value, node.address, (targetNode) => {
          targetNode.children = []
          targetNode.isExpanded = false
        })
      } else {
        // 展开节点
        expandedNodes.value.add(node.id)
        const childNodes = await window.electronAPI.knowledgeTree.getChildNodes(node.address)

        updateNodeInTree(nodes.value, node.address, (targetNode) => {
          targetNode.children = childNodes
          targetNode.isExpanded = true
        })
      }
    } catch (error) {
      console.error('切换节点状态失败:', error)
      throw error
    }
  }

  // 聚焦节点
  const focusNode = async (address: string) => {
    try {
      const path = await window.electronAPI.knowledgeTree.getNodePath(address)
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
      // 获取子节点
      const childNodes = await window.electronAPI.knowledgeTree.getChildNodes(node.address)

      // 创建聚焦的树节点，确保 id 属性存在
      const focusedTree: KnowledgeTreeNode = {
        ...node,
        id: node.address, // 确保 id 存在且与 address 一致
        children: childNodes.map((child) => ({
          ...child,
          id: child.address, // 确保子节点的 id 存在且与 address 一致
          isExpanded: false, // 确保子节点初始状态是未展开的
          children: [] // 初始化空的子节点数组
        })),
        isExpanded: true
      }

      // 确保当前节点和所有子节点都被添加到展开集合中
      expandedNodes.value.add(focusedTree.address)

      // 更新状态
      nodes.value = [focusedTree]
      focusedNode.value = focusedTree
      viewState.value.isInFocusMode = true

      // 保存到历史记录
      focusHistory.value.nodes.push(focusedTree)
      focusHistory.value.currentIndex = focusHistory.value.nodes.length - 1

      // 获取并更新父节点路径
      const path = await window.electronAPI.knowledgeTree.getNodePath(node.address)
      if (path && path.length > 0) {
        // 确保路径中的每个节点都有正确的 id
        parentPath.value = path.map((pathNode) => ({
          ...pathNode,
          id: pathNode.address
        }))
      }
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

  // 重置视图状态
  const resetViewState = async () => {
    viewState.value = {
      scale: 1,
      translateX: 0,
      translateY: 0,
      isInFocusMode: false
    }
    focusedNode.value = null
    parentPath.value = []
    await fetchTopLevelNodes()
  }

  // 创建相邻笔记
  const createAdjacentNote = async (noteId: string, direction: 'below' | 'child') => {
    try {
      // 创建新笔记前，先保存当前树的完整状态
      const currentTreeState = JSON.parse(JSON.stringify(nodes.value))
      const currentExpandedNodesArray = Array.from(expandedNodes.value)

      // 获取所选笔记
      const selectedNote = await window.electronAPI.note.getNote(noteId)
      if (!selectedNote) {
        throw new Error('无法获取所选笔记')
      }

      // 创建新笔记
      const newNote = await window.electronAPI.knowledgeTree.createAdjacentNote(noteId, direction)

      // 根据笔记ID找到对应的节点
      const findNodeById = (
        nodes: KnowledgeTreeNode[],
        id: string
      ): { node: KnowledgeTreeNode | null; parent: KnowledgeTreeNode | null; index: number } => {
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i]
          if (node.noteId === id) {
            return { node, parent: null, index: i }
          }

          if (node.children && node.children.length > 0) {
            const result = findNodeById(node.children, id)
            if (result.node) {
              return { ...result, parent: result.parent || node }
            }
          }
        }
        return { node: null, parent: null, index: -1 }
      }

      // 找到操作的节点和其父节点
      const { node: selectedNode, parent: parentNode } = findNodeById(nodes.value, noteId)

      if (!selectedNode) {
        // 如果找不到节点，恢复原来的树状态
        console.log('找不到所选节点，恢复原状态')
        nodes.value = currentTreeState
        expandedNodes.value = new Set(currentExpandedNodesArray)
        return newNote
      }

      // 更新必要的部分
      if (direction === 'child') {
        // 添加子节点：只需要更新所选节点的子节点列表

        // 标记当前节点为展开状态
        selectedNode.isExpanded = true
        expandedNodes.value.add(selectedNode.address)

        // 获取更新后的子节点列表
        const updatedChildren = await window.electronAPI.knowledgeTree.getChildNodes(
          selectedNode.address
        )

        // 更新子节点，但保留已有子节点的展开状态
        if (selectedNode.children && selectedNode.children.length > 0) {
          // 记录当前所有子节点的展开状态
          const childrenExpandState = new Map<string, boolean>()
          selectedNode.children.forEach((child) => {
            childrenExpandState.set(child.address, !!child.isExpanded)
          })

          // 更新子节点列表，保留展开状态
          selectedNode.children = updatedChildren.map((child) => ({
            ...child,
            id: child.address,
            isExpanded: childrenExpandState.get(child.address) || false,
            children: child.children || []
          }))
        } else {
          // 如果原来没有子节点，直接设置
          selectedNode.children = updatedChildren.map((child) => ({
            ...child,
            id: child.address,
            isExpanded: false,
            children: []
          }))
        }
      } else {
        // 添加同级节点：需要更新父节点的子节点列表

        if (parentNode) {
          // 标记父节点为展开状态
          parentNode.isExpanded = true
          expandedNodes.value.add(parentNode.address)

          // 获取更新后的子节点列表
          const updatedSiblings = await window.electronAPI.knowledgeTree.getChildNodes(
            parentNode.address
          )

          // 记录当前所有子节点的展开状态
          const childrenExpandState = new Map<string, boolean>()
          if (parentNode.children) {
            parentNode.children.forEach((child) => {
              childrenExpandState.set(child.address, !!child.isExpanded)
            })
          }

          // 更新子节点列表，保留展开状态
          parentNode.children = updatedSiblings.map((child) => ({
            ...child,
            id: child.address,
            isExpanded: childrenExpandState.get(child.address) || false,
            children: child.isExpanded ? child.children || [] : []
          }))

          // 如果某个子节点是展开状态，确保其子节点数据正确
          if (parentNode.children) {
            for (const child of parentNode.children) {
              if (child.isExpanded) {
                const childNodeChildren = await window.electronAPI.knowledgeTree.getChildNodes(
                  child.address
                )
                child.children = childNodeChildren.map((grandChild) => ({
                  ...grandChild,
                  id: grandChild.address,
                  isExpanded: false,
                  children: []
                }))
              }
            }
          }
        } else if (selectedNode.address.endsWith('000')) {
          // 如果是顶层节点，则刷新顶层节点列表，但保持展开状态
          const topLevelNodes = await window.electronAPI.knowledgeTree.getTopLevelNodes()

          // 记录当前所有节点的展开状态和子节点
          const expandState = new Map<string, boolean>()
          const childrenMap = new Map<string, KnowledgeTreeNode[]>()

          nodes.value.forEach((node) => {
            expandState.set(node.address, !!node.isExpanded)
            if (node.children) {
              childrenMap.set(node.address, [...node.children])
            }
          })

          // 更新节点，保留展开状态和子节点
          nodes.value = topLevelNodes.map((node) => ({
            ...node,
            id: node.address,
            isExpanded: expandState.get(node.address) || false,
            children: expandState.get(node.address) ? childrenMap.get(node.address) || [] : []
          }))
        } else {
          // 其他情况，可能是编码规则中的特殊情况
          nodes.value = currentTreeState
          expandedNodes.value = new Set(currentExpandedNodesArray)
        }
      }

      return newNote
    } catch (error) {
      console.error('创建相邻笔记失败:', error)
      throw error
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
    backToParent,
    resetViewState,
    createAdjacentNote
  }
})
