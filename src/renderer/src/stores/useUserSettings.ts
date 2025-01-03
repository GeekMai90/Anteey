import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { UserSettings, UpdateUserSettings } from '@shared/types'

export const useUserSettingsStore = defineStore('userSettings', () => {
  const settings = ref<UserSettings | null>(null)
  const loading = ref(false)

  const fetchSettings = async () => {
    loading.value = true
    try {
      const result = await window.electronAPI.getUserSettings()
      // 确保日期字段是字符串
      settings.value = {
        ...result,
        createdAt: result.createdAt.toString(),
        updatedAt: result.updatedAt.toString()
      }
    } catch (error) {
      console.error('渲染进程 → 获取用户设置失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const updateSettings = async (newSettings: UpdateUserSettings) => {
    try {
      // 创建一个新对象，只包含需要更新的字段
      const settingsToUpdate: UpdateUserSettings = {}

      if (newSettings.authorName !== undefined) {
        settingsToUpdate.authorName = newSettings.authorName
      }
      if (newSettings.authorMotto !== undefined) {
        settingsToUpdate.authorMotto = newSettings.authorMotto
      }
      if (newSettings.qrcodeUrl !== undefined) {
        settingsToUpdate.qrcodeUrl = newSettings.qrcodeUrl
      }

      const result = await window.electronAPI.updateUserSettings(settingsToUpdate)

      // 更新本地状态
      if (settings.value) {
        settings.value = {
          ...settings.value,
          ...settingsToUpdate,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt
        }
      }

      return settings.value
    } catch (error) {
      console.error('渲染进程 → 更新用户设置失败:', error)
      throw error
    }
  }

  // 初始化获取设置
  fetchSettings().catch((error) => {
    console.error('渲染进程 → 初始化用户设置失败:', error)
  })

  return {
    settings,
    loading,
    updateSettings,
    fetchSettings
  }
})
