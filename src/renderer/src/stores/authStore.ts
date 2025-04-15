import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { AuthState } from '@shared/types'
import { useRouter } from 'vue-router'
import { message } from '../utils/message'

export const useAuthStore = defineStore('auth', () => {
  // ==================== 状态 ====================
  const authState = ref<AuthState | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const router = useRouter()

  // 存储定时器引用
  let refreshInterval: NodeJS.Timeout | null = null

  const isInitialized = ref(false)

  // 添加离线状态
  const isOffline = ref(false)
  const offlineExpiresIn = ref<number | null>(null)

  // 存储离线监控定时器
  let offlineMonitorInterval: NodeJS.Timeout | null = null

  // 添加一个新的状态来缓存用户类型
  const userLicenseType = ref<string | null>(null)

  // ==================== 计算属性 ====================
  const isAuthenticated = computed(() => !!authState.value)
  const user = computed(() => authState.value?.user)
  const isDesktopPermanent = computed(() => {
    const isPermanent = userLicenseType.value === 'desktop_permanent'
    return isPermanent
  })
  const checkOfflineValidity = computed(() => {
    if (!authState.value) return false
    const lastVerified = new Date(authState.value.lastVerified)
    const expiresAt = new Date(authState.value.expiresAt)
    return (
      expiresAt > new Date() &&
      new Date().getTime() - lastVerified.getTime() < 180 * 24 * 60 * 60 * 1000
    )
  })
  const canCreateNote = computed(() => {
    if (!user.value) return false
    if (isDesktopPermanent.value) return true
    return user.value.licenseType === 'free' // 可以添加更多条件
  })

  // 计算离线剩余时间
  const remainingOfflineDays = computed(() => {
    if (!authState.value?.lastVerified) return 0

    // 如果不是永久授权用户，返回0
    if (authState.value.user?.licenseType !== 'desktop_permanent') {
      return 0
    }

    const lastVerified = new Date(authState.value.lastVerified)
    const now = new Date()
    const diffDays =
      30 - Math.floor((now.getTime() - lastVerified.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  })

  // ==================== 操作方法 ====================
  // 初始化认证状态
  const initAuth = async () => {
    try {
      loading.value = true
      error.value = null
      const state = await retryOperation(
        async () => await window.electronAPI.auth.getCurrentAuthState()
      )
      if (state) {
        const isValid = await retryOperation(async () => await window.electronAPI.auth.verifyAuth())
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
      const state = await retryOperation(
        async () => await window.electronAPI.auth.login({ email, password })
      )
      authState.value = state
      // 设置用户许可证类型
      userLicenseType.value = state.user?.licenseType || null

      // 登录成功后设置
      setupAutoRefresh()
      setupAuthStateListener()
      persistAuthState()
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

      // 清理状态和定时器
      authState.value = null
      userLicenseType.value = null // 清除缓存的用户类型
      if (refreshInterval) {
        clearInterval(refreshInterval)
        refreshInterval = null
      }
      if (offlineMonitorInterval) {
        clearInterval(offlineMonitorInterval)
        offlineMonitorInterval = null
      }

      // 清理本地存储
      localStorage.removeItem('lastAuthState')

      // 跳转到设置页面
      if (router?.currentRoute?.value?.path !== '/timeline') {
        router.push('/timeline')
      }
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
      const currentRefreshToken = authState.value?.refreshToken
      if (!currentRefreshToken) {
        throw new Error('没有可用的刷新令牌')
      }
      const state = await retryOperation(
        async () => await window.electronAPI.auth.refreshToken(currentRefreshToken)
      )
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

  // 修改自动刷新机制
  const setupAutoRefresh = () => {
    // 清理已存在的定时器
    if (refreshInterval) {
      clearInterval(refreshInterval)
    }

    refreshInterval = setInterval(
      async () => {
        if (authState.value?.accessToken) {
          try {
            await refreshToken()
          } catch (err) {
            console.error('自动刷新 token 失败:', err)
          }
        }
      },
      14 * 24 * 60 * 60 * 1000
    )
  }

  // 建议添加重试机制
  const retryOperation = async (operation: () => Promise<any>, maxRetries = 3) => {
    let retries = 0
    while (retries < maxRetries) {
      try {
        return await operation()
      } catch (err) {
        retries++
        if (retries === maxRetries) throw err
        await new Promise((resolve) => setTimeout(resolve, 1000 * retries))
      }
    }
  }

  // 建议添加状态持久化
  const persistAuthState = () => {
    watch(
      () => authState.value,
      (newState) => {
        if (newState) {
          localStorage.setItem(
            'lastAuthState',
            JSON.stringify({
              lastVerified: newState.lastVerified,
              expiresAt: newState.expiresAt
            })
          )
        } else {
          localStorage.removeItem('lastAuthState')
        }
      },
      { deep: true }
    )
  }

  // 修改登录状态监听
  const setupAuthStateListener = () => {
    watch(
      () => authState.value,
      (newState) => {
        if (!newState && router?.currentRoute?.value?.path !== '/timeline') {
          // 改为跳转到 timeline 页面,因为这是我们已有的路由
          router.push('/timeline')
        }
      }
    )
  }

  // 修改监控离线状态函数
  const monitorOfflineStatus = () => {
    // 清理已存在的定时器
    if (offlineMonitorInterval) {
      clearInterval(offlineMonitorInterval)
    }

    // 立即执行一次检查
    checkOfflineStatus()

    // 设置定时检查 (每 4小时)
    offlineMonitorInterval = setInterval(checkOfflineStatus, 4 * 60 * 60 * 1000) // 2小时 = 2 * 60 * 60 * 1000 毫秒
  }

  // 修改检查逻辑
  const checkOfflineStatus = async () => {
    try {
      const networkStatus = await window.electronAPI.auth.checkNetworkStatus()
      isOffline.value = !networkStatus

      // 只有永久授权用户才显示离线剩余时间
      if (!networkStatus && authState.value?.user?.licenseType === 'desktop_permanent') {
        const lastVerified = new Date(authState.value.lastVerified)
        const now = new Date()
        const remainingTime = 30 * 24 * 60 * 60 * 1000 - (now.getTime() - lastVerified.getTime())
        offlineExpiresIn.value = Math.max(0, remainingTime)

        // 只在剩余时间少于7天时显示警告
        if (remainingTime < 7 * 24 * 60 * 60 * 1000 && remainingTime > 0) {
          message.warning(
            `离线使用即将过期，请在 ${Math.ceil(remainingTime / (24 * 60 * 60 * 1000))} 天内连接网络验证授权`
          )
        }
      } else {
        // 非永久授权用户或在线状态下清除离线过期时间
        offlineExpiresIn.value = null
      }
    } catch (error) {
      console.error('authStore→ 检查离线状态失败:', error)
    }
  }

  // 初始化时启动监控
  // onMounted(() => {
  //   monitorOfflineStatus()
  // })

  // 修改 initStore 函数
  const initStore = async () => {
    if (isInitialized.value) {
      // console.log('authStore→ 已经初始化过，跳过初始化')
      return
    }

    try {
      loading.value = true
      // console.log('authStore→ 开始初始化')

      // 1. 先从本地加载状态
      const localState = await window.electronAPI.auth.getCurrentAuthState()
      // console.log('authStore→ 本地状态:', localState)

      if (localState) {
        const now = new Date()
        const expiresAt = new Date(localState.expiresAt)

        // console.log('authStore→ 检查过期状态:', {
        //   now,
        //   expiresAt,
        //   isExpired: expiresAt <= now
        // })

        if (expiresAt > now) {
          authState.value = localState
          // 缓存用户类型
          userLicenseType.value = localState.user?.licenseType || null
          setupAutoRefresh()
          setupAuthStateListener()

          if (localState.user?.licenseType === 'desktop_permanent') {
            // console.log('authStore→ 永久授权用户，启动离线监控')
            monitorOfflineStatus()
          }
        }
      }

      // 2. 立即进行网络验证
      if (authState.value) {
        const isValid = await window.electronAPI.auth.verifyAuth()
        // console.log('authStore→ 网络验证结果:', isValid)

        if (!isValid) {
          console.log('authStore→ 验证失败，执行登出')
          await logout()
        }
      }

      isInitialized.value = true
      // console.log('authStore→ 初始化完成，当前用户类型:', userLicenseType.value)
    } catch (err) {
      console.error('authStore→ 初始化失败:', err)
      error.value = err instanceof Error ? err.message : '初始化失败'
    } finally {
      loading.value = false
    }
  }

  // 修改 cleanup 函数
  const cleanup = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
    if (offlineMonitorInterval) {
      clearInterval(offlineMonitorInterval)
      offlineMonitorInterval = null
    }
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
    checkOfflineValidity,
    canCreateNote,

    // 方法
    initAuth,
    login,
    logout,
    refreshToken,
    clearError,
    setupAutoRefresh,
    setupAuthStateListener,
    initStore,
    cleanup,
    isInitialized,

    // 离线状态
    isOffline,
    offlineExpiresIn,
    remainingOfflineDays
  }
})
