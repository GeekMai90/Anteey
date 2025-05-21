import { db } from '../../db/config'
import type { Note, TaggedDeck, UntaggedDeck, FlashcardSettings } from '@shared/types'
import type {
  FlashcardData,
  ReviewFeedback,
  FlashcardStats,
  FlashcardDecks,
  StudyHistory,
  StudyHeatmap,
  DailyStats
} from '@shared/types'
import type { StateType as FSRSStateType } from 'ts-fsrs'
import { convertToNote } from '../notes/notesService'
import { fsrs, createEmptyCard, Rating, State, type Grade } from 'ts-fsrs'
import { DEFAULT_FLASHCARD_SETTINGS } from '@shared/types'
import { v4 as uuidv4 } from 'uuid'

export class FlashcardService {
  private f = fsrs() // 创建 FSRS 实例

  // 将反馈转换为 FSRS Rating
  private feedbackToRating(feedback: ReviewFeedback): Grade {
    switch (feedback) {
      case 'forgot':
        return Rating.Again
      case 'partially_recalled':
        return Rating.Hard
      case 'recalled_effort':
        return Rating.Good
      case 'easily_recalled':
        return Rating.Easy
      case 'skip':
      default:
        return Rating.Good // 默认使用 Good
    }
  }

  // 将笔记转换为闪卡
  async convertToFlashcard(noteId: string): Promise<void> {
    try {
      const now = new Date()
      const fsrsCard = createEmptyCard(now) // 创建新的 FSRS 卡片

      const flashcardData: FlashcardData = {
        reviewCount: 0,
        proficiency: 'New',
        fsrs: fsrsCard,
        nextReviewAt: fsrsCard.due
      }

      await db('notes')
        .where({ id: noteId })
        .update({
          isFlashcard: true,
          flashcard: JSON.stringify(flashcardData),
          nextReviewAt: fsrsCard.due
        })

      console.log('后端→ 笔记转换为闪卡成功:', noteId)
    } catch (error) {
      console.error('后端→ 笔记转换为闪卡失败:', error)
      throw error
    }
  }

  // 取消闪卡标记
  async removeFlashcard(noteId: string): Promise<void> {
    try {
      await db('notes').where({ id: noteId }).update({
        isFlashcard: false,
        flashcard: null,
        nextReviewAt: null
      })

      console.log('后端→ 取消闪卡标记成功:', noteId)
    } catch (error) {
      console.error('后端→ 取消闪卡标记失败:', error)
      throw error
    }
  }

  // 根据ID获取闪卡
  async getFlashcardsByIds(noteIds: string[]): Promise<Note[]> {
    try {
      if (!noteIds || noteIds.length === 0) {
        return []
      }

      const notes = await db('notes')
        .whereIn('id', noteIds)
        .where({
          isFlashcard: true,
          isDeleted: false
        })
        .select('*')

      return notes.map(convertToNote)
    } catch (error) {
      console.error('后端→ 根据ID获取闪卡失败:', error)
      throw error
    }
  }

  // 更新闪卡复习状态
  async updateFlashcardStatus({
    noteId,
    feedback,
    reviewTime,
    isSimplified = false
  }: {
    noteId: string
    feedback: ReviewFeedback
    reviewTime: number
    isSimplified?: boolean
  }): Promise<{ noteId: string; nextReviewAt: Date }> {
    try {
      const note = await db('notes').where({ id: noteId }).first()
      if (!note || !note.isFlashcard) {
        throw new Error(`笔记不存在或不是闪卡: ${noteId}`)
      }

      const flashcardData: FlashcardData = JSON.parse(note.flashcard || '{}')
      if (!flashcardData.fsrs) {
        throw new Error('闪卡数据不完整')
      }

      // 如果是简化模式，转换反馈
      let actualFeedback = feedback
      if (isSimplified) {
        switch (feedback) {
          case 'forgot':
            actualFeedback = 'forgot' // 保持不变
            break
          case 'partially_recalled':
            actualFeedback = 'partially_recalled' // 保持不变
            break
          default:
            actualFeedback = 'recalled_effort' // 其他情况都转为 recalled_effort
        }
      }

      // 使用 FSRS 计算下一次复习
      const scheduling = this.f.repeat(flashcardData.fsrs, new Date())
      const rating = this.feedbackToRating(actualFeedback)
      const result = scheduling[rating]

      // 更新时间统计数据
      const timeStats = flashcardData.timeStats || {
        totalTime: 0,
        lastReviewTime: 0
      }

      const updatedData: FlashcardData = {
        ...flashcardData,
        lastReviewedAt: new Date(),
        nextReviewAt: result.card.due,
        reviewCount: (flashcardData.reviewCount || 0) + 1,
        lastFeedback: actualFeedback,
        proficiency: State[result.card.state] as FSRSStateType,
        fsrs: result.card,
        timeStats: {
          totalTime: timeStats.totalTime + reviewTime,
          lastReviewTime: reviewTime
        }
      }

      await db('notes')
        .where({ id: noteId })
        .update({
          flashcard: JSON.stringify(updatedData),
          nextReviewAt: result.card.due
        })

      // 添加统计记录
      await Promise.all([
        this.saveReviewRecord(noteId, actualFeedback, reviewTime),
        this.updateDailyStats(actualFeedback, reviewTime)
      ])

      console.log('后端→ 更新闪卡状态和统计数据成功:', noteId)

      // 返回更新后的卡片信息
      return {
        noteId,
        nextReviewAt: result.card.due
      }
    } catch (error) {
      console.error('后端→ 更新闪卡状态和统计数据失败:', error)
      throw error
    }
  }

  /**
   * 获取待复习的闪卡
   * 该方法会根据用户设置和学习进度，返回今天需要复习的卡片
   *
   * @param tags - 可选的标签数组，用于筛选特定标签的卡片
   * @returns 返回待复习的卡片数组
   */
  async getDueFlashcards(tags?: string[]): Promise<Note[]> {
    try {
      // 1. 获取用户的记忆卡设置
      const settings = await this.getSettings()
      console.log('后端→ 获取到的设置:', settings)

      // 2. 计算今天的开始时间（基于用户设置的每日开始时间）
      const now = new Date()
      const todayStart = new Date(now)
      todayStart.setHours(settings.dayStartsAt, 0, 0, 0)
      // 如果当前时间早于设置的开始时间，则认为还在前一天
      if (now.getHours() < settings.dayStartsAt) {
        todayStart.setDate(todayStart.getDate() - 1)
      }
      console.log('后端→ 今天开始时间:', todayStart)

      // 3. 获取今天已学习的卡片统计
      // 分别统计新卡片和复习卡片的数量
      const todayStats = await db('notes')
        .where({
          isFlashcard: true,
          isDeleted: false
        })
        .whereRaw("JSON_EXTRACT(flashcard, '$.lastReviewedAt') >= ?", [todayStart.toISOString()])
        .select([
          // 统计新卡片数量（state = 0 表示新卡片）
          db.raw(`SUM(CASE 
            WHEN JSON_EXTRACT(flashcard, '$.fsrs.state') = '0' THEN 1 
            ELSE 0 END) as new_cards_reviewed`),
          // 统计复习卡片数量（state != 0 表示复习卡片）
          db.raw(`SUM(CASE 
            WHEN JSON_EXTRACT(flashcard, '$.fsrs.state') != '0' THEN 1 
            ELSE 0 END) as review_cards_reviewed`)
        ])
        .first()

      console.log('后端→ 今日学习统计:', todayStats)

      // 4. 计算今天还可以学习的卡片数量
      const newCardsReviewed = Number(todayStats?.new_cards_reviewed || 0)
      const reviewCardsReviewed = Number(todayStats?.review_cards_reviewed || 0)
      // 根据设置的每日上限计算剩余可学习数量
      const remainingNewCards = Math.max(0, settings.newCardsPerDay - newCardsReviewed)
      const remainingReviews = Math.max(0, settings.reviewsPerDay - reviewCardsReviewed)
      const totalRemaining = remainingNewCards + remainingReviews

      console.log('后端→ 学习数量计算:', {
        newCardsReviewed,
        reviewCardsReviewed,
        remainingNewCards,
        remainingReviews,
        totalRemaining
      })

      // 5. 如果今天的学习量已达到上限，直接返回空数组
      if (remainingNewCards === 0 && remainingReviews === 0) {
        console.log('后端→ 新卡和复习卡都已达到上限')
        return []
      }

      // 6. 构建基础查询
      // 查询条件：是闪卡、未删除、到期的卡片
      let query = db('notes')
        .select('notes.*')
        .where({
          'notes.isFlashcard': true,
          'notes.isDeleted': false
        })
        // 只获取到期的卡片
        .where('notes.nextReviewAt', '<=', now)

      // 7. 根据标签参数添加标签过滤条件
      if (tags && tags.length > 0) {
        // 有标签：获取指定标签的闪卡
        query = query
          .join('note_tags', 'notes.id', 'note_tags.noteId')
          .whereIn('note_tags.tagId', tags)
          .groupBy('notes.id')
      } else if (tags && tags.length === 0) {
        // 空数组：获取暂无分类的闪卡
        query = query.whereNotExists(function () {
          this.select('*').from('note_tags').whereRaw('note_tags.noteId = notes.id')
        })
      }

      // 8. 根据设置决定新卡片的排序方式
      switch (settings.newCardPosition) {
        case 'front': // 新卡在前
          query = query.orderByRaw(`
            CASE 
              WHEN JSON_EXTRACT(flashcard, '$.fsrs.state') = '0' THEN 0 
              ELSE 1 
            END,
            nextReviewAt ASC
          `)
          break
        case 'end': // 新卡在后
          query = query.orderByRaw(`
            CASE 
              WHEN JSON_EXTRACT(flashcard, '$.fsrs.state') = '0' THEN 1 
              ELSE 0 
            END,
            nextReviewAt ASC
          `)
          break
        case 'mix': // 混合排序
        default:
          query = query.orderBy('notes.nextReviewAt', 'asc')
          break
      }

      // 9. 分别获取新卡和复习卡
      // 克隆基础查询，分别添加新卡和复习卡的条件
      const newCardsQuery = query
        .clone()
        .andWhereRaw("JSON_EXTRACT(flashcard, '$.fsrs.state') = '0'")
        .limit(remainingNewCards)
      const reviewCardsQuery = query
        .clone()
        .andWhereRaw("JSON_EXTRACT(flashcard, '$.fsrs.state') != '0'")
        .limit(remainingReviews)

      // 10. 并行执行查询
      const [newCards, reviewCards] = await Promise.all([newCardsQuery, reviewCardsQuery])

      // 11. 合并新卡和复习卡
      const combinedCards = [...newCards, ...reviewCards]

      // 12. 根据设置对合并后的卡片进行最终排序
      if (settings.newCardPosition === 'front') {
        // 新卡在前的排序
        combinedCards.sort((a, b) => {
          const aIsNew = JSON.parse(a.flashcard).fsrs.state === 0
          const bIsNew = JSON.parse(b.flashcard).fsrs.state === 0
          if (aIsNew && !bIsNew) return -1
          if (!aIsNew && bIsNew) return 1
          return new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime()
        })
      } else if (settings.newCardPosition === 'end') {
        // 新卡在后的排序
        combinedCards.sort((a, b) => {
          const aIsNew = JSON.parse(a.flashcard).fsrs.state === 0
          const bIsNew = JSON.parse(b.flashcard).fsrs.state === 0
          if (aIsNew && !bIsNew) return 1
          if (!aIsNew && bIsNew) return -1
          return new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime()
        })
      } else {
        // 混合排序，纯粹按照到期时间排序
        combinedCards.sort(
          (a, b) => new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime()
        )
      }

      console.log('后端→ 查询到的卡片数量:', combinedCards.length)
      console.log('后端→ 查询到的卡片:', combinedCards)

      // 13. 转换为Note类型并返回
      const convertedNotes = combinedCards.map(convertToNote)
      console.log('后端→ 转换后的卡片:', convertedNotes)

      return convertedNotes
    } catch (error) {
      console.error('后端→ 获取待复习闪卡失败:', error)
      throw error
    }
  }

  // 获取闪卡统计信息
  async getFlashcardStats(): Promise<FlashcardStats> {
    try {
      console.log('从数据库获取的统计数据')
      // 获取基础统计数据
      const result = await db('notes')
        .where({
          isFlashcard: true,
          isDeleted: false
        })
        .select([
          db.raw('COUNT(*) as total'),
          db.raw(`SUM(CASE 
            WHEN JSON_EXTRACT(flashcard, '$.fsrs.state') = '0' THEN 1 
            ELSE 0 END) as new_cards`),
          db.raw(`SUM(CASE 
            WHEN JSON_EXTRACT(flashcard, '$.fsrs.state') IN ('1', '3') THEN 1 
            ELSE 0 END) as learning_cards`),
          db.raw(`SUM(CASE 
            WHEN JSON_EXTRACT(flashcard, '$.fsrs.state') = ${State.Review} THEN 1 
            ELSE 0 END) as mastered_cards`),
          db.raw(
            `SUM(CASE 
            WHEN nextReviewAt <= ? THEN 1 
            ELSE 0 END) as due_cards`,
            [new Date()]
          )
        ])
        .first()

      // 获取今日统计
      const today = new Date().toISOString().split('T')[0]
      const todayStats = (await db('daily_stats').where({ date: today }).first()) as DailyStats

      // 获取最近7天的统计
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const weeklyStats = (await db('daily_stats')
        .where('date', '>=', weekAgo.toISOString().split('T')[0])
        .orderBy('date', 'desc')
        .select('*')) as DailyStats[]

      // 获取学习历史
      const history = await this.getStudyHistory()

      console.log('weeklyStats:', weeklyStats)
      console.log('todayStats:', todayStats)

      return {
        totalCards: Number(result?.total || 0),
        newCards: Number(result?.new_cards || 0),
        learningCards: Number(result?.learning_cards || 0),
        masteredCards: Number(result?.mastered_cards || 0),
        dueCards: Number(result?.due_cards || 0),
        todayStats: todayStats || {
          date: today,
          uniqueCards: 0,
          totalReviews: 0,
          totalTime: 0,
          feedbackStats: {
            skip: 0,
            forgot: 0,
            partially_recalled: 0,
            recalled_effort: 0,
            easily_recalled: 0
          },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        weeklyStats,
        history
      }
    } catch (error) {
      console.error('后端→ 获取闪卡统计信息失败:', error)
      throw error
    }
  }

  // 获取闪卡卡组数据
  async getFlashcardDecks(): Promise<FlashcardDecks> {
    try {
      // 1. 获取未分类卡组的统计数据
      const untaggedStats = await db('notes')
        .where({
          isFlashcard: true,
          isDeleted: false
        })
        .whereNotExists(function () {
          this.select('*').from('note_tags').whereRaw('note_tags.noteId = notes.id')
        })
        .select([
          db.raw('COUNT(DISTINCT notes.id) as totalCount'),
          db.raw(
            `SUM(CASE 
            WHEN nextReviewAt <= ? AND JSON_EXTRACT(flashcard, '$.fsrs.state') != ${State.Review} THEN 1 
            ELSE 0 END) as dueCount`,
            [new Date()]
          ),
          db.raw(`SUM(CASE 
            WHEN JSON_EXTRACT(flashcard, '$.fsrs.state') = ${State.Review} THEN 1 
            ELSE 0 END) as masteredCount`)
        ])
        .first()

      // 2. 获取标签卡组的统计数据
      const taggedStats = await db('notes')
        .join('note_tags', 'notes.id', 'note_tags.noteId')
        .join('tags', 'note_tags.tagId', 'tags.id')
        .where({
          'notes.isFlashcard': true,
          'notes.isDeleted': false
        })
        .groupBy('tags.id')
        .select([
          'tags.id as tagId',
          'tags.name',
          db.raw('COUNT(DISTINCT notes.id) as totalCount'),
          db.raw(
            `SUM(CASE 
            WHEN notes.nextReviewAt <= ? AND JSON_EXTRACT(notes.flashcard, '$.fsrs.state') != ${State.Review} THEN 1 
            ELSE 0 END) as dueCount`,
            [new Date()]
          ),
          db.raw(`SUM(CASE 
            WHEN JSON_EXTRACT(notes.flashcard, '$.fsrs.state') = ${State.Review} THEN 1 
            ELSE 0 END) as masteredCount`)
        ])

      // 3. 计算进度并格式化数据
      const untagged: UntaggedDeck = {
        totalCount: Number(untaggedStats?.totalCount || 0),
        dueCount: Number(untaggedStats?.dueCount || 0),
        masteredCount: Number(untaggedStats?.masteredCount || 0),
        progress:
          untaggedStats?.totalCount > 0
            ? Math.round(
                (Number(untaggedStats.masteredCount) / Number(untaggedStats.totalCount)) * 100
              )
            : 0
      }

      const tagged: TaggedDeck[] = taggedStats.map((deck) => ({
        tagId: deck.tagId,
        name: deck.name,
        totalCount: Number(deck.totalCount),
        dueCount: Number(deck.dueCount),
        masteredCount: Number(deck.masteredCount),
        progress:
          deck.totalCount > 0
            ? Math.round((Number(deck.masteredCount) / Number(deck.totalCount)) * 100)
            : 0
      }))

      return {
        untagged,
        tagged: tagged.sort((a, b) => b.dueCount - a.dueCount) // 按待复习数量降序排序
      }
    } catch (error) {
      console.error('后端→ 获取闪卡卡组数据失败:', error)
      throw error
    }
  }

  // 获取记忆卡设置
  async getSettings(): Promise<FlashcardSettings> {
    try {
      const settings = await db('flashcard_settings').first()
      if (!settings) {
        return DEFAULT_FLASHCARD_SETTINGS
      }
      return {
        dailyGoal: settings.dailyGoal,
        newCardsPerDay: settings.newCardsPerDay,
        reviewsPerDay: settings.reviewsPerDay,
        dayStartsAt: settings.dayStartsAt,
        newCardPosition: settings.newCardPosition,
        requestRetention: settings.requestRetention,
        maximumInterval: settings.maximumInterval,
        simplifyButtons: settings.simplifyButtons,
        showNextReview: settings.showNextReview,
        maxAnswerTime: settings.maxAnswerTime,
        forgetThreshold: settings.forgetThreshold,
        reviewAgainAfter: settings.reviewAgainAfter
      }
    } catch (error) {
      console.error('后端→ 获取记忆卡设置失败:', error)
      throw error
    }
  }

  // 更新记忆卡设置
  async updateSettings(settings: Partial<FlashcardSettings>): Promise<void> {
    try {
      const currentSettings = await db('flashcard_settings').first()
      if (!currentSettings) {
        // 如果没有设置记录，创建一个
        await db('flashcard_settings').insert({
          id: uuidv4(),
          ...DEFAULT_FLASHCARD_SETTINGS,
          ...settings,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      } else {
        // 更新现有设置
        await db('flashcard_settings')
          .where({ id: currentSettings.id })
          .update({
            ...settings,
            updatedAt: new Date()
          })
      }
      console.log('后端→ 更新记忆卡设置成功')
    } catch (error) {
      console.error('后端→ 更新记忆卡设置失败:', error)
      throw error
    }
  }

  // 重置闪卡学习进度
  async resetFlashcardProgress(noteId: string): Promise<void> {
    try {
      const note = await db('notes').where({ id: noteId }).first()
      if (!note || !note.isFlashcard) {
        throw new Error(`笔记不存在或不是闪卡: ${noteId}`)
      }

      const now = new Date()
      const fsrsCard = createEmptyCard(now) // 创建新的 FSRS 卡片

      const flashcardData: FlashcardData = {
        reviewCount: 0,
        proficiency: 'New',
        fsrs: fsrsCard,
        nextReviewAt: fsrsCard.due,
        // 保留原有的其他数据（如果有的话）
        ...JSON.parse(note.flashcard || '{}'),
        // 但覆盖学习相关的数据
        lastReviewedAt: undefined,
        lastFeedback: undefined
      }

      await db('notes')
        .where({ id: noteId })
        .update({
          flashcard: JSON.stringify(flashcardData),
          nextReviewAt: fsrsCard.due
        })

      console.log('后端→ 重置闪卡进度成功:', noteId)
    } catch (error) {
      console.error('后端→ 重置闪卡进度失败:', error)
      throw error
    }
  }

  // 记录复习记录
  private async saveReviewRecord(
    noteId: string,
    feedback: ReviewFeedback,
    reviewTime: number
  ): Promise<void> {
    try {
      await db('review_records').insert({
        id: uuidv4(),
        noteId,
        reviewedAt: new Date(),
        feedback,
        reviewTime
      })
    } catch (error) {
      console.error('保存复习记录失败:', error)
      throw error
    }
  }

  // 更新每日统计
  private async updateDailyStats(feedback: ReviewFeedback, reviewTime: number): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

      // 获取或创建今日统计
      let stats = await db('daily_stats').where({ date: today }).first()
      if (!stats) {
        stats = {
          date: today,
          uniqueCards: 0,
          totalReviews: 0,
          totalTime: 0,
          feedbackStats: {
            skip: 0,
            forgot: 0,
            partially_recalled: 0,
            recalled_effort: 0,
            easily_recalled: 0
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      } else {
        stats.feedbackStats = JSON.parse(stats.feedbackStats)
      }

      // 更新统计数据
      stats.totalReviews += 1
      stats.totalTime += reviewTime
      stats.feedbackStats[feedback] += 1
      stats.updatedAt = new Date()

      // 保存或更新
      await db('daily_stats')
        .insert(stats)
        .onConflict('date')
        .merge(['totalReviews', 'totalTime', 'feedbackStats', 'updatedAt'])
    } catch (error) {
      console.error('更新每日统计失败:', error)
      throw error
    }
  }

  // 获取学习历史数据
  async getStudyHistory(days: number = 180): Promise<StudyHistory> {
    try {
      // 计算日期范围
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // 获取历史记录
      const records = await db('daily_stats')
        .where('date', '>=', startDate.toISOString().split('T')[0])
        .orderBy('date', 'asc')

      // 计算连续学习天数
      let currentStreak = 0
      let bestStreak = 0
      let tempStreak = 0
      let lastDate: string | null = null

      const heatmap: StudyHeatmap[] = records.map((record) => {
        const count = record.totalReviews
        const date = record.date

        // 计算连续天数
        if (lastDate) {
          const dayDiff = Math.floor(
            (new Date(date).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
          )
          if (dayDiff === 1) {
            tempStreak++
          } else {
            tempStreak = 1
          }
        } else {
          tempStreak = 1
        }

        bestStreak = Math.max(bestStreak, tempStreak)
        lastDate = date

        // 计算当前连续天数
        const today = new Date().toISOString().split('T')[0]
        if (date === today) {
          currentStreak = tempStreak
        }

        // 确定热力图等级
        let level: 'none' | 'few' | 'target' | 'above_target'
        if (count === 0) level = 'none'
        else if (count < 10) level = 'few'
        else if (count < 30) level = 'target'
        else level = 'above_target'

        return { date, count, level }
      })

      return {
        daysStudied: records.length,
        currentStreak,
        bestStreak,
        heatmap
      }
    } catch (error) {
      console.error('获取学习历史失败:', error)
      throw error
    }
  }

  // 批量将笔记转换为闪卡
  async batchConvertToFlashcards(noteIds: string[]): Promise<void> {
    try {
      await db.transaction(async (trx) => {
        // 1. 获取所有非闪卡的笔记
        const notes = await trx('notes')
          .whereIn('id', noteIds)
          .where('isFlashcard', false)
          .select('id')

        if (notes.length === 0) {
          console.log('后端→ 没有需要转换的笔记（可能都已经是闪卡）')
          return
        }

        const now = new Date()
        const nonFlashcardIds = notes.map((note) => note.id)

        // 2. 为每个笔记创建闪卡数据
        const fsrsCard = createEmptyCard(now)
        const flashcardData: FlashcardData = {
          reviewCount: 0,
          proficiency: 'New',
          fsrs: fsrsCard,
          nextReviewAt: fsrsCard.due
        }

        // 3. 批量更新笔记
        await trx('notes')
          .whereIn('id', nonFlashcardIds)
          .update({
            isFlashcard: true,
            flashcard: JSON.stringify(flashcardData),
            nextReviewAt: fsrsCard.due
          })

        console.log('后端→ 批量转换闪卡成功:', {
          totalNotes: noteIds.length,
          convertedNotes: nonFlashcardIds.length,
          skippedNotes: noteIds.length - nonFlashcardIds.length
        })
      })
    } catch (error) {
      console.error('后端→ 批量转换闪卡失败:', error)
      throw error
    }
  }
}

export const flashcardService = new FlashcardService()
