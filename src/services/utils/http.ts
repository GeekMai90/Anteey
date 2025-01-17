import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { getCurrentAuthState } from '../auth/authService'

// 创建 axios 实例
const http: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
http.interceptors.request.use(
  async (config) => {
    // 获取当前认证状态
    const authState = await getCurrentAuthState()

    // 如果有 token，添加到请求头
    if (authState?.accessToken) {
      config.headers.Authorization = `Bearer ${authState.accessToken}`
    }

    return config
  },
  (error) => {
    console.error('请求拦截器错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
http.interceptors.response.use(
  (response) => {
    // 直接返回响应数据
    return response.data
  },
  async (error) => {
    const originalRequest = error.config

    // 如果是 401 错误且不是刷新 token 的请求，尝试刷新 token
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/refresh'
    ) {
      originalRequest._retry = true

      try {
        const authState = await getCurrentAuthState()
        if (authState?.refreshToken) {
          // 刷新 token
          const response = await http.post('/auth/refresh', {
            refresh_token: authState.refreshToken
          })

          // 更新原始请求的 token
          const newToken = response.data.access_token
          originalRequest.headers.Authorization = `Bearer ${newToken}`

          // 重试原始请求
          return http(originalRequest)
        }
      } catch (refreshError) {
        console.error('刷新 token 失败:', refreshError)
        return Promise.reject(refreshError)
      }
    }

    // 处理其他错误
    const errorMessage = error.response?.data?.message || error.message || '请求失败'
    console.error('响应错误:', {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      message: errorMessage
    })

    return Promise.reject(new Error(errorMessage))
  }
)

// 导出类型安全的请求方法
export const request = {
  get: <T>(url: string, config = {}) => http.get<T, T>(url, config),
  post: <T>(url: string, data = {}, config = {}) => http.post<T, T>(url, data, config),
  put: <T>(url: string, data = {}, config = {}) => http.put<T, T>(url, data, config),
  delete: <T>(url: string, config = {}) => http.delete<T, T>(url, config),
  patch: <T>(url: string, data = {}, config = {}) => http.patch<T, T>(url, data, config)
}

export default http
