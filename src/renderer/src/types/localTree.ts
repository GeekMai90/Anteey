import type { Note } from './Note'

export interface LocalTreeData {
  current: Note
  parent: Note | null
  siblings: Note[]
  children: Note[]
}
