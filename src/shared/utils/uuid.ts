import * as uuid from 'uuid'

/**
 * 生成 UUID v4
 * 统一的UUID生成方法，避免在Electron打包后的导入问题
 */
export function generateUUID(): string {
  return uuid.v4()
}

/**
 * 验证UUID格式
 */
export function isValidUUID(value: string): boolean {
  return uuid.validate(value)
}

/**
 * 获取UUID版本
 */
export function getUUIDVersion(value: string): number | undefined {
  return uuid.version(value)
}

// 为了向后兼容，导出v4方法
export const v4 = generateUUID

// 重新导出其他可能需要的UUID方法
export const { v1, v3, v5, validate, version } = uuid
