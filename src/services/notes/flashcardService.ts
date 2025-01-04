import { db } from '../../db/config'
import type { Note, TaggedDeck, UntaggedDeck, FlashcardSettings } from '@shared/types'
import type { FlashcardData, ReviewFeedback, FlashcardStats, FlashcardDecks } from '@shared/types'
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
  }): Promise<void> {
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

      console.log('后端→ 更新闪卡状态成功:', noteId)
    } catch (error) {
      console.error('后端→ 更新闪卡状态失败:', error)
      throw error
    }
  }

  // 获取待复习的闪卡
  async getDueFlashcards(tags?: string[]): Promise<Note[]> {
    try {
      const settings = await this.getSettings()

      // 计算今天的开始时间
      const now = new Date()
      const todayStart = new Date(now)
      todayStart.setHours(settings.dayStartsAt, 0, 0, 0)
      if (now.getHours() < settings.dayStartsAt) {
        todayStart.setDate(todayStart.getDate() - 1)
      }

      // 获取今天已学习的卡片统计
      const todayStats = await db('notes')
        .where({
          isFlashcard: true,
          isDeleted: false
        })
        .whereRaw("JSON_EXTRACT(flashcard, '$.lastReviewedAt') >= ?", [todayStart.toISOString()])
        .select([
          db.raw(`SUM(CASE 
            WHEN JSON_EXTRACT(flashcard, '$.fsrs.state') = '0' THEN 1 
            ELSE 0 END) as new_cards_reviewed`),
          db.raw(`SUM(CASE 
            WHEN JSON_EXTRACT(flashcard, '$.fsrs.state') != '0' THEN 1 
            ELSE 0 END) as review_cards_reviewed`)
        ])
        .first()

      // 计算剩余可学习数量
      const newCardsReviewed = Number(todayStats?.new_cards_reviewed || 0)
      const reviewCardsReviewed = Number(todayStats?.review_cards_reviewed || 0)
      const remainingNewCards = Math.max(0, settings.newCardsPerDay - newCardsReviewed)
      const remainingReviews = Math.max(0, settings.reviewsPerDay - reviewCardsReviewed)
      const totalRemaining = Math.min(
        settings.dailyGoal - (newCardsReviewed + reviewCardsReviewed),
        remainingNewCards + remainingReviews
      )

      if (totalRemaining <= 0) {
        return []
      }

      // 基础查询
      let query = db('notes')
        .select('notes.*')
        .where({
          'notes.isFlashcard': true,
          'notes.isDeleted': false
        })
        .andWhere((builder) => {
          builder.where('notes.nextReviewAt', '<=', now).orWhere((subBuilder) => {
            const reviewAgainTime = new Date(now)
            reviewAgainTime.setMinutes(reviewAgainTime.getMinutes() - settings.reviewAgainAfter)
            subBuilder
              .whereRaw("JSON_EXTRACT(flashcard, '$.lastReviewedAt') IS NOT NULL")
              .andWhereRaw("JSON_EXTRACT(flashcard, '$.lastReviewedAt') <= ?", [
                reviewAgainTime.toISOString()
              ])
          })
        })

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
      // undefined: 获取所有闪卡（不添加任何标签相关的条件）

      // 根据设置决定排序方式
      switch (settings.newCardPosition) {
        case 'front':
          // 新卡片优先：先按状态排序（新卡在前），再按到期时间排序
          query = query.orderByRaw(`
            CASE 
              WHEN JSON_EXTRACT(flashcard, '$.fsrs.state') = '0' THEN 0 
              ELSE 1 
            END,
            nextReviewAt ASC
          `)
          break
        case 'end':
          // 新卡片最后：先按状态排序（新卡在后），再按到期时间排序
          query = query.orderByRaw(`
            CASE 
              WHEN JSON_EXTRACT(flashcard, '$.fsrs.state') = '0' THEN 1 
              ELSE 0 
            END,
            nextReviewAt ASC
          `)
          break
        case 'mix':
        default:
          // 混合：只按到期时间排序
          query = query.orderBy('notes.nextReviewAt', 'asc')
          break
      }

      // 限制返回数量
      query = query.limit(totalRemaining)

      const notes = await query
      return notes.map(convertToNote)
    } catch (error) {
      console.error('后端→ 获取待复习闪卡失败:', error)
      throw error
    }
  }

  // 获取闪卡统计信息
  async getFlashcardStats(): Promise<FlashcardStats> {
    try {
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
            WHEN JSON_EXTRACT(flashcard, '$.fsrs.state') = '2' THEN 1 
            ELSE 0 END) as mastered_cards`),
          db.raw(
            `SUM(CASE 
            WHEN nextReviewAt <= ? THEN 1 
            ELSE 0 END) as due_cards`,
            [new Date()]
          )
        ])
        .first()

      return {
        totalCards: Number(result?.total || 0),
        newCards: Number(result?.new_cards || 0),
        learningCards: Number(result?.learning_cards || 0),
        masteredCards: Number(result?.mastered_cards || 0),
        dueCards: Number(result?.due_cards || 0)
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
}

export const flashcardService = new FlashcardService()
