<template>
  <div class="sidebar-cardbox">
    <!-- 搜索区域 -->
    <div class="search-area">
      <SearchInput
        ref="searchInput"
        v-model="searchQuery"
        placeholder="搜索笔记"
        :width="9999"
        :height="36"
        @input="debouncedSearch"
        @focus="isSearchFocused = true"
        @blur="handleBlur"
      />
    </div>

    <!-- 新增功能按钮区域 -->
    <div class="toolbar-area">
      <div class="toolbar-left">
        <Dropdown
          :items="tagDropdownItems"
          showArrow
          type="default"
          size="medium"
          icon-only
          :icon="Tag"
          :placeholder="'按标签筛选'"
          :is-active="filterState.tags.length > 0"
          @select="handleTagSelect"
        >
          标签
        </Dropdown>

        <Dropdown
          :items="cardboxDropdownItems"
          showArrow
          type="default"
          size="medium"
          icon-only
          :icon="Box"
          :placeholder="'按卡片盒筛选'"
          :is-active="filterState.cardBoxId !== undefined"
          @select="handleCardboxSelect"
        >
          卡片盒
        </Dropdown>

        <Dropdown
          :items="customFilterDropdownItems"
          showArrow
          type="default"
          size="medium"
          icon-only
          :icon="Filter"
          :placeholder="'按自定义筛选'"
          :is-active="filterState.customFilterId !== undefined"
          @select="handleCustomFilterSelect"
        >
          自定义筛选
        </Dropdown>

        <!-- 添加思维板按钮 -->
        <Dropdown
          :items="mindboardDropdownItems"
          showArrow
          type="default"
          size="medium"
          icon-only
          :icon="MindMapping"
          :placeholder="'按思维板筛选'"
          :is-active="filterState.mindboardId !== undefined"
          @select="handleMindboardSelect"
        >
          思维板
        </Dropdown>
      </div>

      <div class="toolbar-right">
        <!-- 清空筛选按钮 -->
        <Button
          v-if="hasActiveFilters"
          type="text"
          size="medium"
          :icon="CloseOne"
          icon-only
          @click="clearFilters"
        >
          清空筛选
        </Button>

        <!-- 排序按钮 -->
        <Dropdown
          :items="sortDropdownItems"
          showArrow
          type="default"
          size="medium"
          icon-only
          align="end"
          :icon="SortTwo"
          :placeholder="'排序'"
          @select="handleSortSelect"
        >
          排序
        </Dropdown>
      </div>
    </div>

    <!-- 笔记列表区域 -->
    <div ref="notesContainer" class="notes-container" @scroll="handleScroll">
      <!-- 加载状态 -->
      <div v-if="isLoading && notes.length === 0" class="loading-state">
        <div class="loading-spinner"></div>
        <span>加载中...</span>
      </div>

      <!-- 思维板卡片列表 -->
      <MindboardCardList v-if="filterState.mindboardId" :mindboard-id="filterState.mindboardId" />

      <!-- 普通笔记列表 -->
      <template v-else>
        <!-- 空状态 -->
        <EmptyState v-if="displayedNotes.length === 0" alt="暂无笔记" text="没有找到笔记" />
        <!-- 笔记列表 -->
        <div v-else class="notes-list" :style="listStyles">
          <div class="virtual-list" :style="virtualListStyles">
            <RightSidebarCardboxCard
              v-for="note in virtualNotes"
              :key="`${note.id}-${new Date(note.updatedAt).toISOString()}`"
              v-memo="[note.id, note.content, note.createdAt]"
              class="note-item"
              :note="note"
              :highlighted-note-id="highlightedNoteId"
            />
          </div>
          <!-- 加载更多指示器 -->
          <div v-if="isLoading && hasMoreNotes" class="loading-more">
            <div class="loading-spinner"></div>
            <span>加载更多...</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, reactive, watch } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useMindboardStore } from '@renderer/stores/mindboardStore'
import { Tag, Filter, SortTwo, CloseOne, Box, MindMapping } from '@icon-park/vue-next'
import type { Note } from '@shared/types'
import RightSidebarCardboxCard from './RightSidebarCardboxCard.vue'
import MindboardCardList from './MindboardCardList.vue'
import { useDebounceFn, useThrottleFn } from '@vueuse/core'
import { useTagStore } from '@renderer/stores/tagStore'
import { useFilterStore } from '@renderer/stores/filterStore'
import Dropdown from '@renderer/components/ui/Dropdown.vue'
import Button from '@renderer/components/ui/Button.vue'
import SearchInput from '@renderer/components/ui/SearchInput.vue'
import EmptyState from '@renderer/components/ui/EmptyState.vue'

const noteStore = useNoteStore()
const tagStore = useTagStore()
const filterStore = useFilterStore()
const mindboardStore = useMindboardStore()

// 基础状态
const isLoading = ref(false)
const notes = ref<Note[]>([])
const searchQuery = ref('')
const isSearchFocused = ref(false)
const highlightedNoteId = ref<string | null>(null)
const notesContainer = ref<HTMLElement | null>(null)
const currentPage = ref(1)
const pageSize = ref(20)
const totalCount = ref(0)
const hasMoreNotes = ref(true)

// 虚拟列表相关状态
const containerHeight = ref(0)
const scrollTop = ref(0)
const itemHeight = 200 // 每个笔记项的固定高度
const bufferSize = 5 // 上下额外渲染的项数

// 添加排序偏好相关接口和常量
interface SortPreference {
  field: 'address' | 'createdAt' | 'updatedAt'
  order: 'asc' | 'desc'
}

const SORT_PREFERENCE_KEY = 'antinet_sidebar_sort_preference'

// 获取保存的排序偏好
const getSavedSortPreference = (): SortPreference | null => {
  try {
    const saved = localStorage.getItem(SORT_PREFERENCE_KEY)
    if (!saved) return null
    const parsed = JSON.parse(saved)
    // 验证字段和排序方向的值是否合法
    if (
      !['address', 'createdAt', 'updatedAt'].includes(parsed.field) ||
      !['asc', 'desc'].includes(parsed.order)
    ) {
      return null
    }
    return parsed as SortPreference
  } catch (error) {
    console.error('读取排序偏好失败:', error)
    return null
  }
}

// 保存排序偏好
const saveSortPreference = (preference: SortPreference) => {
  try {
    localStorage.setItem(SORT_PREFERENCE_KEY, JSON.stringify(preference))
  } catch (error) {
    console.error('保存排序偏好失败:', error)
  }
}

// 修改筛选状态的初始化
const filterState = reactive({
  keyword: '',
  tags: [] as string[],
  cardBoxId: undefined as string | undefined,
  customFilterId: undefined as string | undefined,
  mindboardId: undefined as string | undefined,
  sort: (() => {
    const savedPreference = getSavedSortPreference()
    if (savedPreference) {
      return savedPreference
    }
    return {
      field: 'updatedAt' as 'address' | 'createdAt' | 'updatedAt',
      order: 'desc' as 'asc' | 'desc'
    }
  })()
})

// 计算虚拟列表信息
const viewportInfo = computed(() => {
  const visibleItems = Math.ceil(containerHeight.value / itemHeight)
  const startIndex = Math.max(0, Math.floor(scrollTop.value / itemHeight) - bufferSize)
  const endIndex = Math.min(
    notes.value.length,
    Math.floor(scrollTop.value / itemHeight) + visibleItems + bufferSize
  )

  return {
    startIndex,
    endIndex,
    totalHeight: notes.value.length * itemHeight,
    paddingTop: startIndex * itemHeight
  }
})

// 计算需要渲染的笔记
const virtualNotes = computed(() =>
  notes.value.slice(viewportInfo.value.startIndex, viewportInfo.value.endIndex)
)

// 列表样式
const listStyles = computed(() => ({
  height: `${viewportInfo.value.totalHeight}px`,
  position: 'relative' as const
}))

const virtualListStyles = computed(() => ({
  transform: `translateY(${viewportInfo.value.paddingTop}px)`,
  position: 'absolute' as const,
  width: '100%',
  willChange: 'transform'
}))

// 获取笔记数据
const fetchNotes = async () => {
  if (isLoading.value) return

  isLoading.value = true
  try {
    const result = await noteStore.fetchPaginatedNotesByCardbox({
      page: currentPage.value,
      limit: pageSize.value,
      keyword: filterState.keyword,
      tags: filterState.tags,
      cardBoxId: filterState.cardBoxId,
      customFilterId: filterState.customFilterId,
      sortBy: filterState.sort.field,
      sortOrder: filterState.sort.order
    })

    await nextTick(() => {
      if (currentPage.value === 1) {
        notes.value = result.notes
      } else {
        notes.value = [...notes.value, ...result.notes]
      }
    })

    totalCount.value = result.totalCount
    hasMoreNotes.value = notes.value.length < result.totalCount

    // 检查是否需要加载更多
    if (currentPage.value === 1) {
      await nextTick()
      checkAndLoadMore()
    }
  } catch (error) {
    console.error('获取笔记失败:', error)
    hasMoreNotes.value = true
    currentPage.value = Math.max(1, currentPage.value - 1)
  } finally {
    isLoading.value = false
  }
}

// 处理滚动
const handleScroll = useThrottleFn(
  (e: Event) => {
    const target = e.target as HTMLElement
    const newScrollTop = target.scrollTop
    scrollTop.value = newScrollTop

    // 处理无限加载
    const { scrollHeight, clientHeight } = target
    const scrollBottom = scrollHeight - newScrollTop - clientHeight

    if (
      (scrollBottom < 400 || Math.abs(scrollHeight - (newScrollTop + clientHeight)) < 1) &&
      !isLoading.value &&
      hasMoreNotes.value
    ) {
      currentPage.value++
      fetchNotes()
    }
  },
  50 // 降低节流时间，使响应更灵敏
)

// 检查是否需要加载更多
const checkAndLoadMore = async () => {
  if (!notesContainer.value) return

  const { scrollHeight, clientHeight } = notesContainer.value

  if (
    scrollHeight <= clientHeight &&
    !isLoading.value &&
    hasMoreNotes.value &&
    notes.value.length < totalCount.value
  ) {
    currentPage.value++
    await fetchNotes()
  }
}

// 搜索相关
const debouncedSearch = useDebounceFn(async () => {
  if (filterState.keyword !== searchQuery.value.trim()) {
    filterState.keyword = searchQuery.value.trim()
    currentPage.value = 1
    notes.value = []
    await fetchNotes()
  }
}, 300)

const handleBlur = () => {
  setTimeout(() => {
    isSearchFocused.value = false
  }, 100)
}

// 标签下拉菜单项
const tagDropdownItems = computed(() => {
  const tags = tagStore.tagTree
  return tags.map((tag) => ({
    key: tag.id,
    label: tag.name,
    icon: Tag,
    active: filterState.tags.includes(tag.id)
  }))
})

// 卡片盒下拉菜单项
const cardboxDropdownItems = computed(() => {
  const cardBoxes = noteStore.cardBoxes
  return cardBoxes.map((box) => ({
    key: box.id,
    label: box.name,
    icon: Box,
    active: filterState.cardBoxId === box.id
  }))
})

// 自定义筛选下拉菜单项
const customFilterDropdownItems = computed(() => {
  const filters = filterStore.customFilters
  return filters.map((filter) => ({
    key: filter.id,
    label: filter.name,
    icon: Filter,
    active: filterState.customFilterId === filter.id
  }))
})

// 思维板下拉菜单项
const mindboardDropdownItems = computed(() => {
  return mindboardStore.mindboards.map((mindboard) => ({
    key: mindboard.id,
    label: mindboard.name,
    icon: MindMapping,
    active: filterState.mindboardId === mindboard.id
  }))
})

// 排序下拉菜单项
const sortDropdownItems = computed(() => {
  return [
    {
      key: 'updatedAt',
      label:
        '按更新时间排序' +
        (filterState.sort.field === 'updatedAt'
          ? filterState.sort.order === 'asc'
            ? ' ↑'
            : ' ↓'
          : ''),
      icon: SortTwo,
      active: filterState.sort.field === 'updatedAt'
    },
    {
      key: 'createdAt',
      label:
        '按创建时间排序' +
        (filterState.sort.field === 'createdAt'
          ? filterState.sort.order === 'asc'
            ? ' ↑'
            : ' ↓'
          : ''),
      icon: SortTwo,
      active: filterState.sort.field === 'createdAt'
    },
    {
      key: 'address',
      label:
        '按名称排序' +
        (filterState.sort.field === 'address'
          ? filterState.sort.order === 'asc'
            ? ' ↑'
            : ' ↓'
          : ''),
      icon: SortTwo,
      active: filterState.sort.field === 'address'
    }
  ]
})

// 处理筛选和排序
const handleTagSelect = async (tagId: string) => {
  filterState.tags = [tagId]
  resetAndFetch()
}

const handleCardboxSelect = async (cardBoxId: string) => {
  filterState.cardBoxId = cardBoxId
  resetAndFetch()
}

const handleCustomFilterSelect = async (filterId: string) => {
  const selectedFilter = filterStore.customFilters.find((filter) => filter.id === filterId)
  if (selectedFilter) {
    filterState.customFilterId = filterId
    filterStore.setActiveFilter(selectedFilter)
  }
  resetAndFetch()
}

const handleMindboardSelect = async (mindboardId: string) => {
  // 如果选择了相同的思维板,则清除选择
  if (filterState.mindboardId === mindboardId) {
    filterState.mindboardId = undefined
  } else {
    filterState.mindboardId = mindboardId
  }

  // 清除其他筛选条件
  filterState.tags = []
  filterState.cardBoxId = undefined
  filterState.customFilterId = undefined
  filterState.keyword = ''
  searchQuery.value = ''

  // 重置分页
  currentPage.value = 1
  notes.value = []

  // 如果没有选择思维板,则重新获取笔记列表
  if (!filterState.mindboardId) {
    await fetchNotes()
  }
}

const handleSortSelect = async (value: string) => {
  const field = value as 'address' | 'createdAt' | 'updatedAt'
  if (filterState.sort.field === field) {
    filterState.sort.order = filterState.sort.order === 'asc' ? 'desc' : 'asc'
  } else {
    filterState.sort.field = field
    filterState.sort.order = 'desc'
  }
  // 保存排序偏好
  saveSortPreference({
    field: filterState.sort.field,
    order: filterState.sort.order
  })
  resetAndFetch()
}

// 重置并重新获取数据
const resetAndFetch = async () => {
  currentPage.value = 1
  notes.value = []
  hasMoreNotes.value = true
  scrollTop.value = 0
  if (notesContainer.value) {
    notesContainer.value.scrollTop = 0
  }
  await fetchNotes()
}

// 判断是否有活动的筛选条件
const hasActiveFilters = computed(() => {
  return (
    filterState.tags.length > 0 ||
    filterState.cardBoxId !== undefined ||
    filterState.customFilterId !== undefined ||
    filterState.mindboardId !== undefined
  )
})

// 清空筛选条件
const clearFilters = () => {
  filterState.tags = []
  filterState.cardBoxId = undefined
  filterState.customFilterId = undefined
  filterState.mindboardId = undefined
  filterStore.setActiveFilter(null)
  resetAndFetch()
}

// 显示的笔记列表
const displayedNotes = computed(() => notes.value)

// 监听思维板数据变化
watch(
  () => mindboardStore.mindboards,
  async () => {
    // 如果当前选中的思维板不在列表中,清除选择
    if (
      filterState.mindboardId &&
      !mindboardStore.mindboards.find((m) => m.id === filterState.mindboardId)
    ) {
      filterState.mindboardId = undefined
      await fetchNotes()
    }
  },
  { deep: true }
)

// 生命周期钩子
onMounted(async () => {
  // 如果有保存的排序偏好，使用保存的偏好
  const savedPreference = getSavedSortPreference()
  if (savedPreference) {
    filterState.sort = savedPreference
  }

  if (notesContainer.value) {
    containerHeight.value = notesContainer.value.clientHeight
    notesContainer.value.addEventListener('scroll', handleScroll)

    // 监听容器大小变化
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerHeight.value = entry.contentRect.height
        checkAndLoadMore()
      }
    })

    resizeObserver.observe(notesContainer.value)
  }

  // 初始化数据
  await Promise.all([
    fetchNotes(),
    mindboardStore.fetchAllMindboards() // 获取所有思维板数据
  ])
})

onUnmounted(() => {
  notesContainer.value?.removeEventListener('scroll', handleScroll)
})
</script>

<style lang="scss" scoped>
.sidebar-cardbox {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-primary);

  .search-area {
    padding: 8px 12px 0 12px;
    width: 100%;
    box-sizing: border-box;

    :deep(.search-input-group) {
      width: 100%;
      max-width: 100% !important;
    }
  }

  .toolbar-area {
    padding: 8px 12px;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .notes-container {
    flex: 1;
    overflow-y: auto;
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 0 16px;
    // padding: 16px;

    .loading-state {
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

    :deep(.empty-state) {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin-top: -48px; // 抵消 EmptyState 组件的上内边距，使其真正居中
      .empty-icon {
        width: 220px; // 调整图标大小
        height: 220px;
      }

      .empty-text {
        font-size: 14px;
        color: var(--color-text-secondary);
      }
    }

    .notes-list {
      position: relative;
      padding: 16px;

      .virtual-list {
        left: 0;
        right: 0;
      }

      .note-item {
        height: 200px;
        margin-bottom: 12px;
        transition: transform 0.2s ease;
      }
    }

    .loading-more {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      gap: 8px;
      color: var(--color-text-secondary);
      font-size: 13px;
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
