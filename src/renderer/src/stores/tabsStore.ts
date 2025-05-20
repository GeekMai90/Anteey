import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  TabItem,
  TabItemType,
  AddTabRequest,
  UpdateTabRequest,
  ReorderTabsRequest
} from '@shared/types/tabs'

export const useTabsStore = defineStore(
  'tabs',
  () => {
    // 状态
    const allTabs = ref<TabItem[]>([])
    const activeTabId = ref<string | null>(null)
    const isLoading = ref(false)
    const totalCount = ref(0)

    // 计算属性
    const pinnedTabs = computed(() => allTabs.value.filter((tab) => tab.isPinned))
    const unpinnedTabs = computed(() => allTabs.value.filter((tab) => !tab.isPinned))
    const activeTab = computed(() => allTabs.value.find((tab) => tab.id === activeTabId.value))
    const hasActiveTabs = computed(() => !!activeTabId.value)

    // 方法
    const loadTabs = async () => {
      try {
        isLoading.value = true
        const result = await window.electronAPI.tabs.getTabs()
        allTabs.value = result.tabs
        totalCount.value = result.totalCount

        // 如果有标签页但没有活动标签页，则设置第一个为活动标签页
        if (allTabs.value.length > 0 && !activeTabId.value) {
          activeTabId.value = allTabs.value[0].id
          // 更新标签页的访问时间
          await updateTabAccessTime(activeTabId.value)
        }
      } catch (error) {
        console.error('加载标签页失败:', error)
      } finally {
        isLoading.value = false
      }
    }

    const getTabById = async (id: string) => {
      try {
        const tab = await window.electronAPI.tabs.getTab(id)
        return tab
      } catch (error) {
        console.error(`获取标签页 ${id} 失败:`, error)
        return null
      }
    }

    const addTab = async (params: AddTabRequest) => {
      try {
        const newTab = await window.electronAPI.tabs.addTab(params)

        // 调试日志
        console.log('创建新标签页:', params)
        console.log('创建的标签页数据:', newTab)
        console.log('标签页地址:', newTab.address)

        // 检查是否已存在相同内容的标签页
        const existingIndex = allTabs.value.findIndex(
          (tab) => tab.contentId === newTab.contentId && tab.type === newTab.type
        )

        if (existingIndex >= 0) {
          // 更新现有标签页的访问时间
          allTabs.value[existingIndex] = newTab
          activeTabId.value = newTab.id
        } else {
          // 添加新标签页
          allTabs.value.push(newTab)
          activeTabId.value = newTab.id
        }

        return newTab
      } catch (error) {
        console.error('添加标签页失败:', error)
        throw error
      }
    }

    const updateTab = async (params: UpdateTabRequest) => {
      try {
        const updatedTab = await window.electronAPI.tabs.updateTab(params)
        const index = allTabs.value.findIndex((tab) => tab.id === updatedTab.id)

        if (index >= 0) {
          allTabs.value[index] = updatedTab
        }

        return updatedTab
      } catch (error) {
        console.error(`更新标签页 ${params.id} 失败:`, error)
        throw error
      }
    }

    const deleteTab = async (id: string) => {
      try {
        await window.electronAPI.tabs.deleteTab(id)
        const index = allTabs.value.findIndex((tab) => tab.id === id)

        if (index >= 0) {
          allTabs.value.splice(index, 1)
        }

        // 如果删除的是活动标签页，则设置新的活动标签页
        if (activeTabId.value === id) {
          if (allTabs.value.length > 0) {
            // 优先选择右侧的标签页，如果没有则选择左侧的
            const newActiveIndex = Math.min(index, allTabs.value.length - 1)
            activeTabId.value = allTabs.value[newActiveIndex]?.id || null

            if (activeTabId.value) {
              // 更新新活动标签页的访问时间
              await updateTabAccessTime(activeTabId.value)
            }
          } else {
            activeTabId.value = null
          }
        }

        return true
      } catch (error) {
        console.error(`删除标签页 ${id} 失败:`, error)
        throw error
      }
    }

    const reorderTabs = async (params: ReorderTabsRequest) => {
      try {
        const updatedTabs = await window.electronAPI.tabs.reorderTabs(params)

        // 更新标签页顺序
        for (const updatedTab of updatedTabs) {
          const index = allTabs.value.findIndex((tab) => tab.id === updatedTab.id)
          if (index >= 0) {
            allTabs.value[index] = updatedTab
          }
        }

        return updatedTabs
      } catch (error) {
        console.error('更新标签页顺序失败:', error)
        throw error
      }
    }

    const updateTabAccessTime = async (id: string) => {
      try {
        const updatedTab = await window.electronAPI.tabs.updateTabAccessTime(id)
        const index = allTabs.value.findIndex((tab) => tab.id === id)

        if (index >= 0) {
          allTabs.value[index] = updatedTab
        }

        return updatedTab
      } catch (error) {
        console.error(`更新标签页 ${id} 访问时间失败:`, error)
        throw error
      }
    }

    const pinTab = async (id: string, isPinned: boolean) => {
      try {
        const updatedTab = await window.electronAPI.tabs.pinTab(id, isPinned)
        const index = allTabs.value.findIndex((tab) => tab.id === id)

        if (index >= 0) {
          allTabs.value[index] = updatedTab
        }

        return updatedTab
      } catch (error) {
        console.error(`设置标签页 ${id} 固定状态失败:`, error)
        throw error
      }
    }

    const getTabByContent = async (contentId: string, type: TabItemType) => {
      try {
        return await window.electronAPI.tabs.getTabByContent(contentId, type)
      } catch (error) {
        console.error(`获取内容 ${contentId} 的标签页失败:`, error)
        return null
      }
    }

    const setActiveTab = async (id: string) => {
      const tab = allTabs.value.find((tab) => tab.id === id)

      if (tab) {
        activeTabId.value = id
        // 更新标签页的访问时间
        await updateTabAccessTime(id)
      }
    }

    const closeTab = (id: string) => {
      return deleteTab(id)
    }

    const openContent = async (contentId: string, type: TabItemType, title: string) => {
      // 检查是否已存在相同内容的标签页
      const existingTab = await getTabByContent(contentId, type)

      if (existingTab) {
        // 如果存在，设置为活动标签页并更新访问时间
        activeTabId.value = existingTab.id
        await updateTabAccessTime(existingTab.id)
        return existingTab
      } else {
        // 如果不存在，创建新标签页
        const tabData: AddTabRequest = {
          contentId,
          type,
          title
        }

        // 如果是Note类型，获取笔记地址
        if (type === 'Note') {
          try {
            // 尝试获取笔记数据
            const note = await window.electronAPI.note.getNote(contentId)
            if (note && note.address) {
              tabData.address = note.address
            }
          } catch (error) {
            console.error('获取笔记地址失败:', error)
          }
        }

        const newTab = await addTab(tabData)
        return newTab
      }
    }

    // 初始化
    const initialize = async (forceReload = false) => {
      // 如果已经有标签且不是强制重新加载，无需重新加载，避免顺序重置
      if (allTabs.value.length > 0 && !forceReload) {
        return
      }
      await loadTabs()
    }

    return {
      // 状态
      allTabs,
      activeTabId,
      isLoading,
      totalCount,

      // 计算属性
      pinnedTabs,
      unpinnedTabs,
      activeTab,
      hasActiveTabs,

      // 方法
      loadTabs,
      getTabById,
      addTab,
      updateTab,
      deleteTab,
      reorderTabs,
      updateTabAccessTime,
      pinTab,
      getTabByContent,
      setActiveTab,
      closeTab,
      openContent,
      initialize
    }
  },
  {
    // 持久化配置
    persist: true
  }
)
