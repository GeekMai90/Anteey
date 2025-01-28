import { Segment, useDefault } from 'segmentit'
import log from 'electron-log'
import { Keyword } from '@shared/types'
import { getAllDictionaryWords } from '@services/dictionary/dictionaryService'

export class KeywordExtractor {
  private static instance: KeywordExtractor | null = null
  private segment: any | null = null
  private initialized: boolean = false

  // 技术术语词典
  private readonly TECH_TERMS = new Map([
    ['react', { standard: 'React', weight: 1.5 }],
    ['nextjs', { standard: 'Next.js', weight: 1.5 }],
    ['typescript', { standard: 'TypeScript', weight: 1.4 }]
    // ... 其他技术术语
  ])

  private constructor() {
    // this.initSegment()
  }

  /**
   * 获取单例实例
   */
  public static async getInstance(): Promise<KeywordExtractor> {
    if (!KeywordExtractor.instance) {
      KeywordExtractor.instance = new KeywordExtractor()
    }

    // 如果还未初始化，则进行初始化
    if (!KeywordExtractor.instance.initialized) {
      await KeywordExtractor.instance.initSegment()
    }

    return KeywordExtractor.instance
  }

  /**
   * 初始化分词器
   */
  private async initSegment(): Promise<void> {
    if (this.initialized) return

    try {
      // 1. 使用 useDefault 初始化分词器
      this.segment = useDefault(new Segment())

      // 2. 加载用户自定义词典
      const dictWords = await getAllDictionaryWords()
      const customDictText = dictWords
        .filter((word) => word.enabled)
        .map((word) => {
          // 使用最高词频和原始权重
          return `${word.word} 9999 n ${word.weight}`
        })
        .join('\n')

      // 3. 加载自定义词典
      if (customDictText) {
        this.segment.loadDict(customDictText)
      }

      this.initialized = true
      log.info('分词器初始化成功', {
        dictSize: dictWords.filter((w) => w.enabled).length,
        sampleDict: customDictText.slice(0, 100)
      })
    } catch (error) {
      log.error('分词器初始化失败:', error)
      this.segment = null
      throw error
    }
  }

  /**
   * 提取文本内容
   */
  private extractTextContent(content: any): string {
    if (!content) return ''

    if (Array.isArray(content)) {
      return content
        .map((item) => this.extractTextContent(item))
        .filter(Boolean)
        .join(' ')
    }

    if (typeof content === 'object') {
      if (content.type === 'text' && content.text) {
        return content.text
      }
      if (content.content) {
        return this.extractTextContent(content.content)
      }
    }

    return String(content)
  }

  /**
   * 预处理文本
   */
  private preProcessText(text: string): string {
    try {
      let processedText = text.toLowerCase().trim()

      // 处理技术术语
      this.TECH_TERMS.forEach(({ standard }, term) => {
        const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
        processedText = processedText.replace(pattern, standard.replace(/\s+/g, '_'))
      })

      // 清理特殊字符
      return processedText
        .replace(/[^\u4e00-\u9fa5a-z0-9\s.,!?，。！？、_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    } catch (error) {
      log.error('文本预处理失败:', error)
      return ''
    }
  }

  /**
   * 提取关键词
   */
  public async extract(content: any): Promise<Keyword[]> {
    try {
      if (!this.segment) {
        throw new Error('分词器未初始化')
      }

      // 1. 提取和预处理文本
      const rawText = this.extractTextContent(content)
      const text = this.preProcessText(rawText)

      log.debug('文本处理:', {
        原始文本: { length: rawText.length, sample: rawText.slice(0, 100) },
        预处理文本: { length: text.length, sample: text.slice(0, 100) }
      })

      if (!text) {
        log.warn('预处理后文本为空')
        return []
      }

      // 2. 分词
      const tokens = this.segment.doSegment(text, {
        simple: false,
        stripPunctuation: true
      })

      // 3. 统计词频和计算权重
      const wordStats = new Map<string, { freq: number; pos: string; weight: number }>()
      let totalWords = 0

      tokens.forEach((token: any) => {
        const { w: word, p: pos, t: termWeight = 1 } = token
        // if (word.length < 2) return

        const current = wordStats.get(word) || {
          freq: 0,
          pos,
          weight: termWeight
        }

        wordStats.set(word, {
          freq: current.freq + 1,
          pos: current.pos,
          weight: current.weight
        })
        totalWords++
      })

      // 4. 生成关键词列表
      const keywords = Array.from(wordStats.entries())
        .map(([word, { freq, pos, weight }]) => {
          let finalWeight = freq / totalWords

          // 词性加权
          if (['n', 'v', 'vn', 'nz'].includes(pos)) {
            finalWeight *= 1.2
          }

          // segmentit词典权重
          finalWeight *= weight

          return { word, weight: finalWeight }
        })
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 10)

      log.debug('关键词提取结果:', {
        分词数: tokens.length,
        唯一词数: wordStats.size,
        关键词: keywords.map((k) => ({
          word: k.word,
          weight: k.weight.toFixed(4)
        }))
      })

      return keywords
    } catch (error) {
      log.error('关键词提取失败:', error)
      return []
    }
  }
}

// 修改导出方式
let extractor: KeywordExtractor | null = null

export const getKeywordExtractor = async () => {
  if (!extractor) {
    extractor = await KeywordExtractor.getInstance()
  }
  return extractor
}
