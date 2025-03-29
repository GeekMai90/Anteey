<template>
  <div class="cardbox-view">
    <div class="fixed-header">
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>
      <div class="topToolBar">
        <div class="topToolBar-header">
          <div class="topToolBar-left">
            <!-- 全部按钮 -->
            <Button
              :class="{
                active:
                  filterState.cardBoxId === 'all' &&
                  !filterStore.activeFilter &&
                  !filterState.keyword &&
                  filterState.tags.length === 0 &&
                  filterState.cardTypes.length === 0 &&
                  !filterState.isFlashcard
              }"
              :icon="Box"
              :height="36"
              @click="selectAll"
            >
              全部
            </Button>
            <!-- 闪卡筛选 -->
            <FlashcardFilter
              v-model="filterState.isFlashcard"
              @update:modelValue="handleFlashcardFilterChange"
            />
            <!-- 卡片盒下拉菜单 -->
            <CardBoxDropdown
              v-model="filterState.cardBoxId"
              :card-boxes="cardBoxes"
              :selected-box="selectedCardBox"
              @select="selectCardBox"
              @more="toggleMoreActions"
              @add="openCardBoxModal"
            />
            <!-- 标签下拉菜单 -->
            <TagDropdown
              v-model="filterState.tags"
              :tags="tags"
              :selected-tag="selectedTag"
              @select="selectTag"
            />
            <!-- 卡片类型下拉菜单 -->
            <CardTypeDropdown v-model="filterState.cardTypes" />

            <!-- 添加自定义筛选组件 -->
            <CustomFilterDropdown @filter="handleCustomFilter" @reset="handleResetFilter" />
          </div>

          <div class="topToolBar-right">
            <!-- 搜索框 -->
            <div v-tooltip.top="{ content: 'Cmd+P', delay: { show: 1000 } }" class="search-box">
              <SearchInput
                ref="searchInput"
                v-model="searchQuery"
                :width="200"
                :height="36"
                placeholder="输入关键词回车搜索"
                @keyup.enter="handleSearch"
                @focus="isSearchFocused = true"
              />
            </div>

            <!-- 多选按钮 -->
            <Button
              :class="{ active: noteStore.isMultiSelectMode }"
              :icon="Checkbox"
              :height="36"
              @click="toggleMultiSelect"
            >
              多选
            </Button>

            <!-- 菜单项的编辑菜单 -->
            <div
              v-if="showMoreActions"
              class="more-actions-menu"
              :class="{ show: showMoreActions }"
              :style="moreActionsMenuStyle"
            >
              <div
                class="more-action-item"
                @click.stop="editCardBox(getCardBoxById(showMoreActions))"
              >
                <div class="icon">
                  <EditTwo
                    theme="outline"
                    size="16"
                    fill="var(--color-icon-primary)"
                    :strokeWidth="3"
                  />
                </div>
                <div class="name">编辑</div>
              </div>
              <div class="more-action-item delete" @click.stop="deleteCardBox(showMoreActions)">
                <div class="icon">
                  <Delete theme="outline" size="16" fill="var(--color-danger)" :strokeWidth="3" />
                </div>
                <div class="name delete">
                  {{ isConfirmingDelete ? '确认删除' : '删除' }}
                </div>
              </div>
            </div>
            <!-- 排序 -->
            <div class="sort-button-container" @click.stop="toggleSortMenu">
              <Button :height="36" :icon="SortTwo" dropdown> 排序 </Button>
              <!-- 排序下拉菜单 -->
              <div v-if="showSortMenu" class="sort-dropdown-menu">
                <div
                  v-for="option in sortOptions"
                  :key="option.value"
                  class="sort-dropdown-item"
                  :class="{ active: currentSort === option.value }"
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
      <div ref="cardGridContainer" class="card-grid-container">
        <!-- 空状态展示 -->
        <div v-if="displayedNotes.length === 0" class="empty-state">
          <img src="@renderer/assets/images/empty.svg" alt="暂无内容" class="empty-icon" />
          <div class="empty-text">暂无笔记，点击左侧边栏"新建笔记"开始创建</div>
        </div>
        <!-- 卡片网格 -->
        <div v-else class="card-grid" :style="cardGridStyles">
          <CardBoxNoteCard
            v-for="note in virtualNotes"
            :key="`${note.id}-${new Date(note.updatedAt).toISOString()}`"
            v-memo="[note.id, note.content, note.createdAt, highlightedNoteId]"
            class="card-item"
            :class="{ highlight: note.id === highlightedNoteId }"
            :note="note"
            :highlightedNoteId="highlightedNoteId"
          />
        </div>
      </div>
      <!-- 创建/编辑卡片盒的模态框 -->
      <div v-if="showCardBoxModal" class="modal-overlay" @click="closeCardBoxModal">
        <div class="modal-content" @click.stop>
          <h2>{{ isEditing ? '编辑卡片盒' : '创建卡片盒' }}</h2>
          <input
            v-model="editingCardBox.name"
            :placeholder="isEditing ? '' : '输入卡片盒名称'"
            @keyup.enter="saveCardBox"
          />
          <div class="modal-actions">
            <button
              :disabled="!editingCardBox.name || editingCardBox.name.trim().length === 0"
              @click="saveCardBox"
            >
              完成
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- 添加批量操作工具条 -->
    <BatchOperationToolbar :displayed-notes="displayedNotes" />

    <!-- 添加 FilterDialog -->
    <FilterDialog
      v-if="filterStore.dialogState.visible"
      :filter="filterStore.dialogState.editingFilter"
      @close="handleCloseFilterDialog"
      @save="handleSaveFilter"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
  onActivated,
  reactive,
  provide
} from 'vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import { SortTwo, Box, EditTwo, Delete, Checkbox } from '@icon-park/vue-next'
import type { CardBox, Note, Tag } from '@shared/types'
import CardBoxNoteCard from '@renderer/components/cardbox/CardboxNoteCard.vue'
import { storeToRefs } from 'pinia'
import { useEventBus, useThrottleFn } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import { GetPaginatedNotesParams, GetPaginatedNotesResponse } from '@shared/types'
import CardBoxDropdown from '@renderer/components/cardbox/CardBoxDropdown.vue'
import TagDropdown from '@renderer/components/cardbox/TagDropdown.vue'
import { useTagStore } from '@renderer/stores/tagStore'
import CardTypeDropdown from '@renderer/components/cardbox/CardTypeDropdown.vue'
import CustomFilterDropdown from '@renderer/components/cardbox/CustomFilterDropdown.vue'
import { useFilterStore } from '@renderer/stores/filterStore'
import FilterDialog from '@renderer/components/cardbox/FilterDialog.vue'
import { CreateCustomFilterInput, UpdateCustomFilterInput } from '@shared/types'
import { message } from '@renderer/utils/message'
import FlashcardFilter from '@renderer/components/cardbox/FlashcardFilter.vue'
import SearchInput from '@renderer/components/ui/SearchInput.vue'
import Button from '@renderer/components/ui/Button.vue'
import BatchOperationToolbar from '@renderer/components/cardbox/BatchOperationToolbar.vue'

const noteStore = useNoteStore()
const filterStore = useFilterStore()

const { lastCreatedNote, lastDeletedNote } = storeToRefs(noteStore)
const showCardBoxMenu = ref(false)
const selectedCardBox = ref<CardBox | null>(null)
const showMoreActions = ref<string | null>(null)
const showCardBoxModal = ref(false)
const isEditing = ref(false)
const editingCardBox = ref<Partial<CardBox>>({ name: '' })
const moreActionsMenuStyle = ref({})
const isConfirmingDelete = ref(false)

const cardGridContainer = ref<HTMLElement | null>(null)
const isLoading = ref(false)
const currentPage = ref(1)
const pageSize = ref(28)
const totalCount = ref(0)
const notes = ref<Note[]>([])
const showSortMenu = ref(false)
const hasMoreNotes = ref(true)
const route = useRoute()
const router = useRouter()
const tagStore = useTagStore()
// 添加新的状态
const isContextMode = ref(false)
const targetNoteId = ref<string | null>(null)
const highlightedNoteId = ref<string | null>(null)
// 添加最后选中的笔记ID
const lastSelectedNoteId = ref<string | null>(null)

// 添加虚拟列表相关的状态
const containerHeight = ref(0)
const scrollTop = ref(0)
const cardHeight = 300 // 假设每个卡片的固定高度为300px
const bufferSize = 3 // 上下额外渲染的行数

// 计算视口信息
const viewportInfo = computed(() => {
  const containerWidth = cardGridContainer.value?.clientWidth || 0
  const cardsPerRow = Math.floor(containerWidth / 316) // 300px + 16px gap
  const rowHeight = cardHeight + 16 // 加上gap的高度

  const visibleRows = Math.ceil(containerHeight.value / rowHeight)
  const startRow = Math.floor(scrollTop.value / rowHeight)

  // 确保startRow不会出现负数，并减少上方缓冲区大小
  const safeStartRow = Math.max(0, startRow - Math.floor(bufferSize / 2))
  const endRow = startRow + visibleRows + Math.ceil(bufferSize / 2)

  const startIndex = safeStartRow * cardsPerRow
  const endIndex = Math.min(notes.value.length, endRow * cardsPerRow)

  return {
    startIndex,
    endIndex,
    totalHeight: Math.ceil(notes.value.length / cardsPerRow) * rowHeight,
    paddingTop: safeStartRow * rowHeight
  }
})

// 计算实际需要渲染的笔记
const virtualNotes = computed(() =>
  notes.value.slice(viewportInfo.value.startIndex, viewportInfo.value.endIndex)
)

// 修改 fetchNotes 函数
const fetchNotes = async () => {
  if (isLoading.value) return

  isLoading.value = true
  try {
    const activeFilter = filterStore.activeFilter
    const params: GetPaginatedNotesParams = {
      page: currentPage.value,
      limit: pageSize.value,
      cardBoxId: filterState.cardBoxId,
      cardTypes: filterState.cardTypes,
      tags: filterState.tags,
      keyword: filterState.keyword,
      sortBy: filterState.sort.field,
      sortOrder: filterState.sort.order as 'asc' | 'desc',
      isFlashcard: filterState.isFlashcard,
      customFilterId: activeFilter?.id,
      targetNoteId: targetNoteId.value || undefined
    }

    const result = (await noteStore.fetchPaginatedNotesByCardbox(
      params
    )) as GetPaginatedNotesResponse

    // 如果返回了目标位置，直接计算目标页码
    if (targetNoteId.value && result.targetPosition !== undefined) {
      const targetPage = Math.floor(result.targetPosition / pageSize.value) + 1
      console.log(
        '目标笔记位置:',
        result.targetPosition,
        '目标页码:',
        targetPage,
        '当前页码:',
        currentPage.value
      )

      if (currentPage.value === 1 && targetPage > 1) {
        // 如果是第一页且目标在后面的页码，直接跳转到目标页
        currentPage.value = targetPage
        notes.value = [] // 清空现有数据
        isLoading.value = false // 重置加载状态
        return fetchNotes() // 重新获取正确页码的数据
      }
    }

    const sortedNotes = [...result.notes]
    if (filterState.sort.field === 'address') {
      sortedNotes.sort((a, b) => {
        const result = compareAddress(a.address, b.address)
        return filterState.sort.order === 'asc' ? result : -result
      })
    }

    await nextTick(() => {
      if (currentPage.value === 1) {
        notes.value = sortedNotes
      } else {
        notes.value = [...notes.value, ...sortedNotes]
      }
    })

    totalCount.value = result.totalCount
    hasMoreNotes.value = notes.value.length < result.totalCount

    // 添加：在初始加载完成后检查是否需要加载更多
    if (currentPage.value === 1) {
      await nextTick()
      checkAndLoadMore()
    }

    // 如果有目标笔记且在当前加载的数据中，滚动到目标位置
    if (targetNoteId.value && notes.value.some((note) => note.id === targetNoteId.value)) {
      await nextTick()
      scrollToTargetNote()
    }

    // 如果还没有找到目标笔记，且还有更多数据，继续加载下一页
    if (
      targetNoteId.value &&
      !notes.value.some((note) => note.id === targetNoteId.value) &&
      hasMoreNotes.value
    ) {
      currentPage.value++
      isLoading.value = false // 重置加载状态
      return fetchNotes()
    }
  } catch (error) {
    console.error('获取笔记失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 添加新的检查函数
const checkAndLoadMore = async () => {
  if (!cardGridContainer.value) return

  const { scrollHeight, clientHeight } = cardGridContainer.value
  console.log('检查是否需要加载更多:', {
    scrollHeight,
    clientHeight,
    notesLength: notes.value.length,
    totalCount: totalCount.value,
    hasMore: hasMoreNotes.value
  })

  // 如果内容高度等于容器高度，且还有更多数据，自动加载下一页
  if (
    scrollHeight <= clientHeight &&
    !isLoading.value &&
    hasMoreNotes.value &&
    !targetNoteId.value &&
    notes.value.length < totalCount.value
  ) {
    console.log('初始加载触发加载更多')
    currentPage.value++
    await fetchNotes()
  }
}

// 修改 handleScroll 函数
const handleScroll = useThrottleFn((e: Event) => {
  const target = e.target as HTMLElement
  const newScrollTop = target.scrollTop

  // 更新滚动位置
  scrollTop.value = newScrollTop

  // 处理无限加载
  const { scrollHeight, clientHeight } = target
  const scrollBottom = scrollHeight - newScrollTop - clientHeight

  // 当距离底部小于 500px 且还有更多数据时，加载更多
  if (
    scrollBottom < 500 &&
    !isLoading.value &&
    hasMoreNotes.value &&
    !targetNoteId.value &&
    notes.value.length < totalCount.value
  ) {
    console.log('滚动触发加载更多', {
      scrollBottom,
      isLoading: isLoading.value,
      hasMore: hasMoreNotes.value,
      currentPage: currentPage.value,
      totalNotes: notes.value.length,
      totalCount: totalCount.value
    })
    currentPage.value++
    fetchNotes()
  }
}, 100)

// 添加排序偏好相关接口和方法
interface SortPreference {
  field: string
  order: 'asc' | 'desc'
}

const SORT_PREFERENCE_KEY = 'antinet_sort_preference'

const getSavedSortPreference = (): SortPreference | null => {
  try {
    const saved = localStorage.getItem(SORT_PREFERENCE_KEY)
    if (!saved) return null
    const parsed = JSON.parse(saved)
    // 验证 order 的值是否合法
    if (parsed.order !== 'asc' && parsed.order !== 'desc') {
      return null
    }
    return parsed as SortPreference
  } catch (error) {
    console.error('读取排序偏好失败:', error)
    return null
  }
}

const saveSortPreference = (preference: SortPreference) => {
  try {
    localStorage.setItem(SORT_PREFERENCE_KEY, JSON.stringify(preference))
  } catch (error) {
    console.error('保存排序偏好失败:', error)
  }
}

// 添加地址比较函数
const compareAddress = (a: string, b: string) => {
  // 将地址分割成数组
  // 例如:
  // "5101" => ["5101"]
  // "5101-1" => ["5101", "1"]
  // "5101-1-1" => ["5101", "1", "1"]
  // "5101-1-1-1" => ["5101", "1", "1", "1"]
  // "5101-1a" => ["5101", "1a"]
  const splitAddress = (addr: string = '') => {
    return addr.split('-').map((part) => {
      // 处理数字部分
      const num = parseInt(part)
      // 如果不是纯数字（可能包含字母），或者解析失败，则保持原样
      // 这样可以正确处理类似 "1a" 这样的分支编码
      return isNaN(num) ? part : num
    })
  }

  const aParts = splitAddress(a)
  const bParts = splitAddress(b)

  // 逐段比较，支持无限层级的分支
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    // 如果某个地址段不存在，认为它更小
    // 例如: "5101" < "5101-1"
    if (aParts[i] === undefined) return -1
    if (bParts[i] === undefined) return 1

    // 如果两个部分不相等，返回它们的差
    if (aParts[i] !== bParts[i]) {
      // 如果都是数字，直接相减
      // 例如: "5101-1" < "5101-2"
      if (typeof aParts[i] === 'number' && typeof bParts[i] === 'number') {
        return (aParts[i] as number) - (bParts[i] as number)
      }
      // 否则按字符串比较，这样可以处理包含字母的情况
      // 例如: "5101-1" < "5101-1a" < "5101-1b" < "5101-2"
      return String(aParts[i]).localeCompare(String(bParts[i]), 'zh-CN')
    }
  }
  return 0
}

// 修改 scrollToTargetNote 函数
const scrollToTargetNote = () => {
  if (!targetNoteId.value) {
    console.log('没有目标笔记ID')
    return
  }

  // 找到目标笔记在完整列表中的索引
  const targetIndex = notes.value.findIndex((note) => note.id === targetNoteId.value)
  console.log('目标笔记索引:', targetIndex, '当前笔记列表长度:', notes.value.length)

  if (targetIndex === -1) {
    console.log('目标笔记不在当前页，尝试加载更多数据')
    // 如果还有更多数据，继续加载
    if (hasMoreNotes.value && !isLoading.value) {
      fetchNotes().then(() => {
        // 加载完成后重试滚动
        nextTick(() => {
          scrollToTargetNote()
        })
      })
    }
    return
  }

  // 计算目标笔记所在的行和列
  const containerWidth = cardGridContainer.value?.clientWidth || 0
  const cardsPerRow = Math.floor(containerWidth / 316) // 300px + 16px gap
  const targetRow = Math.floor(targetIndex / cardsPerRow)
  const rowHeight = cardHeight + 16 // 卡片高度 + 间距

  // 计算目标滚动位置，考虑 padding 和边距
  const targetScrollTop = targetRow * rowHeight

  // 设置滚动位置
  if (cardGridContainer.value) {
    // 先更新 scrollTop 以触发虚拟列表重新渲染
    scrollTop.value = targetScrollTop

    // 等待虚拟列表重新渲染
    nextTick(() => {
      // 确保目标笔记在可视区域内
      const containerHeight = cardGridContainer.value?.clientHeight || 0
      const scrollPosition = Math.max(0, targetScrollTop - containerHeight / 3) // 让目标笔记位于视口上方1/3处

      cardGridContainer.value?.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      })

      // 设置高亮状态
      highlightedNoteId.value = targetNoteId.value

      // 5秒后清除高亮状态
      setTimeout(() => {
        highlightedNoteId.value = null
        targetNoteId.value = null
      }, 5000)
    })
  }
}

// 1. 先定义 filterState
const filterState = reactive({
  cardBoxId: (route.query.box as string) || 'all',
  cardTypes: ((route.query.type as string)?.split(',') || []) as string[],
  tags: ((route.query.tags as string)?.split(',') || []) as string[],
  keyword: (route.query.keyword as string) || '',
  isFlashcard: route.query.isFlashcard === 'true' || undefined,
  sort: (() => {
    // 优先使用URL参数
    if (route.query.sort && route.query.order) {
      const order = route.query.order as string
      // 验证 order 的值是否合法
      if (order !== 'asc' && order !== 'desc') {
        return {
          field: route.query.sort as string,
          order: 'asc' as const
        }
      }
      return {
        field: route.query.sort as string,
        order: order as 'asc' | 'desc'
      }
    }
    // 其次使用本地存储的偏好
    const savedPreference = getSavedSortPreference()
    if (savedPreference) {
      return savedPreference
    }
    // 最后使用默认值
    return {
      field: 'address',
      order: 'asc' as const
    }
  })()
})

// 2. 然后再定义 watch
watch(
  () => route.query,
  async (query) => {
    if (query.mode === 'context' && query.noteId) {
      isContextMode.value = true
      const noteId = query.noteId as string
      targetNoteId.value = noteId
      highlightedNoteId.value = noteId

      // 重置筛选条件和状态
      filterState.cardBoxId = 'all'
      filterState.tags = []
      filterState.cardTypes = []
      filterState.keyword = ''
      filterState.isFlashcard = undefined

      // 从第一页开始获取，让 fetchNotes 处理页码计算
      currentPage.value = 1
      notes.value = []
      hasMoreNotes.value = true
      await fetchNotes()
    } else {
      isContextMode.value = false
      targetNoteId.value = null
      highlightedNoteId.value = null
    }
  },
  { immediate: true }
)

// 标签列表
const tags = computed(() => {
  const validTags = (tagStore.tags || []).filter((tag) => tag && typeof tag.name === 'string')
  // 按中文名称排序
  return [...validTags].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
})

// 组件挂载时初始化数据
onMounted(async () => {
  // 如果URL没有排序参数,但有保存的排序偏好,则使用保存的偏好并更新URL
  if (!route.query.sort && !route.query.order) {
    const savedPreference = getSavedSortPreference()
    if (savedPreference) {
      filterState.sort = savedPreference
      await updateRouteQuery() // 更新URL参数
    }
  }

  // 然后再执行数据获取
  resetAndFetch()
  // 获取所有标签（扁平列表）
  await tagStore.fetchAllTags()

  // 添加键盘事件监听
  document.addEventListener('keydown', handleKeyDown)

  // 获取容器高度并设置滚动监听
  if (cardGridContainer.value) {
    containerHeight.value = cardGridContainer.value.clientHeight
    cardGridContainer.value.addEventListener('scroll', handleScroll)

    // 监听容器大小变化
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerHeight.value = entry.contentRect.height
        // 当容器大小改变时也检查是否需要加载更多
        checkAndLoadMore()
      }
    })

    resizeObserver.observe(cardGridContainer.value)
  }
})

// 组件卸载时清理
onUnmounted(() => {
  // 移除键盘事件监听
  document.removeEventListener('keydown', handleKeyDown)

  cardGridContainer.value?.removeEventListener('scroll', handleScroll)
})

// 4. 监听路由变化
watch(
  () => route.query,
  (query) => {
    console.log('路由查询参数变化:', route) // 添加这行
    console.log('当前路由完整信息:', {
      fullPath: route.fullPath,
      path: route.path,
      query: route.query,
      params: route.params
    })
    // 更新筛选状态
    filterState.cardBoxId = (query.box as string) || 'all'
    filterState.cardTypes = (query.type as string)?.split(',') || []
    filterState.tags = (query.tags as string)?.split(',') || []
    filterState.keyword = (query.keyword as string) || ''
    filterState.isFlashcard = query.isFlashcard === 'true' || undefined // 添加闪卡状态更新
    filterState.sort.field = (query.sort as string) || 'address'
    filterState.sort.order = (query.order as 'asc' | 'desc') || 'asc'
  }
)

interface QueryParams {
  box?: string
  type?: string
  tags?: string
  keyword?: string
  isFlashcard?: string // 添加闪卡参数类型
  sort?: string
  order?: 'asc' | 'desc'
  page?: string
  [key: string]: string | undefined // 添加索引签名
}

// 5. 更新路由方法
const updateRouteQuery = () => {
  const query = {
    ...route.query,
    box: filterState.cardBoxId === 'all' ? undefined : filterState.cardBoxId,
    type: filterState.cardTypes?.length ? filterState.cardTypes.join(',') : undefined,
    tags: filterState.tags?.length ? filterState.tags.join(',') : undefined,
    keyword: filterState.keyword || undefined,
    isFlashcard: filterState.isFlashcard ? 'true' : undefined, // 添加闪卡参数
    sort: filterState.sort.field,
    order: filterState.sort.order,
    page: currentPage.value.toString()
  } as QueryParams

  // 移除所有 undefined 的参数
  Object.keys(query).forEach((key) => {
    if (query[key] === undefined) {
      delete query[key]
    }
  })

  // 更新路由
  router.push({ query })
}

// 6. 重置并获取数据
const resetAndFetch = async () => {
  currentPage.value = 1
  notes.value = []
  hasMoreNotes.value = true // 重置加载更多状态
  await nextTick()
  fetchNotes()
}

// 8. 监听筛选条件变化
watch(
  filterState,
  () => {
    updateRouteQuery()
  },
  { deep: true }
)

// 组件被激活时触发
onActivated(() => {
  // 如果有路由参数变化，重新获取数据
  if (route.query.box !== filterState.cardBoxId) {
    resetAndFetch()
  }
})

// 组件挂载时，重置分页并获取笔记
onMounted(() => {
  resetPagination()
  fetchNotes()
})

// 选择全部的方法
const selectAll = async () => {
  // 先清除路由参数，触发路由监听
  await router.replace({ query: {} })

  // 然后再重置其他状态
  if (filterStore.activeFilter) {
    filterStore.setActiveFilter(null)
  }

  filterState.cardBoxId = 'all'
  filterState.tags = []
  filterState.cardTypes = []
  filterState.keyword = ''
  filterState.isFlashcard = undefined
  searchQuery.value = ''

  selectedCardBox.value = null
  selectedTag.value = null

  resetAndFetch()
}

// 显示的笔记
// 如果搜索框没有聚焦，则显示所有笔记
// 如果搜索框聚焦，则显示搜索结果
const displayedNotes = computed(() => {
  return notes.value
})

// 搜索功能
const searchQuery = ref(filterState.keyword || '')
const isSearchFocused = ref(false)

// 监听 filterState.keyword 的变化，同步到 searchQuery
watch(
  () => filterState.keyword,
  (newKeyword) => {
    searchQuery.value = newKeyword || ''
  }
)

// 处理搜索
const handleSearch = async () => {
  if (filterState.keyword !== searchQuery.value.trim()) {
    filterState.keyword = searchQuery.value.trim()
    await resetAndFetch()
  }
}

// 清空搜索
const clearSearch = () => {
  searchQuery.value = ''
  filterState.keyword = ''
  resetAndFetch()
}

// 监听键盘事件，设置搜索框聚焦快捷键
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
  } else if (event.key === 'Escape' && isSearchFocused.value) {
    clearSearch()
    // 在清空搜索后让搜索框重新获得焦点
    nextTick(() => {
      const searchInput = document.querySelector('.search-box input') as HTMLInputElement
      if (searchInput) {
        searchInput.focus()
      }
    })
  }
}

// 重置分页
const resetPagination = () => {
  currentPage.value = 1
}

// 设置事件总线，用于监听笔记更新和创建事件
const noteUpdatedBus = useEventBus<Note>('note-updated')
const eventBusCreated = useEventBus('note-created')
const eventBusDeleted = useEventBus('note-deleted')
const eventBusEmptyNotesMovedToTrash = useEventBus('empty-notes-moved-to-trash')
const eventBusNoteRestored = useEventBus('note-restored')
const taskUpdatedBus = useEventBus<string>('task-updated')
const notesDeletedBus = useEventBus('notes-deleted')

// 监听批量软删除事件
notesDeletedBus.on(() => {
  console.log('CardBoxView.vue→ 监听到笔记批量软删除事件')
  resetPagination()
  fetchNotes()
  noteStore.toggleMultiSelectMode()
})

eventBusNoteRestored.on(() => {
  console.log('CardBoxView.vue→ 监听到笔记从回收站恢复事件')
  resetPagination()
  fetchNotes()
})

eventBusEmptyNotesMovedToTrash.on(() => {
  console.log('CardBoxView.vue→ 监听到空笔记移到回收站事件')
  resetPagination()
  fetchNotes()
})

// 监听笔记更新事件
noteUpdatedBus.on((updatedNote) => {
  console.log('TimelineView.vue→ 监听到笔记更新事件', updatedNote)
  if (!updatedNote) return
  updateSingleNote(updatedNote)
})

taskUpdatedBus.on(async (noteId) => {
  const noteToUpdate = displayedNotes.value.find((note) => note.id === noteId)
  if (!noteToUpdate) return

  try {
    const updatedNote = await noteStore.fetchNoteById(noteId)
    if (updatedNote) {
      await updateSingleNote(updatedNote)
    }
  } catch (error) {
    console.error('更新笔记失败:', error)
  }
})
// 更新单个笔记的函数

const updateSingleNote = async (updatedNote: Note) => {
  if (!updatedNote) return

  await nextTick(() => {
    // 更新源数据
    const index = notes.value.findIndex((note) => note.id === updatedNote.id)
    if (index !== -1) {
      const updatedNotes = [...notes.value]
      updatedNotes[index] = { ...updatedNotes[index], ...updatedNote }

      // 如果当前是按地址排序，且更新包含地址字段，则重新排序
      if (filterState.sort.field === 'address' && 'address' in updatedNote) {
        updatedNotes.sort((a, b) => {
          const result = compareAddress(a.address, b.address)
          return filterState.sort.order === 'asc' ? result : -result
        })
      }

      notes.value = updatedNotes
    }
  })
}

// 监听笔记创建事件
eventBusCreated.on(async () => {
  const createdNote = lastCreatedNote.value
  if (!createdNote) return
  await nextTick(() => {
    notes.value = [...notes.value, createdNote]
  })
})

// 监听笔记删除事件
eventBusDeleted.on(async () => {
  const deletedNote = lastDeletedNote.value
  if (!deletedNote) return
  await nextTick(() => {
    notes.value = notes.value.filter((note) => note.id !== deletedNote.id)
  })
})

// 监听闪卡转换事件
const flashcardConvertedBus = useEventBus<string | 'batch'>('flashcard-converted')
flashcardConvertedBus.on(async (payload) => {
  if (payload === 'batch') {
    // 批量转换，直接重新获取数据
    await resetAndFetch()
  } else {
    // 单个笔记转换，更新单个笔记
    const noteToUpdate = displayedNotes.value.find((note) => note.id === payload)
    if (noteToUpdate) {
      try {
        const updatedNote = await noteStore.fetchNoteById(payload)
        if (updatedNote) {
          updateSingleNote(updatedNote)
        }
      } catch (error) {
        console.error('更新笔记失败:', error)
      }
    }
  }
})

// 在组件挂载时，初始化笔记数据
onMounted(async () => {
  document.addEventListener('click', handleGlobalClick)
})

// 排序选项功能
const sortOptions = [
  { value: 'address', label: '按名称排序' },
  { value: 'createdAt', label: '按创建时间排序' },
  { value: 'updatedAt', label: '按更新时间排序' }
]

// 计算当前排序状态
const currentSort = computed({
  get: () => filterState.sort.field,
  set: (value) => {
    filterState.sort.field = value
  }
})

const sortDirection = computed({
  get: () => filterState.sort.order,
  set: (value) => {
    filterState.sort.order = value as 'asc' | 'desc'
  }
})

const toggleSortMenu = (event: MouseEvent) => {
  event.stopPropagation()
  showSortMenu.value = !showSortMenu.value
}

const selectSortOption = async (option: { value: string; label: string }) => {
  if (currentSort.value === option.value) {
    // 如果点击当前排序字段,切换排序方向
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    // 如果选择新的排序字段,设置字段并默认使用降序
    currentSort.value = option.value
    sortDirection.value = 'desc'
  }

  // 保存排序偏好
  saveSortPreference({
    field: currentSort.value,
    order: sortDirection.value as 'asc' | 'desc'
  })

  showSortMenu.value = false
  await resetAndFetch()
}

// const currentSortLabel = computed(() => {
//   const option = sortOptions.find((opt) => opt.value === currentSort.value)
//   return option ? option.label : '排序'
// })

let deleteTimeout: ReturnType<typeof setTimeout> | null = null

// 监听可能影响过滤结果的变量
// watch(
//   [selectedCardBox, selectedCardTypes, currentSort, sortDirection, isInboxSelected],
//   () => {
//     console.log('Filter conditions changed, resetting and fetching notes')
//     currentPage.value = 1
//     notes.value = []
//     if (isInboxSelected.value) {
//       fetchInboxNotes()
//     } else {
//       fetchNotes()
//     }
//   },
//   { deep: true }
// )

// 卡片盒选择
const cardBoxes = computed(() => {
  const validCardBoxes = (noteStore.cardBoxes || []).filter(
    (box) => box && typeof box.name === 'string'
  )
  const sortedCardBoxes = [...validCardBoxes].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))

  return sortedCardBoxes
})

// 选择卡片盒的方法
const selectCardBox = async (box: CardBox | { id: string; name: string }) => {
  // 先更新选中的卡片盒
  selectedCardBox.value = box.id === 'all' || box.id === 'inbox' ? null : (box as CardBox)

  // 更新过滤状态
  filterState.cardBoxId = box.id

  // 关闭下拉菜单
  showCardBoxMenu.value = false

  // 重新获取数据
  await resetAndFetch()
}

// 卡片盒下拉项中的更多操作
const toggleMoreActions = (id: string, event: MouseEvent) => {
  event.stopPropagation()
  if (showMoreActions.value === id) {
    showMoreActions.value = null
  } else {
    showMoreActions.value = id
    const target = event.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()

    moreActionsMenuStyle.value = {
      position: 'fixed',
      top: `${rect.top - 16}px`,
      left: `${rect.right - 230}px`,
      zIndex: 1001
    }
  }
}

// 获取卡片盒
const getCardBoxById = (id: string | null) => {
  if (id === null) return null
  return cardBoxes.value.find((box) => box.id === id)
}

// 编辑卡片盒
const editCardBox = (box: CardBox | null | undefined) => {
  if (box) {
    openCardBoxModal(box)
    // 关闭编辑菜单
    showMoreActions.value = null
  }
}

// 删除卡片盒
const deleteCardBox = async (id: string | null) => {
  if (id === null) return

  if (!isConfirmingDelete.value) {
    isConfirmingDelete.value = true
    deleteTimeout = setTimeout(() => {
      isConfirmingDelete.value = false
      showMoreActions.value = null
    }, 3000)
  } else {
    try {
      await noteStore.deleteCardBox(id)
      await noteStore.fetchAllNotes()

      // 如果删除的是当前选中的卡片盒，重置选择
      if (selectedCardBox.value?.id === id) {
        selectCardBox(cardBoxes.value[0])
      }

      console.log('删除卡片盒成功:', id)

      showMoreActions.value = null
    } catch (error) {
      console.error('删除卡片盒失败:', error)
    } finally {
      isConfirmingDelete.value = false
      if (deleteTimeout) {
        clearTimeout(deleteTimeout)
        deleteTimeout = null
      }
    }
  }
}

// 全局点击事件，关闭下拉菜单
const handleGlobalClick = (event: MouseEvent) => {
  // const cardTypeDropdown = document.querySelector('.cardtype-dropdown')
  const cardBoxDropdown = document.querySelector('.cardbox-dropdown')
  const sortDropdown = document.querySelector('.sort-button-container')

  if (showCardBoxMenu.value && cardBoxDropdown && !cardBoxDropdown.contains(event.target as Node)) {
    showCardBoxMenu.value = false
  }
  if (showSortMenu.value && sortDropdown && !sortDropdown.contains(event.target as Node)) {
    showSortMenu.value = false
  }

  showMoreActions.value = null
}

const openCardBoxModal = (boxOrEvent?: CardBox | MouseEvent) => {
  if (boxOrEvent && 'id' in boxOrEvent) {
    editingCardBox.value = { ...boxOrEvent, name: boxOrEvent.name || '' }
    isEditing.value = true
  } else {
    editingCardBox.value = { name: '' }
    isEditing.value = false
  }
  showCardBoxModal.value = true
}

const closeCardBoxModal = () => {
  showCardBoxModal.value = false
  editingCardBox.value = { name: '' }
  isEditing.value = false
}

const saveCardBox = async () => {
  if (editingCardBox.value.name && editingCardBox.value.name.trim()) {
    try {
      if (isEditing.value && editingCardBox.value.id) {
        await noteStore.updateCardBox(editingCardBox.value.id, editingCardBox.value.name.trim())
      } else {
        await noteStore.createCardBox(editingCardBox.value.name.trim())
      }
      await noteStore.fetchCardBoxes()
      closeCardBoxModal()
    } catch (error) {
      console.error(isEditing.value ? '更新卡片盒失败:' : '创建卡片盒失败:', error)
      alert(isEditing.value ? '更新卡片盒失败' : '创建卡片盒失败')
    }
  }
}

// 标签相关功能
// 标签相关状态
const selectedTag = ref<Tag | null>(null)
// 选择标签的方法
const selectTag = async (tag: Tag | { id: string; name: string }) => {
  selectedTag.value = tag.id === 'all' || tag.id === 'none' ? null : (tag as Tag)

  // 更新标签筛选状态
  if (tag.id === 'all') {
    // 选择"所有标签"时，传递 ['all']
    filterState.tags = ['all']
  } else if (tag.id === 'none') {
    // 选择"无标签"时
    filterState.tags = ['none']
  } else {
    // 选择单个标签时
    filterState.tags = [tag.id]
  }

  await resetAndFetch()
}

// 关闭筛选规则对话框
const handleCloseFilterDialog = () => {
  filterStore.closeFilterDialog()
}

// 保存筛选规则
const handleSaveFilter = async (data: CreateCustomFilterInput | UpdateCustomFilterInput) => {
  try {
    if (filterStore.dialogState.editingFilter) {
      await filterStore.updateFilter(
        filterStore.dialogState.editingFilter.id,
        data as UpdateCustomFilterInput
      )
    } else {
      await filterStore.createFilter(data as CreateCustomFilterInput)
    }
    filterStore.closeFilterDialog()
    message.success('保存成功')
  } catch (error) {
    console.error('保存筛选规则失败:', error)
    message.error('保存失败')
  }
}
// 处理自定义筛选
const handleCustomFilter = async () => {
  // 清空其他筛选条件
  filterState.cardBoxId = 'all'
  filterState.tags = []
  filterState.cardTypes = []
  selectedCardBox.value = null
  selectedTag.value = null

  // 重新获取笔记
  await resetAndFetch()
}

// 处理重置筛选
const handleResetFilter = async () => {
  await resetAndFetch()
}

// 处理闪卡筛选变化
const handleFlashcardFilterChange = (value: boolean | undefined) => {
  filterState.isFlashcard = value ? true : undefined
  resetAndFetch()
}

// 多选相关方法
const toggleMultiSelect = () => {
  if (noteStore.isMultiSelectMode) {
    // 退出多选模式时清空最后选中的笔记ID
    lastSelectedNoteId.value = null
  }
  noteStore.toggleMultiSelectMode()
}

// 添加处理Shift键多选的方法
const handleNoteShiftSelect = (noteId: string, shiftKey: boolean) => {
  if (!noteStore.isMultiSelectMode || !shiftKey || !lastSelectedNoteId.value) {
    // 如果不是多选模式，或者没有按住Shift键，或者没有上一次选中的笔记
    // 则只记录当前选中的笔记ID
    lastSelectedNoteId.value = noteId
    return false
  }

  // 查找上一次选中的笔记和当前选中的笔记的索引
  const lastIndex = notes.value.findIndex((note) => note.id === lastSelectedNoteId.value)
  const currentIndex = notes.value.findIndex((note) => note.id === noteId)

  if (lastIndex === -1 || currentIndex === -1) return false

  // 确定开始和结束索引（可能是从下往上选的）
  const startIndex = Math.min(lastIndex, currentIndex)
  const endIndex = Math.max(lastIndex, currentIndex)

  // 选中两个索引之间的所有笔记
  for (let i = startIndex; i <= endIndex; i++) {
    noteStore.selectNote(notes.value[i].id, true) // 添加到已选中列表，不切换状态
  }

  // 更新最后选中的笔记ID
  lastSelectedNoteId.value = noteId
  return true
}

// 将这个方法提供给子组件
const provideShiftSelect = {
  handleNoteShiftSelect
}

// 添加样式计算属性
const cardGridStyles = computed(() => ({
  height: `${viewportInfo.value.totalHeight}px`,
  paddingTop: `${viewportInfo.value.paddingTop}px`,
  transform: 'translate3d(0, 0, 0)', // 启用GPU加速
  backfaceVisibility: 'hidden' as const,
  perspective: '1000px'
}))

// 在生命周期钩子或适当位置添加provide
provide('provideShiftSelect', provideShiftSelect)
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
    padding-bottom: 8px;
    border-bottom: 1px solid var(--color-border);
    flex-wrap: wrap; // 关键:允许元素换行
    gap: 8px; // 设置行间距
  }
}
.topToolBar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  overflow-x: auto;
  min-width: 300px; // 设置最小宽度,防止过度挤压
  padding: 4px;

  &::-webkit-scrollbar {
    display: none;
  }
  :deep(.ant-btn) {
    &.active {
      background: rgba(var(--color-primary-rgb), 0.1);
      border-color: var(--color-primary);
      color: var(--color-primary);

      .button-icon {
        color: var(--color-primary);
      }
    }
  }
}
.topToolBar-right {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-left: auto; // 让右侧工具靠右对齐
  @media screen and (max-width: 768px) {
    width: 100%; // 在窄屏时占满整行
    justify-content: flex-end; // 靠右对齐
  }

  .inbox-button {
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

    &.active {
      border: 1px solid var(--color-primary);
    }

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
  }

  .sort-button-container {
    display: flex;
    align-items: center;
    position: relative;

    :deep(.ant-btn) {
      width: 100%;
    }

    .sort-dropdown-menu {
      position: absolute;
      top: 100%;
      right: 0;
      background-color: var(--color-bg-primary);
      border-radius: 8px;
      box-shadow: var(--shadow-primary);
      z-index: 1000;
      min-width: 200px;
      width: auto;
      overflow-y: auto;
      padding: 6px 0;
      white-space: nowrap;
      margin-top: 4px;
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
}

.cardbox-view-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px);
  overflow: hidden;
  position: relative;

  .card-grid-container {
    flex: 1;
    overflow-y: auto;
    position: relative;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -90%);
    width: 100%;
    text-align: center;
    padding: 20px;

    .empty-icon {
      width: 300px;
      height: 300px;
    }

    .empty-text {
      color: var(--color-text-secondary);
      font-size: 14px;
      text-align: center;
    }
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
    padding: 16px 20px;
    align-content: start;
    justify-content: center;
    position: relative;
    will-change: transform; // 优化性能
    margin-top: 16px;

    .card-item {
      height: 300px;
      transition: all 0.3s ease;

      &.highlight {
        box-shadow: 0 0 0 2px var(--color-primary);
        transform: scale(1.02);
        z-index: 1;
      }
    }
  }
  .card-list-enter-active,
  .card-list-leave-active {
    transition: all 0.2s ease;
  }

  .card-list-enter-from,
  .card-list-leave-to {
    opacity: 0;
    // transform: translateY(30px);
  }

  // .card-list-move {
  //   transition: transform 0.3s ease;
  // }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;

    .modal-content {
      background-color: var(--color-bg-primary);
      padding: 20px;
      border-radius: 10px;
      width: 300px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

      h2 {
        margin-top: 0;
        margin-bottom: 20px;
        font-size: 18px;
        text-align: center;
        color: var(--color-text-primary);
      }

      input {
        width: 100%;
        padding: 10px;
        margin-bottom: 20px;
        border: 1px solid var(--color-primary);
        border-radius: 5px;
        font-size: 16px;

        &:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px rgba(var(--color-primary), 0.2);
        }
      }

      .modal-actions {
        display: flex;
        justify-content: center;

        button {
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          background-color: var(--color-primary);
          color: var(--color-bg-primary);
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.3s;

          &:disabled {
            background-color: #ccc;
            cursor: not-allowed;
          }
        }
      }
    }
  }
}

//卡片盒的更多操作菜单
.more-actions-menu {
  position: fixed; // 改回 fixed
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 1002;
  min-width: max-content;
  width: 140px;
  max-width: 200px;
  padding: 6px 12px;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.2s ease,
    visibility 0.2s ease;

  &.show {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  .more-action-item {
    display: flex;
    align-items: center;
    // width: 200px;
    padding: 4px;
    border: none;
    background: none;
    cursor: pointer;
    transition: background-color 0.2s;
    border-radius: 8px;
    // margin: 2px 8px;

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
      padding: 0;
      margin-right: 2px;

      // 新增以下样式来处理 i-icon 类
      :deep(.i-icon) {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        flex-shrink: 0; // 防止图标缩小
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

      &.delete {
        color: var(--color-danger);
      }
    }

    &:hover {
      background-color: var(--color-hover-bg);
    }

    &.delete {
      color: var(--color-danger);
    }
  }
}

.sort-direction {
  font-size: 12px;
  margin-left: 5px;
}

.observer-target {
  height: 20px;
  width: 100%;
  background-color: red;
}
.content-container {
  position: relative; /* 添加这行 */
  flex: 1;
  overflow: hidden;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  overflow: hidden;
  padding: 4px;
}

.topToolBar-right {
  .ant-btn {
    &.active {
      background: rgba(var(--color-primary-rgb), 0.1);
      border-color: var(--color-primary);
      color: var(--color-primary);

      .button-icon {
        color: var(--color-primary);
      }
    }
  }
}
</style>
