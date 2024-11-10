import { ipcMain } from 'electron'
import * as DictionaryService from '../../db/dictionaryService'
import log from 'electron-log'

export function setupDictionaryHandlers() {
  // 获取待处理的建议
  ipcMain.handle('dictionary:getPendingSuggestions', async () => {
    try {
      return await DictionaryService.getPendingSuggestions()
    } catch (error) {
      log.error('获取待处理建议失败:', error)
      throw error
    }
  })

  // 处理建议（接受/拒绝）
  ipcMain.handle(
    'dictionary:processSuggestion',
    async (_, word: string, status: 'accepted' | 'rejected') => {
      try {
        await DictionaryService.processSuggestion(word, status)
      } catch (error) {
        log.error('处理建议失败:', error)
        throw error
      }
    }
  )

  // 获取词典
  ipcMain.handle('dictionary:getDictionary', async () => {
    try {
      return await DictionaryService.getDictionary()
    } catch (error) {
      log.error('获取词典失败:', error)
      throw error
    }
  })

  // 清理过期数据
  ipcMain.handle('dictionary:cleanup', async (_, days: number) => {
    try {
      await DictionaryService.cleanupDictionary(days)
    } catch (error) {
      log.error('清理词典数据失败:', error)
      throw error
    }
  })

  // 批量处理建议
  ipcMain.handle(
    'dictionary:processSuggestionBatch',
    async (_, words: string[], status: 'accepted' | 'rejected') => {
      try {
        await Promise.all(words.map((word) => DictionaryService.processSuggestion(word, status)))
      } catch (error) {
        log.error('批量处理建议失败:', error)
        throw error
      }
    }
  )
  // 获取所有词典词条（包括系统和自定义）
  ipcMain.handle('dictionary:getAllWords', async () => {
    try {
      return await DictionaryService.getAllDictionaryWords()
    } catch (error) {
      log.error('获取所有词条失败:', error)
      throw error
    }
  })

  // 添加自定义词条
  ipcMain.handle('dictionary:addWord', async (_, word: string) => {
    try {
      return await DictionaryService.addCustomWord(word)
    } catch (error) {
      log.error('添加自定义词条失败:', error)
      throw error
    }
  })

  // 删除词条
  ipcMain.handle('dictionary:deleteWord', async (_, word: string) => {
    try {
      await DictionaryService.deleteWord(word)
    } catch (error) {
      log.error('删除词条失败:', error)
      throw error
    }
  })

  // 批量删除词条
  ipcMain.handle('dictionary:deleteWords', async (_, words: string[]) => {
    try {
      await DictionaryService.deleteWords(words)
    } catch (error) {
      log.error('批量删除词条失败:', error)
      throw error
    }
  })

  // 搜索词条
  ipcMain.handle('dictionary:searchWords', async (_, query: string) => {
    try {
      return await DictionaryService.searchWords(query)
    } catch (error) {
      log.error('搜索词条失败:', error)
      throw error
    }
  })

  // 更新词条状态
  ipcMain.handle('dictionary:updateWordStatus', async (_, word: string, enabled: boolean) => {
    try {
      await DictionaryService.updateWordStatus(word, enabled)
    } catch (error) {
      log.error('更新词条状态失败:', error)
      throw error
    }
  })
}
