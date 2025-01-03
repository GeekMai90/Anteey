// src/utils/noteHelpers.ts

export function formatDate(
  date: Date | string | number,
  format: 'full' | 'default' = 'default'
): string {
  const d = new Date(date)

  if (format === 'full') {
    // 完整格式：YYYY 年 MM 月 DD 日 HH:mm
    return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(
      d.getDate()
    ).padStart(2, '0')}日 ${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes()
    ).padStart(2, '0')}`
  }

  // 默认格式：YYYY-MM-DD HH:mm
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(
    2,
    '0'
  )}`
}
