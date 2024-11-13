// 首先创建一个共享的文本处理模块
import * as nodejieba from 'nodejieba'
import log from 'electron-log/renderer'
import path from 'path'
import { writeFile } from 'fs/promises'

// 接口定义
export interface JiebaWord {
  word: string
  weight: number
}

// 停用词表
export const STOP_WORDS = new Set([
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

// 文本处理类
export class TextProcessor {
  // 提取文本内容
  static extractText(content: any): string {
    if (!content) return ''
    if (typeof content === 'string') return content

    if (Array.isArray(content)) {
      return content
        .map((item) => TextProcessor.extractText(item))
        .filter(Boolean)
        .join(' ')
    }

    if (typeof content === 'object') {
      if (content.type === 'text' && content.text) {
        return content.text
      }
      if (content.content) {
        return TextProcessor.extractText(content.content)
      }
    }
    return ''
  }

  // 预处理文本
  static preProcessText(text: string): string {
    try {
      let processedText = text.toLowerCase().trim()
      processedText = processedText.replace(/[^\u4e00-\u9fa5a-z0-9\s.,，。]/gi, ' ')
      processedText = processedText.replace(/\s+/g, ' ').trim()
      return processedText
    } catch (error) {
      log.error('文本预处理失败:', error)
      return ''
    }
  }

  // 初始化分词器
  static async initJieba(customDict: string) {
    try {
      const userDictPath = path.join(__dirname, 'user_dict.txt')
      await writeFile(userDictPath, customDict, 'utf8')
      nodejieba.load({
        userDict: userDictPath
      })
    } catch (error) {
      log.error('初始化分词词典失败:', error)
    }
  }
}
