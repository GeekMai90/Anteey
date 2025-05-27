import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppearanceSettings, GradientPreset } from '@shared/types'

export const useAppearanceStore = defineStore(
  'appearance',
  () => {
    // ==================== 状态 ====================
    const settings = ref<AppearanceSettings | null>(null)
    const isLoading = ref(false)
    const favoriteGradients = ref<GradientPreset[]>([])

    // ==================== 字体映射 ====================
    const fontFamilyMap = {
      system:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      wenkai: '"LXGW WenKai", sans-serif',
      neoxihei: '"LXGW NeoXiHei", sans-serif'
    }

    // ==================== 操作方法 ====================
    // 获取外观设置
    const fetchSettings = async () => {
      try {
        isLoading.value = true
        const fetchedSettings = await window.electronAPI.userSettings.getAppearanceSettings()
        settings.value = fetchedSettings
        applySettings(fetchedSettings)
      } catch (error) {
        console.error('获取外观设置失败:', error)
        throw error
      } finally {
        isLoading.value = false
      }
    }

    // 更新外观设置
    const updateSettings = async (updateData: Partial<AppearanceSettings>) => {
      try {
        isLoading.value = true
        const updatedSettings =
          await window.electronAPI.userSettings.updateAppearanceSettings(updateData)
        settings.value = updatedSettings
        applySettings(updatedSettings)
        return updatedSettings
      } catch (error) {
        console.error('更新外观设置失败:', error)
        throw error
      } finally {
        isLoading.value = false
      }
    }

    // 更新 UI 字体
    const updateUIFont = async (font: string) => {
      try {
        await updateSettings({ uiFont: font })
      } catch (error) {
        console.error('更新 UI 字体失败:', error)
        throw error
      }
    }

    // 更新编辑器字体
    const updateEditorFont = async (font: string) => {
      try {
        await updateSettings({ editorFont: font })
      } catch (error) {
        console.error('更新编辑器字体失败:', error)
        throw error
      }
    }

    // 更新默认页面
    const updateDefaultPage = async (page: string) => {
      try {
        await window.electronAPI.userSettings.updateDefaultPage(page)
      } catch (error) {
        console.error('更新默认页面失败:', error)
        throw error
      }
    }

    // 更新侧边栏展开状态
    const updateStarredExpanded = async (expanded: boolean) => {
      try {
        await window.electronAPI.userSettings.updateStarredExpanded(expanded)
      } catch (error) {
        console.error('更新星标展开状态失败:', error)
        throw error
      }
    }

    const updateTagsExpanded = async (expanded: boolean) => {
      try {
        await window.electronAPI.userSettings.updateTagsExpanded(expanded)
      } catch (error) {
        console.error('更新标签展开状态失败:', error)
        throw error
      }
    }

    const updateRecentExpanded = async (expanded: boolean) => {
      try {
        await window.electronAPI.userSettings.updateRecentExpanded(expanded)
      } catch (error) {
        console.error('更新最近展开状态失败:', error)
        throw error
      }
    }

    // 更新白板功能开关
    const updateWhiteboardEnabled = async (enabled: boolean) => {
      try {
        isLoading.value = true
        const updatedSettings =
          await window.electronAPI.userSettings.updateWhiteboardEnabled(enabled)
        settings.value = updatedSettings
        return updatedSettings
      } catch (error) {
        console.error('更新白板功能开关失败:', error)
        throw error
      } finally {
        isLoading.value = false
      }
    }

    // 更新悬浮侧边栏功能开关
    const updateHoverSidebarEnabled = async (enabled: boolean) => {
      try {
        isLoading.value = true
        const updatedSettings =
          await window.electronAPI.userSettings.updateHoverSidebarEnabled(enabled)
        settings.value = updatedSettings
        return updatedSettings
      } catch (error) {
        console.error('更新悬浮侧边栏功能开关失败:', error)
        throw error
      } finally {
        isLoading.value = false
      }
    }

    // 更新迷你侧边栏显示状态
    const updateShowSlimSidebar = async (enabled: boolean) => {
      try {
        isLoading.value = true
        const updatedSettings = await window.electronAPI.userSettings.updateShowSlimSidebar(enabled)
        settings.value = updatedSettings
        return updatedSettings
      } catch (error) {
        console.error('更新迷你侧边栏显示状态失败:', error)
        throw error
      } finally {
        isLoading.value = false
      }
    }

    // 应用设置到 DOM
    const applySettings = (settings: AppearanceSettings) => {
      document.documentElement.style.setProperty(
        '--font-family-ui',
        fontFamilyMap[settings.uiFont as keyof typeof fontFamilyMap]
      )
      document.documentElement.style.setProperty(
        '--font-family-editor',
        fontFamilyMap[settings.editorFont as keyof typeof fontFamilyMap]
      )
    }

    // 初始化设置
    const initializeSettings = async () => {
      try {
        await fetchSettings()
      } catch (error) {
        console.error('初始化外观设置失败:', error)
        // 使用默认设置
        const defaultSettings: AppearanceSettings = {
          id: '1',
          uiFont: 'system',
          editorFont: 'system',
          defaultPage: '/timeblock',
          starredExpanded: true,
          tagsExpanded: true,
          recentExpanded: true,
          enableWhiteboard: true,
          enableAIAssistant: true,
          enableHoverSidebar: true,
          showSlimSidebar: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          loadingAnimationType: 'candle',
          aiProcessModelId: null
        }
        settings.value = defaultSettings
        applySettings(defaultSettings)
      }
    }

    // 添加计算属性
    const defaultRoute = computed(() => settings.value?.defaultPage || '/home')

    // 添加收藏渐变
    const addFavoriteGradient = (gradient: Omit<GradientPreset, 'id'>) => {
      const newId = favoriteGradients.value.length + 1
      favoriteGradients.value.push({
        id: newId,
        ...gradient
      })
      saveFavorites()
    }

    // 移除收藏渐变
    const removeFavoriteGradient = (gradient: Omit<GradientPreset, 'id'>) => {
      favoriteGradients.value = favoriteGradients.value.filter(
        (g: GradientPreset) =>
          g.startColor !== gradient.startColor ||
          g.endColor !== gradient.endColor ||
          g.angle !== gradient.angle ||
          g.noiseAmount !== gradient.noiseAmount
      )
      saveFavorites()
    }

    // 检查渐变是否已收藏
    const isGradientFavorite = (gradient: Omit<GradientPreset, 'id'>) => {
      return favoriteGradients.value.some(
        (g: GradientPreset) =>
          g.startColor === gradient.startColor &&
          g.endColor === gradient.endColor &&
          g.angle === gradient.angle &&
          g.noiseAmount === gradient.noiseAmount
      )
    }

    // 保存收藏到本地存储
    const saveFavorites = () => {
      localStorage.setItem('favorite-gradients', JSON.stringify(favoriteGradients.value))
    }

    // 加载收藏
    const loadFavorites = () => {
      const saved = localStorage.getItem('favorite-gradients')
      if (saved) {
        favoriteGradients.value = JSON.parse(saved)
      }
    }

    // 初始化时加载收藏
    loadFavorites()

    return {
      // 状态
      settings,
      isLoading,
      favoriteGradients,

      // 方法
      fetchSettings,
      updateSettings,
      updateUIFont,
      updateEditorFont,
      updateDefaultPage,
      updateStarredExpanded,
      updateTagsExpanded,
      updateRecentExpanded,
      initializeSettings,
      defaultRoute,
      updateWhiteboardEnabled,
      updateHoverSidebarEnabled,
      updateShowSlimSidebar,
      addFavoriteGradient,
      removeFavoriteGradient,
      isGradientFavorite
    }
  },
  { persist: true }
)
