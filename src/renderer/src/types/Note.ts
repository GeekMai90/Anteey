// src/types/Note.ts

// 定义卡片类型
export type CardType = 'Maincard' | 'Bibcard' | 'Indexcard' | 'Hoplinkcard'

// 卡片笔记
export interface Note {
  id: string
  address: string // Zettelkasten 编码地址
  cardType: CardType // 卡片类型
  content: string | object // 包含标题和正文
  createdAt: Date
  updatedAt: Date
  tags: string[] // 标签列表
  linkedTo: string[]
  linkedFrom: string[]
  cardBoxId?: string
  isDeleted?: boolean
  isStarred?: boolean
}

export interface CreateNoteDto {
  address: string
  cardType: CardType
  content: object
  tags: string[]
  isDeleted?: boolean
  isStarred?: boolean
}

export interface UpdateNoteDto {
  address?: string
  cardType?: CardType
  content?: object
  tags?: string[]
  isDeleted?: boolean
  isStarred?: boolean
}

// 卡片盒（文件夹）
export interface CardBox {
  id: string
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
  noteIds: string[] //包含的笔记 id 列表
}

// 白板
export interface Whiteboard {
  id: string
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
  notes: WhiteboardNote[] // 白板上的笔记及其位置信息
}

// 白板上的笔记
export interface WhiteboardNote {
  noteId: string // 引用实际的笔记 id
  position: { x: number; y: number } // 笔记在白板上的位置
}

// 连线
export interface Connection {
  id: string
  whiteboardId: string // 所属白板 id
  sourceNoteId: string // 起始笔记 id
  targetNoteId: string // 目标笔记 id
  label?: string // 连线标签
}

// 辅助函数
export function createNewNote(partialNote: Partial<CreateNoteDto>): CreateNoteDto {
  return {
    address: partialNote.address || '',
    cardType: partialNote.cardType || 'Maincard',
    content: partialNote.content || {},
    tags: partialNote.tags || [],
    isDeleted: partialNote.isDeleted || false,
    isStarred: partialNote.isStarred || false
  }
}

// 修改准备保存的函数
export function parseNoteContent(note: Note): Note {
  return {
    ...note,
    createdAt: new Date(note.createdAt),
    updatedAt: new Date(note.updatedAt)
  }
}

// 新增函数：准备更新笔记的数据
// export function prepareNoteForUpdate(
//   note: Partial<UpdateNoteDto>
// ): UpdateNoteDto {
//   const updateData: UpdateNoteDto = {};

//   if (note.address !== undefined) updateData.address = note.address;
//   if (note.cardType !== undefined) updateData.cardType = note.cardType;
//   if (note.content !== undefined) updateData.content = note.content;
//   if (note.tags !== undefined) updateData.tags = note.tags;

//   return updateData;
// }
