import { ipcMain } from 'electron'
import {
  login,
  logout,
  getCurrentAuthState,
  refreshToken,
  verifyAuthState,
  checkNetworkStatus
} from '../../services/auth/authService'

export function setupAuthHandlers() {
  // 登录
  ipcMain.handle(
    'login',
    async (_event, { email, password }: { email: string; password: string }) => {
      try {
        const authState = await login(email, password)
        return { success: true, data: authState }
      } catch (error: any) {
        console.error('主进程→ 登录失败:', error)

        // 添加更详细的错误处理，特别是处理 HTTP 403 错误
        if (error.response && error.response.status === 403) {
          // 设备数量限制错误 - 从 API 响应中获取详细信息
          const errorMessage = error.response.data?.message || '登录失败，请稍后重试'
          return {
            success: false,
            error: errorMessage
          }
        }

        // 处理其他特定的错误类型
        if (error instanceof Error) {
          if (error.message.includes('已达到最大设备数限制')) {
            return {
              success: false,
              error: '已达到最大设备数限制，请先在其他设备上登出'
            }
          }
          if (error.message.includes('邮箱或密码错误')) {
            return {
              success: false,
              error: '邮箱或密码错误，请重试'
            }
          }
        }

        return {
          success: false,
          error: error instanceof Error ? error.message : '登录失败，请稍后重试'
        }
      }
    }
  )

  // 登出
  ipcMain.handle('logout', async () => {
    try {
      await logout()
      return { success: true }
    } catch (error) {
      console.error('主进程→ 登出失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '登出失败，请稍后重试'
      }
    }
  })

  // 获取当前认证状态
  ipcMain.handle('get-auth-state', async () => {
    try {
      const authState = await getCurrentAuthState()
      return { success: true, data: authState }
    } catch (error) {
      console.error('主进程→ 获取认证状态失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取认证状态失败'
      }
    }
  })

  // 刷新 token
  ipcMain.handle('refresh-token', async (_event, token: string) => {
    try {
      const authState = await refreshToken(token)
      return { success: true, data: authState }
    } catch (error) {
      // 处理 token 刷新失败的特殊情况
      if (error instanceof Error && error.message.includes('未找到认证状态')) {
        return {
          success: false,
          error: '登录已过期，请重新登录'
        }
      }

      console.error('主进程→ 刷新 token 失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '刷新登录状态失败'
      }
    }
  })

  // 验证认证状态
  ipcMain.handle('verify-auth', async () => {
    try {
      const isValid = await verifyAuthState()
      return { success: true, data: isValid }
    } catch (error) {
      console.error('主进程→ 验证认证状态失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '验证认证状态失败'
      }
    }
  })

  // 添加网络状态检查处理器
  ipcMain.handle('check-network-status', async () => {
    try {
      const isOnline = await checkNetworkStatus()
      return { success: true, data: isOnline }
    } catch (error) {
      console.error('主进程→ 检查网络状态失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
