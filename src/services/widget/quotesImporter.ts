import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import quotes from '../../db/quotes.json'

export async function importQuotes() {
  try {
    console.log('开始检查是否需要导入金句...')
    const result = await db('daily_quotes').count('* as count').first()
    const count = result ? Number(result.count) : 0

    console.log('当前金句数量:', count)

    if (count > 0) {
      console.log('金句已存在，跳过导入')
      return
    }

    console.log('准备导入金句数据...')
    // 准备导入数据
    const now = new Date()
    const quotesToInsert = quotes.quotes.map((quote) => ({
      id: uuidv4(),
      content: quote.content,
      author: quote.author,
      createdAt: now,
      updatedAt: now
    }))

    console.log(`即将导入 ${quotesToInsert.length} 条金句...`)
    // 批量插入数据
    await db('daily_quotes').insert(quotesToInsert)
    console.log(`成功导入 ${quotesToInsert.length} 条金句`)
  } catch (error) {
    console.error('导入金句失败:', error)
    throw error
  }
}
