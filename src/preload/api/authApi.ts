import { ipcRenderer } from 'electron'
import type { AuthState } from '@shared/types'

export const authApi = {
  // 登录
  login: async (params: { email: string; password: string }): Promise<AuthState> => {
    try {
      const result = await ipcRenderer.invoke('login', params)
      if (!result.success) throw new Error(result.error)
      return result.data
    } catch (error) {
      console.error('预加载脚本 → 登录失败:', error)
      throw error
    }
  },

  // 登出
  logout: async (): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('logout')
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 登出失败:', error)
      throw error
    }
  },

  // 获取当前认证状态
  getCurrentAuthState: async (): Promise<AuthState | null> => {
    try {
      const result = await ipcRenderer.invoke('get-auth-state')
      if (!result.success) throw new Error(result.error)
      return result.data
    } catch (error) {
      console.error('预加载脚本 → 获取认证状态失败:', error)
      throw error
    }
  },

  // 刷新 token
  refreshToken: async (token: string): Promise<AuthState> => {
    try {
      const result = await ipcRenderer.invoke('refresh-token', token)
      if (!result.success) throw new Error(result.error)
      return result.data
    } catch (error) {
      console.error('预加载脚本 → 刷新 token 失败:', error)
      throw error
    }
  },

  // 验证认证状态
  verifyAuth: async (): Promise<boolean> => {
    try {
      const result = await ipcRenderer.invoke('verify-auth')
      if (!result.success) throw new Error(result.error)
      return result.data
    } catch (error) {
      console.error('预加载脚本 → 验证认证状态失败:', error)
      throw error
    }
  }
}
