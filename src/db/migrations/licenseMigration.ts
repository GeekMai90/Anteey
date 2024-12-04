import { db } from '../config'
import crypto from 'crypto'

// 加密配置
const ENCRYPTION_KEY = crypto.scryptSync('antinet-license-key', 'antinet-salt', 32)
const IV_LENGTH = 16

// 加密函数
function encrypt(data: any): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)

  const dataString = JSON.stringify(data)
  let encrypted = cipher.update(dataString, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  return `${iv.toString('hex')}:${encrypted}`
}

export async function migrateLicenseTable() {
  try {
    // 1. 检查是否需要迁移
    const hasEncryptedData = await db.schema.hasColumn('licenses', 'encryptedData')
    if (hasEncryptedData) {
      console.log('许可证表已经是最新结构，无需迁移')
      return
    }

    // 2. 获取所有现有许可证数据
    const oldLicenses = await db('licenses').select('*')

    // 3. 创建新表
    await db.schema.createTable('licenses_new', (table) => {
      table.string('id').primary()
      table.string('machineId').notNullable()
      table.text('encryptedData').notNullable()
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()
      table.index('machineId')
    })

    // 4. 迁移数据
    for (const oldLicense of oldLicenses) {
      // 构建许可证对象
      const license = {
        id: oldLicense.id,
        machineId: oldLicense.machineId,
        activationCode: oldLicense.activationCode,
        activatedAt: new Date(oldLicense.activatedAt),
        status: oldLicense.status,
        version: oldLicense.version,
        level: oldLicense.level,
        expiresAt: new Date(
          Date.now() + (oldLicense.level === 'pro' ? 365 : 180) * 24 * 60 * 60 * 1000
        )
      }

      // 生成哈希
      const hash = crypto.createHash('sha256').update(JSON.stringify(license)).digest('hex')

      // 加密数据
      const encryptedData = encrypt({ license, hash })

      // 插入新表
      await db('licenses_new').insert({
        id: license.id,
        machineId: license.machineId,
        encryptedData,
        createdAt: oldLicense.createdAt,
        updatedAt: Date.now()
      })
    }

    // 5. 替换旧表
    await db.schema.dropTable('licenses')
    await db.schema.renameTable('licenses_new', 'licenses')

    console.log('许可证表迁移完成')
  } catch (error) {
    console.error('许可证表迁移失败:', error)
    throw error
  }
}
