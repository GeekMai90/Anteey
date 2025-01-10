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

    const isSettingDropdownOpen = ref(false)
    const showCardBox = ref(false)
    const isCalendarPickerOpen = ref(false)
    const showSettingsPage = ref(false)
    const isDarkTheme = ref(false)
    const themeMode = ref<'system' | 'light' | 'dark'>('system')

    //右侧边栏状态
    const isRightSidebarOpen = ref(false)
    const rightSidebarTab = ref('multi') // 当前激活的标签页
    // 打开右侧边栏并设置标签页
    const openRightSidebarWithTab = (tab: string) => {
      isRightSidebarOpen.value = true
      rightSidebarTab.value = tab
    }
    // 关闭右侧边栏
    const closeRightSidebar = () => {
      isRightSidebarOpen.value = false
    }
    function openRightSidebar() {
      isRightSidebarOpen.value = true
    }
    function toggleRightSidebar() {
      isRightSidebarOpen.value = !isRightSidebarOpen.value
    }
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

    // 主题颜色选择器状态
    const isThemePickerOpen = ref(false)
    const themePickerPosition = ref({
      left: '0px',
      top: '0px'
    })

    // 打开主题颜色选择器
    const openThemePicker = (event: MouseEvent) => {
      const button = event.currentTarget as HTMLElement
      const rect = button.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const pickerHeight = 500

      let top = rect.top - pickerHeight / 2 + rect.height / 2 - 300 // 向上偏移100px

      // 确保不会超出视口
      if (top + pickerHeight > viewportHeight) {
        top = viewportHeight - pickerHeight - 20
      }
      if (top < 20) {
        top = 20
      }

      themePickerPosition.value = {
        left: `${rect.right + 16}px`,
        top: `${top}px`
      }
      isThemePickerOpen.value = true
    }

    // 关闭主题颜色选择器
    const closeThemePicker = () => {
      isThemePickerOpen.value = false
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
      toggleTheme,
      openRightSidebar,
      closeRightSidebar,
      openRightSidebarWithTab,
      rightSidebarTab,
      isThemePickerOpen,
      themePickerPosition,
      openThemePicker,
      closeThemePicker
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
