import type { Note } from '@shared/types'

export interface LocalTreeData {
  current: Note
  parent: Note | null
  siblings: Note[]
  children: Note[]
}

// 在 src/renderer/src/types/localTree.ts 中添加
export interface LocalTreeWithReferencesData extends LocalTreeData {
  references: {
    incoming: Note[] // 引用了当前笔记的笔记
    outgoing: Note[] // 被当前笔记引用的笔记
  }
}
