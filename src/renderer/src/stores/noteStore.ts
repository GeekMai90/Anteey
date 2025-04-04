import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Notes, Table, TransactionOrder, Deeplink } from '@icon-park/vue-next'
import type { Note, CardBox, CardType } from '@shared/types'
import type { Editor } from '@tiptap/vue-3'
import type { GetPaginatedNotesParams } from '@shared/types'
import { useEventBus } from '@vueuse/core'
import { useUIStore } from './UIStore'
import { useTagStore } from './tagStore'
import { message } from '../utils/message'
import { useAuthStore } from './authStore'

// 常量定义
const cardTypes = [
  { value: 'Maincard', label: '主要卡', icon: Notes },
  { value: 'Bibcard', label: '书目卡', icon: Table },
  { value: 'Indexcard', label: '索引卡', icon: TransactionOrder },
  { value: 'Hoplinkcard', label: '跳转卡', icon: Deeplink }
]

// 添加搜索参数接口
interface SearchParams {
  mode: 'all' | 'address' | 'title'
  term: string
}

export const useNoteStore = defineStore(
  'note',
  () => {
    // ==================== 基础状态 ====================

    // 多选模式相关状态
    const isMultiSelectMode = ref(false)
    const selectedNoteIds = ref<string[]>([])

    // ==================== 编辑器相关 ====================
    // 保存状态相关
    const savingOperations = ref(0)
    const currentNoteSaveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')

    // ==================== 时间线相关 ====================
    const timelineNotes = ref<Note[]>([])
    const timelineCurrentPage = ref(1)
    const timelinePageSize = ref(20)
    const timelineHasMore = ref(true)
    const timelineIsLoading = ref(false)
    const timelineTotalCount = ref(0) // 总笔记数

    // ==================== 卡片盒相关状态 ====================
    const cardboxNotes = ref<Note[]>([]) // 用于维护顺序
    const cardboxCurrentPage = ref(1)
    const cardboxPageSize = ref(28)
    const cardboxHasMore = ref(true)
    const cardboxIsLoading = ref(false)
    const cardboxTotalCount = ref(0)

    // ==================== 最近笔记相关状态 ====================
    const recentNotes = ref<Note[]>([])
    const maxRecentNotes = ref(10)

    // ==================== 右侧边栏反向链接笔记 ====================
    const rightSidebarBacklinkNoteId = ref<string | null>(null)

    // State
    const notes = ref<Note[]>([])
    const cardBoxes = ref<CardBox[]>([])
    const isEditorOpen = ref(false)
    const currentNoteId = ref<string | undefined>(undefined)
    const currentNote = ref<Note | null>(null)
    const isSearchModalOpen = ref(false)
    const isSidebarCollapsed = ref(false)
    const isRightSidebarOpen = ref(false)
    const rightSidebarNotes = ref<Note[]>([])
    const selectedCardTypes = ref<string[]>(cardTypes.map((type) => type.value))
    const noteSaveStatus = ref<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({})

    const isSettingDropdownOpen = ref(false)
    const showCardBox = ref(false)
    const editor = ref<Editor | null>(null)
    const isLoading = ref(true)
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
    const showShareViewModal = ref(false)
    const shareViewNote = ref<any>(null)
    const isReviewMode = ref(false)

    // 最近更新的状态
    const pendingUpdates = ref(
      new Map<
        string,
        {
          type: string
          timestamp: number
        }
      >()
    )

    // 视图配置
    const viewConfig = ref({
      pageSize: 20,
      currentPage: 1
    })
    const getRecentNotes = (count: number) => {
      // 过滤掉已删除的笔记，并返回指定数量
      return recentNotes.value
        .filter((note) => !note.isDeleted) // 添加过滤条件
        .slice(0, count)
    }

    const getRecentEditedNotes = async () => {
      try {
        const notes = await window.electronAPI.note.getRecentEditedNotes()
        console.log('noteStores.ts→ 获取最近编辑的笔记:', notes)
        return notes
      } catch (error) {
        console.error('获取最近编辑的笔记失败:', error)
        throw error
      }
    }

    // ==================== 右侧边栏反向链接笔记 ====================
    // 打开反向链接预览
    const openBacklinkPreview = async (noteId: string) => {
      rightSidebarBacklinkNoteId.value = noteId
      // 自动加载笔记数据
      await fetchNote(noteId)
    }
    // ==================== 标签相关方法 ====================
    const tagStore = useTagStore()
    // 为笔记添加标签
    const addTagToNote = async (noteId: string, tagId: string) => {
      try {
        await window.electronAPI.note.updateNoteTag({
          noteId,
          tagId, // 使用 tagId 替代 tagName
          action: 'add'
        })

        // 刷新笔记和标签状态
        await fetchNote(noteId)
        await tagStore.fetchTagTree() // 更新标签树以反映新的使用次数
      } catch (error) {
        console.error('noteStores.ts→ 为笔记添加标签失败:', error)
        throw error
      }
    }

    // 从笔记中移除标签
    const removeTagFromNote = async (noteId: string, tagId: string) => {
      try {
        await window.electronAPI.note.updateNoteTag({
          noteId,
          tagId, // 使用 tagId 替代 tagName
          action: 'remove'
        })

        // 刷新笔记和标签状态
        await fetchNote(noteId)
        await tagStore.fetchTagTree() // 更新标签树以反映新的使用次数
      } catch (error) {
        console.error('noteStores.ts→ 从笔记中移除标签失败:', error)
        throw error
      }
    }

    const openTaggedNotes = async (tagName: string) => {
      console.log('noteStores.ts→ 打开标签为', tagName, '的笔记')
    }

    // ==================== 最近笔记相关方法 ====================

    // 添加到最近笔记
    const addToRecentNotes = async (noteId: string) => {
      // 获取完整的笔记数据
      const note = await fetchNote(noteId)
      if (!note) return

      // 移除已存在的相同笔记
      recentNotes.value = recentNotes.value.filter((n) => n.id !== noteId)

      // 添加到开头
      recentNotes.value.unshift(note)

      // 限制数量
      if (recentNotes.value.length > maxRecentNotes.value) {
        recentNotes.value = recentNotes.value.slice(0, maxRecentNotes.value)
      }
    }

    // 从最近笔记中删除
    const removeFromRecentNotes = (noteId: string) => {
      recentNotes.value = recentNotes.value.filter((note) => note.id !== noteId)
    }

    // ==================== 编辑器方法 ====================
    // 更新保存状态
    const updateSaveStatus = (status: 'saving' | 'saved' | 'error') => {
      if (status === 'saving') {
        savingOperations.value++
        currentNoteSaveStatus.value = 'saving'
      } else {
        savingOperations.value = Math.max(0, savingOperations.value - 1)
        if (savingOperations.value === 0) {
          currentNoteSaveStatus.value = status
        }
      }
    }

    // 获取笔记
    const fetchNote = async (noteId: string) => {
      try {
        return await window.electronAPI.note.getNote(noteId)
      } catch (error) {
        console.error('获取笔记失败:', error)
        throw error
      }
    }

    // 更新笔记内容
    const updateNoteContent = async (noteId: string, content: any) => {
      try {
        // 1. 更新保存状态
        currentNoteSaveStatus.value = 'saving'

        // 2. 直接保存到数据库
        const updatedNote = await window.electronAPI.note.updateNoteContent(noteId, content)

        // 3. 更新收藏笔记列表中的笔记内容
        const starredIndex = starredNotes.value.findIndex((note) => note.id === noteId)
        if (starredIndex !== -1) {
          starredNotes.value[starredIndex] = {
            ...starredNotes.value[starredIndex],
            ...updatedNote
          }
          // 强制触发响应式更新
          starredNotes.value = [...starredNotes.value]
        }

        if (!isReviewMode.value) {
          // console.log('noteStores.ts→ 非随机查看模式，发送更新事件通知')
          // 4. 发送更新事件通知
          const noteUpdatedBus = useEventBus<Note>('note-updated')
          noteUpdatedBus.emit(updatedNote)
        }

        // 5. 更新保存状态
        currentNoteSaveStatus.value = 'saved'

        return updatedNote
      } catch (error) {
        // 6. 错误处理
        currentNoteSaveStatus.value = 'error'
        console.error('更新笔记内容失败:', error)
        throw error
      }
    }

    // 更新笔记地址
    const updateNoteAddress = async (noteId: string, address: string) => {
      try {
        console.log('noteStores.ts→ 更新笔记地址:', { noteId, address })
        // 1. 直接更新数据库
        const updatedNote = await window.electronAPI.note.updateNoteAddress(noteId, address)

        // 2. 更新收藏笔记列表中的笔记地址
        const starredIndex = starredNotes.value.findIndex((note) => note.id === noteId)
        if (starredIndex !== -1) {
          starredNotes.value[starredIndex] = {
            ...starredNotes.value[starredIndex],
            ...updatedNote
          }
          // 强制触发响应式更新
          starredNotes.value = [...starredNotes.value]
        }

        // 3. 发送更新事件通知
        const noteUpdatedBus = useEventBus<Note>('note-updated')
        noteUpdatedBus.emit(updatedNote)

        return updatedNote
      } catch (error) {
        console.error('更新笔记地址失败:', error)
        throw error
      }
    }

    // 更新笔记类型
    const updateNoteCardType = async (noteId: string, cardType: CardType) => {
      try {
        // 1. 更新保存状态
        currentNoteSaveStatus.value = 'saving'

        // 2. 直接更新数据库
        const updatedNote = await window.electronAPI.note.updateNoteCardType(noteId, cardType)

        // 3. 发送更新事件通知
        const noteUpdatedBus = useEventBus<Note>('note-updated')
        noteUpdatedBus.emit(updatedNote)

        // 4. 更新保存状态
        currentNoteSaveStatus.value = 'saved'

        return updatedNote
      } catch (error) {
        // 5. 错误处理
        currentNoteSaveStatus.value = 'error'
        console.error('更新笔记类型失败:', error)
        throw error
      }
    }

    // 更新笔记的卡片盒
    const updateNoteCardBox = async (noteId: string, cardBoxId: string) => {
      try {
        // 1. 更新保存状态
        currentNoteSaveStatus.value = 'saving'

        // 2. 直接更新数据库
        const updatedNote = await window.electronAPI.note.updateNoteCardBox(noteId, cardBoxId)

        // 3. 发送更新事件通知
        const noteUpdatedBus = useEventBus<Note>('note-updated')
        noteUpdatedBus.emit(updatedNote)

        // 4. 更新保存状态
        currentNoteSaveStatus.value = 'saved'

        return updatedNote
      } catch (error) {
        // 5. 错误处理
        currentNoteSaveStatus.value = 'error'
        console.error('更新卡片盒失败:', error)
        throw error
      }
    }

    // 创建笔记引用关系
    const createNoteReference = async (referenceData: {
      sourceNoteId: string
      targetNoteId: string
      type: 'reference' // 固定为 "reference"
      context: {
        text: string
        position: number
      }
      metadata: {
        title: string
        preview: string
        cardType?: string
        address?: string
      }
    }) => {
      const { sourceNoteId, targetNoteId } = referenceData

      updateSaveStatus('saving')

      try {
        // 1. 创建引用关系
        await window.electronAPI.note.createNoteReference(referenceData)

        // 2. 获取更新后的笔记数据
        const [updatedSourceNote, updatedTargetNote] = await Promise.all([
          window.electronAPI.note.getNote(sourceNoteId),
          window.electronAPI.note.getNote(targetNoteId)
        ])

        updateSaveStatus('saved')
        return { sourceNote: updatedSourceNote, targetNote: updatedTargetNote }
      } catch (error) {
        console.error('创建引用关系失败:', error)
        updateSaveStatus('error')
        throw error
      }
    }

    // 删除笔记引用关系
    const deleteNoteReference = async (params: { sourceNoteId: string; targetNoteId: string }) => {
      const { sourceNoteId, targetNoteId } = params

      updateSaveStatus('saving')

      try {
        // 1. 删除引用关系
        await window.electronAPI.note.deleteNoteReference(params)

        // 2. 获取更新后的笔记数据
        const [updatedSourceNote, updatedTargetNote] = await Promise.all([
          window.electronAPI.note.getNote(sourceNoteId),
          window.electronAPI.note.getNote(targetNoteId)
        ])

        updateSaveStatus('saved')
        return { sourceNote: updatedSourceNote, targetNote: updatedTargetNote }
      } catch (error) {
        console.error('删除引用关系失败:', error)
        updateSaveStatus('error')
        throw error
      }
    }

    // ==================== 时间线方法 ====================

    // Getters
    // const recentNotesList = computed(
    //   () =>
    //     recentNotes.value
    //       .map((id) => notes.value.find((note) => note.id === id))
    //       .filter(Boolean) as Note[]
    // )

    const getNoteAddress = computed(
      () => (id: string) => notes.value.find((note) => note.id === id)?.address || ''
    )

    const allNotes = computed(() => notes.value)

    const allBibNotes = computed(() => notes.value.filter((note) => note.cardType === 'Bibcard'))

    const allIndexNotes = computed(() =>
      notes.value.filter((note) => note.cardType === 'Indexcard')
    )

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

    const setCurrentNoteId = (noteId: string | undefined) => {
      currentNoteId.value = noteId
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

    const handleShareView = async (noteId: string) => {
      const note = await fetchNoteById(noteId)
      if (!note) return
      shareViewNote.value = note
      showShareViewModal.value = true
    }

    const initializeStore = async () => {
      try {
        currentNoteSaveStatus.value = 'saved' // 确保初始状态为 saved

        // 先初始化卡片盒
        await initializeCardBoxes()

        // 再预加载第一页笔记
        await preloadFirstPage()

        // 获取星标收藏的笔记
        await fetchStarredNotes()

        setTimeout(() => {
          isLoading.value = false
        }, 2000)
      } catch (error) {
        console.error('初始化 store 失败:', error)
        isLoading.value = false
      }
    }

    const searchNotesList = async (query: string) => {
      try {
        const notes = await window.electronAPI.note.searchNotesList(query)

        return notes
      } catch (error) {
        console.error('noteStores.ts→ 搜索笔记列表失败:', error)
        throw error
      }
    }
    // 获取卡片盒分页笔记
    const fetchPaginatedNotesByCardbox = async (params: GetPaginatedNotesParams) => {
      // console.log('noteStores.ts→ 开始获取卡片盒分页笔记', params)
      try {
        const { cardTypes = [], tags = [], ...otherParams } = params

        const sanitizedParams = {
          ...otherParams,
          cardTypes: Array.from(cardTypes),
          tags: Array.from(tags),
          isFlashcard: params.isFlashcard
        }

        const { notes: fetchedNotes, totalCount } =
          await window.electronAPI.note.getPaginatedNotesByCardbox(sanitizedParams)

        return { notes: fetchedNotes, totalCount }
      } catch (error) {
        console.error('获取卡片盒分页笔记失败:', error)
        throw error
      }
    }
    // 获取草稿笔记
    const fetchDraftNotes = async (page: number, limit: number) => {
      try {
        const { notes: fetchedNotes, totalCount } = await window.electronAPI.note.getDraftNotes(
          page,
          limit
        )
        return { notes: fetchedNotes, totalCount }
      } catch (error) {
        console.error('获取草稿笔记失败:', error)
        throw error
      }
    }
    //获取某一天的笔记
    const fetchNotesByOneDate = async (date: string) => {
      console.log('noteStores.ts→ 开始获取某一天的笔记', date)
      try {
        const fetchedNotes = await window.electronAPI.note.getNotesByOneDate(date)
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
        const dates = await window.electronAPI.note.getAllDatesWithNotes()
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
        const referenceDate =
          direction === 'older' ? oldestLoadedDate.value : newestLoadedDate.value
        const { notes: fetchedNotes, totalCount } = await window.electronAPI.note.getNotesByDate(
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
        hasMoreNewerNotes.value = newestLoadedDate.value
          ? newestLoadedDate.value < new Date()
          : false

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
      isLoading.value = true

      try {
        const { notes: fetchedNotes, totalCount } = await window.electronAPI.note.getPaginatedNotes(
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
        await window.electronAPI.note.moveEmptyNotesToTrash()
        const emptyNotesMovedToTrashEventBus = useEventBus('empty-notes-moved-to-trash')
        emptyNotesMovedToTrashEventBus.emit()
        message.success('清除空笔记成功')
      } catch (error) {
        console.error('noteStores.ts→ 将空笔记移到回收站失败:', error)
        message.error('清除空笔记失败')
        throw error
      }
    }

    const openNoteEditor = async (noteId: string) => {
      try {
        const fullNote = await fetchNoteById(noteId)
        currentNote.value = fullNote
        currentNoteId.value = noteId
        currentEchoNoteId.value = noteId
        isLoading.value = false
        isEditorOpen.value = true
        // addToRecentNotes(noteId)
      } catch (error) {
        console.error('noteStores.ts→ 打开笔记编辑器失败:', error)
      }
    }

    const closeNoteEditor = () => {
      isEditorOpen.value = false
      currentNoteId.value = undefined
      currentEchoNoteId.value = null
    }

    const openSearchModal = () => {
      isSearchModalOpen.value = true
    }

    const closeSearchModal = () => {
      isSearchModalOpen.value = false
    }

    // 添加 getter 用于获取当前保存状态
    const getCurrentNoteSaveStatus = computed(() => currentNoteSaveStatus.value)

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
        const allNotes = await window.electronAPI.note.getAllNotes(includeDeleted)
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
        const note = await window.electronAPI.note.getNote(id)
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
      // 添加许可证检查
      const canCreate = await checkCanCreateNote()
      if (!canCreate) {
        throw new Error('无法创建新笔记')
      }

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

    // 获取一些笔记
    const getNotesByIds = async (ids: string[]) => {
      await fetchAllNotes()
      const foundNotes = ids
        .map((id) => notes.value.find((note) => note.id === id))
        .filter((note) => note !== undefined) as Note[]
      console.log('noteStores.ts→ 获取笔记成功', foundNotes)
      return foundNotes
    }

    // 检查是否可以创建笔记
    const checkCanCreateNote = async () => {
      const authStore = useAuthStore()

      // 确保 authStore 已经初始化
      if (!authStore.isInitialized) {
        console.log('noteStore→ authStore 未初始化，执行初始化')
        await authStore.initStore()
      }

      // 如果是永久授权用户，直接允许
      if (authStore.isDesktopPermanent) {
        console.log('noteStore→ 永久授权用户，允许创建笔记')
        return true
      }

      // 获取当前笔记数量
      const count = await getNoteCount()
      console.log('noteStore→ 当前笔记数量:', count)

      if (count >= 100) {
        console.log('noteStore→ 超过免费版限制')
        message.error('免费版用户最多可创建 100 张笔记，请升级到永久授权版本')
        return false
      }

      return true
    }

    // 创建新笔记
    const createNote = async () => {
      console.log('noteStores.ts→ 创建新笔记')
      const eventBus = useEventBus('note-created')

      // 添加许可证检查
      const canCreate = await checkCanCreateNote()
      if (!canCreate) {
        throw new Error('无法创建新笔记')
      }

      try {
        const newNote = await window.electronAPI.note.createNote()
        notes.value.push(newNote)
        updateLocalNote(newNote.id, newNote)
        lastCreatedNote.value = newNote
        eventBus.emit(newNote)
        return newNote
      } catch (error) {
        console.error('noteStores.ts→ 创建新笔记失败:', error)
        message.error('创建新笔记失败')
        throw error
      }
    }

    // 创建并用小窗打开新笔记
    const createAndOpenNewNote = async () => {
      console.log('noteStores.ts→ 创建并打开新笔记')
      const newNote = await createNote()
      openNoteEditor(newNote.id)
    }

    // 创建并展开打开新笔记
    const createAndExpandNewNote = async () => {
      console.log('noteStores.ts→ 创建并打开新笔记')
      const newNote = await createNote()
      currentEchoNoteId.value = newNote.id
      return newNote?.id // 返回新笔记的 ID
    }

    //删除笔记，移动到回收站
    const moveToTrash = async (id: string) => {
      console.log('noteStores.ts→ 移动到回收站:', id)
      try {
        const result = await window.electronAPI.note.softDeleteNote(id)
        if (result) {
          lastDeletedNote.value = result
          console.log('noteStores.ts→ 移动到回收站结果:', result)
          // 从星标笔记中移除
          if (starredNotes.value.some((note) => note.id === id)) {
            starredNotes.value = starredNotes.value.filter((note) => note.id !== id)
          }
          // 从最近笔记中移除
          if (recentNotes.value.some((note) => note.id === id)) {
            // 先过滤
            recentNotes.value = recentNotes.value.filter((note) => note.id !== id)
            // 强制触发响应式更新
            recentNotes.value = [...recentNotes.value]
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
        const result = await window.electronAPI.note.restoreNote(id)
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
        await window.electronAPI.note.permanentDeleteNote(id)
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
        const fetchedCardBoxes = await window.electronAPI.note.getAllCardBoxes()
        cardBoxes.value = fetchedCardBoxes.map((box) => ({
          ...box,
          noteIds: box.noteIds || []
        }))
      } catch (error) {
        console.error('noteStores.ts→ 获取卡片盒失败:', error)
        throw error
      }
    }

    const createCardBox = async (name: string) => {
      try {
        const newCardBox = await window.electronAPI.note.createCardBox(name)
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
        const updatedCardBox = await window.electronAPI.note.updateCardBox(id, name)
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
        await window.electronAPI.note.deleteCardBox(id)
        cardBoxes.value = cardBoxes.value.filter((box) => box.id !== id)
        console.log(`noteStores.ts→ 删除卡片盒: ${id}`)
        await fetchCardBoxes()
      } catch (error) {
        console.error(`noteStores.ts→ 删除卡片盒失败: ${id}`, error)
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
    const searchNotes = async (params: SearchParams | string) => {
      try {
        // 如果是字符串参数，转换为默认的全文搜索
        const searchParams =
          typeof params === 'string' ? { mode: 'all' as const, term: params } : params

        const results = await window.electronAPI.note.searchNotes(searchParams)
        return results
      } catch (error) {
        console.error('搜索笔记失败:', error)
        return []
      }
    }

    // 右侧边栏功能
    const addNoteToRightSidebar = async (noteId: string) => {
      const note = await fetchNoteById(noteId)
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
        const updatedNote = await window.electronAPI.note.addStarToNote(id)
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
        const result = await window.electronAPI.note.removeStarFromNote(id)

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
        const fetchedStarredNotes = await window.electronAPI.note.getStarredNotes()
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
        const result = await window.electronAPI.note.updateStarredNotesOrder(orders)
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
        return await window.electronAPI.analytics.getHeatmapData()
      } catch (error) {
        console.error('noteStores.ts→ 获取热力图数据失败:', error)
        throw error
      }
    }

    // 获取笔记总数量
    const getNoteCount = async () => {
      try {
        return await window.electronAPI.analytics.getNoteCount()
      } catch (error) {
        console.error('noteStores.ts→ 获取笔记总数量失败:', error)
        throw error
      }
    }

    // 获取昨日笔记数量
    const getLastDayNoteCount = async () => {
      try {
        return await window.electronAPI.analytics.getLastDayNoteCount()
      } catch (error) {
        console.error('noteStores.ts→ 获取昨日笔记数量失败:', error)
        throw error
      }
    }

    // 获取用户使用天数
    const getUserUsageDays = async () => {
      try {
        return await window.electronAPI.analytics.getUserUsageDays()
      } catch (error) {
        console.error('noteStores.ts→ 获取用户使用天数失败:', error)
        throw error
      }
    }

    // 获取随机笔记
    const getRandomNotes = async () => {
      try {
        return await window.electronAPI.note.getRandomNotes()
      } catch (error) {
        console.error('noteStores.ts→ 获取随机笔记失败:', error)
        throw error
      }
    }

    // 获取所有已删除的笔记
    const getAllDeletedNotes = async () => {
      try {
        return await window.electronAPI.note.getAllDeletedNotes()
      } catch (error) {
        console.error('noteStores.ts→ 获取所有已删除的笔记失败:', error)
        throw error
      }
    }

    // 在笔记编辑器关闭时更新向量
    const updateNoteVectorOnClose = async (id: string, content: object) => {
      try {
        await window.electronAPI.note.updateNoteVectorOnClose(id, content)
        console.log('noteStore.ts → 笔记向量更新成功:', id)
      } catch (error) {
        console.error('noteStore.ts → 更新笔记向量失败:', error)
        throw error
      }
    }

    // 批量更新向量
    const batchUpdateVectors = async () => {
      try {
        await window.electronAPI.note.batchUpdateVectors()
        console.log('noteStore.ts → 批量更新向量成功')
      } catch (error) {
        console.error('noteStore.ts → 批量更新向量失败:', error)
        throw error
      }
    }

    // 批量设置卡片类型
    const batchUpdateNotesCardType = async (noteIds: string[], cardType: string) => {
      try {
        // 1. 更新保存状态
        currentNoteSaveStatus.value = 'saving'

        // 检查参数
        console.log('批量设置卡片类型 - 参数检查:')
        console.log('原始笔记ID数组:', noteIds)

        // 将响应式数组转换为普通数组
        const plainNoteIds = Array.from(noteIds)
        console.log('转换后的笔记ID数组:', plainNoteIds)
        console.log('目标卡片类型:', cardType)

        // 确保是数组
        if (!Array.isArray(plainNoteIds)) {
          throw new Error('笔记ID参数必须是数组')
        }

        // 2. 调用后端 API
        const updatedNotes = await window.electronAPI.note.batchUpdateNotesCardType(
          plainNoteIds,
          cardType
        )

        // 3. 更新本地状态
        updatedNotes.forEach((updatedNote) => {
          // 更新收藏列表中的笔记
          const starredIndex = starredNotes.value.findIndex((n) => n.id === updatedNote.id)
          if (starredIndex !== -1) {
            starredNotes.value[starredIndex] = updatedNote
          }

          // 更新最近笔记列表中的笔记
          const recentIndex = recentNotes.value.findIndex((n) => n.id === updatedNote.id)
          if (recentIndex !== -1) {
            recentNotes.value[recentIndex] = updatedNote
          }

          // 如果是当前笔记，更新当前笔记状态
          if (currentNote.value && currentNote.value.id === updatedNote.id) {
            currentNote.value = updatedNote
          }

          // 发送更新事件通知
          const noteUpdatedBus = useEventBus<Note>('note-updated')
          noteUpdatedBus.emit(updatedNote)
        })

        // 4. 清空选择的笔记
        selectedNoteIds.value = []
        // 保持多选模式开启
        isMultiSelectMode.value = true

        // 5. 更新保存状态
        currentNoteSaveStatus.value = 'saved'

        return updatedNotes
      } catch (error) {
        // 6. 错误处理
        currentNoteSaveStatus.value = 'error'
        console.error('批量设置卡片类型失败:', error)
        throw error
      }
    }

    // 批量移动笔记到卡片盒
    const batchMoveNotesToCardBox = async (noteIds: string[], cardBoxId: string | null) => {
      try {
        // 1. 更新保存状态
        currentNoteSaveStatus.value = 'saving'

        // 检查参数
        console.log('批量移动笔记 - 参数检查:')
        console.log('原始笔记ID数组:', noteIds)

        // 将响应式数组转换为普通数组
        const plainNoteIds = Array.from(noteIds)
        console.log('转换后的笔记ID数组:', plainNoteIds)
        console.log('笔记ID数组类型:', Object.prototype.toString.call(plainNoteIds))
        console.log('笔记ID数组长度:', plainNoteIds.length)
        console.log('目标卡片盒ID:', cardBoxId)

        // 确保是数组
        if (!Array.isArray(plainNoteIds)) {
          throw new Error('笔记ID参数必须是数组')
        }

        // 2. 调用后端 API
        const updatedNotes = await window.electronAPI.note.batchMoveNotesToCardBox(
          plainNoteIds,
          cardBoxId
        )

        // 3. 更新本地状态
        updatedNotes.forEach((updatedNote) => {
          // 更新收藏列表中的笔记
          const starredIndex = starredNotes.value.findIndex((n) => n.id === updatedNote.id)
          if (starredIndex !== -1) {
            starredNotes.value[starredIndex] = updatedNote
          }

          // 更新最近笔记列表中的笔记
          const recentIndex = recentNotes.value.findIndex((n) => n.id === updatedNote.id)
          if (recentIndex !== -1) {
            recentNotes.value[recentIndex] = updatedNote
          }

          // 如果是当前笔记，更新当前笔记状态
          if (currentNote.value && currentNote.value.id === updatedNote.id) {
            currentNote.value = updatedNote
          }

          // 发送更新事件通知
          const noteUpdatedBus = useEventBus<Note>('note-updated')
          noteUpdatedBus.emit(updatedNote)
        })

        // 4. 清空选择的笔记
        selectedNoteIds.value = []
        // 保持多选模式开启
        isMultiSelectMode.value = true

        // 5. 更新保存状态
        currentNoteSaveStatus.value = 'saved'

        return updatedNotes
      } catch (error) {
        // 6. 错误处理
        currentNoteSaveStatus.value = 'error'
        console.error('批量移动笔记到卡片盒失败:', error)
        throw error
      }
    }

    // 多选模式方法
    const toggleMultiSelectMode = () => {
      isMultiSelectMode.value = !isMultiSelectMode.value
      if (!isMultiSelectMode.value) {
        selectedNoteIds.value = [] // 退出多选模式时清空选择
      }
    }

    const selectNote = (noteId: string, addOnly = false) => {
      const index = selectedNoteIds.value.indexOf(noteId)

      if (index === -1) {
        // 笔记未选中，添加到选中列表
        selectedNoteIds.value.push(noteId)
      } else if (!addOnly) {
        // 笔记已选中且不是仅添加模式，从选中列表移除
        selectedNoteIds.value.splice(index, 1)
      }
      // 如果是仅添加模式且笔记已选中，不做任何操作
    }

    const clearSelectedNotes = () => {
      selectedNoteIds.value = []
    }

    const isNoteSelected = (noteId: string) => {
      return selectedNoteIds.value.includes(noteId)
    }

    // 批量软删除笔记
    const batchSoftDeleteNotes = async (noteIds: string[]) => {
      try {
        // 检查参数
        console.log('批量软删除笔记 - 参数检查:')
        console.log('原始笔记ID数组:', noteIds)

        // 将响应式数组转换为普通数组
        const plainNoteIds = Array.from(noteIds)
        console.log('转换后的笔记ID数组:', plainNoteIds)

        // 确保是数组
        if (!Array.isArray(plainNoteIds)) {
          throw new Error('笔记ID参数必须是数组')
        }

        // 调用后端 API
        const updatedNotes = await window.electronAPI.note.batchSoftDeleteNotes(plainNoteIds)

        // 更新本地状态
        updatedNotes.forEach((updatedNote) => {
          // 从收藏列表中移除
          starredNotes.value = starredNotes.value.filter((note) => note.id !== updatedNote.id)

          // 从最近笔记列表中移除
          recentNotes.value = recentNotes.value.filter((note) => note.id !== updatedNote.id)

          // 如果是当前笔记，关闭编辑器
          if (currentNote.value && currentNote.value.id === updatedNote.id) {
            closeNoteEditor()
          }
        })

        // 清空选择的笔记
        selectedNoteIds.value = []
        // 退出多选模式
        isMultiSelectMode.value = false

        // 发送事件通知
        const notesDeletedBus = useEventBus('notes-deleted')
        notesDeletedBus.emit(updatedNotes)

        return updatedNotes
      } catch (error) {
        console.error('批量软删除笔记失败:', error)
        throw error
      }
    }

    // 添加思维共鸣相关状态
    const currentEchoNoteId = ref<string | null>(null)

    // 添加设置当前共鸣笔记 ID 的方法
    const setCurrentEchoNoteId = (noteId: string | null) => {
      currentEchoNoteId.value = noteId
    }

    // 添加获取当前共鸣笔记 ID 的计算属性
    const getCurrentEchoNoteId = computed(() => currentEchoNoteId.value)

    // ==================== 索引相关状态 ====================
    const indexedNotes = ref<Record<string, Note[]>>({})
    const isLoadingIndexedNotes = ref(false)
    const currentIndexLetter = ref<string | null>(null)

    // ==================== 索引相关方法 ====================

    // 切换笔记的索引状态
    const toggleNoteIndex = async (noteId: string) => {
      try {
        const updatedNote = await window.electronAPI.note.toggleNoteIndex(noteId)

        // 更新本地状态
        updateLocalNote(noteId, updatedNote)

        // 重新获取索引笔记列表
        await fetchIndexedNotes()

        // 使用事件总线通知其他组件
        const eventBus = useEventBus<Note[]>('notes-index-updated')
        eventBus.emit([updatedNote])

        return updatedNote
      } catch (error) {
        console.error('切换笔记索引状态失败:', error)
        throw error
      }
    }

    // 获取所有索引笔记
    const fetchIndexedNotes = async () => {
      try {
        isLoadingIndexedNotes.value = true
        const groupedNotes = await window.electronAPI.note.getIndexedNotes()
        indexedNotes.value = groupedNotes
        return groupedNotes
      } catch (error) {
        console.error('获取索引笔记失败:', error)
        throw error
      } finally {
        isLoadingIndexedNotes.value = false
      }
    }

    // 更新索引笔记的顺序
    const updateIndexOrder = async (
      updates: Array<{
        noteId: string
        firstLetter: string
        order: number
      }>
    ) => {
      try {
        const updatedNotes = await window.electronAPI.note.updateIndexOrder(updates)

        // 更新本地状态
        await fetchIndexedNotes()

        return updatedNotes
      } catch (error) {
        console.error('更新索引笔记顺序失败:', error)
        throw error
      }
    }

    // 批量添加到索引
    const batchAddToIndex = async (noteIds: string[]) => {
      try {
        const updatedNotes = await window.electronAPI.note.batchAddToIndex(noteIds)

        // 更新本地状态
        updatedNotes.forEach((note) => {
          updateLocalNote(note.id, note)
        })

        // 重新获取索引笔记列表
        await fetchIndexedNotes()

        // 清空选择的笔记
        selectedNoteIds.value = []

        return updatedNotes
      } catch (error) {
        console.error('批量添加到索引失败:', error)
        throw error
      }
    }

    // 批量移除索引
    const batchRemoveFromIndex = async (noteIds: string[]) => {
      try {
        const updatedNotes = await window.electronAPI.note.batchRemoveFromIndex(noteIds)

        // 更新本地状态
        updatedNotes.forEach((note) => {
          updateLocalNote(note.id, note)
        })

        // 重新获取索引笔记列表
        await fetchIndexedNotes()

        // 清空选择的笔记
        selectedNoteIds.value = []

        // 使用事件总线通知其他组件
        const eventBus = useEventBus('notes-index-updated')
        eventBus.emit(updatedNotes)

        return updatedNotes
      } catch (error) {
        console.error('批量移除索引失败:', error)
        throw error
      }
    }

    // 获取特定首字母的索引笔记
    const getIndexedNotesByLetter = async (letter: string) => {
      try {
        currentIndexLetter.value = letter
        return await window.electronAPI.note.getIndexedNotesByLetter(letter)
      } catch (error) {
        console.error('获取特定首字母的索引笔记失败:', error)
        throw error
      }
    }

    // 1. 添加新的状态
    const collapsedNoteIds = ref<string[]>([])

    // 2. 添加管理折叠状态的方法
    const toggleNoteCollapse = (noteId: string) => {
      const index = collapsedNoteIds.value.indexOf(noteId)
      if (index === -1) {
        collapsedNoteIds.value.push(noteId)
      } else {
        collapsedNoteIds.value.splice(index, 1)
      }
    }

    const isNoteCollapsed = (noteId: string) => {
      return collapsedNoteIds.value.includes(noteId)
    }

    // 返回所有状态和方法
    return {
      // 状态
      notes,
      cardBoxes,
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
      pendingUpdates,
      viewConfig,

      // 计算属性
      getCurrentNoteSaveStatus,
      // recentNotesList,
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
      // 最近更新的
      updateNoteAddress,
      updateNoteCardType,
      updateSaveStatus,
      fetchNote,
      updateNoteContent,
      updateNoteCardBox,

      createNote,
      removeFromRecentNotes,
      // updateNote,

      searchNotes,
      searchNotesList,
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
      closeSettingDropdown,
      setEditor,
      clearAllNotes,
      addNoteToNoteList,
      addToRecentNotes,
      timelineNotes,
      timelineCurrentPage,
      timelinePageSize,
      timelineHasMore,
      timelineTotalCount,
      timelineIsLoading,

      // 卡片盒相关
      cardboxNotes,
      cardboxCurrentPage,
      cardboxPageSize,
      cardboxHasMore,
      cardboxIsLoading,
      cardboxTotalCount,

      // 编辑器相关
      createNoteReference,
      deleteNoteReference,
      rightSidebarBacklinkNoteId,
      openBacklinkPreview,
      createAndExpandNewNote,
      // 标签相关状态
      addTagToNote,
      removeTagFromNote,
      openTaggedNotes,
      getRecentNotes,
      checkCanCreateNote,
      // 分享视图相关
      showShareViewModal,
      shareViewNote,
      handleShareView,

      // 获取最近编辑的笔记
      getRecentEditedNotes,

      // 新方法
      updateNoteVectorOnClose,
      batchUpdateVectors,

      isReviewMode,

      // 多选模式相关
      isMultiSelectMode,
      selectedNoteIds,

      // 批量移动笔记到卡片盒
      batchMoveNotesToCardBox,
      batchUpdateNotesCardType,
      toggleMultiSelectMode,
      selectNote,
      clearSelectedNotes,
      isNoteSelected,

      // 批量软删除笔记
      batchSoftDeleteNotes,

      // 获取草稿笔记
      fetchDraftNotes,

      // 设置当前笔记ID
      setCurrentNoteId,

      // 添加新的状态和方法到返回对象
      currentEchoNoteId,
      setCurrentEchoNoteId,
      getCurrentEchoNoteId,

      // 索引相关状态
      indexedNotes,
      isLoadingIndexedNotes,
      currentIndexLetter,

      // 索引相关方法
      toggleNoteIndex,
      fetchIndexedNotes,
      updateIndexOrder,
      batchAddToIndex,
      batchRemoveFromIndex,
      getIndexedNotesByLetter,

      // 1. 添加新的状态
      collapsedNoteIds,

      // 2. 添加管理折叠状态的方法
      toggleNoteCollapse,

      // 3. 在返回对象中添加这些状态和方法
      isNoteCollapsed
    }
  },
  {
    persist: [
      {
        key: 'note-recent',
        pick: ['recentNotes']
      },
      {
        key: 'note-starred',
        pick: ['starredNotes']
      },
      {
        key: 'note-config',
        pick: ['viewConfig']
      },
      {
        key: 'note-rightSidebar',
        pick: ['rightSidebarNotes']
      },
      {
        key: 'note-active',
        pick: ['activeNotes']
      },
      {
        key: 'note-echo',
        pick: ['currentEchoNoteId']
      },
      {
        key: 'note-index',
        pick: ['currentIndexLetter']
      },
      {
        key: 'note-collapse',
        pick: ['collapsedNoteIds']
      }
    ]
  }
)
