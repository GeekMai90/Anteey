import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Tag, TagTreeNode } from '@shared/types'
import type { TagSearchParams, IconName } from '@shared/types'

export const useTagStore = defineStore('tag', () => {
  // ==================== 状态 ====================
  const tags = ref<Tag[]>([])
  const currentTag = ref<Tag | null>(null)
  const tagSearchQuery = ref('')
  const isTagModalOpen = ref(false)
  const tagTree = ref<TagTreeNode[]>([])

  // ==================== 工具函数 ====================
  // 将扁平标签列表转换为树形结构
  const buildTagTree = (tags: Tag[]): TagTreeNode[] => {
    const tagMap = new Map<string, TagTreeNode>()
    const root: TagTreeNode[] = []

    // 创建一个路径到标签的映射，用于快速查找实际标签
    const pathToTagMap = new Map<string, Tag>()
    tags.forEach((tag) => {
      pathToTagMap.set(tag.path.join('/'), tag)
    })

    // 首先为所有可能的路径创建节点（包括父路径）
    tags.forEach((tag) => {
      const currentPath: string[] = []
      tag.path.forEach((segment) => {
        currentPath.push(segment)
        const pathKey = currentPath.join('/')

        // 如果节点不存在，创建一个新节点
        if (!tagMap.has(pathKey)) {
          // 检查当前路径是否对应一个实际标签
          const actualTag = pathToTagMap.get(pathKey)
          const node: TagTreeNode = {
            id: actualTag ? actualTag.id : `virtual_${pathKey}`, // 如果是实际标签，使用实际ID
            name: segment,
            path: [...currentPath],
            children: [],
            noteCount: actualTag ? actualTag.useCount || 0 : 0,
            totalCount: 0,
            color: actualTag?.color,
            icon: actualTag?.icon as IconName | undefined,
            pinned: actualTag?.pinned || false,
            pinOrder: actualTag?.pinOrder
          }
          tagMap.set(pathKey, node)
        }
      })
    })

    // 构建树形结构
    tagMap.forEach((node) => {
      if (node.path.length === 1) {
        root.push(node)
      } else {
        const parentPath = node.path.slice(0, -1).join('/')
        const parent = tagMap.get(parentPath)
        if (parent) {
          parent.children.push(node)
        }
      }
    })

    // 计算每个节点的总数（包含子节点）
    const calculateTotalCount = (node: TagTreeNode): number => {
      const childrenCount = node.children.reduce(
        (sum, child) => sum + calculateTotalCount(child),
        0
      )
      node.totalCount = node.noteCount + childrenCount
      return node.totalCount
    }

    root.forEach(calculateTotalCount)
    return root
  }

  // ==================== 操作方法 ====================
  // 获取标签树
  const fetchTagTree = async () => {
    try {
      const fetchedTags = await window.electronAPI.tag.getAllTags()
      tags.value = fetchedTags
      tagTree.value = buildTagTree(fetchedTags)
    } catch (error) {
      console.error('获取标签树失败:', error)
      throw error
    }
  }

  // 获取所有标签（扁平列表）
  const fetchAllTags = async () => {
    try {
      const fetchedTags = await window.electronAPI.tag.getAllTags()
      tags.value = fetchedTags
      return fetchedTags
    } catch (error) {
      console.error('获取所有标签失败:', error)
      throw error
    }
  }

  // 创建新标签
  const createTag = async (params: { name: string; color?: string; icon?: IconName }) => {
    try {
      const newTag = await window.electronAPI.tag.createTag(params)
      await fetchTagTree()
      return newTag
    } catch (error) {
      console.error('创建标签失败:', error)
      throw error
    }
  }

  // 更新标签
  const updateTag = async (id: string, updateData: Partial<Tag>) => {
    try {
      const updatedTag = await window.electronAPI.tag.updateTag(id, updateData)
      await fetchTagTree()
      return updatedTag
    } catch (error) {
      console.error('更新标签失败:', error)
      throw error
    }
  }

  // 删除标签
  const deleteTag = async (id: string) => {
    try {
      await window.electronAPI.tag.deleteTag(id)
      if (currentTag.value?.id === id) {
        currentTag.value = null
      }
      await fetchTagTree()
    } catch (error) {
      console.error('删除标签失败:', error)
      throw error
    }
  }

  // 搜索标签
  const searchTags = async (query: string) => {
    try {
      tagSearchQuery.value = query
      if (!query.trim()) {
        return tags.value
      }
      return await window.electronAPI.tag.searchTags(query)
    } catch (error) {
      console.error('搜索标签失败:', error)
      throw error
    }
  }

  // 高级搜索标签
  const searchTagsAdvanced = async (params: TagSearchParams) => {
    try {
      return await window.electronAPI.tag.searchTagsAdvanced(params)
    } catch (error) {
      console.error('高级搜索标签失败:', error)
      throw error
    }
  }

  // 更新标签置顶状态
  const toggleTagPin = async (tagId: string, pinned: boolean, pinOrder?: number) => {
    try {
      await window.electronAPI.tag.updateTagPinned(tagId, pinned, pinOrder)
      await fetchTagTree()
    } catch (error) {
      console.error('更新标签置顶状态失败:', error)
      throw error
    }
  }

  // 更新标签置顶顺序
  const updateTagPinOrder = async (tagId: string, pinOrder: number) => {
    try {
      await window.electronAPI.tag.updateTagPinOrder(tagId, pinOrder)
      await fetchTagTree()
    } catch (error) {
      console.error('更新标签置顶顺序失败:', error)
      throw error
    }
  }

  // 模态框控制
  const openTagModal = () => (isTagModalOpen.value = true)
  const closeTagModal = () => (isTagModalOpen.value = false)

  // 获取笔记的标签
  const getNoteTags = async (noteId: string) => {
    try {
      return await window.electronAPI.tag.getNoteTags(noteId)
    } catch (error) {
      console.error('获取笔记标签失败:', error)
      throw error
    }
  }

  return {
    // 状态
    tags,
    currentTag,
    tagSearchQuery,
    isTagModalOpen,
    tagTree,

    // 方法
    fetchTagTree,
    createTag,
    updateTag,
    deleteTag,
    searchTags,
    searchTagsAdvanced,
    toggleTagPin,
    updateTagPinOrder,
    openTagModal,
    closeTagModal,
    getNoteTags,
    fetchAllTags
  }
})
