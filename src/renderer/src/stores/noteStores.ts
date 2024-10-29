import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Notes, Table, TransactionOrder, Deeplink } from '@icon-park/vue-next'
import type {
  Note,
  Whiteboard,
  Connection,
  CardBox,
  RelatedNote,
  RelatedNotesResult
} from '../types/Note'
import type { Editor } from '@tiptap/vue-3'
import { GetPaginatedNotesParams } from '../../../db/notesService'
import { useEventBus } from '@vueuse/core/index.cjs'
// import { debounce } from 'lodash-es'
import { useUIStore } from './useUIStore'

// 常量定义
const cardTypes = [
  { value: 'Maincard', label: '主要卡', icon: Notes },
  { value: 'Bibcard', label: '书目卡', icon: Table },
  { value: 'Indexcard', label: '索引卡', icon: TransactionOrder },
  { value: 'Hoplinkcard', label: '跳转卡', icon: Deeplink }
]

export const useNoteStore = defineStore('note', () => {
  // State
  const notes = ref<Note[]>([])
  const cardBoxes = ref<CardBox[]>([])
  const whiteboards = ref<Whiteboard[]>([])
  const connections = ref<Connection[]>([])
  const isEditorOpen = ref(false)
  const currentNoteId = ref<string | undefined>(undefined)
  const currentNote = ref<Note | null>(null)
  const isSearchModalOpen = ref(false)
  const isSidebarCollapsed = ref(false)
  const isRightSidebarOpen = ref(false)
  const rightSidebarNotes = ref<Note[]>([])
  const selectedCardTypes = ref<string[]>(cardTypes.map((type) => type.value))
  const noteSaveStatus = ref<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({})
  const currentNoteSaveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const isSettingDropdownOpen = ref(false)
  const showCardBox = ref(false)
  const editor = ref<Editor | null>(null)
  const isLoading = ref(true)
  const recentNotes = ref<string[]>([])
  const maxRecentNotes = ref(6)
  const highlightedNoteId = ref<string | null>(null)
  const currentPage = ref(1)
  const pageSize = ref(20)
  const totalNotes = ref(0)
  const oldestLoadedDate = ref<Date | null>(null)
  const newestLoadedDate = ref<Date | null>(null)
  const hasMoreNotes = ref(true)
  const hasMoreOlderNotes = ref(true)
  const hasMoreNewerNotes = ref(false)
  const windowSize = ref(50)
  const selectedCardBoxId = ref<string | null>(null)
  const lastUpdatedNote = ref<Note | null>(null)
  const lastCreatedNote = ref<Note | null>(null)
  const lastDeletedNote = ref<Note | null>(null)
  const starredNotes = ref<Note[]>([])
  const showShareModal = ref(false)
  const shareNote = ref<any>(null)
  const relatedNotes = ref<RelatedNote[]>([])
  const pendingUpdates = ref(
    new Map<
      string,
      {
        type: string
        timestamp: number
      }
    >()
  )
  // 核心状态
  const visibleNotes = ref<Record<string, Note>>({}) // 可见笔记的响应式存储
  const noteCache = new Map<string, Note>() // 所有笔记的非响应式缓存
  const activeNotes = ref<Record<string, Note>>({}) // 当前正在编辑的笔记

  // 视图配置
  const viewConfig = ref({
    pageSize: 20,
    currentPage: 1
  })
  // 获取笔记
  const fetchNote = async (noteId: string) => {
    console.log('Store: fetchNote 开始:', { noteId, activeNotes: activeNotes.value })

    try {
      // 1. 先检查缓存
      if (noteCache.has(noteId)) {
        console.log('Store: 从缓存获取笔记')
        const note = noteCache.get(noteId)!
        // 确保使用响应式更新
        activeNotes.value = {
          ...activeNotes.value,
          [noteId]: { ...note }
        }
        console.log('Store: 从缓存更新后的状态:', activeNotes.value)
        return note
      }

      // 2. 缓存没有则从后端获取
      console.log('Store: 从后端获取笔记')
      const note = await window.electronAPI.getNote(noteId)
      console.log('Store: 后端返回的笔记:', note)

      if (note) {
        // 3. 更新缓存和活动笔记
        noteCache.set(noteId, note)
        // 确保使用响应式更新
        activeNotes.value = {
          ...activeNotes.value,
          [noteId]: { ...note }
        }
        console.log('Store: 更新后的状态:', activeNotes.value)
        return note
      } else {
        console.warn('Store: 未找到笔记:', noteId)
        return null
      }
    } catch (error) {
      console.error('Store: 获取笔记失败:', error)
      throw error
    }
  }

  // 激活笔记编辑
  const activateNote = (noteId: string) => {
    if (!noteCache.has(noteId)) return null
    const note = noteCache.get(noteId)!
    activeNotes.value[noteId] = { ...note }
    return activeNotes.value[noteId]
  }

  // 停用笔记编辑
  const deactivateNote = (noteId: string) => {
    delete activeNotes.value[noteId]
  }
  // 更新相关的方法
  const updateNoteContent = async (noteId: string, content: any) => {
    // 1. 检查笔记是否存在且处于编辑状态
    if (!activeNotes.value[noteId]) {
      throw new Error('笔记不在编辑状态')
    }

    // 2. 乐观更新
    activeNotes.value[noteId] = {
      ...activeNotes.value[noteId],
      content,
      updatedAt: new Date()
    }

    // 3. 同步更新 cache 和 visible (如果存在)
    if (noteCache.has(noteId)) {
      noteCache.set(noteId, { ...activeNotes.value[noteId] })
    }
    if (noteId in visibleNotes.value) {
      visibleNotes.value[noteId] = { ...activeNotes.value[noteId] }
    }

    try {
      // 4. 发送后端请求
      const updatedNote = await window.electronAPI.updateNoteContent(noteId, content)

      // 5. 更新成功，同步所有状态
      activeNotes.value[noteId] = updatedNote
      noteCache.set(noteId, updatedNote)
      if (noteId in visibleNotes.value) {
        visibleNotes.value[noteId] = updatedNote
      }

      return updatedNote
    } catch (error) {
      // 6. 更新失败，回滚所有状态
      const originalNote = noteCache.get(noteId)!
      activeNotes.value[noteId] = { ...originalNote }
      if (noteId in visibleNotes.value) {
        visibleNotes.value[noteId] = { ...originalNote }
      }
      throw error
    }
  }

  // 更新笔记地址
  const updateNoteAddress = async (noteId: string, address: string) => {
    console.log('Store: 开始更新笔记地址:', { noteId, address })
    // 1. 检查笔记是否存在且处于编辑状态
    if (!activeNotes.value[noteId]) {
      throw new Error('笔记不在编辑状态')
    }

    // 2. 乐观更新
    activeNotes.value[noteId] = {
      ...activeNotes.value[noteId],
      address,
      updatedAt: new Date()
    }

    // 3. 同步更新 cache 和 visible (如果存在)
    if (noteCache.has(noteId)) {
      noteCache.set(noteId, { ...activeNotes.value[noteId] })
    }
    if (noteId in visibleNotes.value) {
      visibleNotes.value[noteId] = { ...activeNotes.value[noteId] }
    }

    // 4. 记录pending状态，防止并发更新
    pendingUpdates.value.set(`${noteId}-address`, {
      type: 'address',
      timestamp: Date.now()
    })

    try {
      // 5. 发送后端请求
      const updatedNote = await window.electronAPI.updateNoteAddress(noteId, address)

      // 6. 检查是否有更新的pending更新，避免覆盖新的更改
      const pendingUpdate = pendingUpdates.value.get(`${noteId}-address`)
      if (!pendingUpdate || pendingUpdate.timestamp <= Date.now()) {
        // 7. 更新成功，同步所有状态
        activeNotes.value[noteId] = updatedNote
        noteCache.set(noteId, updatedNote)
        if (noteId in visibleNotes.value) {
          visibleNotes.value[noteId] = updatedNote
        }
      }

      return updatedNote
    } catch (error) {
      // 8. 更新失败，回滚所有状态
      const originalNote = noteCache.get(noteId)!
      activeNotes.value[noteId] = { ...originalNote }
      if (noteId in visibleNotes.value) {
        visibleNotes.value[noteId] = { ...originalNote }
      }
      console.error('更新地址失败:', error)
      throw error
    } finally {
      // 9. 清理pending状态
      pendingUpdates.value.delete(`${noteId}-address`)
    }
  }

  // Getters
  const recentNotesList = computed(
    () =>
      recentNotes.value
        .map((id) => notes.value.find((note) => note.id === id))
        .filter(Boolean) as Note[]
  )

  const getNoteAddress = computed(
    () => (id: string) => notes.value.find((note) => note.id === id)?.address || ''
  )

  const allNotes = computed(() => notes.value)

  const allBibNotes = computed(() => notes.value.filter((note) => note.cardType === 'Bibcard'))

  const allIndexNotes = computed(() => notes.value.filter((note) => note.cardType === 'Indexcard'))

  const allHoplinkNotes = computed(() =>
    notes.value.filter((note) => note.cardType === 'Hoplinkcard')
  )

  const allMainNotes = computed(() => notes.value.filter((note) => note.cardType === 'Maincard'))

  const getCardBoxById = computed(
    () => (id: string) => cardBoxes.value.find((box) => box.id === id)
  )

  // Actions

  const toggleCardBox = () => {
    showCardBox.value = !showCardBox.value
  }

  const setShowCardBox = (show: boolean) => {
    showCardBox.value = show
  }

  const toggleSidebar = () => {
    isSidebarCollapsed.value = !isSidebarCollapsed.value
  }

  const setIsSidebarCollapsed = (value: boolean) => {
    isSidebarCollapsed.value = value
  }

  const setCurrentNote = (note: Note | null) => {
    currentNote.value = note
    currentNoteId.value = note ? note.id : undefined
  }

  const setHighlightedNoteId = (noteId: string | null) => {
    highlightedNoteId.value = noteId
  }

  const clearHighlightedNoteId = () => {
    highlightedNoteId.value = null
  }

  const handleShare = async (noteId: string) => {
    // 假设 fetchNoteById 已经在 store 中定义
    const note = await fetchNoteById(noteId)
    if (!note) return

    shareNote.value = note
    showShareModal.value = true
  }

  const initializeStore = async () => {
    await preloadFirstPage() // 预加载第一页笔记
    await initializeCardBoxes() // 初始化卡片盒
    await fetchStarredNotes() // 获取星标收藏的笔记

    setTimeout(() => {
      isLoading.value = false
    }, 2000)
  }

  const getRelatedNotes = async (noteId: string, limit: number): Promise<RelatedNotesResult> => {
    try {
      const result = await window.electronAPI.getRelatedNotes(noteId, limit)

      // 可以选择更新状态
      if (result.success) {
        relatedNotes.value = result.notes
      }

      return result
    } catch (error) {
      console.error('noteStores.ts→ 获取相关笔记失败:', error)
      return {
        success: false,
        notes: [],
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  const searchNotesList = async (query: string) => {
    console.log('noteStores.ts→ 开始搜索笔记列表', query)
    try {
      const notes = await window.electronAPI.searchNotesList(query)
      console.log('noteStores.ts→ 搜索笔记列表成功', notes)
      return notes
    } catch (error) {
      console.error('noteStores.ts→ 搜索笔记列表失败:', error)
      throw error
    }
  }

  const fetchPaginatedNotesByCardbox = async (params: GetPaginatedNotesParams) => {
    // console.log('noteStores.ts→ 开始获取卡片盒分页笔记', params)
    try {
      const { notes: fetchedNotes, totalCount } =
        await window.electronAPI.getPaginatedNotesByCardbox(params)
      // console.log('noteStores.ts→ 获取卡片盒分页笔记成功', fetchedNotes, totalCount)
      return { notes: fetchedNotes, totalCount }
    } catch (error) {
      console.error('noteStores.ts→ 获取卡片盒分页笔记失败:', error)
      throw error // 或者返回一个默认值,取决于您的错误处理策略
    }
  }
  //获取某一天的笔记
  const fetchNotesByOneDate = async (date: string) => {
    console.log('noteStores.ts→ 开始获取某一天的笔记', date)
    try {
      const fetchedNotes = await window.electronAPI.getNotesByOneDate(date)
      console.log('noteStores.ts→ 获取某一天的笔记成功', fetchedNotes)
      return fetchedNotes
    } catch (error) {
      console.error('noteStores.ts→ 获取某一天的笔记失败:', error)
      throw error
    }
  }
  // 获取都有哪些日期有笔记
  const fetchAllDatesWithNotes = async () => {
    try {
      const dates = await window.electronAPI.getAllDatesWithNotes()
      return dates
    } catch (error) {
      console.error('noteStores.ts→ 获取都有哪些日期有笔记失败:', error)
      throw error
    }
  }
  // 辅助方法 trimNotes
  const trimNotes = (direction: 'newer' | 'older') => {
    if (direction === 'older') {
      notes.value = notes.value.slice(-windowSize.value)
      newestLoadedDate.value = new Date(notes.value[0].createdAt)
    } else {
      notes.value = notes.value.slice(0, windowSize.value)
      oldestLoadedDate.value = new Date(notes.value[notes.value.length - 1].createdAt)
    }
  }

  // 获取日期分页笔记
  const fetchNotesByDate = async (direction: 'newer' | 'older' = 'older', limit = 10) => {
    if (isLoading.value) return false

    isLoading.value = true
    try {
      const referenceDate = direction === 'older' ? oldestLoadedDate.value : newestLoadedDate.value
      const { notes: fetchedNotes, totalCount } = await window.electronAPI.getNotesByDate(
        direction,
        referenceDate,
        limit
      )

      if (fetchedNotes.length > 0) {
        if (direction === 'older') {
          notes.value = [...notes.value, ...fetchedNotes]
          oldestLoadedDate.value = new Date(fetchedNotes[fetchedNotes.length - 1].createdAt)
        } else {
          notes.value = [...fetchedNotes, ...notes.value]
          newestLoadedDate.value = new Date(fetchedNotes[0].createdAt)
        }

        // 更新日期，确保它们不为 null
        oldestLoadedDate.value =
          oldestLoadedDate.value || new Date(notes.value[notes.value.length - 1].createdAt)
        newestLoadedDate.value = newestLoadedDate.value || new Date(notes.value[0].createdAt)
      }

      totalNotes.value = totalCount
      hasMoreOlderNotes.value = notes.value.length < totalNotes.value

      // 添加空值检查
      hasMoreNewerNotes.value = newestLoadedDate.value ? newestLoadedDate.value < new Date() : false

      // 只在笔记数量超过窗口大小的两倍时进行裁剪
      if (notes.value.length > windowSize.value * 2) {
        trimNotes(direction)
      }
      console.log('noteStores.ts→ Pinia 中的笔记数量', notes.value.length)
      return fetchedNotes.length > 0
    } catch (error) {
      console.error('Failed to fetch notes:', error)
      return false
    } finally {
      isLoading.value = false
    }
  }
  const clearNotes = async () => {
    notes.value = []
    oldestLoadedDate.value = null
    newestLoadedDate.value = null
    hasMoreOlderNotes.value = true
    hasMoreNewerNotes.value = false
  }

  const refreshNotes = async () => {
    await clearNotes()
    return fetchNotesByDate('older')
  }

  const clearOlderNotes = () => {
    const notesToKeep = 30 // 保留最新的30条笔记
    if (notes.value.length > notesToKeep) {
      notes.value = notes.value.slice(0, notesToKeep)
      oldestLoadedDate.value = new Date(notes.value[notes.value.length - 1].createdAt)
      // 重置hasMoreOlderNotes，因为我们知道还有更多旧笔记
      hasMoreOlderNotes.value = true
    }
  }

  const scrollToTop = async () => {
    // 清理旧数据
    clearOlderNotes()

    // 重新加载最新的笔记
    await refreshNotes()

    // 返回 true 表示操作完成
    return true
  }
  // 获取分页笔记
  const fetchPaginatedNotes = async (page: number, pageSize: number) => {
    // if (isLoading.value) return null
    // console.log('noteStores.ts→ 获取分页笔记', page, pageSize)

    isLoading.value = true

    try {
      const { notes: fetchedNotes, totalCount } = await window.electronAPI.getPaginatedNotes(
        page,
        pageSize
      )
      totalNotes.value = totalCount
      // console.log('noteStores.ts→ 获取分页笔记成功', fetchedNotes, totalCount)
      return { notes: fetchedNotes, totalCount }
    } catch (error) {
      console.error('noteStores.ts→ 获取分页笔记失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const preloadFirstPage = async () => {
    try {
      await fetchPaginatedNotes(1, pageSize.value)
    } catch (error) {
      console.error('noteStores.ts→ 预加载第一页笔记失败:', error)
    }
  }

  const moveEmptyNotesToTrash = async () => {
    try {
      await window.electronAPI.moveEmptyNotesToTrash()
      const emptyNotesMovedToTrashEventBus = useEventBus('empty-notes-moved-to-trash')
      emptyNotesMovedToTrashEventBus.emit()
    } catch (error) {
      console.error('noteStores.ts→ 将空笔记移到回收站失败:', error)
      throw error
    }
  }

  // 添加到最近笔记
  const addToRecentNotes = (noteId: string) => {
    // 如果笔记已经在列表中，先移除它
    recentNotes.value = recentNotes.value.filter((id) => id !== noteId)
    // 将笔记ID添加到列表开头
    recentNotes.value.unshift(noteId)
    // 如果超过最大数量，删除最后一个
    if (recentNotes.value.length > maxRecentNotes.value) {
      recentNotes.value.pop()
    }
  }

  // 从最近笔记中删除
  const removeFromRecentNotes = (noteId: string) => {
    recentNotes.value = recentNotes.value.filter((id) => id !== noteId)
  }

  const openNoteEditor = async (noteId: string) => {
    console.group('打开笔记编辑器')
    console.trace('调用栈:')
    console.log('noteId:', noteId)
    console.log('当前路由:', window.location.href)
    console.log('isEditorOpen 当前状态:', isEditorOpen.value)
    console.groupEnd()

    try {
      const fullNote = await fetchNoteById(noteId)
      currentNote.value = fullNote
      currentNoteId.value = noteId
      isLoading.value = false
      isEditorOpen.value = true
      addToRecentNotes(noteId)
    } catch (error) {
      console.error('noteStores.ts→ 打开笔记编辑器失败:', error)
    }
  }

  const closeNoteEditor = () => {
    isEditorOpen.value = false
    currentNoteId.value = undefined
  }

  const openSearchModal = () => {
    isSearchModalOpen.value = true
  }

  const closeSearchModal = () => {
    isSearchModalOpen.value = false
  }

  const updateCurrentNoteSaveStatus = (status: 'idle' | 'saving' | 'saved' | 'error') => {
    currentNoteSaveStatus.value = status
  }

  const toggleSettingDropdown = () => {
    isSettingDropdownOpen.value = !isSettingDropdownOpen.value
  }

  const closeSettingDropdown = () => {
    isSettingDropdownOpen.value = false
  }

  // 设置编辑器实例
  const setEditor = (newEditor: Editor) => {
    editor.value = newEditor as any
  }

  // 清除编辑器实例
  const clearEditor = () => {
    if (editor.value) {
      editor.value.destroy()
    }
    editor.value = null
  }

  // 获取所有笔记
  const fetchAllNotes = async (includeDeleted: boolean = true) => {
    try {
      const allNotes = await window.electronAPI.getAllNotes(includeDeleted)
      //只存储 20 条笔记
      notes.value = allNotes.slice(0, 20)
      // notes.value = allNotes
      return allNotes
    } catch (error) {
      console.error('noteStores.ts→ 获取所有笔记失败:', error)
      throw error
    }
  }

  //清除所有笔记
  const clearAllNotes = () => {
    notes.value = []
  }

  // 获取单个笔记
  const fetchNoteById = async (id: string): Promise<Note> => {
    try {
      const note = await window.electronAPI.getNote(id)
      if (!note) {
        throw new Error(`Note with id ${id} not found`)
      }
      currentNote.value = note
      console.log('noteStores.ts→ 获取笔记', note)
      return note
    } catch (error) {
      console.error(`noteStores.ts→ 获取笔记失败 ${id}:`, error)
      throw error
    }
  }

  // 将白板中创建的笔记添加到笔记列表中
  const addNoteToNoteList = async (id: string) => {
    const note = await fetchNoteById(id)
    const index = notes.value.findIndex((n) => n.id === id)
    if (index === -1) {
      notes.value.push(note)
    }
  }

  // 更新本地笔记状态
  const updateLocalNote = (id: string, updatedFields: Partial<Note>) => {
    console.log('noteStores.ts→ 更新本地笔记', id, updatedFields)
    const index = notes.value.findIndex((note) => note.id === id)
    if (index !== -1) {
      notes.value[index] = { ...notes.value[index], ...updatedFields }
    }
    if (currentNote.value && currentNote.value.id === id) {
      currentNote.value = { ...currentNote.value, ...updatedFields }
    }
  }

  // 2. 防抖更新远程数据
  // const debouncedUpdateRemote = debounce(
  //   async (id: string, type: 'content' | 'full', data: any) => {
  //     try {
  //       if (type === 'content') {
  //         await window.electronAPI.updateNoteContent(id, data.content)
  //       } else {
  //         await window.electronAPI.updateNote(id, data)
  //       }
  //       console.log(`更新远程笔记${type}成功`, id)
  //     } catch (error) {
  //       console.error(`更新远程笔记${type}失败 ${id}:`, error)
  //       throw error
  //     }
  //   },
  //   1000
  // )

  // 1. 更新笔记内容（仅内容）
  // const updateNoteContent = async (id: string, content: any) => {
  //   try {
  //     currentNoteSaveStatus.value = 'saving'

  //     // 获取当前笔记以保留其他字段
  //     const note = await fetchNoteById(id)
  //     if (!note) throw new Error('Note not found')

  //     // 只更新内容，保留其他字段
  //     const updatedFields = {
  //       ...note,
  //       content,
  //       updatedAt: new Date().toISOString()
  //     }

  //     // 立即更新本地状态
  //     // updateLocalNote(id, updatedFields)

  //     // 延迟更新远程数据库
  //     await debouncedUpdateRemote(id, 'content', updatedFields)

  //     setTimeout(() => {
  //       currentNoteSaveStatus.value = 'saved'
  //     }, 2000)
  //   } catch (error) {
  //     console.error(`更新笔记内容失败 ${id}:`, error)
  //     currentNoteSaveStatus.value = 'error'
  //   }
  // }

  // 获取一些笔记
  const getNotesByIds = async (ids: string[]) => {
    await fetchAllNotes()
    const foundNotes = ids
      .map((id) => notes.value.find((note) => note.id === id))
      .filter((note) => note !== undefined) as Note[]
    console.log('noteStores.ts→ 获取笔记成功', foundNotes)
    return foundNotes
  }

  // 创建新笔记
  const createNote = async () => {
    console.log('noteStores.ts→ 创建新笔记')
    const eventBus = useEventBus('note-created')
    try {
      const newNote = await window.electronAPI.createNote()
      notes.value.push(newNote)
      updateLocalNote(newNote.id, newNote)
      lastCreatedNote.value = newNote
      eventBus.emit(newNote)
      return newNote
    } catch (error) {
      console.error('noteStores.ts→ 创建新笔记失败:', error)
      throw error
    }
  }

  // 创建并打开新笔记
  const createAndOpenNewNote = async () => {
    console.log('noteStores.ts→ 创建并打开新笔记')
    const newNote = await createNote()
    openNoteEditor(newNote.id)
  }

  const moveToTrash = async (id: string) => {
    console.log('noteStores.ts→ 移动到回收站:', id)
    try {
      const result = await window.electronAPI.softDeleteNote(id)
      if (result) {
        lastDeletedNote.value = result
        console.log('noteStores.ts→ 移动到回收站结果:', result)
        // 从星标笔记中移除
        if (starredNotes.value.some((note) => note.id === id)) {
          starredNotes.value = starredNotes.value.filter((note) => note.id !== id)
        }
        return true
      } else {
        console.error('noteStores.ts→ 移动笔记到回收站失败:', result)
        throw new Error('移动笔记到回收站失败')
      }
    } catch (error) {
      console.error('noteStores.ts→ 移动笔记到回收站失败:', error)
      throw error
    }
  }

  const restoreFromTrash = async (id: string) => {
    try {
      const result = await window.electronAPI.restoreNote(id)
      const noteRestoredEventBus = useEventBus('note-restored')
      noteRestoredEventBus.emit()
      return result
    } catch (error) {
      console.error(`noteStores.ts→ 从回收站恢复笔记失败 ${id}:`, error)
      throw error
    }
  }

  const permanentlyDelete = async (id: string) => {
    try {
      await window.electronAPI.permanentDeleteNote(id)
      // notes.value = notes.value.filter((note) => note.id !== id)
      // console.log(`noteStores.ts→ 永久删除笔记: ${id}`)
      if (currentNoteId.value === id) {
        closeNoteEditor()
      }
    } catch (error) {
      console.error(`noteStores.ts→ 永久删除笔记失败: ${id}:`, error)
      throw error
    }
  }

  const initializeCardBoxes = async () => {
    await fetchCardBoxes()
  }

  const fetchCardBoxes = async () => {
    try {
      const fetchedCardBoxes = await window.electronAPI.getAllCardBoxes()
      cardBoxes.value = fetchedCardBoxes.map((box) => ({
        ...box,
        noteIds: box.noteIds || []
      }))
      // console.log(`noteStores.ts→ 获取卡片盒`, cardBoxes.value)
    } catch (error) {
      console.error('noteStores.ts→ 获取卡片盒失败:', error)
      throw error
    }
  }

  const createCardBox = async (name: string) => {
    try {
      const newCardBox = await window.electronAPI.createCardBox(name)
      console.log('noteStores.ts→ 创建卡片盒', newCardBox)
      cardBoxes.value.push({
        ...newCardBox,
        noteIds: []
      })
      console.log(`noteStores.ts→ 创建卡片盒成功: ${newCardBox.id}`)
      return newCardBox
    } catch (error) {
      console.error('noteStores.ts→ 创建卡片盒失败:', error)
      throw error
    }
  }

  const updateCardBox = async (id: string, name: string) => {
    try {
      const updatedCardBox = await window.electronAPI.updateCardBox(id, name)
      if (updatedCardBox) {
        const index = cardBoxes.value.findIndex((box) => box.id === id)
        if (index !== -1) {
          cardBoxes.value[index] = updatedCardBox
        }
        console.log(`noteStores.ts→ 更新卡片盒: ${id}`)
        return updatedCardBox
      } else {
        console.error(`noteStores.ts→ 更新卡片盒失败: ${id}`, updatedCardBox)
        return null
      }
    } catch (error) {
      console.error(`noteStores.ts→ 更新卡片盒失败: ${id}`, error)
      throw error
    }
  }

  const deleteCardBox = async (id: string) => {
    try {
      await window.electronAPI.deleteCardBox(id)
      cardBoxes.value = cardBoxes.value.filter((box) => box.id !== id)
      console.log(`noteStores.ts→ 删除卡片盒: ${id}`)
      await fetchCardBoxes()
    } catch (error) {
      console.error(`noteStores.ts→ 删除卡片盒失败: ${id}`, error)
      throw error
    }
  }

  const updateNoteCardBox = async (noteId: string, newCardBoxId: string): Promise<Note | null> => {
    console.log(`noteStores.ts→ 更新笔记 ${noteId} 到卡片盒 ${newCardBoxId}`)
    try {
      const updatedNote = await window.electronAPI.updateNoteCardBox(noteId, newCardBoxId)

      if (notes.value.some((note) => note.id === noteId)) {
        // 更新本地存储的笔记
        const note = notes.value.find((note) => note.id === noteId)!
        note.cardBoxId = newCardBoxId
        console.log(`noteStores.ts→ Note ${noteId} 成功更新卡片盒`)
      } else {
        console.warn(`noteStores.ts→ Note ${noteId} 未找到`)
      }
      return updatedNote
    } catch (error) {
      console.error('noteStores.ts→ 更新笔记卡片盒失败:', error)
      throw error
    }
  }

  // 辅助方法
  const parseNoteContent = (note: any): Note => {
    return {
      ...note,
      content: typeof note.content === 'string' ? JSON.parse(note.content) : note.content,
      createdAt: new Date(note.createdAt),
      updatedAt: new Date(note.updatedAt)
    }
  }

  // 搜索笔记
  const searchNotes = async (query: string) => {
    try {
      return await window.electronAPI.searchNotes(query)
    } catch (error) {
      console.error('noteStores.ts→ 搜索笔记失败:', error)
      throw error
    }
  }

  // 右侧边栏功能
  const addNoteToRightSidebar = (noteId: string) => {
    const note = notes.value.find((n) => n.id === noteId)
    if (note && !rightSidebarNotes.value.some((n) => n.id === noteId)) {
      rightSidebarNotes.value.push(note)
    } else if (!note) {
      console.warn(`Note with id ${noteId} not found in notes`)
    }
  }

  const removeNoteFromRightSidebar = (noteId: string) => {
    const uiStore = useUIStore()
    rightSidebarNotes.value = rightSidebarNotes.value.filter((n) => n.id !== noteId)
    if (rightSidebarNotes.value.length === 0) {
      uiStore.closeRightSidebar()
    }
  }

  const clearRightSidebarNotes = () => {
    rightSidebarNotes.value = []
    const uiStore = useUIStore()
    uiStore.closeRightSidebar()
  }

  const toggleCardType = (type: string) => {
    const index = selectedCardTypes.value.indexOf(type)
    if (index === -1) {
      selectedCardTypes.value.push(type)
    } else {
      selectedCardTypes.value.splice(index, 1)
    }
  }

  // 添加星标收藏
  const addStarToNote = async (id: string) => {
    try {
      const updatedNote = await window.electronAPI.addStarToNote(id)
      if (updatedNote) {
        starredNotes.value.push(updatedNote)
      } else {
        console.warn(`noteStores.ts→ 尝试为不存在的笔记添加星标: ${id}`)
      }
      if (currentNote.value && currentNote.value.id === id) {
        currentNote.value = updatedNote
      }
      return updatedNote
    } catch (error) {
      console.error('noteStores.ts→ 添加星标收藏时出错:', error)
      throw error
    }
  }

  // 移除星标收藏
  const removeStarFromNote = async (id: string) => {
    try {
      const result = await window.electronAPI.removeStarFromNote(id)

      // 从 starredNotes 中移除取消收藏的笔记
      starredNotes.value = starredNotes.value.filter((note) => note.id !== id)

      // 更新其他收藏笔记的顺序
      result.reorderedNotes.forEach((note) => {
        const index = starredNotes.value.findIndex((n) => n.id === note.id)
        if (index !== -1) {
          starredNotes.value[index] = note
        }
      })

      // 如果是当前笔记，更新当前笔记的状态
      if (currentNote.value && currentNote.value.id === id) {
        currentNote.value = result.updatedNote
      }

      console.log('noteStores.ts→ 移除星标收藏成功:', result)
      console.log('noteStores.ts→ 移除星标收藏后收藏的笔记:', starredNotes.value)
      return result
    } catch (error) {
      console.error('noteStores.ts→ 移除星标收藏时出错:', error)
      throw error
    }
  }

  // 获取收藏的笔记
  const fetchStarredNotes = async () => {
    try {
      const fetchedStarredNotes = await window.electronAPI.getStarredNotes()
      // console.log(`noteStores.ts→ 获取收藏的笔记`, fetchedStarredNotes)
      starredNotes.value = fetchedStarredNotes
      return fetchedStarredNotes
    } catch (error) {
      console.error('noteStores.ts→ 获取收藏的笔记失败:', error)
      throw error
    }
  }

  // 辅助方法：检查是否为有效的 Note 数组
  const isValidNoteArray = (arr: any[]): boolean => {
    return arr.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        'id' in item &&
        'starredOrder' in item &&
        'isStarred' in item
    )
  }

  // 辅助方法：回滚乐观更新
  const rollbackOptimisticUpdate = (orders: { id: string; starredOrder: number }[]) => {
    orders.forEach(({ id }) => {
      const index = notes.value.findIndex((note) => note.id === id)
      if (index !== -1) {
        const note = notes.value[index]
        notes.value[index] = { ...note, starredOrder: note.starredOrder }
      }
    })
  }

  // 更新收藏笔记顺序
  const updateStarredNotesOrder = async (orders: { id: string; starredOrder: number }[]) => {
    try {
      console.log('noteStores.ts→ 开始更新收藏笔记顺序', orders)
      // 乐观更新
      orders.forEach(({ id, starredOrder }) => {
        const index = starredNotes.value.findIndex((note) => note.id === id)
        if (index !== -1) {
          starredNotes.value[index] = { ...starredNotes.value[index], starredOrder }
        }
      })
      // 调用后端 API 更新顺序
      const result = await window.electronAPI.updateStarredNotesOrder(orders)
      console.log('noteStores.ts→ 收到后端返回的结果:', result)

      if (!Array.isArray(result)) {
        console.error('noteStores.ts→ 后端返回的数据格式不正确，预期是数组', result)
        rollbackOptimisticUpdate(orders)
        return
      }

      if (result.length === 0) {
        console.log('noteStores.ts→ 后端返回空数组，可能没有笔记需要更新')
        return
      }

      if (!isValidNoteArray(result)) {
        console.error('noteStores.ts→ 后端返回的数组包含无效的 Note 对象', result)
        rollbackOptimisticUpdate(orders)
        return
      }

      const updatedNotes = result as Note[]
      updatedNotes.forEach((note) => {
        const index = starredNotes.value.findIndex((n) => n.id === note.id)
        if (index !== -1) {
          starredNotes.value[index] = note
        } else {
          console.warn(`noteStores.ts→ 尝试更新不存在的笔记: ${note.id}`)
        }
      })
      console.log('noteStores.ts→ 更新收藏笔记顺序成功', starredNotes.value)
    } catch (error) {
      console.error('noteStores.ts→ 更新收藏笔记顺序失败:', error)
      rollbackOptimisticUpdate(orders)
      throw error
    }
  }

  // 获取热力图数据
  const getHeatmapData = async () => {
    try {
      return await window.electronAPI.getHeatmapData()
    } catch (error) {
      console.error('noteStores.ts→ 获取热力图数据失败:', error)
      throw error
    }
  }

  // 获取笔记总数量
  const getNoteCount = async () => {
    try {
      return await window.electronAPI.getNoteCount()
    } catch (error) {
      console.error('noteStores.ts→ 获取笔记总数量失败:', error)
      throw error
    }
  }

  // 获取昨日笔记数量
  const getLastDayNoteCount = async () => {
    try {
      return await window.electronAPI.getLastDayNoteCount()
    } catch (error) {
      console.error('noteStores.ts→ 获取昨日笔记数量失败:', error)
      throw error
    }
  }

  // 获取用户使用天数
  const getUserUsageDays = async () => {
    try {
      return await window.electronAPI.getUserUsageDays()
    } catch (error) {
      console.error('noteStores.ts→ 获取用户使用天数失败:', error)
      throw error
    }
  }

  // 获取随机笔记
  const getRandomNotes = async () => {
    try {
      return await window.electronAPI.getRandomNotes()
    } catch (error) {
      console.error('noteStores.ts→ 获取随机笔记失败:', error)
      throw error
    }
  }

  // 获取所有已删除的笔记
  const getAllDeletedNotes = async () => {
    try {
      return await window.electronAPI.getAllDeletedNotes()
    } catch (error) {
      console.error('noteStores.ts→ 获取所有已删除的笔记失败:', error)
      throw error
    }
  }

  // const updateNote = async (id: string, noteData: Partial<Note>): Promise<Note> => {
  //   const eventBus = useEventBus('note-updated')
  //   try {
  //     // 获取当前笔记
  //     const currentNote = await fetchNoteById(id)
  //     if (!currentNote) throw new Error('Note not found')

  //     // 合并更新，确保保留现有字段
  //     const mergedData = {
  //       ...currentNote,
  //       ...noteData,
  //       updatedAt: new Date().toISOString(),
  //       // 确保引用关系不被覆盖
  //       linkedTo: currentNote.linkedTo,
  //       linkedFrom: currentNote.linkedFrom
  //     }

  //     // 序列化数据
  //     const serializableData = JSON.parse(JSON.stringify(mergedData))

  //     // 更新远程
  //     const response = await window.electronAPI.updateNote(id, serializableData)
  //     const updatedNote = parseNoteContent(response)

  //     // 更新本地状态
  //     updateLocalNote(id, updatedNote)

  //     // 更新 notes 数组
  //     const noteIndex = notes.value.findIndex((note) => note.id === id)
  //     if (noteIndex === -1) {
  //       notes.value.push(updatedNote)
  //     } else {
  //       notes.value[noteIndex] = updatedNote
  //     }

  //     // 更新其他状态
  //     lastUpdatedNote.value = updatedNote
  //     eventBus.emit(updatedNote)

  //     // 更新星标笔记
  //     if (updatedNote.isStarred) {
  //       const starredIndex = starredNotes.value.findIndex((note) => note.id === id)
  //       if (starredIndex !== -1) {
  //         const newStarredNotes = [...starredNotes.value]
  //         newStarredNotes[starredIndex] = { ...updatedNote }
  //         starredNotes.value = newStarredNotes
  //       }
  //     }

  //     return updatedNote
  //   } catch (error) {
  //     console.error(`更新笔记失败 ${id}:`, error)
  //     throw error
  //   }
  // }

  // 返回所有状态和方法
  return {
    // 状态
    notes,
    cardBoxes,
    whiteboards,
    connections,
    isEditorOpen,
    currentNoteId,
    currentNote,
    isSearchModalOpen,
    isSidebarCollapsed,
    isRightSidebarOpen,
    rightSidebarNotes,
    selectedCardTypes,
    noteSaveStatus,
    currentNoteSaveStatus,
    isSettingDropdownOpen,
    showCardBox,
    editor,
    isLoading,
    recentNotes,
    maxRecentNotes,
    highlightedNoteId,
    currentPage,
    pageSize,
    totalNotes,
    oldestLoadedDate,
    newestLoadedDate,
    hasMoreNotes,
    hasMoreOlderNotes,
    hasMoreNewerNotes,
    windowSize,
    selectedCardBoxId,
    lastUpdatedNote,
    lastCreatedNote,
    lastDeletedNote,
    starredNotes,
    showShareModal,
    shareNote,
    relatedNotes,
    pendingUpdates,
    visibleNotes,
    noteCache,
    activeNotes,
    viewConfig,

    // 计算属性
    recentNotesList,
    getNoteAddress,
    allNotes,
    allBibNotes,
    allIndexNotes,
    allHoplinkNotes,
    allMainNotes,
    getCardBoxById,
    getNotesByIds,
    addStarToNote,
    removeStarFromNote,
    fetchStarredNotes,
    updateStarredNotesOrder,

    // 方法
    updateNoteAddress,
    createNote,
    removeFromRecentNotes,
    updateNoteCardBox,
    // updateNote,

    searchNotes,
    searchNotesList,
    getRelatedNotes,
    fetchAllDatesWithNotes,
    initializeStore,
    addNoteToRightSidebar,
    removeNoteFromRightSidebar,
    clearRightSidebarNotes,
    toggleCardType,
    parseNoteContent,
    createAndOpenNewNote,
    moveToTrash,
    restoreFromTrash,
    permanentlyDelete,
    initializeCardBoxes,
    fetchCardBoxes,
    createCardBox,
    updateCardBox,
    deleteCardBox,
    updateNoteContent,
    getHeatmapData,
    getNoteCount,
    getLastDayNoteCount,
    getUserUsageDays,
    getRandomNotes,
    getAllDeletedNotes,
    toggleCardBox,
    openNoteEditor,
    closeNoteEditor,
    clearEditor,
    toggleSidebar,
    toggleSettingDropdown,
    setHighlightedNoteId,
    setShowCardBox,
    setIsSidebarCollapsed,
    setCurrentNote,
    clearHighlightedNoteId,
    handleShare,
    fetchPaginatedNotesByCardbox,
    fetchPaginatedNotes,
    fetchNoteById,
    fetchAllNotes,
    fetchNotesByDate,
    fetchNotesByOneDate,
    scrollToTop,
    moveEmptyNotesToTrash,
    openSearchModal,
    closeSearchModal,
    updateCurrentNoteSaveStatus,
    closeSettingDropdown,
    setEditor,
    clearAllNotes,
    addNoteToNoteList,
    addToRecentNotes,
    fetchNote,
    activateNote,
    deactivateNote
  }
})
