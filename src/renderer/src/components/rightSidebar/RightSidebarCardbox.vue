<template>
  <div class="sidebar-cardbox">
    <!-- 搜索区域 -->
    <div class="search-area">
      <div class="search-box">
        <div class="search-icon">
          <div class="icon">
            <Search theme="outline" size="14" fill="var(--color-icon-secondary)" :strokeWidth="3" />
          </div>
        </div>
        <input
          ref="searchInput"
          v-model="searchQuery"
          type="text"
          placeholder="搜索笔记"
          @input="debouncedSearch"
          @focus="isSearchFocused = true"
          @blur="handleBlur"
        />
        <div v-if="searchQuery" class="clear-icon" @click="clearSearch">
          <div class="icon">
            <Close theme="outline" size="14" fill="var(--color-icon-secondary)" :strokeWidth="3" />
          </div>
        </div>
      </div>
    </div>

    <!-- 笔记列表区域 -->
    <div class="notes-container">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <span>加载中...</span>
      </div>
      <!-- 空状态 -->
      <div v-else-if="displayedNotes.length === 0" class="empty-state">
        <div class="empty-icon">
          <FileSearch
            theme="outline"
            size="32"
            fill="var(--color-text-secondary)"
            :strokeWidth="2"
          />
        </div>
        <span>没有找到笔记</span>
      </div>
      <!-- 笔记网格 -->
      <div v-else class="notes-grid">
        <RightSidebarCardboxCard
          v-for="note in displayedNotes"
          :key="`${note.id}-${new Date(note.updatedAt).toISOString()}`"
          v-memo="[note.id, note.content, note.createdAt]"
          class="note-item"
          :note="note"
          :highlighted-note-id="highlightedNoteId"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, reactive } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import { Close, Search, FileSearch } from '@icon-park/vue-next'
import type { Note } from '@shared/types'
import RightSidebarCardboxCard from './RightSidebarCardboxCard.vue'
import { useDebounceFn } from '@vueuse/core'

const noteStore = useNoteStore()

const isLoading = ref(false)
const notes = ref<Note[]>([])
const searchQuery = ref('')
const isSearchFocused = ref(false)
const highlightedNoteId = ref<string | null>(null)

const filterState = reactive({
  keyword: '',
  sort: {
    field: 'updatedAt',
    order: 'desc' as const
  }
})

onMounted(() => {
  fetchNotes()
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

const fetchNotes = async () => {
  if (isLoading.value) return

  isLoading.value = true
  try {
    const result = await noteStore.fetchPaginatedNotesByCardbox({
      keyword: filterState.keyword,
      sortBy: filterState.keyword ? filterState.sort.field : 'updatedAt',
      sortOrder: filterState.keyword ? filterState.sort.order : ('desc' as const),
      page: 1,
      limit: 20
    })

    notes.value = result.notes
  } catch (error) {
    console.error('获取笔记失败:', error)
  } finally {
    isLoading.value = false
  }
}

const displayedNotes = computed<Note[]>(() => {
  return notes.value
})

const debouncedSearch = useDebounceFn(async () => {
  if (filterState.keyword !== searchQuery.value.trim()) {
    filterState.keyword = searchQuery.value.trim()
    notes.value = []
    await fetchNotes()
  }
}, 300)

const handleBlur = () => {
  setTimeout(() => {
    isSearchFocused.value = false
  }, 100)
}

const clearSearch = () => {
  searchQuery.value = ''
  filterState.keyword = ''
  fetchNotes()
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
    isSearchFocused.value = true
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
</script>

<style lang="scss" scoped>
.sidebar-cardbox {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-primary);

  .search-area {
    padding: 8px 12px;
    border-bottom: 1px solid var(--color-border);

    .search-box {
      display: flex;
      align-items: center;
      background-color: var(--color-bg-secondary);
      border-radius: 6px;
      padding: 4px 8px;
      transition: all 0.2s ease;
      border: 1px solid transparent;

      &:focus-within {
        background-color: var(--color-bg-secondary);
        border: 1px solid var(--color-primary);
        box-shadow: 0 0 0 2px var(--color-primary-light);
      }

      input {
        flex: 1;
        border: none;
        background: none;
        padding: 4px;
        font-size: 13px;
        color: var(--color-text-primary);

        &:focus {
          outline: none;
        }
      }

      .icon {
        display: flex;
        align-items: center;
        color: var(--color-text-secondary);
      }
    }
  }

  .notes-container {
    flex: 1;
    overflow-y: auto;
    padding: 12px;

    .notes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;

      .note-item {
        height: 160px;
        font-size: 13px;
        cursor: grab;

        &:active {
          cursor: grabbing;
        }

        :deep(.note-card) {
          padding: 12px;
        }

        :deep(.note-title) {
          font-size: 14px;
          margin-bottom: 8px;
        }

        :deep(.note-content) {
          font-size: 12px;
          line-height: 1.4;
        }
      }
    }

    .loading-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--color-text-secondary);
      font-size: 13px;
      gap: 12px;
    }

    .loading-spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .empty-state {
      .empty-icon {
        opacity: 0.5;
      }
    }
  }
}
</style>
