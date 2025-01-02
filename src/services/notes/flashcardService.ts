import { db } from '../../db/config'
import type { Note } from '../../renderer/src/types/Note'
import type {
  FlashcardData,
  ReviewFeedback,
  FlashcardStats,
  FlashcardDecks,
  UntaggedDeck,
  TaggedDeck
} from '../../renderer/src/types/flashcard'
import { convertToNote } from '../notes/notesService'
export class FlashcardService {
  // 将笔记转换为闪卡
  async convertToFlashcard(noteId: string): Promise<void> {
    try {
      const flashcardData: FlashcardData = {
        reviewCount: 0,
        proficiency: 'new',
        sm2: {
          repetitions: 0,
          easiness: 2.5,
          interval: 0
        }
      }

      await db('notes')
        .where({ id: noteId })
        .update({
          isFlashcard: true,
          flashcard: JSON.stringify(flashcardData),
          nextReviewAt: new Date()
        })
        .returning('*')

      console.log('后端→ 笔记转换为闪卡成功:', noteId)
    } catch (error) {
      console.error('后端→ 笔记转换为闪卡失败:', error)
      throw error
    }
  }

  // 取消闪卡标记
  async removeFlashcard(noteId: string): Promise<void> {
    try {
      await db('notes')
        .where({ id: noteId })
        .update({
          isFlashcard: false,
          flashcard: null,
          nextReviewAt: null
        })
        .returning('*')

      console.log('后端→ 取消闪卡标记成功:', noteId)
    } catch (error) {
      console.error('后端→ 取消闪卡标记失败:', error)
      throw error
    }
  }

  // 更新闪卡复习状态
  async updateFlashcardStatus({
    noteId,
    feedback
  }: {
    noteId: string
    feedback: ReviewFeedback
  }): Promise<void> {
    try {
      const note = await db('notes').where({ id: noteId }).first()
      if (!note || !note.isFlashcard) {
        throw new Error(`笔记不存在或不是闪卡: ${noteId}`)
      }

      const flashcardData: FlashcardData = JSON.parse(note.flashcard || '{}')
      const sm2Data = this.calculateSM2(flashcardData.sm2, feedback)

      const updatedData: FlashcardData = {
        ...flashcardData,
        lastReviewedAt: new Date(),
        nextReviewAt: sm2Data.nextReviewAt,
        reviewCount: (flashcardData.reviewCount || 0) + 1,
        lastFeedback: feedback,
        proficiency: this.calculateProficiency(sm2Data),
        sm2: {
          repetitions: sm2Data.repetitions,
          easiness: sm2Data.easiness,
          interval: sm2Data.interval
        }
      }

      await db('notes')
        .where({ id: noteId })
        .update({
          flashcard: JSON.stringify(updatedData),
          nextReviewAt: updatedData.nextReviewAt
        })
        .returning('*')

      console.log('后端→ 更新闪卡状态成功:', noteId)
    } catch (error) {
      console.error('后端→ 更新闪卡状态失败:', error)
      throw error
    }
  }

  // 获取待复习的闪卡
  async getDueFlashcards(tags?: string[]): Promise<Note[]> {
    try {
      let query = db('notes')
        .select('notes.*')
        .where({
          'notes.isFlashcard': true,
          'notes.isDeleted': false
        })
        .andWhere('notes.nextReviewAt', '<=', new Date())

      if (tags && tags.length > 0) {
        query = query
          .join('note_tags', 'notes.id', 'note_tags.noteId')
          .whereIn('note_tags.tagId', tags)
          .groupBy('notes.id')
      } else {
        // 如果没有指定标签，则获取所有卡片
        // 不需要添加额外的条件
      }

      const notes = await query.orderBy('notes.nextReviewAt', 'asc')

      // 使用 convertToNote 函数转换数据库记录
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
            WHEN JSON_EXTRACT(flashcard, '$.proficiency') = 'new' THEN 1 
            ELSE 0 END) as new_cards`),
          db.raw(`SUM(CASE 
            WHEN JSON_EXTRACT(flashcard, '$.proficiency') = 'learning' THEN 1 
            ELSE 0 END) as learning_cards`),
          db.raw(`SUM(CASE 
            WHEN JSON_EXTRACT(flashcard, '$.proficiency') = 'mastered' THEN 1 
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
            WHEN nextReviewAt <= ? AND JSON_EXTRACT(flashcard, '$.proficiency') != 'mastered' THEN 1 
            ELSE 0 END) as dueCount`,
            [new Date()]
          ),
          db.raw(`SUM(CASE 
            WHEN JSON_EXTRACT(flashcard, '$.proficiency') = 'mastered' THEN 1 
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
            WHEN notes.nextReviewAt <= ? THEN 1 
            ELSE 0 END) as dueCount`,
            [new Date()]
          ),
          db.raw(`SUM(CASE 
            WHEN JSON_EXTRACT(notes.flashcard, '$.proficiency') = 'mastered' THEN 1 
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

  // 私有方法：计算 SM2 算法结果
  private calculateSM2(currentSM2: any, feedback: ReviewFeedback) {
    const score = this.feedbackToScore(feedback)
    const easiness = Math.max(
      1.3,
      currentSM2.easiness + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02))
    )

    let interval = 0
    let repetitions = 0

    if (score >= 3) {
      repetitions = currentSM2.repetitions + 1
      if (repetitions === 1) interval = 1
      else if (repetitions === 2) interval = 6
      else interval = Math.round(currentSM2.interval * easiness)
    }

    const nextReviewAt = new Date()
    nextReviewAt.setDate(nextReviewAt.getDate() + interval)

    return { easiness, interval, repetitions, nextReviewAt }
  }

  // 私有方法：将反馈转换为分数
  private feedbackToScore(feedback: ReviewFeedback): number {
    const scoreMap = {
      skip: 0,
      forgot: 1,
      partially_recalled: 3,
      recalled_effort: 4,
      easily_recalled: 5
    }
    return scoreMap[feedback]
  }

  // 私有方法：计算熟练度
  private calculateProficiency(sm2Data: any) {
    if (sm2Data.repetitions === 0) return 'new'
    if (sm2Data.repetitions < 3) return 'learning'
    if (sm2Data.interval >= 21) return 'mastered'
    return 'familiar'
  }
}

export const flashcardService = new FlashcardService()
