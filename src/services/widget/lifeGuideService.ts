import { db } from '../../db/config'
import { Note } from '@shared/types'
import { convertToNote } from '../notes/notesService'

// 获取随机的人生指南笔记
export async function getRandomLifeGuideNote(): Promise<Note | null> {
  try {
    // 1. 从 note_tags 关联表和 tags 表中查找带有"人生指南"标签的笔记
    const note = await db('notes')
      .join('note_tags', 'notes.id', 'note_tags.noteId')
      .join('tags', 'note_tags.tagId', 'tags.id')
      .where('tags.name', '人生指南')
      .where('notes.isDeleted', false)
      .orderByRaw('RANDOM()') // 使用 orderByRaw 代替 orderBy
      .select('notes.*')
      .first()

    // 2. 如果没有找到笔记,返回 null
    if (!note) {
      return null
    }

    // 3. 使用 convertToNote 处理笔记数据(处理序列化的字段)
    return convertToNote(note)
  } catch (error) {
    console.error('获取随机人生指南笔记失败:', error)
    throw error
  }
}
