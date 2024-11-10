import * as nodejieba from 'nodejieba'
import { Keyword } from '../renderer/src/types/Embedding'
import log from 'electron-log/renderer'
import path from 'path'
import { writeFile } from 'fs/promises'
import { DictionaryLearner } from './dictionaryLearner'
import * as DictionaryService from './dictionaryService'
import { TextProcessor } from './textProcessor'

// 添加自定义词典
const CUSTOM_DICT = `
# 核心术语
机器学习模型 15
机器学习 12

# 评估指标（使用竖线连接中英文）
准确率|Accuracy|准确度 12
精确率|Precision 12
召回率|Recall 12
F1分数|F1|F1 Score 12

# 评估方法（权重统一）
交叉验证 10
留出法 10
A/B测试 10
过拟合 10
欠拟合 10

# 常用短语（略微降低权重）
评估方法 8
评估指标 8
关键指标 8
`.trim()

// 添加词典学习功能
let dictionaryLearner: DictionaryLearner | null = null

// 初始化词典学习器
async function initDictionaryLearner() {
  if (!dictionaryLearner) {
    dictionaryLearner = new DictionaryLearner()
    log.info('词典学习器初始化成功')
  }
  return dictionaryLearner
}

// 定期清理过期数据
export async function cleanupDictionary() {
  try {
    await DictionaryService.cleanupDictionary()
    log.info('词典清理完成')
  } catch (error) {
    log.error('词典清理失败:', error)
  }
}

// 在提取关键词时顺便学习
export async function extractKeywordsAndLearn(content: any): Promise<Keyword[]> {
  const keywords = extractKeywords(content)

  // 先提取纯文本
  const text = TextProcessor.extractText(content)
  if (!text) {
    log.debug('提取文本为空，跳过学习')
    return keywords
  }

  // 异步学习，不等待结果
  const learner = await initDictionaryLearner()
  learner.learnFromText(text).catch((error) => log.error('文本学习失败:', error))

  return keywords
}

// 创建临时词典文件并加载
const userDictPath = path.join(__dirname, 'user_dict.txt')

// 动态词典管理
let customDictContent = CUSTOM_DICT
let lastDictUpdate = 0
const DICT_UPDATE_INTERVAL = 5 * 60 * 1000 // 5分钟更新一次词典

// 更新词典内容
async function updateCustomDict() {
  try {
    // 检查是否需要更新
    const now = Date.now()
    if (now - lastDictUpdate < DICT_UPDATE_INTERVAL) {
      return
    }

    // 获取数据库中的词典
    const dictWords = await DictionaryService.getDictionary()

    // 构建新的词典内容
    const dbDictContent = dictWords
      .map((word) => {
        // 根据来源和权重设置不同的基础分数
        const baseScore = word.source === 'manual' ? 12 : 10
        // 使用词频和文档数调整最终分数
        const score = Math.min(
          Math.round(baseScore * (1 + Math.log(word.frequency + word.documents))),
          15
        )
        return `${word.word} ${score}`
      })
      .join('\n')

    // 合并固定词典和数据库词典
    customDictContent = `${CUSTOM_DICT}\n\n# 数据库词典\n${dbDictContent}`

    // 写入临时文件并重新加载
    await writeFile(userDictPath, customDictContent, 'utf8')
    nodejieba.load({
      userDict: userDictPath
    })

    lastDictUpdate = now
    log.info('词典更新成功，当前词条数:', dictWords.length)
  } catch (error) {
    log.error('更新自定义词典失败:', error)
  }
}

// 使用异步函数初始化
// 修改初始化函数
async function initJieba() {
  try {
    // 首次加载固定词典
    await writeFile(userDictPath, CUSTOM_DICT, 'utf8')
    nodejieba.load({
      userDict: userDictPath
    })

    // 立即更新一次词典
    await updateCustomDict()
  } catch (error) {
    log.error('初始化分词词典失败:', error)
  }
}

// 调用初始化
initJieba()

// 停用词表 - 保留一些基本的停用词过滤
const STOP_WORDS = new Set([
  '的',
  '了',
  '和',
  '与',
  '或',
  '在',
  '是',
  '都',
  '而',
  '还',
  '又',
  '也',
  '就',
  '但',
  '并',
  '很',
  '这',
  '那',
  '有',
  '会',
  '来',
  '去',
  '把',
  '到',
  '被',
  '让',
  '给',
  '从',
  '向',
  '它'
])

// 提取文本内容 (保持原有逻辑不变)
function extractText(content: any): string {
  if (!content) return ''
  if (typeof content === 'string') return content

  if (Array.isArray(content)) {
    return content
      .map((item) => extractText(item))
      .filter(Boolean)
      .join(' ')
  }

  if (typeof content === 'object') {
    if (content.type === 'text' && content.text) {
      return content.text
    }
    if (content.content) {
      return extractText(content.content)
    }
  }
  return ''
}

// 预处理文本
function preProcessText(text: string): string {
  try {
    let processedText = text.toLowerCase().trim()

    // 只保留中文、英文、数字和基本标点
    processedText = processedText.replace(/[^\u4e00-\u9fa5a-z0-9\s.,，。]/gi, ' ')
    processedText = processedText.replace(/\s+/g, ' ').trim()

    return processedText
  } catch (error) {
    log.error('文本预处理失败:', error)
    return ''
  }
}

// 提取关键词
export async function extractKeywords(content: any): Promise<Keyword[]> {
  try {
    // 确保词典是最新的
    await updateCustomDict()
    const text = extractText(content)
    if (!text.trim()) return []

    const processedText = preProcessText(text)
    if (!processedText) return []

    // 使用 nodejieba 提取关键词
    const rawKeywords = nodejieba.extract(processedText, 30) // 先提取更多关键词

    // 过滤和处理关键词
    const keywords = rawKeywords
      .filter(
        ({ word }: { word: string }) =>
          !STOP_WORDS.has(word) && word.length >= 2 && !/^\d+$/.test(word)
      )
      .map(({ word, weight }: { word: string; weight: number }) => ({
        word,
        weight: Math.min(weight / 100, 1) // 归一化权重到 0-1 范围
      }))
      .slice(0, 10) // 只保留前10个关键词

    // 记录日志
    log.info('关键词提取详情:', {
      文本信息: {
        原文长度: text.length,
        处理后长度: processedText.length,
        提取关键词数: keywords.length
      },
      关键词结果: keywords.map((k) => ({
        词: k.word,
        权重: k.weight.toFixed(4)
      }))
    })

    return keywords
  } catch (error) {
    log.error('关键词提取失败:', error)
    return []
  }
}

// 计算关键词相似度 (保持原有逻辑不变)
export function calculateKeywordSimilarity(keywords1: Keyword[], keywords2: Keyword[]): number {
  try {
    const map1 = new Map(keywords1.map((k) => [k.word, k.weight]))
    const map2 = new Map(keywords2.map((k) => [k.word, k.weight]))

    // 计算余弦相似度
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    // 计算点积和范数
    map1.forEach((weight1, word) => {
      norm1 += weight1 * weight1
      const weight2 = map2.get(word)
      if (weight2) {
        dotProduct += weight1 * weight2
      }
    })

    map2.forEach((weight2) => {
      norm2 += weight2 * weight2
    })

    // 计算最终相似度
    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))

    log.info('关键词相似度计算:', {
      共同关键词: Array.from(map1.keys())
        .filter((word) => map2.has(word))
        .map((word) => ({
          词: word,
          权重1: map1.get(word)?.toFixed(4),
          权重2: map2.get(word)?.toFixed(4)
        })),
      相似度: similarity.toFixed(4)
    })

    return similarity
  } catch (error) {
    log.error('关键词相似度计算失败:', error)
    return 0
  }
}
