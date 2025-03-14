import { defineStore } from 'pinia'
import { ref } from 'vue'

// 定义编辑器设置接口
interface EditorSettings {
  characterLimit: number
  showCharacterCount: boolean
  enforceLimit: boolean
  enableSpellcheck: boolean
}

/**
 * UI 状态管理 Store
 * @description 管理应用全局 UI 状态，包括：
 * - 编辑器显示状态
 * - 搜索模态窗状态
 * - 侧边栏状态
 * - 日历组件状态
 * - 设置页面状态
 * - 主题设置状态
 * - 随机回顾状态
 * - 编辑器设置状态
 */
export const useUIStore = defineStore(
  'ui',
  () => {
    // ==================== 编辑器相关 ====================
    // 显示编辑器
    const isEditorOpen = ref(false)

    // ==================== 编辑器设置相关 ====================
    // 从本地存储获取编辑器设置，如果没有则使用默认值
    const defaultEditorSettings: EditorSettings = {
      characterLimit: 500,
      showCharacterCount: true,
      enforceLimit: false,
      enableSpellcheck: false
    }

    const storedSettings = JSON.parse(localStorage.getItem('ui-store') || '{}')
    const editorSettings = ref<EditorSettings>(
      storedSettings.editorSettings || defaultEditorSettings
    )

    // 更新编辑器设置
    function updateEditorSettings(settings: Partial<EditorSettings>) {
      editorSettings.value = {
        ...editorSettings.value,
        ...settings
      }
    }

    // ==================== 搜索模态窗相关 ====================
    // 显示搜索模态窗口
    const isSearchModalOpen = ref(false)
    // 显示白板搜索模态窗口
    const isWhiteboardSearchModalOpen = ref(false)

    // 打开搜索模态框
    function openSearchModal() {
      isSearchModalOpen.value = true
    }

    // 关闭搜索模态窗
    function closeSearchModal() {
      isSearchModalOpen.value = false
    }

    // 打开白板搜索模态窗
    function openWhiteboardSearchModal() {
      isWhiteboardSearchModalOpen.value = true
    }

    // 关闭白板搜索模态窗
    function closeWhiteboardSearchModal() {
      isWhiteboardSearchModalOpen.value = false
    }

    // ==================== 左侧边栏相关 ====================

    // 侧边栏折叠
    const isSidebarCollapsed = ref(
      JSON.parse(localStorage.getItem('ui-store') || '{}')?.isSidebarCollapsed || false
    )
    // 显示设置下拉菜单
    const isSettingDropdownOpen = ref(false)
    // 显示卡片盒
    const showCardBox = ref(false)

    // 切换卡片盒的显示
    function toggleCardBox() {
      showCardBox.value = !showCardBox.value
    }

    // 显示卡片盒
    function setShowCardBox(show: boolean) {
      showCardBox.value = show
    }

    // 切换侧边栏的显示
    function toggleSidebar() {
      isSidebarCollapsed.value = !isSidebarCollapsed.value
    }

    // 设置侧边栏折叠状态
    function setIsSidebarCollapsed(value: boolean) {
      isSidebarCollapsed.value = value
    }

    // 切换设置下拉菜单显示
    function toggleSettingDropdown() {
      isSettingDropdownOpen.value = !isSettingDropdownOpen.value
    }

    // 关闭设置下拉菜单显示
    function closeSettingDropdown() {
      isSettingDropdownOpen.value = false
    }

    // ==================== 日历组件相关 ====================
    // 显示日历选择组件
    const isCalendarPickerOpen = ref(false)
    // 显示时间块页面的日历选择组件
    const isTimeBlockCalendarPickerOpen = ref(false)

    // 切换日历选择器组件的显示
    function toggleCalendarPicker() {
      isCalendarPickerOpen.value = !isCalendarPickerOpen.value
    }

    // 切换时光记页面中日历选择器组件的显示
    function toggleTimeBlockCalendarPicker() {
      isTimeBlockCalendarPickerOpen.value = !isTimeBlockCalendarPickerOpen.value
    }

    // 关闭日历选择器
    function closeCalendarPicker() {
      isCalendarPickerOpen.value = false
    }

    // 关闭时光记页面中的日历选择器
    function closeTimeBlockCalendarPicker() {
      isTimeBlockCalendarPickerOpen.value = false
    }

    // ==================== 设置页面相关 ====================
    // 显示设置页面
    const showSettingsPage = ref(false)

    // 打开设置页面
    function openSettingsPage() {
      showSettingsPage.value = true
    }

    // 关闭设置页面
    function closeSettingsPage() {
      showSettingsPage.value = false
    }

    // ==================== 右侧边栏相关 ====================
    //显示右侧边栏
    const isRightSidebarOpen = ref(false)
    // 右侧边栏当前显示的标签页（参数是默认打开的标签页）
    const rightSidebarTab = ref('widgets')

    // 打开右侧边栏并设置标签页
    const openRightSidebarWithTab = (tab: string) => {
      isRightSidebarOpen.value = true
      rightSidebarTab.value = tab
    }
    // 关闭右侧边栏
    const closeRightSidebar = () => {
      isRightSidebarOpen.value = false
    }
    // 打开右侧边栏
    function openRightSidebar() {
      isRightSidebarOpen.value = true
    }
    // 切换显示右侧边栏
    function toggleRightSidebar() {
      isRightSidebarOpen.value = !isRightSidebarOpen.value
    }

    // ==================== 主题设置相关 ====================

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

    // ==================== 随机回顾相关 ====================

    // 随机回顾模态框状态
    const isReviewModalOpen = ref(false)

    // 是否使用马里奥风格的按钮
    const isMarioStyle = ref(false)

    // 打开随机回顾模态框
    const openReviewModal = () => {
      isReviewModalOpen.value = true
    }

    // 关闭随机回顾模态框
    const closeReviewModal = () => {
      isReviewModalOpen.value = false
    }

    // 切换随机回顾模态框状态
    const toggleReviewModal = () => {
      isReviewModalOpen.value = !isReviewModalOpen.value
    }

    // 切换随机回顾按钮的样式
    const toggleButtonStyle = () => {
      isMarioStyle.value = !isMarioStyle.value
    }

    return {
      // 编辑器相关
      isEditorOpen,

      // 编辑器设置相关
      editorSettings,
      updateEditorSettings,

      // 搜索模态窗相关
      isSearchModalOpen,
      isWhiteboardSearchModalOpen,
      openSearchModal,
      closeSearchModal,
      openWhiteboardSearchModal,
      closeWhiteboardSearchModal,

      // 左侧边栏相关
      isSidebarCollapsed,
      isSettingDropdownOpen,
      showCardBox,
      toggleCardBox,
      setShowCardBox,
      toggleSidebar,
      setIsSidebarCollapsed,
      toggleSettingDropdown,
      closeSettingDropdown,

      // 日历组件相关
      isCalendarPickerOpen,
      isTimeBlockCalendarPickerOpen,
      toggleCalendarPicker,
      toggleTimeBlockCalendarPicker,
      closeCalendarPicker,
      closeTimeBlockCalendarPicker,

      // 设置页面相关
      showSettingsPage,
      openSettingsPage,
      closeSettingsPage,

      // 右侧边栏相关
      isRightSidebarOpen,
      rightSidebarTab,
      openRightSidebarWithTab,
      closeRightSidebar,
      openRightSidebar,
      toggleRightSidebar,

      // 主题设置相关
      isThemePickerOpen,
      themePickerPosition,
      openThemePicker,
      closeThemePicker,

      // 随机回顾相关
      isReviewModalOpen,
      openReviewModal,
      closeReviewModal,
      toggleReviewModal,
      isMarioStyle,
      toggleButtonStyle
    }
  },
  {
    persist: {
      // 指定需要持久化的state
      pick: [
        'isSidebarCollapsed',
        'isRightSidebarOpen',
        'showSettingsPage',
        'isDarkTheme',
        'isMarioStyle',
        'editorSettings'
        // 不需要持久化 isReviewModalOpen，每次打开应用都应该是关闭状态
      ],
      // 使用 localStorage 存储
      storage: localStorage,
      // 自定义存储的 key
      key: 'ui-store'
    }
  }
)
