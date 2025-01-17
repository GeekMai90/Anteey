// 用户信息接口
export interface User {
  id: string
  email: string
  username: string
  licenseType: 'free' | 'desktop_permanent'
  maxDevices: number
  licenseExpiredAt: string | null
}

// 登录请求参数
export interface LoginParams {
  email: string
  password: string
  deviceType: 'desktop'
  deviceName: string
  deviceIdentifier: string
  ipAddress: string
}

// 登录响应
export interface LoginResponse {
  access_token: string
  refresh_token: string
  user: User
}

// 刷新token请求参数
export interface RefreshTokenParams {
  refresh_token: string
}

// 刷新token响应
export interface RefreshTokenResponse {
  access_token: string
  refresh_token: string
}

// 本地存储的认证状态
export interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  deviceId: string
  deviceName: string
  lastVerified: string // ISO日期字符串
  expiresAt: string // ISO日期字符串
}

// API错误响应
export interface ApiError {
  code: number
  message: string
}
