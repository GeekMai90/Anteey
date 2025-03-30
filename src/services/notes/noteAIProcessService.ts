import { db } from '../../db/config'
import { LLMService } from '../rag/llmService'
import log from 'electron-log'
import { AIProcessingResult } from '@shared/types'
import { processNoteContent } from '../aiChat/ProcessNoteContent'
import { generateEmbeddingFromContent } from '../rag/embeddingService'

export class NoteAIProcessService {
  private llmService: LLMService

  constructor() {
    this.llmService = new LLMService()
  }

  /**
   * 获取AI处理使用的模型ID
   */
  private async getAIProcessModelId(): Promise<string | undefined> {
    try {
      const settings = await db('appearance_settings').first()
      return settings?.aiProcessModelId
    } catch (error) {
      log.error('获取AI处理模型配置失败:', error)
      return undefined // 返回 undefined 表示使用默认模型
    }
  }

  /**
   * 从大模型响应中提取JSON数据
   */
  private extractJsonFromResponse(response: string): AIProcessingResult {
    try {
      // 1. 预处理响应字符串
      let cleanResponse = response
        .replace(/[\r\n\t]/g, '') // 移除换行和制表符
        .replace(/\s+/g, ' ') // 合并多个空格
        .trim()

      // 2. 尝试直接解析整个响应
      try {
        // 处理可能存在的 BOM 和其他特殊字符
        if (cleanResponse.charCodeAt(0) === 0xfeff) {
          cleanResponse = cleanResponse.slice(1)
        }
        const result = JSON.parse(cleanResponse)
        if (this.validateResult(result)) {
          return this.sanitizeResult(result)
        }
      } catch (e) {
        log.debug('直接解析JSON失败，尝试其他方法', { error: e })
      }

      // 3. 尝试提取JSON对象
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0])
          if (this.validateResult(result)) {
            return this.sanitizeResult(result)
          }
        } catch (e) {
          log.debug('提取JSON对象失败，尝试下一个方法', { error: e })
        }
      }

      // 4. 尝试手动解析数组
      try {
        const result = this.parseArraysManually(cleanResponse)
        if (this.validateResult(result)) {
          return this.sanitizeResult(result)
        }
      } catch (e) {
        log.debug('手动解析数组失败', { error: e })
      }

      // 5. 如果所有方法都失败，返回默认值
      log.warn('无法从响应中提取有效的JSON，使用默认值', { response: cleanResponse })
      return { keywords: [], suggestedTags: [] }
    } catch (error) {
      log.error('处理大模型响应失败:', {
        response,
        error: error instanceof Error ? error.message : String(error)
      })
      return { keywords: [], suggestedTags: [] }
    }
  }

  /**
   * 验证结果是否符合预期格式
   */
  private validateResult(result: any): result is AIProcessingResult {
    return (
      result &&
      Array.isArray(result.keywords) &&
      Array.isArray(result.suggestedTags) &&
      result.keywords.every((k: unknown) => typeof k === 'string') &&
      result.suggestedTags.every((t: unknown) => typeof t === 'string')
    )
  }

  /**
   * 清理和规范化结果
   */
  private sanitizeResult(result: AIProcessingResult): AIProcessingResult {
    const cleanString = (str: string): string => {
      return (
        str
          .trim()
          // 移除中文引号
          .replace(/[""]/g, '')
          // 移除英文引号
          .replace(/"/g, '')
          // 移除可能存在的多余空格
          .trim()
      )
    }

    return {
      keywords: result.keywords
        .map(cleanString)
        // 过滤掉空字符串
        .filter((k) => k.length > 0)
        // 去重
        .filter((value, index, self) => self.indexOf(value) === index),
      suggestedTags: result.suggestedTags
        .map(cleanString)
        .filter((t) => t.length > 0)
        .filter((value, index, self) => self.indexOf(value) === index)
    }
  }

  /**
   * 手动解析数组
   */
  private parseArraysManually(response: string): AIProcessingResult {
    const keywordsMatch = response.match(/"keywords"\s*:\s*\[(.*?)\]/)
    const tagsMatch = response.match(/"suggestedTags"\s*:\s*\[(.*?)\]/)

    if (!keywordsMatch || !tagsMatch) {
      throw new Error('无法找到关键词或标签数组')
    }

    const parseArray = (str: string): string[] => {
      return str
        .split(',')
        .map((item) => {
          // 匹配中英文引号中的内容
          const match = item.match(/[""]([^""]*)[""]|"([^"]*)"/)
          return match
            ? (match[1] || match[2]).trim() // 返回第一个或第二个捕获组（取决于是中文还是英文引号）
            : item.trim()
        })
        .filter((item) => item.length > 0)
    }

    return {
      keywords: parseArray(keywordsMatch[1]),
      suggestedTags: parseArray(tagsMatch[1])
    }
  }

  /**
   * 处理单个笔记的AI任务
   */
  async processNote(noteId: string): Promise<void> {
    try {
      // 1. 获取笔记内容
      const note = await db('notes').where('id', noteId).first()
      if (!note) {
        throw new Error(`笔记不存在: ${noteId}`)
      }

      // 2. 更新处理状态为进行中
      await db('notes')
        .where('id', noteId)
        .update({
          aiProcessingStatus: JSON.stringify({
            keywords: 'processing',
            lastKeywordUpdateAt: new Date()
          }),
          vectorStatus: JSON.stringify({
            status: 'processing',
            lastVectorizedAt: new Date()
          })
        })

      // 3. 使用 processNoteContent 处理笔记内容
      const processedContent = await processNoteContent([noteId])
      const plainText = processedContent.contextText

      // 4. 并行处理 AI 分析和向量化
      try {
        const [aiResult] = await Promise.all([
          // AI 处理
          (async () => {
            const prompt = `请分析以下文本，提取关键词和推荐标签。
关键词要求：
- 提取10-15个关键词
- 按重要性排序
- 关键词应该反映文本的核心概念和主题

推荐标签要求：
- 提取3-5个标签
- 标签应该是更高层级的分类
- 标签应该有助于组织和分类

注意：
- 不需要返回任何解释，只需要返回JSON格式
- 请以JSON格式返回，格式如下：
{
  "keywords": ["关键词1", "关键词2", ...],
  "suggestedTags": ["标签1", "标签2", ...]
}

文本内容：
${plainText}`
            const modelConfigId = await this.getAIProcessModelId()
            const response = await this.llmService.generateResponse(prompt, modelConfigId)
            return this.extractJsonFromResponse(response)
          })(),
          // 向量化处理 - 不需要获取结果
          generateEmbeddingFromContent(noteId, note.content).then(() => undefined)
        ])

        // 验证 AI 结果
        if (aiResult.keywords.length === 0 && aiResult.suggestedTags.length === 0) {
          throw new Error('AI未能生成有效的关键词和标签')
        }

        // 5. 更新笔记
        await db('notes')
          .where('id', noteId)
          .update({
            keywords: JSON.stringify(aiResult.keywords),
            suggestedTags: JSON.stringify(aiResult.suggestedTags),
            aiProcessingStatus: JSON.stringify({
              keywords: 'completed',
              lastKeywordUpdateAt: new Date()
            }),
            vectorStatus: JSON.stringify({
              status: 'completed',
              lastVectorizedAt: new Date()
            })
          })

        log.info('笔记处理完成:', {
          noteId,
          keywordsCount: aiResult.keywords.length,
          suggestedTagsCount: aiResult.suggestedTags.length,
          sampleKeywords: aiResult.keywords.slice(0, 3),
          sampleTags: aiResult.suggestedTags.slice(0, 2),
          vectorized: true
        })
      } catch (error) {
        // 更新状态为失败
        await db('notes')
          .where('id', noteId)
          .update({
            aiProcessingStatus: JSON.stringify({
              keywords: 'failed',
              lastKeywordUpdateAt: new Date(),
              error: error instanceof Error ? error.message : String(error)
            }),
            vectorStatus: JSON.stringify({
              status: 'failed',
              lastVectorizedAt: new Date(),
              error: error instanceof Error ? error.message : String(error)
            })
          })

        throw error
      }
    } catch (error) {
      log.error('笔记处理失败:', {
        noteId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * 获取需要处理的主卡片笔记列表
   * @param limit 可选参数，如果不传则获取所有符合条件的笔记
   */
  async getPendingMainNotes(limit?: number): Promise<string[]> {
    try {
      // 先打印一下所有的主卡片数量，用于调试
      const totalMainCards = await db('notes')
        .where({
          isDeleted: false,
          cardType: 'Maincard'
        })
        .count('* as count')
        .first()

      log.info('主卡片总数:', totalMainCards)

      let query = db('notes')
        .where({
          isDeleted: false,
          cardType: 'Maincard'
        })
        .where((builder) => {
          builder
            .whereNull('aiProcessingStatus') // 从未处理过的笔记
            .orWhereRaw("json_extract(aiProcessingStatus, '$.keywords') = 'pending'") // 待处理的笔记
            .orWhereRaw("json_extract(aiProcessingStatus, '$.keywords') = 'failed'") // 处理失败的笔记
            .orWhereNull('keywords') // 没有关键词的笔记
        })
        .orderBy('updatedAt', 'desc')
        .select('id')

      // 只有在传入 limit 参数时才限制数量
      if (limit) {
        query = query.limit(limit)
      }

      // 先获取SQL语句，用于调试
      const sqlString = query.toString()
      log.info('查询SQL:', sqlString)

      const notes = await query

      // 添加详细的日志以便调试
      log.info('获取待处理主卡片笔记:', {
        count: notes.length,
        sampleIds: notes.slice(0, 3).map((note) => note.id),
        query: sqlString
      })

      // 如果没有找到笔记，检查一下数据状态
      if (notes.length === 0) {
        // 随机抽查几条主卡片的状态
        const sampleNotes = await db('notes')
          .where({
            isDeleted: false,
            cardType: 'Maincard'
          })
          .select('id', 'aiProcessingStatus', 'keywords')
          .limit(3)

        log.info('主卡片示例数据:', sampleNotes)
      }

      return notes.map((note) => note.id)
    } catch (error) {
      log.error('获取待处理主卡片笔记失败:', error)
      throw error
    }
  }

  /**
   * 批量处理主卡片笔记
   * @param limit 可选参数，如果不传则处理所有符合条件的笔记
   * @param batchSize 每批处理的笔记数量，默认为3（符合RPM限制）
   */
  async processMainCardBatch(limit?: number, batchSize: number = 3): Promise<void> {
    try {
      const noteIds = await this.getPendingMainNotes(limit)
      if (noteIds.length === 0) {
        log.info('没有需要处理的主卡片笔记')
        return
      }

      log.info(`开始批量处理主卡片笔记, 总数量: ${noteIds.length}`)

      // 将笔记分批处理
      for (let i = 0; i < noteIds.length; i += batchSize) {
        const batchNoteIds = noteIds.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1
        log.info(`开始处理第 ${batchNumber} 批，本批数量: ${batchNoteIds.length}`)

        // 串行处理当前批次的笔记
        for (const [index, noteId] of batchNoteIds.entries()) {
          let retryCount = 0
          const maxRetries = 3
          let success = false

          while (retryCount < maxRetries && !success) {
            try {
              await this.processNote(noteId)
              success = true

              // 根据批内位置调整等待时间
              if (index < batchNoteIds.length - 1) {
                // 同一批次内的笔记之间等待25秒（确保在1分钟内不超过3次请求）
                const waitTime = 25000
                log.info(`批次 ${batchNumber} 内等待 ${waitTime / 1000} 秒后处理下一个笔记`)
                await new Promise((resolve) => setTimeout(resolve, waitTime))
              }
            } catch (error: any) {
              retryCount++
              const isRateLimit =
                error?.message?.includes('Rate limit exceeded') ||
                error?.message?.includes('max RPM')

              if (isRateLimit && retryCount < maxRetries) {
                // 使用更长的指数退避等待时间
                const waitTime = Math.pow(2, retryCount) * 30000 // 30秒、60秒、120秒
                log.info(
                  `处理笔记 ${noteId} 遇到速率限制，等待 ${waitTime / 1000} 秒后重试(${retryCount}/${maxRetries})`
                )
                await new Promise((resolve) => setTimeout(resolve, waitTime))
                continue
              }

              log.error(`处理主卡片笔记 ${noteId} 失败 (尝试 ${retryCount}/${maxRetries}):`, error)
              if (retryCount === maxRetries) {
                log.error(`笔记 ${noteId} 达到最大重试次数，跳过处理`)
              }
              break
            }
          }
        }

        // 每批处理完后等待60秒，确保下一批有足够的请求配额
        if (i + batchSize < noteIds.length) {
          const batchWaitTime = 60000
          log.info(`第 ${batchNumber} 批处理完成，等待 ${batchWaitTime / 1000} 秒后开始下一批`)
          await new Promise((resolve) => setTimeout(resolve, batchWaitTime))
        }
      }

      log.info(`主卡片笔记批量处理完成，共处理 ${noteIds.length} 条笔记`)
    } catch (error) {
      log.error('主卡片笔记批量处理失败:', error)
      throw error
    }
  }

  /**
   * 获取需要处理的笔记列表
   */
  async getPendingNotes(limit: number = 5): Promise<string[]> {
    try {
      const notes = await db('notes')
        .where('isDeleted', false)
        .whereRaw("json_extract(aiProcessingStatus, '$.keywords') IN ('pending', 'failed')")
        .orWhereNull('aiProcessingStatus')
        .orderBy('updatedAt', 'desc')
        .limit(limit)
        .select('id')

      return notes.map((note) => note.id)
    } catch (error) {
      log.error('获取待处理笔记失败:', error)
      throw error
    }
  }

  /**
   * 批量处理笔记
   */
  async processBatch(limit: number = 5): Promise<void> {
    try {
      const noteIds = await this.getPendingNotes(limit)
      if (noteIds.length === 0) {
        return
      }

      log.info(`开始批量处理笔记, 数量: ${noteIds.length}`)

      // 串行处理，避免并发请求过多
      for (const noteId of noteIds) {
        try {
          await this.processNote(noteId)
          // 处理完一个后稍微等待一下，避免请求过于频繁
          await new Promise((resolve) => setTimeout(resolve, 1000))
        } catch (error) {
          log.error(`处理笔记 ${noteId} 失败:`, error)
          // 继续处理下一个
          continue
        }
      }

      log.info('批量处理完成')
    } catch (error) {
      log.error('批量处理失败:', error)
      throw error
    }
  }

  /**
   * 手动触发处理
   */
  async triggerProcessing(noteId: string): Promise<void> {
    try {
      // 先将状态设置为待处理
      await db('notes')
        .where('id', noteId)
        .update({
          aiProcessingStatus: JSON.stringify({
            keywords: 'pending',
            lastKeywordUpdateAt: new Date()
          })
        })

      // 立即处理
      await this.processNote(noteId)
    } catch (error) {
      log.error('手动触发处理失败:', { noteId, error })
      throw error
    }
  }

  /**
   * 获取笔记的AI处理状态
   */
  async getNoteAIStatus(noteId: string) {
    try {
      const note = await db('notes')
        .where('id', noteId)
        .select('aiProcessingStatus', 'keywords', 'suggestedTags')
        .first()

      if (!note) {
        throw new Error('笔记不存在')
      }

      return {
        aiProcessingStatus: note.aiProcessingStatus ? JSON.parse(note.aiProcessingStatus) : null,
        keywords: note.keywords ? JSON.parse(note.keywords) : [],
        suggestedTags: note.suggestedTags ? JSON.parse(note.suggestedTags) : []
      }
    } catch (error) {
      log.error('获取笔记AI处理状态失败:', {
        noteId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * 更新AI处理使用的模型配置
   */
  async updateAIProcessModel(modelId: string | null): Promise<void> {
    try {
      await db('appearance_settings').update({
        aiProcessModelId: modelId,
        updatedAt: new Date()
      })
      log.info('更新AI处理模型配置成功:', { modelId })
    } catch (error) {
      log.error('更新AI处理模型配置失败:', error)
      throw error
    }
  }

  /**
   * 获取当前AI处理使用的模型配置
   */
  async getAIProcessModel(): Promise<string | null> {
    try {
      const settings = await db('appearance_settings').select('aiProcessModelId').first()
      return settings?.aiProcessModelId || null
    } catch (error) {
      log.error('获取AI处理模型配置失败:', error)
      throw error
    }
  }
}

// 导出单例实例
export const noteAIProcessService = new NoteAIProcessService()
