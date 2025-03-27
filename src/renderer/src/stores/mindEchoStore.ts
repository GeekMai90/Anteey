import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MindEcho, MindEchoWithRelations, UpdateMindEchoParams } from '@shared/types/mind-echo'
import { useEventBus } from '@vueuse/core'

export const useMindEchoStore = defineStore('mindEcho', () => {
  // ==================== 状态 ====================
  const mindEchoes = ref<MindEcho[]>([])
  const currentMindEcho = ref<MindEchoWithRelations | null>(null)
  const isLoading = ref(false)
  const includeArchived = ref(false)

  // ==================== 操作方法 ====================
  // 从单条AI回复创建思维共鸣
  const createFromContent = async (params: {
    noteId: string
    conversationId: string
    messageId: string
    modelConfigId?: string
  }) => {
    try {
      isLoading.value = true
      const echo = await window.electronAPI.mindEcho.createMindEchoFromContent(params)
      // 触发思维共鸣创建事件
      const mindEchoEventBus = useEventBus('mindEchoCreated')
      mindEchoEventBus.emit(echo)
      // 刷新列表
      await fetchNoteMindEchoes(params.noteId)
      return echo
    } catch (error) {
      console.error('创建思维共鸣失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 从多轮对话创建思维共鸣
  const createFromConversation = async (params: {
    noteId: string
    conversationId: string
    messageIds: string[]
    modelConfigId?: string
  }) => {
    try {
      isLoading.value = true
      const echo = await window.electronAPI.mindEcho.createMindEchoFromConversation(params)
      // 触发思维共鸣创建事件
      const mindEchoEventBus = useEventBus('mindEchoCreated')
      mindEchoEventBus.emit(echo)
      // 刷新列表
      await fetchNoteMindEchoes(params.noteId)
      return echo
    } catch (error) {
      console.error('从对话创建思维共鸣失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 获取笔记的所有思维共鸣
  const fetchNoteMindEchoes = async (noteId: string) => {
    try {
      isLoading.value = true
      const echoes = await window.electronAPI.mindEcho.getNoteMindEchoes(
        noteId,
        includeArchived.value
      )
      mindEchoes.value = echoes
      return echoes
    } catch (error) {
      console.error('获取笔记思维共鸣失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 获取思维共鸣详情
  const fetchMindEchoDetail = async (id: string) => {
    try {
      isLoading.value = true
      const echo = await window.electronAPI.mindEcho.getMindEchoDetail(id)
      if (echo) {
        currentMindEcho.value = echo
      }
      return echo
    } catch (error) {
      console.error('获取思维共鸣详情失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 更新思维共鸣
  const updateMindEcho = async (updateData: UpdateMindEchoParams) => {
    try {
      isLoading.value = true

      // 直接传递更新数据，不需要再做 JSON 转换
      const updated = await window.electronAPI.mindEcho.updateMindEcho(updateData)

      // 更新列表中的数据
      const index = mindEchoes.value.findIndex((echo) => echo.id === updateData.id)
      if (index !== -1) {
        mindEchoes.value[index] = updated
      }

      // 如果是当前查看的思维共鸣，也更新详情
      if (currentMindEcho.value?.id === updateData.id) {
        await fetchMindEchoDetail(updateData.id)
      }

      return updated
    } catch (error) {
      console.error('更新思维共鸣失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 删除思维共鸣
  const deleteMindEcho = async (id: string) => {
    try {
      isLoading.value = true
      await window.electronAPI.mindEcho.deleteMindEcho(id)
      // 从列表中移除
      mindEchoes.value = mindEchoes.value.filter((echo) => echo.id !== id)
      // 如果是当前查看的思维共鸣，清空当前详情
      if (currentMindEcho.value?.id === id) {
        currentMindEcho.value = null
      }
    } catch (error) {
      console.error('删除思维共鸣失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 更新思维共鸣排序
  const updateOrder = async (id: string, newOrder: number) => {
    try {
      isLoading.value = true
      const updated = await window.electronAPI.mindEcho.updateMindEchoOrder(id, newOrder)
      // 更新列表
      const noteId = updated.noteId
      await fetchNoteMindEchoes(noteId)
      return updated
    } catch (error) {
      console.error('更新思维共鸣排序失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 切换归档状态
  const toggleArchived = async (id: string, isArchived: boolean) => {
    try {
      isLoading.value = true
      const updated = await window.electronAPI.mindEcho.toggleMindEchoArchived(id, isArchived)
      // 如果不显示归档内容，从列表中移除
      if (!includeArchived.value && isArchived) {
        mindEchoes.value = mindEchoes.value.filter((echo) => echo.id !== id)
      } else {
        // 更新列表中的数据
        const index = mindEchoes.value.findIndex((echo) => echo.id === id)
        if (index !== -1) {
          mindEchoes.value[index] = updated
        }
      }
      return updated
    } catch (error) {
      console.error('更新思维共鸣归档状态失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 批量更新思维共鸣
  const batchUpdate = async (ids: string[], updates: Partial<MindEcho>) => {
    try {
      isLoading.value = true
      const updated = await window.electronAPI.mindEcho.batchUpdateMindEchoes(ids, updates)
      // 如果有笔记ID，刷新列表
      if (updated.length > 0) {
        await fetchNoteMindEchoes(updated[0].noteId)
      }
      return updated
    } catch (error) {
      console.error('批量更新思维共鸣失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 切换是否显示归档内容
  const toggleIncludeArchived = async (noteId: string) => {
    includeArchived.value = !includeArchived.value
    await fetchNoteMindEchoes(noteId)
  }

  return {
    // 状态
    mindEchoes,
    currentMindEcho,
    isLoading,
    includeArchived,

    // 方法
    createFromContent,
    createFromConversation,
    fetchNoteMindEchoes,
    fetchMindEchoDetail,
    updateMindEcho,
    deleteMindEcho,
    updateOrder,
    toggleArchived,
    batchUpdate,
    toggleIncludeArchived
  }
})
