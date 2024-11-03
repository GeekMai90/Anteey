import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Tag, TagTreeNode } from '@renderer/types/Note'

export const useTagStore = defineStore('tag', () => {
  // ==================== 标签相关状态 ====================
  const tags = ref<Tag[]>([]) // 所有标签
  const currentTag = ref<Tag | null>(null) // 当前选中的标签
  const tagSearchQuery = ref('') // 标签搜索关键词
  const isTagModalOpen = ref(false) // 标签管理模态框状态
  const tagTree = ref<TagTreeNode[]>([])
  const allTags = ref<Tag[]>([])

  // 将扁平标签列表转换为树形结构
  const buildTagTree = (tags: Tag[]): TagTreeNode[] => {
    const tagMap = new Map<string, TagTreeNode>()
    const root: TagTreeNode[] = []

    // 首先创建所有节点
    tags.forEach((tag) => {
      const node: TagTreeNode = {
        id: tag.id,
        name: tag.path[tag.path.length - 1], // 取路径最后一段作为显示名称
        path: tag.path,
        children: [],
        noteCount: tag.metadata.count,
        totalCount: tag.metadata.totalCount || tag.metadata.count, // 使用 totalCount，如果没有则使用 count
        color: tag.color,
        icon: tag.icon
      }
      tagMap.set(tag.path.join('/'), node)
    })

    // 构建树形结构
    tags.forEach((tag) => {
      const node = tagMap.get(tag.path.join('/'))!
      if (tag.path.length === 1) {
        // 顶层标签
        root.push(node)
      } else {
        // 子标签，找到父节点并添加
        const parentPath = tag.path.slice(0, -1).join('/')
        const parent = tagMap.get(parentPath)
        if (parent) {
          parent.children.push(node)
        }
      }
    })

    return root
  }

  // 获取标签树
  const fetchTagTree = async () => {
    try {
      const tags = await window.electronAPI.getAllTagsWithCount()
      allTags.value = tags
      console.log('tagStore.ts→ 获取所有标签(带计数)成功:', tags)
      tagTree.value = buildTagTree(tags)
    } catch (error) {
      console.error('Failed to fetch tag tree:', error)
    }
  }

  // // 获取标签树
  // const fetchTagTree = async () => {
  //   try {
  //     // TODO: 从后端 API 获取标签数据
  //     // 临时测试数据
  //     tagTree.value = [
  //       {
  //         id: '1',
  //         name: '工作',
  //         path: ['工作'],
  //         noteCount: 5,
  //         children: [
  //           {
  //             id: '2',
  //             name: '项目',
  //             path: ['工作', '项目'],
  //             noteCount: 3,
  //             children: []
  //           }
  //         ]
  //       },
  //       {
  //         id: '3',
  //         name: '生活',
  //         path: ['生活'],
  //         noteCount: 2,
  //         children: []
  //       }
  //     ]
  //   } catch (error) {
  //     console.error('Failed to fetch tag tree:', error)
  //   }
  // }

  // 获取所有标签
  const fetchAllTags = async () => {
    try {
      const allTags = await window.electronAPI.getAllTags()
      tags.value = allTags
      console.log('noteStores.ts→ 获取所有标签成功:', allTags)
      return allTags
    } catch (error) {
      console.error('noteStores.ts→ 获取所有标签失败:', error)
      throw error
    }
  }

  // 创建新标签
  const createTag = async (params: { name: string; color?: string; icon?: string }) => {
    try {
      const newTag = await window.electronAPI.createTag(params)
      tags.value.push(newTag)
      await fetchTagTree()
      return newTag
    } catch (error) {
      console.error('noteStores.ts→ 创建标签失败:', error)
      throw error
    }
  }

  // 更新标签
  const updateTag = async (id: string, updateData: Partial<Tag>) => {
    try {
      const updatedTag = await window.electronAPI.updateTag(id, updateData)
      const index = tags.value.findIndex((tag) => tag.id === id)
      if (index !== -1) {
        tags.value[index] = updatedTag
      }
      await fetchTagTree()
      return updatedTag
    } catch (error) {
      console.error('noteStores.ts→ 更新标签失败:', error)
      throw error
    }
  }

  // 删除标签
  const deleteTag = async (id: string) => {
    try {
      await window.electronAPI.deleteTag(id)
      tags.value = tags.value.filter((tag) => tag.id !== id)
      if (currentTag.value?.id === id) {
        currentTag.value = null
      }
      await fetchTagTree()
    } catch (error) {
      console.error('noteStores.ts→ 删除标签失败:', error)
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
      const searchResult = await window.electronAPI.searchTags(query)
      console.log(searchResult)
      return searchResult
    } catch (error) {
      console.error('noteStores.ts→ 搜索标签失败:', error)
      throw error
    }
  }

  // 打开标签管理模态框
  const openTagModal = () => {
    isTagModalOpen.value = true
  }

  // 关闭标签管理模态框
  const closeTagModal = () => {
    isTagModalOpen.value = false
  }

  return {
    tagTree,
    fetchTagTree,
    allTags,
    fetchAllTags,
    createTag,
    updateTag,
    deleteTag,
    searchTags,
    openTagModal,
    closeTagModal,
    tags,
    currentTag,
    tagSearchQuery,
    isTagModalOpen
  }
})
