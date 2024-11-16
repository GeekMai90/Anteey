import { Segment, useDefault } from 'segmentit'
import log from 'electron-log'
import { Keyword } from '../../renderer/src/types/Embedding'

export class KeywordExtractor {
  private static instance: KeywordExtractor
  private segment: any | null = null

  // 技术术语词典
  private readonly TECH_TERMS = new Map([
    ['react', { standard: 'React', weight: 1.5 }],
    ['nextjs', { standard: 'Next.js', weight: 1.5 }],
    ['typescript', { standard: 'TypeScript', weight: 1.4 }]
    // ... 其他技术术语
  ])

  private constructor() {
    this.initSegment()
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): KeywordExtractor {
    if (!KeywordExtractor.instance) {
      KeywordExtractor.instance = new KeywordExtractor()
    }
    return KeywordExtractor.instance
  }

  /**
   * 初始化分词器
   */
  private initSegment(): void {
    try {
      this.segment = useDefault(new Segment())
      // 添加初始化检查
      if (!this.segment || typeof this.segment.doSegment !== 'function') {
        throw new Error('分词器初始化不完整')
      }
      log.info('分词器初始化成功', {
        segmentExists: !!this.segment,
        hasDoSegment: typeof this.segment.doSegment === 'function'
      })
    } catch (error) {
      log.error('分词器初始化失败:', error)
      this.segment = null
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
        .replace(/[^\u4e00-\u9fa5a-z0-9\s.,!?，。！？、]/g, ' ')
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
  public extract(content: any): Keyword[] {
    try {
      if (!this.segment) {
        throw new Error('分词器未初始化')
      }

      // 1. 提取和预处理文本
      const rawText = this.extractTextContent(content)
      console.log('原始文本:', { length: rawText.length, sample: rawText.slice(0, 100) })

      const text = this.preProcessText(rawText)
      console.log('预处理后文本:', { length: text.length, sample: text.slice(0, 100) })

      if (!text) {
        log.warn('预处理后文本为空')
        return []
      }

      // 2. 分词并获取词性
      const tokens = this.segment.doSegment(text)
      console.log('分词结果:', {
        tokenCount: tokens.length,
        sampleTokens: tokens.slice(0, 5)
      })

      // 3. 统计词频和计算权重
      const wordStats = new Map<string, { freq: number; pos: string }>()
      let totalWords = 0

      tokens.forEach((token: any) => {
        const { w: word, p: pos } = token
        if (word.length < 2) return

        const key = word.toLowerCase()
        const current = wordStats.get(key) || { freq: 0, pos }
        wordStats.set(key, { freq: current.freq + 1, pos })
        totalWords++
      })

      console.log('词频统计:', {
        uniqueWords: wordStats.size,
        totalWords
      })

      // 4. 生成关键词列表
      const keywords = Array.from(wordStats.entries())
        .map(([word, { freq, pos }]) => {
          let weight = freq / totalWords

          // 技术术语加权
          const techTerm = this.TECH_TERMS.get(word)
          if (techTerm) {
            weight *= techTerm.weight
            word = techTerm.standard
          }

          // 词性加权
          if (['n', 'v', 'vn', 'nz'].includes(pos)) {
            weight *= 1.2
          }

          return { word, weight }
        })
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 10)

      console.log('最终关键词:', keywords)

      return keywords
    } catch (error) {
      log.error('关键词提取失败:', error)
      return []
    }
  }
}

// 导出单例实例
export const keywordExtractor = KeywordExtractor.getInstance()
