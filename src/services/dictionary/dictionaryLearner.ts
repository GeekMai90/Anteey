// 通过用户笔记词频和共现词来学习词典
import * as nodejieba from 'nodejieba'
import log from 'electron-log/renderer'
import { TextProcessor, STOP_WORDS, JiebaWord } from './textProcessor'
import { saveSuggestions } from './dictionaryService'
import type { WordSuggestion } from './dictionaryService'

// 词统计接口
interface WordStats {
  frequency: number // 出现频率
  documents: number // 出现的文档数
  lastSeen: number // 最后一次出现时间
  cooccurrences: Map<string, number> // 共现词统计
}

export class DictionaryLearner {
  private wordStats = new Map<string, WordStats>()
  private totalDocuments = 0

  constructor() {
    log.info('初始化词典学习器')
  }

  // 从文本中学习
  // 从文本中学习
  public async learnFromText(text: string): Promise<void> {
    try {
      if (!text || typeof text !== 'string') {
        log.warn('无效的文本输入:', { type: typeof text })
        return
      }

      const processedText = TextProcessor.preProcessText(text)
      if (!processedText) {
        log.warn('预处理后文本为空')
        return
      }

      log.debug('准备提取关键词:', {
        原文长度: text.length,
        处理后长度: processedText.length,
        处理后文本前50字: processedText.slice(0, 50)
      })

      try {
        // 提取关键词
        const extractResult = nodejieba.extract(processedText, 20) as JiebaWord[]
        const words = new Set(
          extractResult
            .filter(({ word }) => !STOP_WORDS.has(word) && word.length >= 2 && !/^\d+$/.test(word))
            .map((item) => item.word)
        )

        // 更新统计信息
        words.forEach((word) => {
          const stats = this.wordStats.get(word) || {
            frequency: 0,
            documents: 0,
            lastSeen: 0,
            cooccurrences: new Map()
          }

          stats.frequency++
          stats.documents++
          stats.lastSeen = Date.now()

          // 统计共现词
          words.forEach((other) => {
            if (word !== other) {
              const count = stats.cooccurrences.get(other) || 0
              stats.cooccurrences.set(other, count + 1)
            }
          })

          this.wordStats.set(word, stats)
        })

        // 生成并保存建议
        if (words.size > 0) {
          const suggestions = this.generateSuggestions()
          if (suggestions.length > 0) {
            await saveSuggestions(suggestions)
            log.info('保存学习结果:', {
              文本长度: text.length,
              提取词数: words.size,
              建议词数: suggestions.length,
              示例建议: suggestions.slice(0, 3).map((s) => ({
                词: s.word,
                权重: s.weight,
                原因: s.reason
              }))
            })
          }
        }
      } catch (error) {
        log.error('nodejieba 处理失败:', {
          error,
          文本长度: processedText.length,
          文本示例: processedText.slice(0, 100)
        })
      }
    } catch (error) {
      log.error('文本学习失败:', error)
      // 不抛出错误，避免影响主流程
    }
  }

  // 从多篇笔记中学习
  async learnFromNotes(notes: Array<{ content: any }>) {
    try {
      this.totalDocuments = notes.length

      // 处理每篇笔记
      for (const note of notes) {
        const text = TextProcessor.extractText(note.content)
        this.learnFromText(text)
      }

      // 生成新词建议
      const suggestions = this.generateSuggestions()

      log.info('词典学习结果:', {
        分析文档数: this.totalDocuments,
        候选词数量: suggestions.length,
        建议词条: suggestions.slice(0, 10)
      })

      return suggestions
    } catch (error) {
      log.error('批量学习失败:', error)
      return []
    }
  }

  // 生成新词建议
  private generateSuggestions(): Array<Omit<WordSuggestion, 'createdAt' | 'processedAt'>> {
    const suggestions: Array<Omit<WordSuggestion, 'createdAt' | 'processedAt'>> = []

    // 确保至少有一个文档
    this.totalDocuments = Math.max(1, this.totalDocuments)

    log.debug('开始生成建议，当前统计:', {
      总文档数: this.totalDocuments,
      词统计数: this.wordStats.size
    })

    for (const [word, stats] of this.wordStats.entries()) {
      // 计算 TF-IDF 分数
      const tf = stats.frequency / this.totalDocuments
      const idf = Math.log(this.totalDocuments / Math.max(1, stats.documents))
      const tfidf = tf * idf

      // 计算共现词分数
      const cooccurrenceScore =
        Array.from(stats.cooccurrences.values()).reduce((sum, count) => sum + count, 0) /
        Math.max(1, stats.frequency)

      // 综合评分
      const score = Math.abs(tfidf * cooccurrenceScore) // 确保是正数

      log.debug('词评分详情:', {
        词: word,
        频率: stats.frequency,
        文档数: stats.documents,
        共现词数: stats.cooccurrences.size,
        TF分数: tf,
        IDF分数: idf,
        TFIDF分数: tfidf,
        共现分数: cooccurrenceScore,
        最终分数: score
      })

      // 极度放宽条件，先确保能生成建议
      const reasons: string[] = []
      if (stats.frequency >= 1) {
        // 只要出现过就行
        reasons.push(`出现${stats.frequency}次`)
      }
      if (stats.cooccurrences.size >= 1) {
        // 只要有一个共现词就行
        reasons.push(`与${stats.cooccurrences.size}个关键词相关`)
      }

      // 几乎不设门槛
      if (reasons.length > 0) {
        suggestions.push({
          word,
          weight: Math.max(1, Math.min(10, Math.round(score * 10))), // 确保权重在 1-10 之间
          score: Math.max(0.1, score), // 确保分数是正数
          reason: JSON.stringify(reasons),
          status: 'pending'
        })
      }
    }

    log.debug('生成建议结果:', {
      总词数: this.wordStats.size,
      建议数: suggestions.length,
      示例建议: suggestions.slice(0, 3).map((s) => ({
        词: s.word,
        权重: s.weight,
        分数: s.score,
        原因: JSON.parse(s.reason)
      }))
    })

    return suggestions.sort((a, b) => b.score - a.score)
  }

  // 清理过期数据
  // private cleanup() {
  //   const now = Date.now()
  //   const threshold = now - 30 * 24 * 60 * 60 * 1000 // 30天

  //   for (const [word, stats] of this.wordStats.entries()) {
  //     if (stats.lastSeen < threshold) {
  //       this.wordStats.delete(word)
  //     }
  //   }
  // }

  // 获取词典统计信息
  getStats() {
    return {
      总词数: this.wordStats.size,
      文档数: this.totalDocuments,
      词频统计: Array.from(this.wordStats.entries())
        .map(([word, stats]) => ({
          词: word,
          频率: stats.frequency,
          文档数: stats.documents,
          共现词数: stats.cooccurrences.size
        }))
        .sort((a, b) => b.频率 - a.频率)
        .slice(0, 20) // 只返回前20个高频词
    }
  }
}
