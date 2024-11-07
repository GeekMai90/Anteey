import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import type {
  CustomFilter,
  CreateCustomFilterInput,
  UpdateCustomFilterInput,
  FilterRule
} from '../types/Filter'

export const useFilterStore = defineStore('filter', () => {
  const customFilters = ref<CustomFilter[]>([])
  const activeFilter = ref<CustomFilter | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const dialogState = reactive({
    visible: false,
    editingFilter: null as CustomFilter | null
  })

  // 添加控制方法
  const openFilterDialog = (filter: CustomFilter | null = null) => {
    dialogState.editingFilter = filter
    dialogState.visible = true
  }

  const closeFilterDialog = () => {
    dialogState.editingFilter = null
    dialogState.visible = false
  }

  // 获取所有自定义筛选规则
  const fetchCustomFilters = async () => {
    isLoading.value = true
    error.value = null
    try {
      const filters = await window.electronAPI.getAllCustomFilters()
      customFilters.value = filters.sort((a, b) => {
        // 先按置顶状态排序
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        // 置顶的按 pinnedOrder 排序
        if (a.isPinned && b.isPinned) {
          return (a.pinnedOrder || 0) - (b.pinnedOrder || 0)
        }
        // 非置顶的按创建时间排序
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
    } catch (err) {
      console.error('获取自定义筛选规则失败:', err)
      error.value = '获取筛选规则失败'
    } finally {
      isLoading.value = false
    }
  }

  // 创建新的筛选规则
  // 创建新的筛选规则
  const createFilter = async (input: CreateCustomFilterInput) => {
    isLoading.value = true
    error.value = null
    try {
      const sanitizedInput = {
        name: input.name,
        matchType: input.matchType,
        rules: input.rules.map((rule) => ({
          field: rule.field,
          operator: rule.operator,
          value:
            rule.field === 'tag'
              ? Array.isArray(rule.value)
                ? rule.value[0] // 如果是数组，取第一个值
                : String(rule.value) // 如果不是数组，转换为字符串
              : String(rule.value) // 其他类型都转换为字符串
        }))
      }

      console.log('创建筛选规则，处理后的输入:', sanitizedInput)
      const result = await window.electronAPI.createCustomFilter(sanitizedInput)

      const filterToAdd: CustomFilter = {
        ...result,
        rules: result.rules.map((rule) => ({
          ...rule,
          value:
            rule.field === 'tag'
              ? [rule.value] // 在前端显示时转换为数组
              : rule.value,
          createdAt: new Date(rule.createdAt),
          updatedAt: new Date(rule.updatedAt)
        })) as FilterRule[],
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt)
      }

      customFilters.value.push(filterToAdd)
      return filterToAdd
    } catch (err) {
      console.error('创建筛选规则失败:', err)
      error.value = '创建筛选规则失败'
      throw err
    } finally {
      isLoading.value = false
    }
  }
  const updateFilter = async (id: string, updateData: UpdateCustomFilterInput) => {
    isLoading.value = true
    error.value = null
    try {
      console.log('更新筛选规则，原始输入:', {
        name: updateData.name,
        matchType: updateData.matchType,
        rules: updateData.rules?.map((rule) => ({
          field: rule.field,
          operator: rule.operator,
          value: rule.value,
          valueType: typeof rule.value,
          isArray: Array.isArray(rule.value),
          rawValue: JSON.stringify(rule.value)
        }))
      })

      const sanitizedInput = {
        name: updateData.name,
        matchType: updateData.matchType,
        rules: updateData.rules?.map((rule) => ({
          field: rule.field,
          operator: rule.operator,
          value:
            rule.field === 'tag'
              ? Array.isArray(rule.value)
                ? rule.value[0] // 如果是数组，取第一个值
                : String(rule.value) // 如果不是数组，转换为字符串
              : String(rule.value) // 其他类型都转换为字符串
        }))
      }

      console.log('更新筛选规则，处理后的输入:', sanitizedInput)

      const updatedFilter = await window.electronAPI.updateCustomFilter(id, {
        id,
        ...sanitizedInput
      })

      const filterToUpdate: CustomFilter = {
        ...updatedFilter,
        rules: updatedFilter.rules.map((rule) => ({
          ...rule,
          value:
            rule.field === 'tag'
              ? [rule.value] // 在前端显示时转换为数组
              : rule.value,
          createdAt: new Date(rule.createdAt),
          updatedAt: new Date(rule.updatedAt)
        })) as FilterRule[],
        createdAt: new Date(updatedFilter.createdAt),
        updatedAt: new Date(updatedFilter.updatedAt)
      }

      const index = customFilters.value.findIndex((f) => f.id === id)
      if (index !== -1) {
        customFilters.value[index] = filterToUpdate
      }
      if (activeFilter.value?.id === id) {
        activeFilter.value = filterToUpdate
      }

      return filterToUpdate
    } catch (err) {
      console.error('更新筛选规则失败:', err)
      error.value = '更新筛选规则失败'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 删除筛选规则
  const deleteFilter = async (id: string) => {
    isLoading.value = true
    error.value = null
    try {
      await window.electronAPI.deleteCustomFilter(id)
      customFilters.value = customFilters.value.filter((f) => f.id !== id)
      if (activeFilter.value?.id === id) {
        activeFilter.value = null
      }
    } catch (err) {
      console.error('删除筛选规则失败:', err)
      error.value = '删除筛选规则失败'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 切换规则置顶状态
  const toggleFilterPin = async (id: string) => {
    const filter = customFilters.value.find((f) => f.id === id)
    if (!filter) return

    const isPinned = !filter.isPinned
    const pinnedFilters = customFilters.value.filter((f) => f.isPinned && f.id !== id)
    const pinnedOrder = isPinned
      ? pinnedFilters.length > 0
        ? Math.max(...pinnedFilters.map((f) => f.pinnedOrder || 0)) + 1
        : 0
      : undefined

    try {
      const updatedFilter = await window.electronAPI.updateFilterPinned(id, isPinned, pinnedOrder)
      const index = customFilters.value.findIndex((f) => f.id === id)
      if (index !== -1) {
        customFilters.value[index] = updatedFilter
      }
    } catch (err) {
      console.error('更新筛选规则置顶状态失败:', err)
      error.value = '更新置顶状态失败'
      throw err
    }
  }

  // 设置当前活动的筛选规则
  const setActiveFilter = (filter: CustomFilter | null) => {
    activeFilter.value = filter
  }

  // 切换筛选规则的收藏状态
  const toggleFilterStar = async (id: string) => {
    try {
      const updatedFilter = await window.electronAPI.toggleFilterStar(id)
      const index = customFilters.value.findIndex((f) => f.id === id)
      if (index !== -1) {
        customFilters.value[index] = updatedFilter
      }
    } catch (err) {
      console.error('切换筛选规则收藏状态失败:', err)
      error.value = '切换收藏状态失败'
      throw err
    }
  }

  return {
    customFilters,
    activeFilter,
    isLoading,
    error,
    fetchCustomFilters,
    createFilter,
    updateFilter,
    deleteFilter,
    toggleFilterPin,
    setActiveFilter,
    openFilterDialog,
    closeFilterDialog,
    dialogState,
    toggleFilterStar
  }
})
