import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SerializableCommand, CommandGroup } from '@shared/types'

export const useCommandStore = defineStore('command', () => {
  // 状态
  const isCommandPaletteOpen = ref(false)
  const searchQuery = ref('')
  const searchResults = ref<SerializableCommand[]>([])
  const isLoading = ref(false)
  const selectedCommandIndex = ref(0)

  // 计算属性
  const hasResults = computed(() => searchResults.value.length > 0)

  // 方法
  // 打开命令面板
  const openCommandPalette = () => {
    isCommandPaletteOpen.value = true
    searchQuery.value = ''
    selectedCommandIndex.value = 0
    // 加载所有命令
    searchCommands('')
  }

  // 关闭命令面板
  const closeCommandPalette = () => {
    isCommandPaletteOpen.value = false
    searchQuery.value = ''
    searchResults.value = []
  }

  // 搜索命令
  const searchCommands = async (query: string) => {
    try {
      isLoading.value = true
      searchQuery.value = query

      const result = await window.electronAPI.command.searchCommands(query)
      searchResults.value = result.commands

      // 重置选择的索引
      if (searchResults.value.length > 0) {
        selectedCommandIndex.value = 0
      }
    } catch (error) {
      console.error('搜索命令失败:', error)
      searchResults.value = []
    } finally {
      isLoading.value = false
    }
  }

  // 执行命令
  const executeCommand = async (commandId: string) => {
    try {
      const result = await window.electronAPI.command.executeCommand(commandId)
      if (!result.success) {
        console.error('执行命令失败:', result.error)
      }
      // 执行后关闭命令面板
      closeCommandPalette()
      return result.success
    } catch (error) {
      console.error('执行命令失败:', error)
      return false
    }
  }

  // 执行当前选中的命令
  const executeSelectedCommand = async () => {
    if (searchResults.value.length > 0 && selectedCommandIndex.value >= 0) {
      const selectedCommand = searchResults.value[selectedCommandIndex.value]
      return await executeCommand(selectedCommand.id)
    }
    return false
  }

  // 选择下一个命令
  const selectNextCommand = () => {
    if (searchResults.value.length > 0) {
      selectedCommandIndex.value = (selectedCommandIndex.value + 1) % searchResults.value.length
    }
  }

  // 选择上一个命令
  const selectPreviousCommand = () => {
    if (searchResults.value.length > 0) {
      selectedCommandIndex.value =
        (selectedCommandIndex.value - 1 + searchResults.value.length) % searchResults.value.length
    }
  }

  // 按类别获取命令
  const getCommandsByCategory = async (): Promise<CommandGroup[]> => {
    try {
      return await window.electronAPI.command.getCommandsByCategory()
    } catch (error) {
      console.error('获取命令分类失败:', error)
      return []
    }
  }

  // 注册默认命令
  const registerDefaultCommands = async () => {
    // 这里不需要实现，因为命令是在主进程中注册的
    // 这个方法只是为了在渲染进程中提供一个接口
  }

  // 注册主题相关命令
  const registerThemeCommands = () => {
    // 这里不需要实现，因为命令是在主进程中注册的
  }

  // 初始化命令存储
  const initializeStore = async () => {
    // 这里可以做一些初始化工作，比如预加载命令等
  }

  return {
    // 状态
    isCommandPaletteOpen,
    searchQuery,
    searchResults,
    isLoading,
    selectedCommandIndex,

    // 计算属性
    hasResults,

    // 方法
    openCommandPalette,
    closeCommandPalette,
    searchCommands,
    executeCommand,
    executeSelectedCommand,
    selectNextCommand,
    selectPreviousCommand,
    getCommandsByCategory,
    registerDefaultCommands,
    registerThemeCommands,
    initializeStore
  }
})
