import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Note } from '@shared/types'

export type BaseStore = ReturnType<typeof useBaseStore>
// 基础 store，包含共享状态
export const useBaseStore = defineStore('base', () => {
  // 共享状态
  const visibleNotes = ref<Record<string, Note>>({})
  const noteCache = new Map<string, Note>()
  const activeNotes = ref<Record<string, Note>>({})
  const pendingUpdates = ref(new Map<string, { type: string; timestamp: number }>())

  // 基础方法
  const addToVisible = (note: Note) => {
    visibleNotes.value[note.id] = note
    noteCache.set(note.id, note)
  }

  const addMultipleToVisible = (notes: Note[]) => {
    notes.forEach((note) => addToVisible(note))
  }

  const removeFromVisible = (noteId: string) => {
    delete visibleNotes.value[noteId]
  }

  const clearVisible = () => {
    visibleNotes.value = {}
  }

  return {
    visibleNotes,
    noteCache,
    activeNotes,
    pendingUpdates,
    addToVisible,
    addMultipleToVisible,
    removeFromVisible,
    clearVisible
  }
})
