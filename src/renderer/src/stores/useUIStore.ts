import { defineStore } from 'pinia'
import { ref } from 'vue'

// 用于管理 UI 状态的 Setup store
export const useUIStore = defineStore('ui', () => {
  //state
  const isEditorOpen = ref(false)
  const isSearchModalOpen = ref(false)
  const isSidebarCollapsed = ref(false)
  const isRightSidebarOpen = ref(false)
  const isSettingDropdownOpen = ref(false)
  const showCardBox = ref(false)

  //actions
  function toggleCardBox() {
    showCardBox.value = !showCardBox.value
  }

  function setShowCardBox(show: boolean) {
    showCardBox.value = show
  }

  function toggleSidebar() {
    isSidebarCollapsed.value = !isSidebarCollapsed.value
  }

  function setIsSidebarCollapsed(value: boolean) {
    isSidebarCollapsed.value = value
  }

  function openSearchModal() {
    isSearchModalOpen.value = true
  }

  function closeSearchModal() {
    isSearchModalOpen.value = false
  }

  function toggleSettingDropdown() {
    isSettingDropdownOpen.value = !isSettingDropdownOpen.value
  }

  function closeSettingDropdown() {
    isSettingDropdownOpen.value = false
  }

  function openRightSidebar() {
    isRightSidebarOpen.value = true
  }

  function closeRightSidebar() {
    isRightSidebarOpen.value = false
  }

  return {
    isEditorOpen,
    isSearchModalOpen,
    isSidebarCollapsed,
    isRightSidebarOpen,
    isSettingDropdownOpen,
    showCardBox,
    toggleCardBox,
    setShowCardBox,
    toggleSidebar,
    setIsSidebarCollapsed,
    openSearchModal,
    closeSearchModal,
    toggleSettingDropdown,
    closeSettingDropdown,
    openRightSidebar,
    closeRightSidebar
  }
})
