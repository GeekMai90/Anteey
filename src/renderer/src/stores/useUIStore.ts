import { defineStore } from 'pinia'
import { ref } from 'vue'

// 用于管理 UI 状态的 Setup store
export const useUIStore = defineStore(
  'ui',
  () => {
    //state
    const isEditorOpen = ref(false)
    const isSearchModalOpen = ref(false)
    const isWhiteboardSearchModalOpen = ref(false)
    // const isSidebarCollapsed = ref(false)
    const isSidebarCollapsed = ref(
      JSON.parse(localStorage.getItem('ui-store') || '{}')?.isSidebarCollapsed || false
    )
    const isRightSidebarOpen = ref(false)
    const isSettingDropdownOpen = ref(false)
    const showCardBox = ref(false)
    const isCalendarPickerOpen = ref(false)
    const showSettingsPage = ref(false)
    //actions

    function openSettingsPage() {
      showSettingsPage.value = true
    }

    function closeSettingsPage() {
      showSettingsPage.value = false
    }

    function toggleCalendarPicker() {
      isCalendarPickerOpen.value = !isCalendarPickerOpen.value
    }

    function closeCalendarPicker() {
      isCalendarPickerOpen.value = false
    }

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

    function openWhiteboardSearchModal() {
      isWhiteboardSearchModalOpen.value = true
    }

    function closeWhiteboardSearchModal() {
      isWhiteboardSearchModalOpen.value = false
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
    function toggleRightSidebar() {
      isRightSidebarOpen.value = !isRightSidebarOpen.value
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
      closeRightSidebar,
      toggleCalendarPicker,
      closeCalendarPicker,
      isCalendarPickerOpen,
      openSettingsPage,
      closeSettingsPage,
      showSettingsPage,
      openWhiteboardSearchModal,
      closeWhiteboardSearchModal,
      isWhiteboardSearchModalOpen,
      toggleRightSidebar
    }
  },
  {
    persist: {
      // 指定需要持久化的state
      pick: ['isSidebarCollapsed', 'isRightSidebarOpen', 'showSettingsPage'],
      // 使用 localStorage 存储
      storage: localStorage,
      // 自定义存储的 key
      key: 'ui-store'
    }
  }
)
