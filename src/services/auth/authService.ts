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

// 登录
export async function login(email: string, password: string): Promise<AuthState> {
  try {
    const deviceInfo = getDeviceInfo()

    console.log('authService.ts→ 登录', deviceInfo)

    const data = await request.post<LoginResponse>('/auth/login', {
      email,
      password,
      deviceType: deviceInfo.deviceType,
      deviceName: deviceInfo.deviceName,
      deviceIdentifier: deviceInfo.deviceIdentifier,
      ipAddress: deviceInfo.ipAddress
    })

    const authState: AuthState = {
      user: data.user,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      deviceId: deviceInfo.deviceIdentifier,
      deviceName: deviceInfo.deviceName,
      lastVerified: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
    }

    const encryptedData = encrypt(JSON.stringify(authState))
    await db('auth_state')
      .delete()
      .then(() =>
        db('auth_state').insert({
          id: deviceInfo.deviceIdentifier,
          encryptedData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      )

    return authState
  } catch (error) {
    console.error('后端→ 登录失败:', error)
    throw error
  }
}

// 刷新 token
export async function refreshToken(token: string): Promise<AuthState> {
  try {
    const data = await request.post<RefreshTokenResponse>('/auth/refresh', {
      refresh_token: token
    })

    const currentState = await getCurrentAuthState()
    if (!currentState) {
      throw new Error('未找到认证状态')
    }

    const newState: AuthState = {
      ...currentState,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      lastVerified: new Date().toISOString()
    }

    const encryptedData = encrypt(JSON.stringify(newState))
    await db('auth_state')
      .update({
        encryptedData,
        updatedAt: new Date()
      })
      .where('id', currentState.deviceId)

    return newState
  } catch (error) {
    console.error('后端→ 刷新 token 失败:', error)
    throw error
  }
}

// 登出
export async function logout(): Promise<void> {
  try {
    const currentState = await getCurrentAuthState()
    if (!currentState) {
      return
    }

    console.log('authService.ts→ 登出前的认证状态:', {
      deviceId: currentState.deviceId,
      user: currentState.user
    })

    await request.post('/auth/logout', {
      deviceId: currentState.deviceId
    })

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

// 验证认证状态
export async function verifyAuthState(): Promise<boolean> {
  try {
    const state = await getCurrentAuthState()
    if (!state) {
      return false
    }

    // 检查是否过期
    const expiresAt = new Date(state.expiresAt)
    if (expiresAt < new Date()) {
      await db('auth_state').delete()
      return false
    }

    return true
  } catch (error) {
    console.error('后端→ 验证认证状态失败:', error)
    return false
  }
}
