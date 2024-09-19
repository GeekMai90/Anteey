import { DataSource, Repository } from 'typeorm'
import { Note } from '../entities/Note'
import { CardBox } from '../entities/CardBox'
import { v4 as uuidv4 } from 'uuid'

export class NotesService {
  private notesRepository: Repository<Note>
  private _cardBoxRepository: Repository<CardBox>
  private dataSource: DataSource

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource
    this.notesRepository = dataSource.getRepository(Note)
    this._cardBoxRepository = dataSource.getRepository(CardBox)
  }

  async findAll(includeDeleted: boolean = false): Promise<Note[]> {
    return this.notesRepository.find({
      where: includeDeleted ? {} : { isDeleted: false }
    })
  }

  async findOne(id: string): Promise<Note> {
    const note = await this.notesRepository.findOne({
      where: { id },
      relations: ['linkedTo', 'linkedFrom']
    })
    if (!note) {
      throw new Error(`Note with ID "${id}" not found`)
    }
    return note
  }

  async create(createNoteDto: Partial<Note>): Promise<Note> {
    const note = this.notesRepository.create({
      ...createNoteDto,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    })
    return this.notesRepository.save(note)
  }

  async createNewNote(): Promise<Note> {
    const now = new Date()
    const newNote: Partial<Note> = {
      id: uuidv4(),
      address: '',
      cardType: 'Maincard',
      content: {
        type: 'doc',
        content: [{ type: 'paragraph' }]
      },
      // content: {},
      createdAt: now,
      updatedAt: now,
      tags: [],
      linkedTo: [],
      linkedFrom: [],
      cardBoxId: null,
      isDeleted: false,
      isStarred: false
    }
    return this.create(newNote)
  }

  async update(id: string, updateNoteDto: Partial<Note>): Promise<Note> {
    console.log(`NotesService → 开始更新笔记，ID: ${id}`)
    console.log('NotesService → 更新数据:', JSON.stringify(updateNoteDto))

    return this.dataSource
      .transaction(async (transactionalEntityManager) => {
        // 1. 查找笔记
        const note = await transactionalEntityManager.findOne(Note, {
          where: { id },
          relations: ['linkedTo', 'linkedFrom'] // 加载关联数据
        })

        if (!note) {
          console.error(`NotesService → 未找到ID为 ${id} 的笔记`)
          throw new Error(`Note with ID "${id}" not found`)
        }

        console.log('NotesService → 找到的原始笔记:', JSON.stringify(note))

        // 2. 更新字段
        if (updateNoteDto.address !== undefined) {
          note.address = updateNoteDto.address
        }
        if (updateNoteDto.cardType !== undefined) {
          note.cardType = updateNoteDto.cardType
        }
        if (updateNoteDto.content !== undefined) {
          try {
            // 确保内容是有效的JSON
            note.content =
              typeof updateNoteDto.content === 'string'
                ? JSON.parse(updateNoteDto.content)
                : updateNoteDto.content
            console.log('NotesService → 更新内容:', JSON.stringify(note.content))
          } catch (error) {
            console.error('NotesService → 解析内容时出错:', error)
            throw new Error('Invalid content format')
          }
        }
        if (updateNoteDto.tags !== undefined) {
          note.tags = Array.isArray(updateNoteDto.tags) ? updateNoteDto.tags : []
        }
        if (updateNoteDto.cardBoxId !== undefined) {
          note.cardBoxId = updateNoteDto.cardBoxId
        }
        if (updateNoteDto.isDeleted !== undefined) {
          note.isDeleted = updateNoteDto.isDeleted
        }
        if (updateNoteDto.isStarred !== undefined) {
          note.isStarred = updateNoteDto.isStarred
        }

        // 3. 更新时间戳
        note.updatedAt = new Date()

        // 4. 保存更新
        console.log('NotesService → 更新后的笔记（保存前）:', JSON.stringify(note))
        try {
          const savedNote = await transactionalEntityManager.save(Note, note)
          console.log('NotesService → 保存后的笔记:', JSON.stringify(savedNote))
          return savedNote
        } catch (error) {
          console.error('NotesService → 保存笔记时出错:', error)
          throw new Error('Failed to save the updated note')
        }
      })
      .catch((error) => {
        console.error('NotesService → 更新笔记事务失败:', error)
        throw error
      })
  }

  async remove(id: string): Promise<void> {
    const note = await this.notesRepository.findOne({
      where: { id },
      relations: ['linkedTo', 'linkedFrom']
    })
    if (!note) {
      throw new Error('Note not found')
    }
    await this.notesRepository.remove(note)
  }

  async addLink(sourceNoteId: string, targetNoteId: string): Promise<void> {
    const sourceNote = await this.notesRepository.findOne({
      where: { id: sourceNoteId },
      relations: ['linkedTo']
    })
    const targetNote = await this.notesRepository.findOne({
      where: { id: targetNoteId }
    })

    if (!sourceNote || !targetNote) {
      throw new Error('One or both notes not found')
    }

    if (!sourceNote.linkedTo.some((note) => note.id === targetNoteId)) {
      sourceNote.linkedTo.push(targetNote)
      await this.notesRepository.save(sourceNote)
    }
  }

  async removeLink(sourceNoteId: string, targetNoteId: string): Promise<void> {
    const sourceNote = await this.notesRepository.findOne({
      where: { id: sourceNoteId },
      relations: ['linkedTo']
    })

    if (!sourceNote) {
      throw new Error('Source note not found')
    }

    sourceNote.linkedTo = sourceNote.linkedTo.filter((note) => note.id !== targetNoteId)
    await this.notesRepository.save(sourceNote)
  }

  async getLinkedNotes(noteId: string): Promise<Note[]> {
    const note = await this.notesRepository.findOne({
      where: { id: noteId },
      relations: ['linkedTo']
    })

    if (!note) {
      throw new Error('Note not found')
    }

    return note.linkedTo
  }

  async getBacklinks(noteId: string): Promise<Note[]> {
    const note = await this.notesRepository.findOne({
      where: { id: noteId },
      relations: ['linkedFrom']
    })

    if (!note) {
      throw new Error('Note not found')
    }

    return note.linkedFrom
  }

  async updateNoteCardBox(noteId: string, newCardBoxId: string | null): Promise<Note> {
    return this.dataSource.transaction(async (manager) => {
      const note = await manager.findOne(Note, { where: { id: noteId } })
      if (!note) {
        throw new Error('笔记未找到')
      }

      note.cardBoxId = newCardBoxId
      await manager.save(Note, note)

      return note
    })
  }

  async getNotesInCardBox(cardBoxId: string): Promise<Note[]> {
    return this.notesRepository.find({
      where: { cardBoxId: cardBoxId },
      order: { updatedAt: 'DESC' }
    })
  }

  async toggleDeletedStatus(id: string): Promise<Note> {
    const note = await this.findOne(id)
    note.isDeleted = !note.isDeleted
    return this.notesRepository.save(note)
  }

  async toggleStarredStatus(id: string): Promise<Note> {
    const note = await this.findOne(id)
    note.isStarred = !note.isStarred
    return this.notesRepository.save(note)
  }

  async findStarred(): Promise<Note[]> {
    return this.notesRepository.find({
      where: { isStarred: true, isDeleted: false }
    })
  }

  async moveToTrash(id: string): Promise<{ success: boolean; note: Note }> {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      const note = await transactionalEntityManager.findOne(Note, {
        where: { id }
      })

      if (!note) {
        console.error(`NotesService→ 尝试将不存在的笔记移至垃圾箱: ${id}`)
        throw new Error(`Note with ID "${id}" not found`)
      }

      if (note.isDeleted) {
        console.warn(`NotesService→ 尝试将已经在回收站的笔记移至垃圾箱:${id}`)
        throw new Error(`Note with ID "${id}" is already in trash`)
      }

      note.isDeleted = true
      note.updatedAt = new Date()

      const updatedNote = await transactionalEntityManager.save(Note, note)
      console.log(`NotesService→ 笔记成功移至垃圾箱:${id}`)

      return { success: true, note: updatedNote }
    })
  }

  async restoreFromTrash(id: string): Promise<Note> {
    const note = await this.findOne(id)
    note.isDeleted = false
    return this.notesRepository.save(note)
  }

  async permanentlyDelete(id: string): Promise<void> {
    const result = await this.notesRepository.delete(id)
    if (result.affected === 0) {
      throw new Error('Note not found')
    }
  }

  async findDeleted(): Promise<Note[]> {
    return this.notesRepository.find({
      where: { isDeleted: true },
      order: { updatedAt: 'DESC' }
    })
  }
}
