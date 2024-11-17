import { parseAddress, getRelatedAddresses } from './addressParser'

describe('Address Parser', () => {
  test('parseAddress should work correctly', () => {
    const result1 = parseAddress('1212')
    expect(result1).toEqual({
      segments: ['1212'],
      level: 1,
      isRoot: true
    })

    const result2 = parseAddress('1212-1')
    expect(result2).toEqual({
      segments: ['1212', '1'],
      level: 2,
      isRoot: false
    })
  })

  test('getRelatedAddresses should work correctly', () => {
    const result1 = getRelatedAddresses('1212')
    expect(result1).toEqual({
      parent: '',
      siblings: ['1211', '1213'],
      children: []
    })

    const result2 = getRelatedAddresses('1212-1')
    expect(result2).toEqual({
      parent: '1212',
      siblings: ['1212-2'],
      children: []
    })
  })
})
