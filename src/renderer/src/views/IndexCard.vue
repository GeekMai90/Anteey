<template>
  <div class="cardbox-view">
    <div class="fixed-header">
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>
      <div class="topToolBar">
        <div class="topToolBar-header">
          <div class="topToolBar-left">
            <div class="icon">
              <ListAlphabet theme="outline" size="20" fill="var(--color-blue)" :strokeWidth="3" />
            </div>
            <div class="name">索引卡片</div>
          </div>
          <div class="topToolBar-right">
            <!-- 搜索框 -->
            <div
              v-tooltip.bottom="{ content: 'Cmd+P', delay: { show: 1000 } }"
              class="search-box"
              :class="{ 'is-focused': isSearchActive }"
            >
              <div class="search-icon">
                <div class="icon">
                  <Search
                    theme="outline"
                    size="16"
                    fill="var(--color-icon-secondary)"
                    :strokeWidth="3"
                  />
                </div>
              </div>
              <input
                ref="searchInput"
                v-model="searchQuery"
                type="text"
                placeholder="搜索"
                @input="handleSearch"
                @focus="isSearchActive = true"
                @blur="handleBlur"
              />
              <div v-if="searchQuery" class="clear-icon" @click="clearSearch">
                <div class="icon">
                  <Close
                    theme="outline"
                    size="16"
                    fill="var(--color-icon-secondary)"
                    :strokeWidth="3"
                  />
                </div>
              </div>
              <!-- 搜索结果显示 -->
              <div v-if="searchResults.length > 0" class="search-results">
                <div
                  v-for="result in searchResults"
                  :key="result.note.id"
                  class="search-result-item"
                  @click="scrollToNote(result.index, result.note.id)"
                >
                  {{ result.note.address }}
                </div>
              </div>
            </div>
            <!-- 排序 -->
            <div class="sort-button-container" @click.stop="toggleSortMenu">
              <div class="icon">
                <SortTwo
                  theme="outline"
                  size="18"
                  fill="var(--color-icon-menu-default)"
                  :strokeWidth="3"
                />
              </div>
              <div class="name">排序</div>
              <div v-if="showSortMenu" class="sort-dropdown-menu">
                <div
                  v-for="option in sortOptions"
                  :key="option.value"
                  class="sort-dropdown-item"
                  @click="selectSortOption(option)"
                >
                  <div class="dropdown-item-content">
                    {{ option.label }}
                  </div>
                  <div v-if="currentSort === option.value" class="sort-direction">
                    {{ sortDirection === 'asc' ? '↑' : '↓' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="cardbox-view-container">
      <div class="card-grid-container">
        <div class="card-grid">
          <CardBoxNoteCard
            v-for="note in filteredNotes"
            :key="note.id"
            :note="note"
            :highlightedNoteId="highlightedNoteId"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useNoteStore } from '../stores/noteStores'
import AppToolbar from '../components/AppToolbar.vue'
import { SortTwo, Search, Close, ListAlphabet } from '@icon-park/vue-next'
import { Note } from '../types/Note'
import CardBoxNoteCard from '../components/CardboxNoteCard.vue'
import { storeToRefs } from 'pinia'
import { useCardBoxSearch } from '../composables/useCardBoxSearch'
import { useEventBus } from '@vueuse/core'

const noteStore = useNoteStore()
const { allIndexNotes } = storeToRefs(noteStore)

const showSortMenu = ref(false)
const currentSort = ref('name')
const sortDirection = ref('asc')
const highlightedNoteId = ref<string | null>(null)

// 使用新的 useCardBoxSearch 组合函数
const {
  searchQuery,
  handleSearch,
  filteredNotes: searchFilteredNotes,
  searchResults,
  clearSearch,
  isSearchActive
} = useCardBoxSearch(allIndexNotes)

// 初始化组件中的笔记数据
const fetchNotes = async () => {
  await noteStore.fetchAllNotes()
}

// 在组件挂载时，初始化笔记数据
onMounted(async () => {
  await fetchNotes()
  document.addEventListener('click', handleGlobalClick)
})

// 监听笔记删除事件，重新获取笔记数据
const eventBus = useEventBus('note-deleted')
eventBus.on(() => {
  fetchNotes()
})

// 排序选项功能
const sortOptions = [
  { value: 'name', label: '按名称排序' },
  { value: 'createdAt', label: '按创建时间排序' },
  { value: 'updatedAt', label: '按更新时间排序' }
]

const toggleSortMenu = (event: MouseEvent) => {
  event.stopPropagation()
  showSortMenu.value = !showSortMenu.value
}

const selectSortOption = (option: { value: string; label: string }) => {
  if (currentSort.value === option.value) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    currentSort.value = option.value
    sortDirection.value = 'asc'
  }
  showSortMenu.value = false
}

const handleBlur = () => {
  setTimeout(() => {
    isSearchActive.value = false
  }, 100)
}

// 修改 filteredNotes 计算属性
const filteredNotes = computed(() => {
  return [...searchFilteredNotes.value].sort((a: Note, b: Note) => {
    let comparison = 0
    switch (currentSort.value) {
      case 'name':
        comparison = a.address.localeCompare(b.address, 'zh-CN')
        break
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case 'updatedAt':
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        break
    }
    return sortDirection.value === 'asc' ? comparison : -comparison
  })
})

// 监听可能影响过滤结果的变量
watch(
  [currentSort, sortDirection],
  () => {
    console.log('筛选条件发生变化')
    console.log('当前排序:', currentSort.value)
    console.log('排序方向:', sortDirection.value)
  },
  { deep: true }
)

// 新增的 scrollToNote 函数
const scrollToNote = (index: number, noteId: string) => {
  const cardElements = document.querySelectorAll('.card-grid > *')
  if (cardElements[index]) {
    cardElements[index].scrollIntoView({ behavior: 'smooth', block: 'center' })
    highlightedNoteId.value = noteId
    setTimeout(() => {
      highlightedNoteId.value = null
    }, 3000) // 3秒后取消高亮
  }
  clearSearch() // 清除搜索结果
}

// 全局点击事件，关闭下拉菜单
const handleGlobalClick = (event: MouseEvent) => {
  const sortDropdown = document.querySelector('.sort-button-container')

  if (showSortMenu.value && sortDropdown && !sortDropdown.contains(event.target as Node)) {
    showSortMenu.value = false
  }
}

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
})
</script>

<style lang="scss" scoped>
.cardbox-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-primary);
  overflow: hidden;
}
.fixed-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: var(--color-bg-primary);
}
.topToolBar {
  display: flex;
  align-items: center;
  padding: 0px 20px;
  background-color: var(--color-bg-primary);
  .topToolBar-header {
    display: flex;
    width: 100%;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid var(--color-border);
  }
}
.topToolBar-left {
  position: relative;
  display: flex;
  align-items: center;
  border: none;
  background: none;
  border-radius: 6px;
  padding: 4px 0px;
  margin: 2px;

  .icon {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;
    border-radius: 8px;
    // background-color: var(--color-menu-bg);
    border: 1px solid var(--color-blue);

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    :deep(svg) {
      width: 18px;
      height: 18px;
    }
  }

  .name {
    flex-grow: 0;
    text-align: left;
    color: var(--default-text-color);
    font-size: 20px;
    font-weight: 600;
    margin-left: 8px;
    white-space: nowrap;
    writing-mode: horizontal-tb;
    user-select: none;
  }
}
.topToolBar-right {
  display: flex;
  gap: 10px;
  align-items: center;

  .sort-button-container {
    display: flex;
    align-items: center;
    // width: 100px;
    padding: 2px 12px 2px 7px;
    border: none;
    background: none;
    cursor: pointer;
    transition: background-color 0.2s;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    user-select: none;

    .icon {
      background: none;
      border: none;
      cursor: pointer;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: background-color 0.2s;
      padding: 0;
      // margin-right: 3px;

      &:hover:not(:disabled) {
        background-color: var(--color-hover-bg);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      // 新增以下样式来处理 i-icon 类
      :deep(.i-icon) {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }

      :deep(svg) {
        width: 16px; // 或者您想要的大小
        height: 16px; // 或者您想要的大小
      }
    }

    .name {
      flex-grow: 0;
      text-align: left;
      color: var(--color-text-primary);
      font-size: 14px;
      white-space: nowrap; // 防止文字换行
      writing-mode: horizontal-tb; // 确保文字是水平排列的
      line-height: 1;
    }

    &:hover {
      background-color: var(--color-hover-bg);
    }

    &.active {
      background-color: var(--color-menu-active-bg);
      // border: 1px solid var(--color-primary);
    }

    .sort-dropdown-menu {
      position: absolute;
      top: 90%;
      // left: -10px;
      right: 20px;
      background-color: var(--color-bg-primary);
      border-radius: 8px;
      box-shadow: var(--shadow-primary);
      z-index: 1000;
      min-width: 200px;
      width: auto;
      overflow-y: auto;
      padding: 6px 0;
      white-space: nowrap;
    }

    .sort-dropdown-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      cursor: pointer;
      transition: background-color 0.2s;
      font-size: 14px;
      color: var(--color-text-primary);
      white-space: nowrap;
      border-radius: 8px;
      margin: 2px 8px 2px 8px;
      user-select: none;

      &:hover {
        background-color: var(--color-hover-bg);
      }

      &.active {
        background-color: var(--color-menu-active-bg);
      }
    }
  }

  .search-box {
    position: relative;
    width: 200px;
    display: flex;
    align-items: center;
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 1px 8px;
    overflow: hidden;
    &.is-focused {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
    }
    .search-icon {
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      pointer-events: none;
      :deep(.i-icon) {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }
    }

    .clear-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      cursor: pointer;
      :deep(.i-icon) {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }
    }

    input {
      flex-grow: 1;
      border: none;
      background: transparent;
      padding: 4px 4px 4px 25px;
      color: var(--color-text-secondary);
      font-size: 14px;
      min-width: 0;
      &::placeholder {
        color: var(--color-text-placeholder);
        opacity: 1;
      }

      &:focus {
        outline: none;
      }
    }

    .clear-icon {
      cursor: pointer;
    }

    .search-results {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background-color: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      box-shadow: var(--shadow-primary);
      max-height: 300px;
      overflow-y: auto;
      z-index: 1000;
    }

    .search-result-item {
      padding: 8px 12px;
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover {
        background-color: var(--color-hover-bg);
      }
    }
  }
}

.cardbox-view-container {
  // height: 100%;
  // width: 100%;
  // padding: 0px 0px 10px 0px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px); // 假设顶部工具栏高度为100px，请根据实际情况调整
  overflow: hidden; // 防止整个页面滚动

  .card-grid-container {
    flex: 1;
    // height: 100%;
    overflow-y: auto; // 允许卡片网格容器滚动
    // padding: 0 16px 16px 16px;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
    padding: 16px 20px;
    align-content: start; // 让内容从顶部开始排列
    justify-content: center; // 水平居中对齐

    // 使用视口单位和 clamp 函数来控制卡片高度
    --card-height: clamp(250px, calc(20vw - 32px), 350px);
    grid-auto-rows: var(--card-height);

    // 计算每行可以容纳的卡片数量
    --cards-per-row: calc((100% - 32px) / (300px + 16px));
  }
}

.sort-direction {
  font-size: 12px;
  margin-left: 5px;
}
</style>
