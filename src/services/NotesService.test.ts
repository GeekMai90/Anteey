import { jest } from '@jest/globals'
import { NotesService } from './NotesService'
import { DataSource, Repository } from 'typeorm'
import { Note } from '../entities/Note'

describe('NotesService', () => {
  let notesService: NotesService
  let mockDataSource: jest.Mocked<DataSource>
  let mockNoteRepository: jest.Mocked<Repository<Note>>

  beforeEach(() => {
    mockNoteRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      delete: jest.fn() // 添加这一行
    } as unknown as jest.Mocked<Repository<Note>>

    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockNoteRepository)
    } as unknown as jest.Mocked<DataSource>

    notesService = new NotesService(mockDataSource)
  })

  test('findAll should return all notes', async () => {
    const mockNotes: Note[] = [
      {
        id: 'f1431e72-6f1a-4a2d-bcb5-4f229de6cd07',
        address: '跳转卡',
        cardType: 'Hoplinkcard',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: '这是第一个笔记'
                }
              ]
            }
          ]
        },
        createdAt: new Date('2024-09-13T14:26:28.387Z'),
        updatedAt: new Date('2024-09-14T05:59:40.520Z'),
        tags: [],
        cardBoxId: null,
        isDeleted: false,
        isStarred: false,
        linkedTo: [],
        linkedFrom: [],
        cardBox: null
      },
      {
        id: 'a2b3c4d5-e6f7-8g9h-i0j1-k2l3m4n5o6p7',
        address: '普通卡片',
        cardType: 'Normalcard',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: '这是第二个笔记的内容'
                }
              ]
            }
          ]
        },
        createdAt: new Date('2024-09-14T10:30:00.000Z'),
        updatedAt: new Date('2024-09-15T08:45:20.123Z'),
        tags: ['重要', '工作'],
        cardBoxId: 'box123',
        isDeleted: false,
        isStarred: true,
        linkedTo: [],
        linkedFrom: [],
        cardBox: null
      }
    ]

    mockNoteRepository.find.mockResolvedValue(mockNotes)

    const result = await notesService.findAll()
    expect(result).toEqual(mockNotes)
    expect(mockNoteRepository.find).toHaveBeenCalledWith({
      where: { isDeleted: false }
    })
  })
  test('findOne should return a specific note', async () => {
    const mockNote: Note = {
      id: 'test-id',
      address: '测试卡片',
      cardType: 'Normalcard',
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '测试内容' }] }]
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['测试'],
      cardBoxId: null,
      isDeleted: false,
      isStarred: false,
      linkedTo: [],
      linkedFrom: [],
      cardBox: null
    }

    mockNoteRepository.findOne.mockResolvedValue(mockNote)

    const result = await notesService.findOne('test-id')
    expect(result).toEqual(mockNote)
    expect(mockNoteRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'test-id' },
      relations: ['linkedTo', 'linkedFrom']
    })
  })

  test('create should create a new note', async () => {
    const newNoteData = {
      address: '新卡片',
      cardType: 'Normalcard',
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '新内容' }] }]
      },
      tags: ['新'],
      cardBoxId: null
    }

    const createdNote = {
      ...newNoteData,
      id: expect.any(String),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      isDeleted: false,
      isStarred: false,
      linkedTo: [],
      linkedFrom: [],
      cardBox: null
    }

    mockNoteRepository.create.mockReturnValue(createdNote)
    mockNoteRepository.save.mockResolvedValue(createdNote)

    const result = await notesService.create(newNoteData)
    expect(result).toEqual(createdNote)
    expect(mockNoteRepository.create).toHaveBeenCalledWith(expect.objectContaining(newNoteData))
    expect(mockNoteRepository.save).toHaveBeenCalledWith(createdNote)
  })

  test('update should update an existing note', async () => {
    const existingNote: Note = {
      id: 'existing-id',
      address: '现有卡片',
      cardType: 'Normalcard',
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '现有内容' }] }]
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['旧'],
      cardBoxId: null,
      isDeleted: false,
      isStarred: false,
      linkedTo: [],
      linkedFrom: [],
      cardBox: null
    }

    const updateData = {
      address: '更新的卡片',
      tags: ['新', '更新']
    }

    const updatedNote = { ...existingNote, ...updateData, updatedAt: new Date() }

    mockNoteRepository.findOne.mockResolvedValue(existingNote)
    mockNoteRepository.save.mockResolvedValue(updatedNote)

    const result = await notesService.update('existing-id', updateData)
    expect(result).toEqual(updatedNote)
    expect(mockNoteRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'existing-id' },
      relations: ['linkedTo', 'linkedFrom']
    })
    expect(mockNoteRepository.save).toHaveBeenCalledWith(expect.objectContaining(updateData))
  })

  test('remove should delete a note', async () => {
    const existingNote: Note = {
      id: 'to-delete-id',
      address: '要删除的卡片',
      cardType: 'Normalcard',
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '要删除的内容' }] }]
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      cardBoxId: null,
      isDeleted: false,
      isStarred: false,
      linkedTo: [],
      linkedFrom: [],
      cardBox: null
    }

    mockNoteRepository.findOne.mockResolvedValue(existingNote)
    mockNoteRepository.remove.mockResolvedValue(existingNote)

    await notesService.remove('to-delete-id')

    expect(mockNoteRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'to-delete-id' },
      relations: ['linkedTo', 'linkedFrom']
    })

    expect(mockNoteRepository.remove).toHaveBeenCalledWith(existingNote)
  })

  test('moveToTrash should mark a note as deleted', async () => {
    const existingNote: Note = {
      id: 'to-trash-id',
      // ... 其他属性 ...
      isDeleted: false,
      address: '',
      cardType: '',
      content: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      linkedTo: [],
      linkedFrom: [],
      cardBoxId: null,
      cardBox: null,
      isStarred: false
    }

    mockNoteRepository.findOne.mockResolvedValue(existingNote)
    mockNoteRepository.save.mockResolvedValue({ ...existingNote, isDeleted: true })

    const result = await notesService.moveToTrash('to-trash-id')

    expect(result.isDeleted).toBe(true)
    expect(mockNoteRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'to-trash-id',
        isDeleted: true
      })
    )
  })

  test('restoreFromTrash should mark a note as not deleted', async () => {
    const existingNote: Note = {
      id: 'to-restore-id',
      // ... 其他属性 ...
      isDeleted: true,
      address: '',
      cardType: '',
      content: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      linkedTo: [],
      linkedFrom: [],
      cardBoxId: null,
      cardBox: null,
      isStarred: false
    }

    mockNoteRepository.findOne.mockResolvedValue(existingNote)
    mockNoteRepository.save.mockResolvedValue({ ...existingNote, isDeleted: false })

    const result = await notesService.restoreFromTrash('to-restore-id')

    expect(result.isDeleted).toBe(false)
    expect(mockNoteRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'to-restore-id',
        isDeleted: false
      })
    )
  })

  test('permanentlyDelete should delete a note', async () => {
    mockNoteRepository.delete.mockResolvedValue({ affected: 1, raw: {} })

    await notesService.permanentlyDelete('to-delete-id')

    expect(mockNoteRepository.delete).toHaveBeenCalledWith('to-delete-id')
  })
})
