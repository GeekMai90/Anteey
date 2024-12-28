import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const KEY = crypto.scryptSync('your-secret-password', 'salt', 32) // 生成 32 字节的密钥

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16) // 每次加密生成新的 IV
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return `${iv.toString('hex')}:${encrypted}` // 将 IV 和密文一起存储
}

export function decrypt(text: string): string {
  const [ivHex, encryptedText] = text.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
