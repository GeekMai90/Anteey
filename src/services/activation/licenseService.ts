import { db } from '../../db/config'
import { License, ActivationResult } from '@shared/types'
import { v4 as uuidv4 } from 'uuid'
import { machineIdSync } from 'node-machine-id'
import crypto from 'crypto'

// 加密相关配置
const ENCRYPTION_KEY = crypto.scryptSync('antinet-license-key', 'antinet-salt', 32)
const IV_LENGTH = 16
const SECRET_KEY = 'antinet-geekmai-app-0228' // 需要与服务端保持一致

// 加密函数
function encrypt(data: any): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)

  const dataString = JSON.stringify(data)
  let encrypted = cipher.update(dataString, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  return `${iv.toString('hex')}:${encrypted}`
}

// 解密函数
function decrypt(encryptedData: string): any {
  const [ivHex, encrypted] = encryptedData.split(':')
  const iv = Buffer.from(ivHex, 'hex')

  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return JSON.parse(decrypted)
}

export async function getMachineId(): Promise<string> {
  return machineIdSync()
}

// 从激活码中解析有效期
function decryptValidDays(licenseKey: string): number {
  try {
    // 1. 分解激活码
    const [version, machineId, encryptedDays, checksum] = licenseKey.split('-')

    // 2. 验证校验码
    const expectedChecksum = crypto
      .createHash('sha256')
      .update(`${version}${machineId}${encryptedDays}`)
      .digest('hex')
      .substring(0, 4)
      .toUpperCase()

    if (checksum !== expectedChecksum) {
      throw new Error('无效的激活码')
    }

    // 3. 解密有效期
    // 遍历可能的天数（1-3650天），找到匹配的加密结果
    for (let days = 1; days <= 3650; days++) {
      const daysHex = days.toString(16).padStart(4, '0')
      const testEncrypted = crypto
        .createHmac('sha256', SECRET_KEY)
        .update(daysHex)
        .digest('hex')
        .substring(0, 4)
        .toUpperCase()

      if (testEncrypted === encryptedDays) {
        return days
      }
    }

    throw new Error('无效的有效期')
  } catch (error) {
    throw new Error('激活码解析失败')
  }
}

// 验证激活码
function verifyLicenseKey(activationCode: string, machineId: string): boolean {
  try {
    // 解析激活码
    const [version, hashedMachineId, encryptedDays, checksum] = activationCode.split('-')

    // 重新生成加密机器码
    const expectedHashedMachineId = crypto
      .createHash('sha256')
      .update(machineId)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase()

    // 重新生成校验码
    const expectedChecksum = crypto
      .createHash('sha256')
      .update(`${version}${hashedMachineId}${encryptedDays}`)
      .digest('hex')
      .substring(0, 4)
      .toUpperCase()

    // 验证加密机器码和校验码
    return hashedMachineId === expectedHashedMachineId && checksum === expectedChecksum
  } catch (error) {
    return false
  }
}

export async function activateLicense(activationCode: string): Promise<ActivationResult> {
  try {
    const machineId = await getMachineId()

    // 验证激活码
    if (!verifyLicenseKey(activationCode, machineId)) {
      return {
        success: false,
        message: '激活码无效'
      }
    }

    // 检查是否已经激活
    const existingLicense = await db('licenses').where({ machineId }).first()
    if (existingLicense) {
      try {
        const decrypted = decrypt(existingLicense.encryptedData)
        if (decrypted.license.status === 'active') {
          return { success: false, message: '该设备已经激活' }
        }
      } catch (error) {
        console.error('解密现有许可证失败:', error)
      }
    }

    // 解析有效期
    let validDays: number
    try {
      validDays = decryptValidDays(activationCode)
    } catch (error) {
      return {
        success: false,
        message: '激活码无效'
      }
    }

    // 设置许可证有效期
    const now = new Date()
    const expiresAt = new Date(now.getTime() + validDays * 24 * 60 * 60 * 1000)

    const license: License = {
      id: uuidv4(),
      machineId,
      activationCode,
      activatedAt: now,
      expiresAt,
      status: 'active',
      version: '1.0',
      level: 'pro' // 统一使用 pro 级别
    }

    // 生成数据哈希
    const hash = crypto.createHash('sha256').update(JSON.stringify(license)).digest('hex')

    // 加密数据
    const encryptedData = encrypt({ license, hash })

    // 存储加密数据
    await db('licenses').insert({
      id: license.id,
      machineId,
      encryptedData,
      createdAt: Date.now(),
      updatedAt: Date.now()
    })

    return { success: true, message: '激活成功', license }
  } catch (error) {
    console.error('激活失败:', error)
    return { success: false, message: String(error) }
  }
}

export async function checkLicenseStatus(): Promise<License | null> {
  try {
    const machineId = await getMachineId()
    const result = await db('licenses').where({ machineId }).first()

    if (!result?.encryptedData) {
      return null
    }

    try {
      // 解密数据
      const decrypted = decrypt(result.encryptedData)
      const { license, hash } = decrypted

      // 验证哈希
      const currentHash = crypto.createHash('sha256').update(JSON.stringify(license)).digest('hex')

      if (currentHash !== hash) {
        console.error('许可证数据完整性验证失败')
        return null
      }

      // 验证机器码
      if (license.machineId !== machineId) {
        console.error('机器码不匹配')
        return null
      }

      // 验证过期时间
      if (new Date(license.expiresAt) < new Date()) {
        console.error('许可证已过期')
        return null
      }

      return license
    } catch (error) {
      console.error('解密或验证许可证失败:', error)
      return null
    }
  } catch (error) {
    console.error('检查激活状态失败:', error)
    return null
  }
}
