<template>
  <div class="cardbox-view">
    <div class="fixed-header">
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>
      <div class="topToolBar">
        <div class="topToolBar-header">
          <div class="topToolBar-left">
            <!-- 全部按钮 -->
            <div
              class="all-button"
              :class="{ active: filterState.cardBoxId === 'all' }"
              @click="selectAll"
            >
              <div class="icon">
                <Box
                  theme="outline"
                  size="18"
                  fill="var(--color-icon-menu-default)"
                  :strokeWidth="3"
                />
              </div>
              <div class="name">全部</div>
            </div>
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
            <div
              v-tooltip.bottom="{ content: 'Cmd+P', delay: { show: 1000 } }"
              class="search-box"
              :class="{ 'is-focused': isSearchFocused }"
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
                @input="debouncedSearch"
                @focus="isSearchFocused = true"
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
            </div>
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
                    fill="var(--color-icon-menu-default)"
                    :strokeWidth="3"
                  />
                </div>
                <div class="name">编辑</div>
              </div>
              <div class="more-action-item delete" @click.stop="deleteCardBox(showMoreActions)">
                <div class="icon">
                  <Delete
                    theme="outline"
                    size="16"
                    fill="var(--color-text-danger)"
                    :strokeWidth="3"
                  />
                </div>
                <div class="name delete">
                  {{ isConfirmingDelete ? '确认删除' : '删除' }}
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
      <div ref="cardGridContainer" class="card-grid-container">
        <div class="card-grid">
          <CardBoxNoteCard
            v-for="note in displayedNotes"
            :key="`${note.id}-${new Date(note.updatedAt).toISOString()}`"
            v-memo="[note.id, note.createdAt]"
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick, onActivated, reactive } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStores'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import { SortTwo, Box, EditTwo, Delete, Close, Search } from '@icon-park/vue-next'
import { CardBox, Note, Tag } from '@renderer/types/Note'
import CardBoxNoteCard from '@renderer/components/cardbox/CardboxNoteCard.vue'
import { storeToRefs } from 'pinia'
import { useDebounceFn, useEventBus, useThrottleFn } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import { GetPaginatedNotesParams } from '../../../db/notesService'
import CardBoxDropdown from '@renderer/components/cardbox/CardBoxDropdown.vue'
import TagDropdown from '@renderer/components/cardbox/TagDropdown.vue'
import { useTagStore } from '@renderer/stores/tagStore'
import CardTypeDropdown from '@renderer/components/cardbox/CardTypeDropdown.vue'
import CustomFilterDropdown from '@renderer/components/cardbox/CustomFilterDropdown.vue'
import { useFilterStore } from '@renderer/stores/filterStore'
import FilterDialog from '@renderer/components/cardbox/FilterDialog.vue'
import { CreateCustomFilterInput, UpdateCustomFilterInput } from '@renderer/types/Filter'
import { message } from '@renderer/utils/message'

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
const highlightedNoteId = ref<string | null>(null)
const cardGridContainer = ref<HTMLElement | null>(null)
const isLoading = ref(false)
const currentPage = ref(1)
const pageSize = ref(28)
const totalCount = ref(0)
const notes = ref<Note[]>([])
const showSortMenu = ref(false)
const currentSort = ref('address')
const sortDirection = ref('asc')
const hasMoreNotes = ref(true)
const route = useRoute()
const router = useRouter()
const tagStore = useTagStore()

// 标签列表
const tags = computed(() => {
  const validTags = (tagStore.tags || []).filter((tag) => tag && typeof tag.name === 'string')
  // 按中文名称排序
  return [...validTags].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
})

// 组件挂载时初始化数据
onMounted(async () => {
  // 然后再执行数据获取
  resetAndFetch()
  // 获取所有标签（扁平列表）
  await tagStore.fetchAllTags()

  // 添加事件监听器
  document.addEventListener('click', handleGlobalClick)
  document.addEventListener('keydown', handleKeyDown)
  cardGridContainer.value?.addEventListener('scroll', handleScroll)
})

// 组件卸载时清理
onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
  document.removeEventListener('keydown', handleKeyDown)
  cardGridContainer.value?.removeEventListener('scroll', handleScroll)
})

// 3. 筛选状态
const filterState = reactive({
  cardBoxId: (route.query.box as string) || 'all',
  cardTypes: ((route.query.type as string)?.split(',') || []) as string[],
  tags: ((route.query.tags as string)?.split(',') || []) as string[],
  keyword: (route.query.keyword as string) || '',
  sort: {
    field: (route.query.sort as string) || 'updatedAt',
    order: (route.query.order as 'asc' | 'desc') || 'desc'
  }
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
    filterState.sort.field = (query.sort as string) || 'updatedAt'
    filterState.sort.order = (query.order as 'asc' | 'desc') || 'desc'
  }
)

interface QueryParams {
  box?: string
  type?: string
  tags?: string
  keyword?: string
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
  await nextTick() // 确保状态更新
  fetchNotes()
}

// 7. 获取笔记数据
// const fetchNotes = async () => {
//   if (isLoading.value) return

//   isLoading.value = true
//   try {
//     console.log('获取笔记数据，当前筛选状态:', {
//       cardBoxId: filterState.cardBoxId,
//       cardTypes: filterState.cardTypes,
//       tags: filterState.tags,
//       page: currentPage.value
//     })
//     const params: GetPaginatedNotesParams = {
//       page: currentPage.value,
//       limit: pageSize.value,
//       cardBoxId: filterState.cardBoxId,
//       cardTypes: filterState.cardTypes,
//       tags: filterState.tags,
//       keyword: filterState.keyword,
//       sortBy: filterState.sort.field,
//       sortOrder: filterState.sort.order
//     }

//     const result = await noteStore.fetchPaginatedNotesByCardbox(params)

//     if (currentPage.value === 1) {
//       notes.value = result.notes
//     } else {
//       notes.value = [...notes.value, ...result.notes]
//     }

//     totalCount.value = result.totalCount
//     hasMoreNotes.value = notes.value.length < totalCount.value
//     currentPage.value++
//   } catch (error) {
//     console.error('获取笔记失败:', error)
//   } finally {
//     isLoading.value = false
//   }
// }
const fetchNotes = async () => {
  if (isLoading.value) return

  isLoading.value = true
  try {
    const activeFilter = filterStore.activeFilter

    console.log('获取笔记数据，当前筛选状态:', {
      customFilterId: activeFilter?.id,
      cardBoxId: filterState.cardBoxId,
      cardTypes: filterState.cardTypes,
      tags: filterState.tags,
      page: currentPage.value
    })

    const params: GetPaginatedNotesParams = {
      page: currentPage.value,
      limit: pageSize.value,
      cardBoxId: filterState.cardBoxId,
      cardTypes: filterState.cardTypes,
      tags: filterState.tags,
      keyword: filterState.keyword,
      sortBy: filterState.sort.field,
      sortOrder: filterState.sort.order,
      // 如果有激活的自定义筛选规则，添加 customFilterId
      customFilterId: activeFilter?.id
    }

    const result = await noteStore.fetchPaginatedNotesByCardbox(params)

    if (currentPage.value === 1) {
      notes.value = result.notes
    } else {
      notes.value = [...notes.value, ...result.notes]
    }

    totalCount.value = result.totalCount
    hasMoreNotes.value = notes.value.length < totalCount.value
    currentPage.value++
  } catch (error) {
    console.error('获取笔记失败:', error)
  } finally {
    isLoading.value = false
  }
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
const selectAll = () => {
  filterState.cardBoxId = 'all'
  selectedCardBox.value = null
  filterState.tags = []
  // 清空自定义筛选规则
  filterStore.setActiveFilter(null)
  resetAndFetch()
}

// 显示的笔记
// 如果搜索框没有聚焦，则显示所有笔记
// 如果搜索框聚焦，则显示搜索结果
const displayedNotes = computed(() => {
  if (searchQuery.value.trim() === '') {
    return notes.value
  }
  return searchResults.value
})

// 搜索功能
const searchQuery = ref('')
const isSearchFocused = ref(false)
const searchResults = ref<Note[]>([])

// 使用防抖函数优化搜索性能
const debouncedSearch = useDebounceFn(async () => {
  if (searchQuery.value.trim() === '') {
    searchResults.value = []
    return
  }
  const results = await noteStore.searchNotesList(searchQuery.value)
  if (results) {
    searchResults.value = results
  }
}, 300)

// 搜索框失去焦点
const handleBlur = () => {
  setTimeout(() => {
    isSearchFocused.value = false
  }, 100)
}
// 清空搜索
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
  } else if (event.key === 'Escape') {
    clearSearch()
  }
}
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

// 重置分页
const resetPagination = () => {
  currentPage.value = 1
}

// 滚动加载更多笔记
const handleScroll = useThrottleFn(() => {
  if (cardGridContainer.value) {
    const { scrollTop, scrollHeight, clientHeight } = cardGridContainer.value
    // 增加判断条件，防止重复加载
    if (
      scrollHeight - scrollTop - clientHeight < 1000 &&
      !isLoading.value &&
      hasMoreNotes.value &&
      notes.value.length < totalCount.value
    ) {
      console.log('滚动触发，加载更多笔记')

      fetchNotes()
    }
  }
}, 300)

onMounted(() => {
  cardGridContainer.value?.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  cardGridContainer.value?.removeEventListener('scroll', handleScroll)
})

// 设置事件总线，用于监听笔记更新和创建事件
const noteUpdatedBus = useEventBus<Note>('note-updated')
const eventBusCreated = useEventBus('note-created')
const eventBusDeleted = useEventBus('note-deleted')
const eventBusEmptyNotesMovedToTrash = useEventBus('empty-notes-moved-to-trash')
const eventBusNoteRestored = useEventBus('note-restored')
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
// 更新单个笔记的函数
const updateSingleNote = (updatedNote: Note) => {
  if (!updatedNote) return
  // 如果日历被选择了，则更新filteredNotes
  const index = displayedNotes.value.findIndex((note) => note.id === updatedNote.id)
  if (index !== -1) {
    displayedNotes.value[index] = { ...displayedNotes.value[index], ...updatedNote }
  }
}
// 监听笔记创建事件
eventBusCreated.on(() => {
  console.log('TimelineView.vue→ 监听到笔记创建事件', lastCreatedNote.value)
  if (!lastCreatedNote.value) return
  displayedNotes.value.push(lastCreatedNote.value)
})

// 监听笔记删除事件
eventBusDeleted.on(() => {
  console.log('TimelineView.vue→ 监听到笔记删除事件', lastDeletedNote.value)
  if (!lastDeletedNote.value) return
  // 如果删除的笔记在notes中，则删除
  const index = displayedNotes.value.findIndex((note) => note.id === lastDeletedNote.value?.id)
  if (index !== -1) {
    displayedNotes.value.splice(index, 1)
  }
})

// 滚动到高亮笔记
const scrollToHighlightedNote = async () => {
  if (highlightedNoteId.value) {
    for (let i = 0; i < 5; i++) {
      // 尝试5次
      await new Promise((resolve) => setTimeout(resolve, 100)) // 等待100ms
      const highlightedElement = document.getElementById(`note-${highlightedNoteId.value}`)
      if (highlightedElement && cardGridContainer.value) {
        const containerRect = cardGridContainer.value.getBoundingClientRect()
        const elementRect = highlightedElement.getBoundingClientRect()
        const scrollTop =
          elementRect.top - containerRect.top + cardGridContainer.value.scrollTop - 20
        cardGridContainer.value.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        })
        break
      }
    }
    // 添加一个小延迟后清除高亮ID
    setTimeout(() => {
      highlightedNoteId.value = null
      router.replace({ query: {} })
      // 清除 noteStore 中的高亮笔记
      noteStore.clearHighlightedNoteId()
    }, 2000) // 2秒后清除高亮状态
  }
}

// 搜索高亮事件
const handleSearchHighlight = (noteId: string) => {
  highlightedNoteId.value = noteId
  scrollToHighlightedNote()
}

// 在组件挂载时，初始化笔记数据
onMounted(async () => {
  document.addEventListener('click', handleGlobalClick)
})

// 监听搜索高亮事件的事件总线
const searchHighlightEventBus = useEventBus('search-highlight')
searchHighlightEventBus.on((noteId: any) => {
  handleSearchHighlight(noteId)
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
  resetPagination()
  fetchNotes()
}

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
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

    moreActionsMenuStyle.value = {
      top: `${rect.bottom + scrollTop}px`,
      left: `${rect.left + scrollLeft}px`
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
// 选择标签的方法
const selectTag = async (tag: Tag | { id: string; name: string }) => {
  selectedTag.value = tag.id === 'all' || tag.id === 'none' ? null : (tag as Tag)

  // 更新标签筛选状态
  if (tag.id === 'all') {
    // 所有标签：筛选所有有标签的笔记
    filterState.tags = tags.value.map((t: Tag) => t.id)
  } else if (tag.id === 'none') {
    // 无标签：清空标签筛选
    filterState.tags = ['none'] // 后端需要特殊处理这个值
  } else {
    // 选择特定标签
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
  display: flex;
  align-items: center;
  gap: 8px;
  .all-button {
    display: flex;
    align-items: center;
    padding: 4px 10px 4px 4px;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    user-select: none;

    &:hover {
      background-color: var(--color-hover-bg);
    }
    .icon {
      background: none;
      border: none;
      cursor: pointer;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      padding: 0;

      :deep(.i-icon) {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }

      :deep(svg) {
        width: 15px;
        height: 15px;
      }
    }

    .name {
      flex-grow: 0;
      text-align: left;
      color: var(--default-text-color);
      font-size: 14px;
      font-weight: 400;
      white-space: nowrap;
      writing-mode: horizontal-tb;
      line-height: 1;
    }

    &.active {
      background-color: var(--color-hover-bg);
    }

    .icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      margin-right: 4px;
    }

    .name {
      font-size: 14px;
      color: var(--color-text-primary);
    }
  }
}
.topToolBar-right {
  display: flex;
  gap: 8px;
  align-items: center;

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
    padding: 4px 10px 4px 4px;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    user-select: none;

    .icon {
      background: none;
      border: none;
      cursor: pointer;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all 0.2s ease;
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
        width: 15px; // 或者您想要的大小
        height: 15px; // 或者您想要的大小
      }
    }

    .name {
      flex-grow: 0;
      text-align: left;
      color: var(--color-text-primary);
      font-size: 14px;
      white-space: nowrap; // 防止文字换行
      writing-mode: horizontal-tb; // 确保文字是水平排列的
      margin-left: 3px;
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
      top: 100%;
      // left: -10px;
      right: 20px;
      background-color: var(--color-dropdown-bg);
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
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px); // 假设顶部工具栏高度为100px，请根据实际情况调整
  overflow: hidden; // 防止整个页面滚动
  scroll-behavior: smooth; // 添加平滑滚动

  .card-grid-container {
    flex: 1;
    overflow-y: auto; // 允许卡片网格容器滚动
    scroll-behavior: smooth; // 添加平滑滚动
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
      transition: background-color 0.2s;
      padding: 0;
      margin-right: 2px;

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
        color: var(--color-text-danger);
      }
    }

    &:hover {
      background-color: var(--color-hover-bg);
    }

    &.delete {
      color: var(--color-text-danger);
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
</style>
