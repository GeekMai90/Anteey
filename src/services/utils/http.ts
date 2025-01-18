import axios from 'axios'
import { config } from '../../config'

// 创建 axios 实例
export const request = axios.create({
  baseURL: config.apiBaseURL, // 使用配置文件中的 URL
  timeout: 5000, // 减少超时时间
  headers: {
    'Content-Type': 'application/json'
  }
})

// 响应拦截器
request.interceptors.response.use(
  (response) => response,
  async (error) => {
    // 最多重试2次
    const maxRetries = 2

    if (error.config && (!error.config.retryCount || error.config.retryCount < maxRetries)) {
      error.config.retryCount = (error.config.retryCount || 0) + 1

      // 重试延迟增加
      const delay = error.config.retryCount * 1000
      await new Promise((resolve) => setTimeout(resolve, delay))

      return request(error.config)
    }

    throw error
  }
)
