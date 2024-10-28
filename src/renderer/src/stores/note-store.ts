import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { CardType, Note } from '../types/Note'
import { Editor } from '@tiptap/vue-3'

export const useNoteStore = defineStore('note', () => {
  // 状态
  const currentNote = ref<Note | null>(null)
  const isEditorOpen = ref(false)
  const isLoading = ref(false)
  const pendingUpdates = ref(new Set<string>()) // 跟踪正在更新的字段
  const starredNotes = ref<Note[]>([])
  const editor = ref<Editor | null>(null)

  // getters
  const isSaving = computed(() => pendingUpdates.value.size > 0)
  // 方法

  //初始化
  async function initializeStore() {
    await fetchStarredNotes()
  }

  // 创建并打开笔记
  async function createAndOpenNote() {
    try {
      isLoading.value = true
      // 创建笔记
      const newNote = await window.electronAPI.createNote()
      currentNote.value = newNote
      // 打开笔记
      isEditorOpen.value = true
    } catch (error) {
      console.error('创建笔记失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  //关闭笔记编辑器
  function closeNoteEditor() {
    isEditorOpen.value = false
    currentNote.value = null
  }

  // 获取笔记
  async function fetchNoteById(id: string) {
    try {
      isLoading.value = true
      const note = await window.electronAPI.getNoteById(id)
      currentNote.value = note
    } catch (error) {
      console.error('获取笔记失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 更新笔记地址
  async function updateNoteAddress(id: string, newAddress: string) {
    if (!currentNote.value || currentNote.value.id !== id) return

    const oldAddress = currentNote.value.address
    try {
      // 乐观更新
      currentNote.value.address = newAddress
      pendingUpdates.value.add('address')

      // 后端更新
      await window.electronAPI.updateNoteAddress(id, newAddress)
    } catch (error) {
      // 发生错误时回滚
      if (currentNote.value) {
        currentNote.value.address = oldAddress
      }
      console.error('更新笔记地址失败:', error)
      throw error
    } finally {
      pendingUpdates.value.delete('address')
    }
  }

  // 更新笔记类型
  async function updateNoteCardType(id: string, newType: CardType) {
    if (!currentNote.value || currentNote.value.id !== id) return

    const oldType = currentNote.value.cardType
    try {
      // 乐观更新
      currentNote.value.cardType = newType
      pendingUpdates.value.add('cardType')

      // 后端更新
      await window.electronAPI.updateNoteCardType(id, newType)
    } catch (error) {
      // 发生错误时回滚
      if (currentNote.value) {
        currentNote.value.cardType = oldType
      }
      console.error('更新笔记类型失败:', error)
      throw error
    } finally {
      pendingUpdates.value.delete('cardType')
    }
  }

  // 更新笔记内容
  async function updateNoteContent(id: string, newContent: any) {
    if (!currentNote.value || currentNote.value.id !== id) return

    const oldContent = currentNote.value.content
    try {
      // 乐观更新
      currentNote.value.content = newContent
      pendingUpdates.value.add('content')

      // 后端更新
      await window.electronAPI.updateNoteContent(id, newContent)
    } catch (error) {
      // 发生错误时回滚
      if (currentNote.value) {
        currentNote.value.content = oldContent
      }
      console.error('更新笔记内容失败:', error)
      throw error
    } finally {
      pendingUpdates.value.delete('content')
    }
  }

  // 获取星标收藏的笔记
  async function fetchStarredNotes() {
    try {
      const response = await window.electronAPI.getStarredNotes()
      if (response.success && response.data) {
        starredNotes.value = response.data
      } else {
        throw new Error(response.error || '获取收藏笔记失败')
      }
    } catch (error) {
      console.error('获取收藏笔记失败:', error)
      throw error
    }
  }
  // 更新笔记收藏状态
  async function updateNoteStarred(id: string, isStarred: boolean) {
    try {
      pendingUpdates.value.add('starred')

      // 乐观更新
      if (currentNote.value?.id === id) {
        currentNote.value.isStarred = isStarred
      }

      // 更新 starredNotes 列表
      if (isStarred) {
        // 如果是收藏，将笔记添加到列表顶部
        const noteToAdd =
          currentNote.value?.id === id
            ? currentNote.value
            : await window.electronAPI.getNoteById(id)
        if (noteToAdd) {
          starredNotes.value.unshift(noteToAdd)
        }
      } else {
        // 如果是取消收藏，从列表中移除
        starredNotes.value = starredNotes.value.filter((note) => note.id !== id)
      }

      // 调用后端 API
      const finalState = await window.electronAPI.updateNoteStarred(id, isStarred)

      // 如果后端返回的状态与预期不符，回滚更改
      if (finalState !== isStarred) {
        if (currentNote.value?.id === id) {
          currentNote.value.isStarred = finalState
        }
        // 重新获取收藏列表以确保数据一致性
        await fetchStarredNotes()
      }

      return finalState
    } catch (error) {
      console.error('更新笔记收藏状态失败:', error)
      // 发生错误时回滚更改
      if (currentNote.value?.id === id) {
        currentNote.value.isStarred = !isStarred
      }
      await fetchStarredNotes() // 重新获取收藏列表
      throw error
    } finally {
      pendingUpdates.value.delete('starred')
    }
  }
  // 设置编辑器实例
  function setEditor(newEditor: Editor) {
    editor.value = newEditor as any
  }
  // 清除编辑器实例
  function clearEditor() {
    if (editor.value) {
      editor.value.destroy()
    }
    editor.value = null
  }

  return {
    // state
    isEditorOpen,
    isLoading,
    currentNote,
    isSaving,
    starredNotes,
    editor,
    // actions
    createAndOpenNote,
    closeNoteEditor,
    fetchNoteById,
    updateNoteAddress,
    updateNoteCardType,
    updateNoteContent,
    fetchStarredNotes,
    updateNoteStarred,
    setEditor,
    clearEditor,
    initializeStore
  }
})
