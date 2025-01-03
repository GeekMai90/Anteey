import { ref, computed, Ref, onMounted, onUnmounted, nextTick } from 'vue'
import { debounce } from 'lodash-es'
import { Note } from '@shared/types'

export function useCardBoxSearch(allNotes: Ref<Note[]>) {
  const searchQuery = ref('')
  const selectedDate = ref<string | null>(null)
  const isSearchActive = ref(false)
  const searchResults = ref<{ note: Note; index: number }[]>([])

  const handleSearch = debounce(() => {
    if (searchQuery.value.trim() === '') {
      searchResults.value = []
      return
    }

    const query = searchQuery.value.toLowerCase()
    searchResults.value = allNotes.value
      .filter((note) => !note.isDeleted)
      .map((note, index) => ({ note, index }))
      .filter(
        ({ note }) =>
          (note.address && note.address.toLowerCase().includes(query)) ||
          searchInObject(note.content, query)
      )
  }, 300)

  const filteredNotes = computed(() => {
    let result = allNotes.value.filter((note) => !note.isDeleted)

    // 应用搜索过滤
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(
        (note) =>
          (note.address && note.address.toLowerCase().includes(query)) ||
          searchInObject(note.content, query)
      )
    }

    // 应用日期过滤
    if (selectedDate.value) {
      const filterDate = new Date(selectedDate.value)
      result = result.filter((note) => {
        const noteDate = new Date(note.createdAt)
        return noteDate.toDateString() === filterDate.toDateString()
      })
    }

    return result
  })

  function searchInObject(obj: any, query: string): boolean {
    if (!obj) return false
    for (const key in obj) {
      const value = obj[key]
      if (typeof value === 'string' && value.toLowerCase().includes(query)) {
        return true
      } else if (value && typeof value === 'object') {
        if (searchInObject(value, query)) {
          return true
        }
      }
    }
    return false
  }

  const clearSearch = () => {
    searchQuery.value = ''
    searchResults.value = []
    nextTick(() => {
      const activeElement = document.activeElement as HTMLElement
      if (activeElement && 'blur' in activeElement) {
        activeElement.blur()
      }
    })
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'p') {
      event.preventDefault()
      isSearchActive.value = true
      nextTick(() => {
        const searchInput = document.querySelector('.search-box input') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      })
    } else if (event.key === 'Escape') {
      clearSearch()
    }
  }

  const setSelectedDate = (date: string | null) => {
    selectedDate.value = date
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })

  return {
    searchQuery,
    handleSearch,
    filteredNotes,
    searchResults,
    clearSearch,
    selectedDate,
    setSelectedDate,
    isSearchActive
  }
}
