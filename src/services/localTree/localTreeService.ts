import { Note } from '../../renderer/src/types/Note'
import { db } from '../../db/config'

// 根据 ID 查找笔记
export async function findNoteById(id: string) {
  try {
    const note = await db('notes').where('id', id).where('isDeleted', false).first()

    return note || null
  } catch (error) {
    console.error('查找笔记失败:', error)
    throw error
  }
}

// 获取本地树相关笔记
export async function getLocalTreeNotes(noteId: string) {
  try {
    // 1. 先获取当前笔记
    const currentNote = await findNoteById(noteId)
    if (!currentNote) {
      throw new Error('笔记不存在')
    }

    // 2. 在数据库中查找所有笔记
    const allNotes = await db('notes').where('isDeleted', false).select('*')

    // 3. 根据地址规则筛选出相关笔记
    const result = {
      current: currentNote,
      parent: null as Note | null,
      siblings: [] as Note[],
      children: [] as Note[]
    }

    allNotes.forEach((note) => {
      // 父级：当前地址是否以某个笔记地址为前缀
      if (currentNote.address.startsWith(note.address + '-')) {
        result.parent = note
      }

      // 兄弟级：和当前地址有相同的父级前缀
      const currentSegments = currentNote.address.split('-')
      const noteSegments = note.address.split('-')
      if (
        currentSegments.length === noteSegments.length &&
        currentSegments.slice(0, -1).join('-') === noteSegments.slice(0, -1).join('-') &&
        note.id !== noteId
      ) {
        result.siblings.push(note)
      }

      // 子级：以当前地址为前缀
      if (note.address.startsWith(currentNote.address + '-')) {
        result.children.push(note)
      }
    })

    return result
  } catch (error) {
    console.error('获取本地树相关笔记失败:', error)
    throw error
  }
}
