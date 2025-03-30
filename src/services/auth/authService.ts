import { db } from '../../db/config'

import { v5 as uuidv5 } from 'uuid'
import { machineIdSync } from 'node-machine-id'
import os from 'os'
import { encrypt, decrypt } from '../utils/crypto'
import { AuthState } from '@shared/types'
import { request } from '../utils/http'

// 网络状态缓存
interface NetworkStatusCache {
  isOnline: boolean
  timestamp: number
}

let networkStatusCache: NetworkStatusCache | null = null
// 设置缓存时间为4小时
const NETWORK_CHECK_INTERVAL = 24 * 60 * 60 * 1000

/**
 * 认证服务模块
 *
 * 主要功能：
 * 1. 处理用户登录、登出
 * 2. 管理认证状态
 * 3. 处理离线验证
 * 4. Token 刷新
 */

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

/**
 * 获取设备信息
 *
 * 功能：
 * 1. 获取机器唯一标识符
 * 2. 使用 UUID v5 生成标准设备 ID
 * 3. 获取设备名称（主机名）
 *
 * @returns {Object} 设备信息对象，包含设备类型、名称、标识符和IP
 */
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

/**
 * 将数据库记录转换为认证状态对象
 *
 * 功能：
 * 1. 解密存储的认证数据
 * 2. 将解密后的 JSON 转换为 AuthState 对象
 *
 * @param record 数据库记录
 * @returns {AuthState} 认证状态对象
 * @throws 解密失败时抛出错误
 */
function convertToAuthState(record: any): AuthState {
  try {
    const decrypted = decrypt(record.encryptedData)
    return JSON.parse(decrypted)
  } catch (error) {
    console.error('解密认证状态失败:', error)
    throw error
  }
}

/**
 * 保存认证状态到本地数据库
 *
 * 功能：
 * 1. 加密认证状态数据
 * 2. 清除旧的认证记录
 * 3. 保存新的认证状态
 *
 * @param state 要保存的认证状态
 * @throws 保存失败时抛出错误
 */
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

/**
 * 检查网络连接状态
 *
 * 功能：
 * 1. 优先使用缓存的网络状态（4小时内有效）
 * 2. 通过 /auth/status 接口检测网络连接
 * 3. 即使接口返回错误也视为网络正常（只要有响应）
 * 4. 只有完全无法连接时才判定为离线
 *
 * @returns {Promise<boolean>} true 表示网络正常，false 表示离线
 */
export async function checkNetworkStatus(): Promise<boolean> {
  const now = Date.now()

  // 如果缓存存在且未过期，直接返回缓存的结果
  if (networkStatusCache && now - networkStatusCache.timestamp < NETWORK_CHECK_INTERVAL) {
    console.log('authService→ 使用缓存的网络状态:', networkStatusCache.isOnline)
    return networkStatusCache.isOnline
  }

  try {
    // console.log('authService→ 开始检查网络状态')
    // const start = Date.now()
    await request.get('/auth/status', { timeout: 3000 })
    // const duration = Date.now() - start
    // console.log(`authService→ 网络检查成功, 耗时: ${duration}ms`)

    // 更新缓存
    networkStatusCache = {
      isOnline: true,
      timestamp: now
    }
    return true
  } catch (error) {
    console.log('authService→ 网络检查失败:', error)
    // 即使接口返回错误，只要有响应就说明网络是通的
    const isOnline = !!(error as any).response

    // 更新缓存
    networkStatusCache = {
      isOnline,
      timestamp: now
    }

    if (isOnline) {
      console.log('authService→ 网络正常,但接口返回错误:', (error as any).response.status)
    }
    return isOnline
  }
}

/**
 * 用户登录
 *
 * 功能：
 * 1. 获取设备信息
 * 2. 调用登录 API
 * 3. 保存认证状态
 * 4. 处理永久授权和过期时间
 *
 * @param email 用户邮箱
 * @param password 用户密码
 * @returns {Promise<AuthState>} 认证状态对象
 * @throws 登录失败时抛出错误
 */
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

/**
 * 刷新访问令牌
 *
 * 功能：
 * 1. 使用刷新令牌获取新的访问令牌
 * 2. 更新本地存储的认证状态
 * 3. 更新最后验证时间
 *
 * @param token 刷新令牌
 * @returns {Promise<AuthState>} 更新后的认证状态
 * @throws 刷新失败时抛出错误
 */
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

/**
 * 用户登出
 *
 * 功能：
 * 1. 调用登出 API
 * 2. 删除设备记录
 * 3. 清除本地认证状态
 * 4. 即使 API 调用失败也会清除本地状态
 *
 * @throws 清除本地状态失败时抛出错误
 */
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

/**
 * 获取当前认证状态
 *
 * 功能：
 * 1. 从本地数据库获取认证记录
 * 2. 解密并转换为认证状态对象
 *
 * @returns {Promise<AuthState | null>} 认证状态对象，不存在时返回 null
 * @throws 获取或解密失败时抛出错误
 */
export async function getCurrentAuthState(): Promise<AuthState | null> {
  try {
    const record = await db('auth_state').first()
    // console.log('authService→ 从数据库获取的认证记录:', record)

    if (record) {
      const state = convertToAuthState(record)
      // console.log('authService→ 转换后的认证状态:', {
      //   hasUser: !!state.user,
      //   licenseType: state.user?.licenseType,
      //   expiresAt: state.expiresAt
      // })
      return state
    }
    return null
  } catch (error) {
    console.error('authService→ 获取认证状态失败:', error)
    throw error
  }
}

/**
 * 验证网络连接和认证状态
 *
 * 功能：
 * 1. 检查网络连接状态
 * 2. 验证访问令牌
 * 3. 更新用户信息和最后验证时间
 * 4. 处理 token 刷新
 *
 * @param state 当前认证状态
 * @returns {Promise<boolean>} true 表示验证成功，false 表示验证失败
 */
async function checkNetworkAndVerify(state: AuthState): Promise<boolean> {
  try {
    // 检查网络状态
    const isOnline = await checkNetworkStatus()
    if (!isOnline) {
      console.log('authService→ 网络离线，跳过验证')
      return false
    }

    // 验证 token
    const response = await request.get('/auth/verify', {
      headers: { Authorization: `Bearer ${state.accessToken}` }
    })

    // 更新用户信息和最后验证时间
    const verifyData = response.data
    if (verifyData.valid && verifyData.user) {
      await saveAuthState({
        ...state,
        user: verifyData.user,
        lastVerified: new Date().toISOString()
      })
      console.log('authService→ 验证成功，已更新用户信息')
      return true
    }

    return false
  } catch (error) {
    console.log('authService→ 验证失败，尝试刷新 token')
    // 如果是认证错误，尝试刷新 token
    if ((error as any).response?.status === 401) {
      try {
        if (!state.refreshToken) {
          throw new Error('刷新 token 不存在')
        }
        await refreshToken(state.refreshToken)
        return true
      } catch (refreshError) {
        console.error('authService→ 刷新 token 失败:', refreshError)
        return false
      }
    }

    return false
  }
}

/**
 * 验证认证状态
 *
 * 功能：
 * 1. 检查本地认证状态是否存在
 * 2. 验证许可证是否过期
 * 3. 对永久授权用户提供30天的离线使用期
 * 4. 其他情况需要网络验证
 *
 * 验证流程：
 * 1. 先检查本地状态和过期时间
 * 2. 永久授权用户30天内验证过则直接通过
 * 3. 其他情况进行网络验证
 *
 * @returns {Promise<boolean>} true 表示验证通过，false 表示验证失败
 */
export async function verifyAuthState(): Promise<boolean> {
  try {
    const state = await getCurrentAuthState()
    // console.log('authService→ 当前认证状态:', {
    //   hasState: !!state,
    //   hasUser: !!state?.user,
    //   licenseType: state?.user?.licenseType,
    //   lastVerified: state?.lastVerified,
    //   expiresAt: state?.expiresAt
    // })

    if (!state || !state.user) return false

    const now = new Date()
    const lastVerified = new Date(state.lastVerified)
    const expiresAt = new Date(state.expiresAt)

    // 如果已过期，直接返回 false
    if (expiresAt < now) {
      console.log('authService→ 许可证已过期:', {
        now,
        expiresAt,
        diff: expiresAt.getTime() - now.getTime()
      })
      await db('auth_state').delete()
      return false
    }

    // 如果在30天内验证过，且是永久授权，直接返回 true
    const isRecentlyVerified = now.getTime() - lastVerified.getTime() < 30 * 24 * 60 * 60 * 1000
    if (isRecentlyVerified && state.user.licenseType === 'desktop_permanent') {
      // console.log('authService→ 最近已验证过，且是永久授权:', {
      //   lastVerified,
      //   timeSinceLastVerification: now.getTime() - lastVerified.getTime(),
      //   licenseType: state.user.licenseType
      // })
      return true
    }

    // 否则进行网络验证
    const networkVerifyResult = await checkNetworkAndVerify(state)
    console.log('authService→ 网络验证结果:', networkVerifyResult)
    return networkVerifyResult
  } catch (error) {
    console.error('authService→ 验证失败:', error)
    return false
  }
}
