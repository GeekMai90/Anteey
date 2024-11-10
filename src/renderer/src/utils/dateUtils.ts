// export function formatDate(dateString: string): string {
//   const date = new Date(dateString)
//   return `${date.getMonth() + 1}月${date.getDate()}日 ${date
//     .getHours()
//     .toString()
//     .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
// }
export function formatDate(date: Date | string): string {
  const dateObj = date instanceof Date ? date : new Date(date)
  return `${dateObj.getMonth() + 1}月${dateObj.getDate()}日 ${dateObj
    .getHours()
    .toString()
    .padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`
}
