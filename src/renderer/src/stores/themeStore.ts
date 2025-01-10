import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ThemeSettings, FavoriteGradients, GradientPreset } from '@shared/types'

export const useThemeStore = defineStore('theme', () => {
  // ==================== 状态 ====================
  const themeSettings = ref<ThemeSettings | null>(null)
  const favoriteGradients = ref<FavoriteGradients | null>(null)
  const isLoading = ref(false)

  // 主题选择器状态
  const isThemePickerOpen = ref(false)
  const themePickerPosition = ref({ x: 0, y: 0 })

  // ==================== 计算属性 ====================
  const currentGradient = computed(() => {
    if (!themeSettings.value) return null

    if (themeSettings.value.gradientMode === 'universal') {
      return themeSettings.value.universalGradient
    }

    // 根据当前主题模式返回对应的渐变
    const isDark =
      themeSettings.value.themeMode === 'dark' ||
      (themeSettings.value.themeMode === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)

    return isDark ? themeSettings.value.darkGradient : themeSettings.value.lightGradient
  })

  // ==================== 操作方法 ====================
  // 初始化主题设置
  const initializeTheme = async () => {
    try {
      isLoading.value = true
      const settings = await window.electronAPI.theme.getThemeSettings()
      themeSettings.value = settings
      await loadFavoriteGradients()
    } catch (error) {
      console.error('初始化主题设置失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 更新主题设置
  const updateThemeSettings = async (settings: Partial<ThemeSettings>) => {
    try {
      isLoading.value = true
      const updatedSettings = await window.electronAPI.theme.updateThemeSettings(settings)
      themeSettings.value = updatedSettings
    } catch (error) {
      console.error('更新主题设置失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 加载收藏的渐变
  const loadFavoriteGradients = async () => {
    try {
      const favorites = await window.electronAPI.theme.getFavoriteGradients()
      favoriteGradients.value = favorites
    } catch (error) {
      console.error('加载收藏的渐变失败:', error)
      throw error
    }
  }

  // 添加收藏的渐变
  const addFavoriteGradient = async (
    gradient: GradientPreset,
    type: 'universal' | 'light' | 'dark'
  ) => {
    try {
      const updatedFavorites = await window.electronAPI.theme.addFavoriteGradient(gradient, type)
      favoriteGradients.value = updatedFavorites
    } catch (error) {
      console.error('添加收藏渐变失败:', error)
      throw error
    }
  }

  // 移除收藏的渐变
  const removeFavoriteGradient = async (
    gradient: Omit<GradientPreset, 'id'>,
    type: 'universal' | 'light' | 'dark'
  ) => {
    try {
      const updatedFavorites = await window.electronAPI.theme.removeFavoriteGradient(gradient, type)
      favoriteGradients.value = updatedFavorites
    } catch (error) {
      console.error('移除收藏渐变失败:', error)
      throw error
    }
  }

  // 切换主题模式
  const toggleThemeMode = async () => {
    if (!themeSettings.value) return

    // 只在 light 和 dark 之间切换
    const newMode = themeSettings.value.themeMode === 'light' ? 'dark' : 'light'
    await updateThemeSettings({ themeMode: newMode })

    // 应用主题
    const isDark = newMode === 'dark'
    document.documentElement.classList.toggle('theme-dark', isDark)
  }

  // 切换渐变模式
  const toggleGradientMode = async () => {
    if (!themeSettings.value) return

    const newMode = themeSettings.value.gradientMode === 'universal' ? 'specific' : 'universal'
    await updateThemeSettings({ gradientMode: newMode })
  }

  // 打开主题选择器
  const openThemePicker = (position: { x: number; y: number }) => {
    // 获取窗口尺寸
    const windowHeight = window.innerHeight
    const windowWidth = window.innerWidth

    // 主题选择器的预估尺寸
    const PICKER_HEIGHT = 500
    const PICKER_WIDTH = 300
    const OFFSET_Y = 155 // 向上偏移量
    const OFFSET_X = 85 // 向右偏移量

    // 计算合适的位置，确保不会超出窗口
    let x = position.x + OFFSET_X
    let y = position.y - OFFSET_Y

    // 检查右边界
    if (x + PICKER_WIDTH > windowWidth) {
      x = windowWidth - PICKER_WIDTH - 20
    }

    // 检查下边界
    if (y + PICKER_HEIGHT > windowHeight) {
      y = y - PICKER_HEIGHT - 10
    }

    // 确保不会超出顶部
    if (y < 10) {
      y = 10
    }

    themePickerPosition.value = { x, y }
    isThemePickerOpen.value = true
  }

  // 关闭主题选择器
  const closeThemePicker = () => {
    isThemePickerOpen.value = false
  }

  // 切换主题风格
  const toggleStyleMode = async (mode: 'modern' | 'classic') => {
    if (!themeSettings.value) return

    // 如果点击的是当前模式，不做任何操作
    if (themeSettings.value.styleMode === mode) return

    await updateThemeSettings({ styleMode: mode })
    applyStyleMode() // 应用新的风格
  }

  // 应用主题风格
  const applyStyleMode = () => {
    if (!themeSettings.value) return

    const isClassic = themeSettings.value.styleMode === 'classic'
    document.documentElement.classList.toggle('theme-classic', isClassic)
  }

  // 修改 applyTheme 方法，添加风格应用
  const applyTheme = () => {
    if (!themeSettings.value) return

    const isDark =
      themeSettings.value.themeMode === 'dark' ||
      (themeSettings.value.themeMode === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)

    document.documentElement.classList.toggle('theme-dark', isDark)
    applyStyleMode() // 同时应用风格
  }

  return {
    // 状态
    themeSettings,
    favoriteGradients,
    isLoading,
    currentGradient,

    // 方法
    initializeTheme,
    updateThemeSettings,
    loadFavoriteGradients,
    addFavoriteGradient,
    removeFavoriteGradient,
    toggleThemeMode,
    toggleGradientMode,

    // 主题选择器状态
    isThemePickerOpen,
    themePickerPosition,
    openThemePicker,
    closeThemePicker,

    // 新方法
    applyTheme,
    toggleStyleMode,
    applyStyleMode
  }
})
