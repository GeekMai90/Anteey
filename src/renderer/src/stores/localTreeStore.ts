import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { LocalTreeData, LocalTreeWithReferencesData } from '@shared/types'

export const useLocalTreeStore = defineStore('localTree', () => {
  const treeData = ref<LocalTreeData | null>(null)
  const treeDataWithRefs = ref<LocalTreeWithReferencesData | null>(null)

  const isValidAddress = (address: string): boolean => {
    const valid = /^\d{4}(-([1-9]\d{0,2}[a-z]?|[1-9]?\d{0,2}[a-z]))*$/.test(address)
    // console.log(`验证地址 ${address}: ${valid}`)
    return valid
  }

  const fetchLocalTree = async (noteId: string) => {
    try {
      // console.group('开始获取树形数据')
      // console.log('请求笔记ID:', noteId)

      // 获取数据
      const data = await window.electronAPI.knowledgeTree.getLocalTree(noteId)
      // console.log('后端返回的原始数据:', data)

      if (data) {
        if (!data.current?.id || !data.current?.address) {
          console.error('当前节点数据无效:', data.current)
          return
        }

        // 初始化 siblings 结构
        data.siblings = data.siblings || { all: [], adjacent: [] }
        data.children = data.children || []

        // 直接使用后端返回的父节点数据，不进行覆盖
        // console.log('后端返回的父节点数据:', data.parent)

        // 修改 siblings 的过滤逻辑
        data.siblings.all = data.siblings.all.filter((note) => note?.id && note?.address)
        data.siblings.adjacent = data.siblings.adjacent.filter((note) => note?.id && note?.address)

        // 处理子节点
        // console.log('开始处理子节点')
        const validChildren = data.children.filter((note) => {
          if (!note?.id || !note?.address) return false
          const isValid = isValidAddress(note.address)
          // console.log(`检查子节点 ${note.address}: 地址有效=${isValid}`)
          return isValid
        })

        data.children = validChildren
        // console.log('处理后的子节点:', validChildren)

        // console.log('最终处理后的数据:', data)
        treeData.value = data
      } else {
        console.error('获取到的树形数据无效:', data)
        treeData.value = null
      }

      // console.groupEnd()
    } catch (error) {
      console.error('获取树形数据失败:', error)
      treeData.value = null
      // console.groupEnd()
    }
  }

  const fetchLocalTreeWithRefs = async (noteId: string) => {
    try {
      // console.group('开始获取树形数据与引用')
      // console.log('请求笔记ID:', noteId)

      // 获取数据
      const data = await window.electronAPI.knowledgeTree.getLocalTreeWithReferences(noteId)
      // console.log('后端返回的原始数据:', data)

      if (data) {
        if (!data.current?.id || !data.current?.address) {
          console.error('当前节点数据无效:', data.current)
          return
        }

        // 初始化结构
        data.siblings = data.siblings || { all: [], adjacent: [] }
        data.children = data.children || []
        data.references = data.references || { incoming: [], outgoing: [] }

        // 直接使用后端返回的父节点数据，不进行覆盖
        // console.log('后端返回的父节点数据:', data.parent)

        // 修改 siblings 的过滤逻辑
        data.siblings.all = data.siblings.all.filter((note) => note?.id && note?.address)
        data.siblings.adjacent = data.siblings.adjacent.filter((note) => note?.id && note?.address)

        // 处理子节点
        // console.log('开始处理子节点')
        const validChildren = data.children.filter((note) => {
          if (!note?.id || !note?.address) return false
          const isValid = isValidAddress(note.address)
          // console.log(`检查子节点 ${note.address}: 地址有效=${isValid}`)
          return isValid
        })

        data.children = validChildren
        // console.log('处理后的子节点:', validChildren)

        // console.log('最终处理后的数据:', data)
        treeDataWithRefs.value = data
      } else {
        console.error('获取到的数据无效:', data)
        treeDataWithRefs.value = null
      }

      // console.groupEnd()
    } catch (error) {
      console.error('获取树形数据与引用失败:', error)
      treeDataWithRefs.value = null
      // console.groupEnd()
    }
  }

  return {
    treeData,
    fetchLocalTree,
    isValidAddress,
    treeDataWithRefs,
    fetchLocalTreeWithRefs
  }
})
