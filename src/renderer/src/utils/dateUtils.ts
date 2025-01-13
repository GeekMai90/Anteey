export function formatDate(date: Date | string | number): string {
  const dateObj = date instanceof Date ? date : new Date(date)
  return `${dateObj.getMonth() + 1}月${dateObj.getDate()}日 ${dateObj
    .getHours()
    .toString()
    .padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`
}

// 如果需要更完整的日期格式（包含年份），可以添加这个方法
export function formatFullDate(date: Date | string | number): string {
  const dateObj = date instanceof Date ? date : new Date(date)
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(
    dateObj.getDate()
  ).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(
    dateObj.getMinutes()
  ).padStart(2, '0')}`
}
