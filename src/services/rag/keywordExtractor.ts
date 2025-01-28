/**
 * 关键词提取器模块
 * 使用 segmentit 进行中文分词
 * 支持自定义词典和技术术语识别
 * 提供文本预处理和关键词权重计算功能
 */
import { Segment, useDefault } from 'segmentit'
import log from 'electron-log'
import { Keyword } from '@shared/types'
import { getAllDictionaryWords } from '@services/dictionary/dictionaryService'

/**
 * 关键词提取器类
 * 使用单例模式确保全局只有一个分词器实例
 */
export class KeywordExtractor {
  private static instance: KeywordExtractor | null = null
  private segment: any | null = null
  private initialized: boolean = false

  /**
   * 技术术语词典
   * 用于标准化技术词汇的写法和赋予特殊权重
   * key: 词汇的小写形式
   * value: { standard: 标准写法, weight: 权重 }
   */
  private readonly TECH_TERMS = new Map([
    // 编程语言和框架
    ['javascript', { standard: 'JavaScript', weight: 1.5 }],
    ['typescript', { standard: 'TypeScript', weight: 1.5 }],
    ['python', { standard: 'Python', weight: 1.5 }],
    ['vue3', { standard: 'Vue3', weight: 1.5 }],
    ['vue', { standard: 'Vue', weight: 1.5 }],
    ['react', { standard: 'React', weight: 1.5 }],
    ['angular', { standard: 'Angular', weight: 1.5 }],
    ['electron', { standard: 'Electron', weight: 1.5 }],

    // 数据库
    ['mysql', { standard: 'MySQL', weight: 1.5 }],
    ['postgresql', { standard: 'PostgreSQL', weight: 1.5 }],
    ['mongodb', { standard: 'MongoDB', weight: 1.5 }],
    ['sqlite', { standard: 'SQLite', weight: 1.5 }],

    // 开发工具和平台
    ['vscode', { standard: 'VS Code', weight: 1.4 }],
    ['git', { standard: 'Git', weight: 1.4 }],
    ['github', { standard: 'GitHub', weight: 1.4 }],
    ['webpack', { standard: 'Webpack', weight: 1.4 }],
    ['vite', { standard: 'Vite', weight: 1.4 }],
    ['markdown', { standard: 'Markdown', weight: 1.4 }],
    ['obsidian', { standard: 'Obsidian', weight: 1.4 }],

    // AI 相关
    ['chatgpt', { standard: 'ChatGPT', weight: 1.6 }],
    ['gpt', { standard: 'GPT', weight: 1.6 }],
    ['ai', { standard: 'AI', weight: 1.6 }],

    // 概念术语
    ['双链', { standard: '双链', weight: 1.5 }],
    ['双向链接', { standard: '双向链接', weight: 1.5 }],
    ['类型安全', { standard: '类型安全', weight: 1.5 }],
    ['开源', { standard: '开源', weight: 1.4 }],
    ['智能写作', { standard: '智能写作', weight: 1.4 }]
  ])

  /**
   * 需要过滤的技术字段集合
   * 包含 Tiptap 编辑器的 JSON 结构中常见的字段名
   * 这些字段会在关键词提取过程中被忽略
   */
  private readonly FILTER_WORDS = new Set([
    'align',
    'alt',
    'app',
    'app-image',
    'attrs',
    'blockquote',
    'bold',
    'bulletlist',
    'center',
    'checked',
    'class',
    'code',
    'codeBlock',
    'codeblock',
    'color',
    'colspan',
    'colwidth',
    'content',
    'data',
    'data-note-id',
    'details',
    'detailsContent',
    'detailsSummary',
    'doc',
    'emoji',
    'face',
    'false',
    'ffc',
    'hardBreak',
    'hardbreak',
    'heading',
    'hearts',
    'highlight',
    'href',
    'image',
    'images',
    'italic',
    'justify',
    'language',
    'left',
    'level',
    'link',
    'list',
    'listItem',
    'listitem',
    'marks',
    'name',
    'nofollow',
    'noopener',
    'noreferrer',
    'note',
    'null',
    'open',
    'orderedList',
    'orderedlist',
    'paragraph',
    'plaintext',
    'png',
    'reference',
    'rel',
    'right',
    'rowspan',
    'smiling',
    'softbreak',
    'src',
    'strike',
    'subscript',
    'superscript',
    'table',
    'tableheader',
    'tablecell',
    'tablerow',
    'target',
    'tasklist',
    'taskitem',
    'text',
    'textAlign',
    'textalign',
    'textStyle',
    'textstyle',
    'tight',
    'title',
    'true',
    'type',
    'underline',
    'width',
    'with',
    'var',
    '一款',
    '基于',
    '采用',
    '支持',
    '实现',
    '提供',
    '确保',
    '建立',
    '集成',
    '使用',
    '托管'
  ])

  /**
   * 私有构造函数，防止直接实例化
   */
  private constructor() {
    // this.initSegment()
  }

  /**
   * 获取关键词提取器的单例实例
   * 如果实例不存在则创建新实例
   * 确保分词器已经初始化
   * @returns Promise<KeywordExtractor> 初始化完成的提取器实例
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
   * 1. 创建基础分词器实例
   * 2. 加载用户自定义词典
   * 3. 配置分词器参数
   */
  private async initSegment(): Promise<void> {
    if (this.initialized) return

    try {
      // 1. 使用 useDefault 初始化分词器
      this.segment = useDefault(new Segment())

      // 2. 加载用户自定义词典
      const dictWords = await getAllDictionaryWords()

      // 修改：对于英文词，统一使用原始形式，避免大小写重复
      const normalizedDictWords = dictWords
        .filter((word) => word.enabled)
        .reduce(
          (acc, word) => {
            if (/[a-zA-Z]/.test(word.word)) {
              // 对于英文词，保持原始大小写形式
              const existingWord = acc.find((w) => w.word.toLowerCase() === word.word.toLowerCase())
              if (!existingWord || word.word === word.word.toLowerCase()) {
                acc.push(word)
              }
            } else {
              acc.push(word)
            }
            return acc
          },
          [] as typeof dictWords
        )

      const customDictText = normalizedDictWords
        .map((word) => {
          // 修改：增加词频和权重，确保自定义词优先级最高
          return `${word.word} 999999 nz ${word.weight * 5}`
        })
        .join('\n')

      // 3. 加载自定义词典
      if (customDictText) {
        this.segment.loadDict(customDictText)
        log.info('已加载自定义词典:', {
          词条数: normalizedDictWords.length,
          样例: normalizedDictWords,
          词典内容: customDictText
        })
      }

      this.initialized = true
    } catch (error) {
      log.error('分词器初始化失败:', error)
      this.segment = null
      throw error
    }
  }

  /**
   * 从富文本内容中提取纯文本
   * 递归处理 Tiptap 编辑器的 JSON 结构
   * @param content 富文本内容（JSON 结构）
   * @returns 提取的纯文本内容
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
   * 预处理文本内容
   * 1. 转换为小写并去除首尾空格
   * 2. 标准化技术术语
   * 3. 清理特殊字符
   * @param text 原始文本
   * @returns 预处理后的文本
   */
  private preProcessText(text: string): string {
    try {
      let processedText = text.trim()

      // 1. 先获取自定义词典中的词
      const customWords = Array.from(this.segment.DICT as Map<string, any>)
        .filter(([word]: [string, any]) => typeof word === 'string' && word.length > 1)
        .map(([word]: [string, any]) => word)

      // 2. 保护所有自定义词典中的词
      customWords.forEach((word: string) => {
        // 对于英文词，同时匹配大小写形式
        if (/[a-zA-Z]/.test(word)) {
          const pattern = new RegExp(word, 'gi')
          processedText = processedText.replace(pattern, word)
        }
      })

      // 3. 处理技术术语
      this.TECH_TERMS.forEach(({ standard }, term) => {
        const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
        processedText = processedText.replace(pattern, standard.replace(/\s+/g, '_'))
      })

      // 4. 清理特殊字符，但保留自定义词
      return processedText
        .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s.,!?，。！？、_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    } catch (error) {
      log.error('文本预处理失败:', error)
      return ''
    }
  }

  /**
   * 提取文本中的关键词
   * 处理流程：
   * 1. 提取纯文本内容
   * 2. 预处理文本
   * 3. 分词
   * 4. 过滤无效词
   * 5. 计算词频和权重
   * 6. 排序和筛选
   *
   * 权重计算考虑因素：
   * - 词频（TF）
   * - 词性权重（名词、动词等）
   * - 中文词权重
   * - 自定义词典权重
   *
   * @param content 富文本内容
   * @returns Promise<Keyword[]> 关键词数组，包含词和权重
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

        // 修改过滤规则：
        // 1. 过滤纯数字
        if (/^\d+$/.test(word)) {
          return
        }

        // 2. 检查是否是自定义词典中的词（不区分大小写）
        const isCustomWord = Array.from(this.segment.DICT as Map<string, any>).some(
          ([dictWord]: [string, any]) =>
            typeof dictWord === 'string' && dictWord.toLowerCase() === word.toLowerCase()
        )

        // 3. 如果是自定义词或者不在过滤列表中，则保留
        if (!isCustomWord && this.FILTER_WORDS.has(word.toLowerCase())) {
          return
        }

        // 4. 长度检查（对自定义词放宽限制）
        if (!isCustomWord) {
          if (/[\u4e00-\u9fa5]/.test(word) && word.length < 2) {
            return
          }
          if (!/[\u4e00-\u9fa5]/.test(word) && word.length < 2) {
            return
          }
        }

        // 5. 累计词频和权重（提高自定义词的权重）
        const current = wordStats.get(word) || {
          freq: 0,
          pos,
          weight: isCustomWord ? termWeight * 2 : termWeight // 提高自定义词的权重
        }

        wordStats.set(word, {
          freq: current.freq + 1,
          pos: current.pos,
          weight: Math.max(current.weight, isCustomWord ? termWeight * 2 : termWeight)
        })
        totalWords++
      })

      // 4. 生成关键词列表
      const keywords = Array.from(wordStats.entries())
        .map(([word, { freq, pos, weight }]) => {
          let finalWeight = freq / totalWords

          // 提高词性权重
          if (['n', 'v', 'vn', 'nz'].includes(pos)) {
            finalWeight *= 1.8 // 进一步提高名词权重
          }

          // 提高中文词权重
          if (/[\u4e00-\u9fa5]/.test(word)) {
            finalWeight *= 1.6 // 提高中文词权重
          }

          // 技术术语加权
          if (this.TECH_TERMS.has(word.toLowerCase())) {
            finalWeight *= 2.0 // 显著提高技术术语权重
          }

          // 词长度权重：优先选择较长的词
          finalWeight *= 1 + word.length * 0.15 // 增加长词的权重

          // 应用词典权重
          finalWeight *= weight

          return { word, weight: finalWeight }
        })
        .sort((a, b) => b.weight - a.weight)
        .filter((k) => k.word.length >= 2 || /[\u4e00-\u9fa5]/.test(k.word)) // 再次过滤掉短词
        .slice(0, 15)

      // 添加更详细的日志
      log.debug('关键词提取结果:', {
        原始文本: rawText.slice(0, 100),
        分词结果: tokens.slice(0, 10).map((t: any) => ({
          词: t.w,
          词性: t.p,
          权重: t.t
        })),
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

/**
 * 全局单例实例
 * 用于缓存已初始化的提取器实例
 */
let extractor: KeywordExtractor | null = null

/**
 * 获取关键词提取器实例的工厂函数
 * 确保全局只有一个实例，避免重复初始化
 * @returns Promise<KeywordExtractor>
 */
export const getKeywordExtractor = async () => {
  if (!extractor) {
    extractor = await KeywordExtractor.getInstance()
  }
  return extractor
}
