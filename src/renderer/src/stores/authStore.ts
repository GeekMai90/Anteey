import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AuthState } from '@shared/types'

export const useAuthStore = defineStore('auth', () => {
  // ==================== 状态 ====================
  const authState = ref<AuthState | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ==================== 计算属性 ====================
  const isAuthenticated = computed(() => !!authState.value)
  const user = computed(() => authState.value?.user)
  const isDesktopPermanent = computed(() => user.value?.licenseType === 'desktop_permanent')

  // ==================== 操作方法 ====================
  // 初始化认证状态
  const initAuth = async () => {
    try {
      loading.value = true
      error.value = null
      const state = await window.electronAPI.auth.getCurrentAuthState()
      if (state) {
        const isValid = await window.electronAPI.auth.verifyAuth()
        if (!isValid) {
          await logout()
          return
        }
        authState.value = state
      }
    } catch (err) {
      console.error('初始化认证状态失败:', err)
      error.value = err instanceof Error ? err.message : '初始化认证状态失败'
    } finally {
      loading.value = false
    }
  }

  // 登录
  const login = async (email: string, password: string) => {
    try {
      loading.value = true
      error.value = null
      const state = await window.electronAPI.auth.login({ email, password })
      authState.value = state
    } catch (err) {
      console.error('登录失败:', err)
      error.value = err instanceof Error ? err.message : '登录失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 登出
  const logout = async () => {
    try {
      loading.value = true
      error.value = null
      await window.electronAPI.auth.logout()
      authState.value = null
    } catch (err) {
      console.error('登出失败:', err)
      error.value = err instanceof Error ? err.message : '登出失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 刷新 token
  const refreshToken = async () => {
    try {
      if (!authState.value?.refreshToken) {
        throw new Error('没有可用的刷新令牌')
      }
      const state = await window.electronAPI.auth.refreshToken(authState.value.refreshToken)
      authState.value = state
    } catch (err) {
      console.error('刷新令牌失败:', err)
      error.value = err instanceof Error ? err.message : '刷新令牌失败'
      throw err
    }
  }

  // 清除错误
  const clearError = () => {
    error.value = null
  }

  return {
    // 状态
    authState,
    loading,
    error,

    // 计算属性
    isAuthenticated,
    user,
    isDesktopPermanent,

    // 方法
    initAuth,
    login,
    logout,
    refreshToken,
    clearError
  }
})
