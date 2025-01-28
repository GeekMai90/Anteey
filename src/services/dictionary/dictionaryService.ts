// 词典服务
import { Knex } from 'knex/types'
import { db } from '../../db/config'
import log from 'electron-log/renderer'

// 接口定义
export interface DictWord {
  word: string
  weight: number
  frequency: number
  documents: number
  lastSeen: number
  cooccurrences: string // JSON 字符串
  source: 'auto' | 'manual'
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface WordSuggestion {
  word: string
  weight: number
  score: number
  reason: string // JSON 字符串
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: Date
  processedAt?: Date
}

// 工具函数：转换 cooccurrences
function convertCooccurrences(record: DictWord) {
  try {
    return {
      ...record,
      cooccurrences: JSON.parse(record.cooccurrences)
    }
  } catch (error) {
    log.error('解析共现词失败:', error)
    return {
      ...record,
      cooccurrences: {}
    }
  }
}

// 保存词条
export async function saveWord(word: Omit<DictWord, 'createdAt' | 'updatedAt'>): Promise<DictWord> {
  try {
    const now = new Date()
    const newWord = {
      ...word,
      cooccurrences: JSON.stringify(word.cooccurrences),
      createdAt: now,
      updatedAt: now
    }

    const [savedWord] = await db('dictionary')
      .insert(newWord)
      .onConflict('word')
      .merge({
        weight: word.weight,
        frequency: db.raw('dictionary.frequency + ?', [word.frequency]),
        documents: db.raw('dictionary.documents + ?', [word.documents]),
        lastSeen: word.lastSeen,
        cooccurrences: JSON.stringify(word.cooccurrences),
        updatedAt: now
      })
      .returning('*')

    return convertCooccurrences(savedWord)
  } catch (error) {
    log.error('保存词条失败:', error)
    throw error
  }
}

// 批量保存词条
export async function saveWords(
  words: Array<Omit<DictWord, 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    await db.transaction(async (trx) => {
      const now = new Date()
      for (const word of words) {
        await trx('dictionary')
          .insert({
            ...word,
            cooccurrences: JSON.stringify(word.cooccurrences),
            createdAt: now,
            updatedAt: now
          })
          .onConflict('word')
          .merge({
            weight: word.weight,
            frequency: db.raw('dictionary.frequency + ?', [word.frequency]),
            documents: db.raw('dictionary.documents + ?', [word.documents]),
            lastSeen: word.lastSeen,
            cooccurrences: JSON.stringify(word.cooccurrences),
            updatedAt: now
          })
      }
    })
  } catch (error) {
    log.error('批量保存词条失败:', error)
    throw error
  }
}

// 获取词典
// export async function getDictionary(): Promise<DictWord[]> {
//   try {
//     const words = await db('dictionary').where('enabled', true).orderBy('frequency', 'desc')

//     return words.map(convertCooccurrences)
//   } catch (error) {
//     log.error('获取词典失败:', error)
//     throw error
//   }
// }
// export async function getDictionary(): Promise<DictWord[]> {
//   try {
//     const words = await db.transaction(async (trx) => {
//       return await trx('dictionary').where('enabled', true).orderBy('frequency', 'desc')
//     })

//     return words.map(convertCooccurrences)
//   } catch (error) {
//     log.error('获取词典失败:', error)
//     throw error
//   }
// }
export async function getDictionary(trx?: Knex.Transaction): Promise<DictWord[]> {
  try {
    const dbConnection = trx || db
    const words = await dbConnection('dictionary')
      .where('enabled', true)
      .orderBy('frequency', 'desc')

    return words.map(convertCooccurrences)
  } catch (error) {
    log.error('获取词典失败:', error)
    throw error
  }
}

// 保存建议
export async function saveSuggestions(
  suggestions: Array<Omit<WordSuggestion, 'createdAt' | 'processedAt'>>
): Promise<void> {
  try {
    const now = new Date()
    await db.transaction(async (trx) => {
      for (const suggestion of suggestions) {
        await trx('dictionary_suggestions')
          .insert({
            ...suggestion,
            reason: JSON.stringify(suggestion.reason),
            createdAt: now
          })
          .onConflict('word')
          .merge({
            weight: suggestion.weight,
            score: suggestion.score,
            reason: JSON.stringify(suggestion.reason),
            status: suggestion.status,
            createdAt: now
          })
      }
    })
  } catch (error) {
    log.error('保存建议失败:', error)
    throw error
  }
}

// 获取待处理的建议
export async function getPendingSuggestions(): Promise<WordSuggestion[]> {
  try {
    const suggestions = await db('dictionary_suggestions')
      .where('status', 'pending')
      .orderBy('score', 'desc')

    return suggestions.map((suggestion) => ({
      ...suggestion,
      reason: JSON.parse(suggestion.reason)
    }))
  } catch (error) {
    log.error('获取待处理建议失败:', error)
    throw error
  }
}

// 处理建议
export async function processSuggestion(
  word: string,
  status: 'accepted' | 'rejected'
): Promise<void> {
  try {
    await db.transaction(async (trx) => {
      const now = new Date()

      // 更新建议状态
      await trx('dictionary_suggestions').where('word', word).update({
        status,
        processedAt: now
      })

      // 如果接受建议，将词条添加到词典
      if (status === 'accepted') {
        const suggestion = await trx('dictionary_suggestions').where('word', word).first()

        if (suggestion) {
          await trx('dictionary').insert({
            word: suggestion.word,
            weight: suggestion.weight,
            frequency: 1,
            documents: 1,
            lastSeen: Date.now(),
            cooccurrences: '{}',
            source: 'auto',
            enabled: true,
            createdAt: now,
            updatedAt: now
          })
        }
      }
    })
  } catch (error) {
    log.error('处理建议失败:', error)
    throw error
  }
}

// 清理过期数据
export async function cleanupDictionary(days: number = 30): Promise<void> {
  try {
    const threshold = Date.now() - days * 24 * 60 * 60 * 1000

    await db.transaction(async (trx) => {
      // 清理过期的自动学习词条
      await trx('dictionary').where('source', 'auto').where('lastSeen', '<', threshold).delete()

      // 清理过期的建议
      await trx('dictionary_suggestions').where('createdAt', '<', threshold).delete()
    })
  } catch (error) {
    log.error('清理过期数据失败:', error)
    throw error
  }
}
// ... 现有代码 ...

// 获取所有词典词条（包括系统和自定义）
export async function getAllDictionaryWords(): Promise<DictWord[]> {
  try {
    const words = await db('dictionary').select('*').orderBy('createdAt', 'desc')

    return words.map(convertCooccurrences)
  } catch (error) {
    log.error('获取所有词条失败:', error)
    throw error
  }
}

// 添加自定义词条
export async function addCustomWord(word: string): Promise<DictWord> {
  try {
    const now = new Date()
    const [newWord] = await db('dictionary')
      .insert({
        word,
        weight: 10, // 自定义词条默认权重
        frequency: 1,
        documents: 1,
        lastSeen: Date.now(),
        cooccurrences: '{}',
        source: 'manual', // 标记为手动添加
        enabled: true,
        createdAt: now,
        updatedAt: now
      })
      .returning('*')

    return convertCooccurrences(newWord)
  } catch (error) {
    log.error('添加自定义词条失败:', error)
    throw error
  }
}

// 删除词条
export async function deleteWord(word: string): Promise<void> {
  try {
    await db('dictionary').where('word', word).delete()
  } catch (error) {
    log.error('删除词条失败:', error)
    throw error
  }
}

// 批量删除词条
export async function deleteWords(words: string[]): Promise<void> {
  try {
    await db.transaction(async (trx) => {
      await trx('dictionary').whereIn('word', words).delete()
    })
  } catch (error) {
    log.error('批量删除词条失败:', error)
    throw error
  }
}

// 搜索词条
export async function searchWords(query: string): Promise<DictWord[]> {
  try {
    const words = await db('dictionary')
      .where('word', 'like', `%${query}%`)
      .orderBy('createdAt', 'desc')

    return words.map(convertCooccurrences)
  } catch (error) {
    log.error('搜索词条失败:', error)
    throw error
  }
}

// 更新词条状态
export async function updateWordStatus(word: string, enabled: boolean): Promise<void> {
  try {
    await db('dictionary').where('word', word).update({
      enabled,
      updatedAt: new Date()
    })
  } catch (error) {
    log.error('更新词条状态失败:', error)
    throw error
  }
}
