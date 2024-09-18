import { DataSource, Repository } from 'typeorm'
import { CardBox } from '../entities/CardBox'
import { Note } from '../entities/Note'
import { v4 as uuidv4 } from 'uuid'

export class CardBoxService {
  private cardBoxRepository: Repository<CardBox>
  private noteRepository: Repository<Note>
  private dataSource: DataSource

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource
    this.cardBoxRepository = dataSource.getRepository(CardBox)
    this.noteRepository = dataSource.getRepository(Note)
  }

  async findAll(): Promise<CardBox[]> {
    return this.cardBoxRepository.find()
  }

  async findOne(id: string): Promise<CardBox> {
    const cardBox = await this.cardBoxRepository.findOne({
      where: { id }
    })
    if (!cardBox) {
      throw new Error(`CardBox with ID "${id}" not found`)
    }
    return cardBox
  }

  async create(createCardBoxDto: Partial<CardBox>): Promise<CardBox> {
    const cardBox = this.cardBoxRepository.create({
      ...createCardBoxDto,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    })
    return this.cardBoxRepository.save(cardBox)
  }

  async update(id: string, updateCardBoxDto: Partial<CardBox>): Promise<CardBox> {
    const cardBox = await this.findOne(id)
    Object.assign(cardBox, {
      ...updateCardBoxDto,
      updatedAt: new Date()
    })
    return this.cardBoxRepository.save(cardBox)
  }

  async remove(id: string): Promise<void> {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      // 找到要删除的卡片盒
      const cardBox = await transactionalEntityManager.findOne(CardBox, { where: { id } })
      if (!cardBox) {
        throw new Error(`CardBox with ID "${id}" not found`)
      }

      // 找到所有关联到这个卡片盒的笔记
      const relatedNotes = await transactionalEntityManager.find(Note, { where: { cardBoxId: id } })

      // 更新这些笔记，将它们的 cardBoxId 设置为 null
      for (const note of relatedNotes) {
        note.cardBoxId = null
      }
      await transactionalEntityManager.save(Note, relatedNotes)

      // 删除卡片盒
      await transactionalEntityManager.remove(CardBox, cardBox)
    })
  }

  // async addNoteToCardBox(cardBoxId: string, noteId: string): Promise<CardBox> {
  //   return this.dataSource.transaction(async (manager) => {
  //     const cardBox = await manager.findOne(CardBox, { where: { id: cardBoxId } })
  //     const note = await manager.findOne(Note, { where: { id: noteId } })

  //     if (!cardBox || !note) {
  //       throw new Error('CardBox or Note not found')
  //     }

  //     if (!cardBox.noteIds.includes(noteId)) {
  //       cardBox.noteIds.push(noteId)
  //       note.cardBoxId = cardBoxId
  //       await manager.save(Note, note)
  //       await manager.save(CardBox, cardBox)
  //     }

  //     return cardBox
  //   })
  // }

  // async removeNoteFromCardBox(cardBoxId: string, noteId: string): Promise<CardBox> {
  //   return this.dataSource.transaction(async (manager) => {
  //     const cardBox = await manager.findOne(CardBox, { where: { id: cardBoxId } })
  //     const note = await manager.findOne(Note, { where: { id: noteId } })

  //     if (!cardBox || !note) {
  //       throw new Error('CardBox or Note not found')
  //     }

  //     cardBox.noteIds = cardBox.noteIds.filter((id) => id !== noteId)
  //     note.cardBoxId = null
  //     await manager.save(Note, note)
  //     await manager.save(CardBox, cardBox)

  //     return cardBox
  //   })
  // }

  // async getNotesInCardBox(cardBoxId: string): Promise<Note[]> {
  //   const cardBox = await this.findOne(cardBoxId)
  //   return this.noteRepository.findByIds(cardBox.noteIds)
  // }
}
