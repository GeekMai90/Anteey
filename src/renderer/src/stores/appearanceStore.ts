import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AppearanceSettings } from '../../../services/appearance/appearanceService'

export const useAppearanceStore = defineStore('appearance', () => {
  // ==================== 状态 ====================
  const settings = ref<AppearanceSettings | null>(null)
  const isLoading = ref(false)

  // ==================== 字体映射 ====================
  const fontFamilyMap = {
    system:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    wenkai: '"LXGW WenKai", sans-serif'
  }

  // ==================== 操作方法 ====================
  // 获取外观设置
  const fetchSettings = async () => {
    try {
      isLoading.value = true
      const fetchedSettings = await window.electronAPI.getAppearanceSettings()
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
      const updatedSettings = await window.electronAPI.updateAppearanceSettings(updateData)
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
        createdAt: new Date(),
        updatedAt: new Date()
      }
      settings.value = defaultSettings
      applySettings(defaultSettings)
    }
  }

  return {
    // 状态
    settings,
    isLoading,

    // 方法
    fetchSettings,
    updateSettings,
    updateUIFont,
    updateEditorFont,
    initializeSettings
  }
})
