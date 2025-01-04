import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { LocalTreeData, LocalTreeWithReferencesData } from '@shared/types'

export const useLocalTreeStore = defineStore('localTree', () => {
  const treeData = ref<LocalTreeData | null>(null)
  const treeDataWithRefs = ref<LocalTreeWithReferencesData | null>(null)

  const isValidAddress = (address: string): boolean => {
    const valid = /^\d+(-[1-9]\d*[a-z]?)*$/.test(address)
    // console.log(`验证地址 ${address}: ${valid}`)
    return valid
  }

  const getParentAddress = (address: string): string | null => {
    if (!isValidAddress(address)) {
      // console.log(`地址无效: ${address}`)
      return null
    }
    const parts = address.split('-')
    if (parts.length <= 1) {
      // console.log(`地址没有父级: ${address}`)
      return null
    }
    const parentAddr = parts.slice(0, -1).join('-')
    // console.log(`${address} 的父地址是: ${parentAddr}`)
    return parentAddr
  }

  const fetchLocalTree = async (noteId: string) => {
    try {
      // console.group('开始获取树形数据')
      const data = await window.electronAPI.knowledgeTree.getLocalTree(noteId)

      if (data) {
        if (!data.current?.id || !data.current?.address) {
          // console.error('当前节点数据无效:', data.current)
          return
        }

        data.siblings = data.siblings || []
        data.children = data.children || []

        // console.log('原始数据:', {
        //   current: data.current,
        //   parent: data.parent,
        //   siblings: data.siblings,
        //   children: data.children
        // })

        const currentAddress = data.current.address
        // console.log('当前节点地址:', currentAddress)

        const parentAddress = getParentAddress(currentAddress)
        // console.log('计算得到的父节点地址:', parentAddress)

        if (parentAddress) {
          if (data.parent?.id && data.parent?.address === parentAddress) {
            // console.log('使用后端返回的父节点:', data.parent)
          } else {
            try {
              const result = await window.electronAPI.note.getNoteByAddress(parentAddress)
              if (result?.id) {
                // console.log('从后端获取到的父节点:', result)
                data.parent = result
              } else {
                // console.log('未找到父节点:', parentAddress)
                data.parent = null
              }
            } catch (error) {
              console.error('获取父节点失败:', error)
              data.parent = null
            }
          }
        } else {
          data.parent = null
        }

        data.siblings = data.siblings.filter((note) => note?.id && note?.address)
        // console.log('处理后的兄弟节点:', data.siblings)

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

      console.groupEnd()
    } catch (error) {
      console.error('获取树形数据失败:', error)
      treeData.value = null
      console.groupEnd()
    }
  }

  const fetchLocalTreeWithRefs = async (noteId: string) => {
    try {
      // console.group('开始获取树形数据与引用')
      const data = await window.electronAPI.knowledgeTree.getLocalTreeWithReferences(noteId)

      if (data) {
        if (!data.current?.id || !data.current?.address) {
          console.error('当前节点数据无效:', data.current)
          return
        }

        data.siblings = data.siblings || []
        data.children = data.children || []
        data.references = data.references || { incoming: [], outgoing: [] }

        // console.log('获取到的完整数据:', data)
        treeDataWithRefs.value = data
      } else {
        console.error('获取到的数据无效:', data)
        treeDataWithRefs.value = null
      }

      console.groupEnd()
    } catch (error) {
      console.error('获取树形数据与引用失败:', error)
      treeDataWithRefs.value = null
      console.groupEnd()
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
