import { ref, computed, Ref, onMounted, onUnmounted, nextTick } from 'vue'
import { debounce } from 'lodash-es'

export interface Searchable {
  id: string
  address?: string
  content: any
  createdAt: Date
  [key: string]: any
}

export function useSearch<T extends Searchable>(items: Ref<T[]>) {
  const searchQuery = ref('')
  const selectedDate = ref<string | null>(null)
  const isSearchActive = ref(false)

  const handleSearch = debounce(() => {
    // 搜索逻辑会在 filteredItems 计算属性中处理
  }, 300)

  const filteredItems = computed(() => {
    let result = items.value

    // 应用搜索过滤
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter((item) => {
        if (item.address && item.address.toLowerCase().includes(query)) {
          return true
        }
        if (item.content && typeof item.content === 'object') {
          return searchInObject(item.content, query)
        }
        return false
      })
    }

    // 应用日期过滤
    if (selectedDate.value) {
      const filterDate = new Date(selectedDate.value)
      result = result.filter((item) => {
        const itemDate = new Date(item.createdAt)
        return itemDate.toDateString() === filterDate.toDateString()
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
    nextTick(() => {
      // 使用 document.activeElement 来获取当前聚焦的元素
      const activeElement = document.activeElement as HTMLElement
      if (activeElement && 'blur' in activeElement) {
        activeElement.blur()
      }
    })
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    // 检查是否按下了 Cmd+P (Mac) 或 Ctrl+P (Windows/Linux)
    if ((event.metaKey || event.ctrlKey) && event.key === 'p') {
      event.preventDefault() // 阻止默认行为（如打开打印对话框）
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

  // const handleEscKey = (event: KeyboardEvent) => {
  //   if (event.key === 'Escape') {
  //     clearSearch()
  //   }
  // }

  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })

  return {
    searchQuery,
    handleSearch,
    filteredItems,
    clearSearch,
    selectedDate,
    setSelectedDate
  }
}
