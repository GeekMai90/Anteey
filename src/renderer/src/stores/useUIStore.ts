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
    const isDarkTheme = ref(false)
    const themeMode = ref<'system' | 'light' | 'dark'>('system')
    //actions
    // 初始化主题
    function initTheme() {
      // 从本地存储获取主题模式设置
      const savedThemeMode = localStorage.getItem('themeMode') as 'system' | 'light' | 'dark'
      themeMode.value = savedThemeMode || 'system'

      if (themeMode.value === 'system') {
        // 如果是系统模式，则使用系统主题
        isDarkTheme.value = window.matchMedia('(prefers-color-scheme: dark)').matches
      } else {
        // 否则使用用户设置的主题
        isDarkTheme.value = themeMode.value === 'dark'
      }

      applyTheme()
    }

    // 监听系统主题变化
    function setupThemeListener() {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      mediaQuery.addEventListener('change', (e) => {
        if (themeMode.value === 'system') {
          isDarkTheme.value = e.matches
          applyTheme()
        }
      })
    }
    const toggleTheme = () => {
      const uiStore = useUIStore()
      uiStore.setThemeMode(uiStore.themeMode === 'light' ? 'dark' : 'light')
    }

    // 切换主题模式
    function setThemeMode(mode: 'system' | 'light' | 'dark') {
      themeMode.value = mode
      localStorage.setItem('themeMode', mode)

      if (mode === 'system') {
        isDarkTheme.value = window.matchMedia('(prefers-color-scheme: dark)').matches
      } else {
        isDarkTheme.value = mode === 'dark'
      }

      applyTheme()
    }

    // 应用主题
    function applyTheme() {
      document.documentElement.classList.toggle('theme-dark', isDarkTheme.value)
      localStorage.setItem('theme', isDarkTheme.value ? 'dark' : 'light')
    }

    // 初始化
    initTheme()
    setupThemeListener()

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
      toggleRightSidebar,
      setThemeMode,
      initTheme,
      isDarkTheme,
      themeMode,
      toggleTheme
    }
  },
  {
    persist: {
      // 指定需要持久化的state
      pick: ['isSidebarCollapsed', 'isRightSidebarOpen', 'showSettingsPage', 'isDarkTheme'],
      // 使用 localStorage 存储
      storage: localStorage,
      // 自定义存储的 key
      key: 'ui-store'
    }
  }
)
