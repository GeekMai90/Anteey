import { parseAddress, getRelatedAddresses } from './addressParser'

// 测试用例
console.log('测试 parseAddress:')
console.log('解析 "1212":', parseAddress('1212'))
console.log('解析 "1212-1":', parseAddress('1212-1'))

console.log('\n测试 getRelatedAddresses:')
console.log('1212 的相关地址:', getRelatedAddresses('1212'))
console.log('1212-1 的相关地址:', getRelatedAddresses('1212-1'))
