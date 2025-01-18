import { db } from '../../db/config'

import { v5 as uuidv5 } from 'uuid'
import { machineIdSync } from 'node-machine-id'
import os from 'os'
import { encrypt, decrypt } from '../utils/crypto'
import { AuthState } from '@shared/types'
import { request } from '../utils/http'

// API 响应类型定义
interface LoginResponse {
  access_token: string
  refresh_token: string
  user: {
    id: string
    email: string
    username: string
    licenseType: 'free' | 'desktop_permanent'
    maxDevices: number
    licenseExpiredAt: string | null
  }
}

interface RefreshTokenResponse {
  access_token: string
  refresh_token: string
}

// 工具函数：获取设备信息
function getDeviceInfo() {
  const machineId = machineIdSync()
  // 使用 UUID v5 将 machineId 转换为标准 UUID
  const deviceUUID = uuidv5(machineId, uuidv5.URL)

  console.log('authService.ts→ 设备信息:', {
    machineId,
    deviceUUID
  })

  return {
    deviceType: 'desktop' as const,
    deviceName: os.hostname(),
    deviceIdentifier: deviceUUID, // 使用转换后的 UUID
    ipAddress: '127.0.0.1'
  }
}

// 工具函数：将数据库记录转换为 AuthState
function convertToAuthState(record: any): AuthState {
  try {
    const decrypted = decrypt(record.encryptedData)
    return JSON.parse(decrypted)
  } catch (error) {
    console.error('解密认证状态失败:', error)
    throw error
  }
}

// 添加保存认证状态的函数
async function saveAuthState(state: AuthState): Promise<void> {
  try {
    // 加密认证状态
    const encryptedData = encrypt(JSON.stringify(state))

    // 先删除现有记录（如果有的话）
    await db('auth_state').delete()

    // 插入新记录
    await db('auth_state').insert({
      id: state.deviceId, // 使用设备ID作为主键
      encryptedData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    console.log('authService.ts→ 认证状态保存成功')
  } catch (error) {
    console.error('保存认证状态失败:', error)
    throw error
  }
}

// 添加离线状态检测函数
export async function checkNetworkStatus(): Promise<boolean> {
  try {
    await request.get('/ping', { timeout: 3000 }) // 快速检查网络连接
    return true
  } catch (error) {
    return false
  }
}

// 登录
export async function login(email: string, password: string): Promise<AuthState> {
  try {
    const deviceInfo = getDeviceInfo()
    const { data } = await request.post<LoginResponse>('/auth/login', {
      ...deviceInfo,
      email,
      password
    })

    // 添加调试日志
    console.log('authService.ts→ 登录响应数据:', data)

    // 从 data 中获取数据
    const { user, access_token, refresh_token } = data

    const authState: AuthState = {
      user,
      accessToken: access_token,
      refreshToken: refresh_token,
      deviceId: deviceInfo.deviceIdentifier,
      deviceName: deviceInfo.deviceName,
      lastVerified: new Date().toISOString(),
      expiresAt:
        user.licenseExpiredAt || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
    }

    // 加密存储认证状态
    await saveAuthState(authState)

    return authState
  } catch (error) {
    console.error('登录失败:', error)
    throw error
  }
}

// 刷新 token
export async function refreshToken(token: string): Promise<AuthState> {
  try {
    const { data } = await request.post<RefreshTokenResponse>('/auth/refresh', {
      refresh_token: token
    })

    // 从 data 中获取数据
    const { access_token, refresh_token } = data

    // 获取当前认证状态
    const currentState = await getCurrentAuthState()
    if (!currentState) {
      throw new Error('无法获取当前认证状态')
    }

    const authState: AuthState = {
      ...currentState,
      accessToken: access_token,
      refreshToken: refresh_token,
      lastVerified: new Date().toISOString()
    }

    // 加密存储更新后的认证状态
    await saveAuthState(authState)

    return authState
  } catch (error) {
    console.error('刷新 token 失败:', error)
    throw error
  }
}

// 登出
export async function logout(): Promise<void> {
  try {
    const currentState = await getCurrentAuthState()
    if (!currentState) {
      console.log('authService.ts→ 当前没有登录状态，直接清除本地数据')
      await db('auth_state').delete()
      return
    }

    console.log('authService.ts→ 登出前的认证状态:', {
      deviceId: currentState.deviceId,
      accessToken: currentState.accessToken ? '存在' : '不存在'
    })

    try {
      // 确保请求头中包含 token
      const config = {
        headers: {
          Authorization: `Bearer ${currentState.accessToken}`
        }
      }

      // 尝试调用登出 API
      await request.post(
        '/auth/logout',
        {
          deviceId: currentState.deviceId
        },
        config
      )

      // 尝试删除设备
      await request.delete(`/devices/identifier/${currentState.deviceId}`, config)
    } catch (error) {
      console.log('authService.ts→ 登出或删除设备失败:', error)
      // 即使 API 调用失败，也继续清除本地状态
    }

    // 无论如何都清除本地认证状态
    await db('auth_state').delete()
  } catch (error) {
    console.error('后端→ 登出失败:', error)
    throw error
  }
}

// 获取当前认证状态
export async function getCurrentAuthState(): Promise<AuthState | null> {
  try {
    const record = await db('auth_state').first()
    return record ? convertToAuthState(record) : null
  } catch (error) {
    console.error('后端→ 获取认证状态失败:', error)
    throw error
  }
}

// 添加网络验证函数
async function checkNetworkAndVerify(state: AuthState): Promise<boolean> {
  try {
    // 检查网络状态
    const isOnline = await checkNetworkStatus()
    if (!isOnline) {
      return false
    }

    // 验证 token
    await request.post('/auth/verify', null, {
      headers: { Authorization: `Bearer ${state.accessToken}` }
    })

    // 更新最后验证时间
    await saveAuthState({
      ...state,
      lastVerified: new Date().toISOString()
    })

    return true
  } catch (error) {
    console.error('网络验证失败:', error)
    return false
  }
}

// 修改验证状态函数
export async function verifyAuthState(): Promise<boolean> {
  try {
    const state = await getCurrentAuthState()
    if (!state) return false

    // 先检查本地过期时间
    const now = new Date()
    const lastVerified = new Date(state.lastVerified)
    const expiresAt = new Date(state.expiresAt)

    // 如果已过期，直接返回 false
    if (expiresAt < now) {
      await db('auth_state').delete()
      return false
    }

    // 如果在30天内验证过，直接返回true
    if (now.getTime() - lastVerified.getTime() < 30 * 24 * 60 * 60 * 1000) {
      return true
    }

    // 否则进行网络验证
    return await checkNetworkAndVerify(state)
  } catch (error) {
    console.error('验证失败:', error)
    return false
  }
}
