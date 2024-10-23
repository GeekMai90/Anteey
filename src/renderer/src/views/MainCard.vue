<template>
  <div class="cardbox-view">
    <div class="fixed-header">
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>
      <div class="topToolBar">
        <div class="topToolBar-header">
          <div class="topToolBar-left">
            <div class="icon">
              <Notes theme="outline" size="20" fill="var(--color-primary)" :strokeWidth="3" />
            </div>
            <div class="name">主要卡片</div>
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
            <!-- 收件箱 -->
            <div class="inbox-button" :class="{ active: isInboxSelected }" @click="toggleInbox">
              <div class="icon">
                <InboxIn
                  theme="outline"
                  size="18"
                  fill="var(--color-icon-menu-default)"
                  :strokeWidth="3"
                />
              </div>
              <div class="name">收件箱</div>
            </div>
            <!-- 卡片柜 -->
            <div ref="cardboxDropdown" class="cardbox-dropdown" @click.stop="toggleCardBoxMenu">
              <div class="icon">
                <FileCabinet
                  theme="outline"
                  size="18"
                  fill="var(--color-icon-menu-default)"
                  :strokeWidth="3"
                />
              </div>
              <div class="name">{{ selectedCardBoxName }}</div>
              <!-- 卡片柜下拉菜单 -->
              <div
                v-if="showCardBoxMenu"
                class="dropdown-menu"
                :class="{ show: showCardBoxMenu }"
                :style="dropdownMenuStyle"
              >
                <div
                  v-for="box in cardBoxes"
                  :key="box.id"
                  class="dropdown-item"
                  :class="{ active: selectedCardBox && selectedCardBox.id === box.id }"
                  @click.stop="selectCardBox(box)"
                >
                  <div class="dropdown-item-content">
                    <div class="icon">
                      <component
                        :is="box.id === '0000' ? FileCabinet : Box"
                        theme="outline"
                        size="18"
                        fill="var(--color-icon-menu-default)"
                        :strokeWidth="3"
                      />
                    </div>
                    <div class="name">
                      {{ box.name }}
                    </div>
                  </div>
                  <div v-if="box.id !== '0000'" class="dropdown-item-actions">
                    <button
                      class="more-actions-btn"
                      @click.stop="toggleMoreActions(box.id, $event)"
                    >
                      <div class="icon">
                        <More
                          theme="outline"
                          size="18"
                          fill="var(--color-icon-menu-default)"
                          :strokeWidth="3"
                        />
                      </div>
                    </button>
                  </div>
                </div>
                <div class="dropdown-divider"></div>
                <div class="dropdown-item add-cardbox" @click.stop="openCardBoxModal">
                  <div class="dropdown-item-content">
                    <div class="icon">
                      <Plus
                        theme="outline"
                        size="18"
                        fill="var(--color-icon-menu-default)"
                        :strokeWidth="3"
                      />
                    </div>
                    <div class="name">新增卡片盒</div>
                  </div>
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
            <!-- 卡片类型 -->
            <!-- <div class="cardtype-dropdown" @click.stop="toggleCardTypeMenu">
              <div class="icon">
                <BankCardTwo
                  theme="outline"
                  size="18"
                  fill="var(--color-icon-menu-default)"
                  :strokeWidth="3"
                />
              </div>
              <div class="name">卡片类型</div>
              <div v-if="showCardTypeMenu" class="cadrtype-dropdown-menu" @click.stop>
                <div v-for="type in cardTypes" :key="type.value" class="cadrtype-dropdown-item">
                  <div class="cadrtype-dropdown-item-content">
                    <div class="icon">
                      <component
                        :is="type.icon"
                        theme="outline"
                        size="18"
                        fill="var(--color-icon-menu-default)"
                        :strokeWidth="3"
                      />
                    </div>
                    <div class="name">
                      {{ type.label }}
                    </div>
                  </div>
                  <label class="switch">
                    <input
                      type="checkbox"
                      :checked="selectedCardTypes.includes(type.value)"
                      @change="toggleCardType(type.value)"
                    />

                    <span class="slider round"></span>
                  </label>
                </div>
              </div>
            </div> -->
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useNoteStore } from '../stores/noteStores'
import AppToolbar from '../components/AppToolbar.vue'
import {
  SortTwo,
  InboxIn,
  Box,
  More,
  EditTwo,
  Delete,
  FileCabinet,
  Plus,
  Search,
  Close,
  Notes
} from '@icon-park/vue-next'
import { CardBox, Note } from '../types/Note'
import CardBoxNoteCard from '../components/CardboxNoteCard.vue'
import { storeToRefs } from 'pinia'
// import { useCardBoxSearch } from '../composables/useCardBoxSearch'
import { useDebounceFn, useEventBus, useThrottleFn } from '@vueuse/core'
import { useRouter } from 'vue-router'
import { GetPaginatedNotesParams } from '../../../db/notes'

const noteStore = useNoteStore()

const { selectedCardTypes, lastUpdatedNote, lastCreatedNote, lastDeletedNote } =
  storeToRefs(noteStore)
const showCardBoxMenu = ref(false)
const selectedCardBox = ref<CardBox | null>(null)
const showMoreActions = ref<string | null>(null)
const showCardBoxModal = ref(false)
const isEditing = ref(false)
const editingCardBox = ref<Partial<CardBox>>({ name: '' })
const moreActionsMenuStyle = ref({})
const isConfirmingDelete = ref(false)

const highlightedNoteId = ref<string | null>(null)
// const route = useRoute()
const router = useRouter()

const cardGridContainer = ref<HTMLElement | null>(null)
const isLoading = ref(false)

const currentPage = ref(1)
const pageSize = ref(21)
const totalCount = ref(0)
const notes = ref<Note[]>([])
const showSortMenu = ref(false)
const currentSort = ref('address')
const sortDirection = ref('asc')
const hasMoreNotes = ref(true)

// 获取所有卡片盒笔记
const fetchNotes = async () => {
  if (isLoading.value) return

  isLoading.value = true
  console.log('Fetching notes, page:', currentPage.value)
  try {
    const params: GetPaginatedNotesParams = {
      page: currentPage.value,
      limit: pageSize.value,
      cardBoxId: selectedCardBox.value?.id || 'all',
      cardTypes: ['Maincard'],
      sortBy: currentSort.value,
      sortOrder: sortDirection.value as 'asc' | 'desc'
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
    console.log('Fetched notes:', result.notes.length, 'Total:', totalCount.value)
  } catch (error) {
    console.error('获取笔记失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 显示的笔记
// 如果搜索框没有聚焦，则显示所有笔记
// 如果搜索框聚焦，则显示搜索结果
const displayedNotes = computed(() => {
  if (searchQuery.value.trim() === '') {
    return notes.value
  }
  return searchResults.value.filter((note) => note.cardType === 'Maincard')
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

watch(
  [selectedCardBox, selectedCardTypes, currentSort, sortDirection],
  () => {
    currentPage.value = 1
    fetchNotes()
  },
  { deep: true }
)

onMounted(() => {
  resetPagination()
  fetchNotes()
})

// 监听筛选条件变化
watch(
  [selectedCardBox, selectedCardTypes, currentSort, sortDirection],
  () => {
    console.log('Filter conditions changed, resetting and fetching notes')
    resetPagination()
    notes.value = []
    fetchNotes()
  },
  { deep: true }
)

// 滚动加载更多笔记
const handleScroll = useThrottleFn(() => {
  if (cardGridContainer.value) {
    const { scrollTop, scrollHeight, clientHeight } = cardGridContainer.value
    if (scrollHeight - scrollTop - clientHeight < 800 && !isLoading.value && hasMoreNotes.value) {
      console.log('滚动触发，加载更多笔记')
      if (isInboxSelected.value) {
        fetchInboxNotes()
      } else {
        fetchNotes()
      }
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
const eventBus = useEventBus('note-updated')
const eventBusCreated = useEventBus('note-created')
const eventBusDeleted = useEventBus('note-deleted')
const eventBusEmptyNotesMovedToTrash = useEventBus('empty-notes-moved-to-trash')
const eventBusNoteRestored = useEventBus('note-restored')
eventBusNoteRestored.on(() => {
  console.log('MainCard.vue→ 监听到笔记从回收站恢复事件')
  resetPagination()
  fetchNotes()
})

eventBusEmptyNotesMovedToTrash.on(() => {
  console.log('MainCard.vue→ 监听到空笔记移到回收站事件')
  resetPagination()
  fetchNotes()
})

// 监听笔记更新事件
eventBus.on(() => {
  console.log('TimelineView.vue→ 监听到笔记更新事件', lastUpdatedNote.value)
  if (!lastUpdatedNote.value) return
  updateSingleNote(lastUpdatedNote.value)
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

const handleSearchHighlight = (noteId: string) => {
  highlightedNoteId.value = noteId
  scrollToHighlightedNote()
}

// 在组件挂载时，初始化笔记数据
onMounted(async () => {
  // await fetchNotes()
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

// 收件箱功能
const isInboxSelected = ref(false)

const toggleInbox = async () => {
  isInboxSelected.value = !isInboxSelected.value
  currentPage.value = 1
  notes.value = []

  if (isInboxSelected.value) {
    // 获取未分类的笔记
    await fetchInboxNotes()
  } else {
    // 获取所有笔记
    await fetchNotes()
  }
}
const fetchInboxNotes = async () => {
  console.log('Fetching inbox notes, page:', currentPage.value)
  try {
    const params: GetPaginatedNotesParams = {
      page: currentPage.value,
      limit: pageSize.value,
      cardBoxId: 'inbox',
      cardTypes: ['Maincard', 'Bibcard', 'Indexcard'],
      sortBy: 'address',
      sortOrder: 'asc'
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
    console.log('Fetched notes:', result.notes.length, 'Total:', totalCount.value)
  } catch (error) {
    console.error('获取笔记失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 卡片柜
const cardBoxes = computed(() => {
  const allCardsOption: CardBox = {
    id: 'all',
    name: '全部卡片',
    type: 'cardbox',
    description: '所有卡片',
    createdAt: new Date('2023-01-15T09:00:00Z'),
    updatedAt: new Date('2023-06-20T14:30:00Z'),
    noteIds: [],
    parentId: ''
  }

  const validCardBoxes = (noteStore.cardBoxes || []).filter(
    (box) => box && typeof box.name === 'string'
  )
  const sortedCardBoxes = [...validCardBoxes].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))

  return [allCardsOption, ...sortedCardBoxes]
})

const selectedCardBoxName = computed(() => {
  return selectedCardBox.value ? selectedCardBox.value.name : '全部卡片'
})

// 选择卡片盒进行筛选
const selectCardBox = (box: CardBox | null) => {
  console.log('选择卡片盒:', box?.name)
  selectedCardBox.value = box
  showCardBoxMenu.value = false
  if (box !== null) {
    isInboxSelected.value = false
  }
}

// 监听可能影响过滤结果的变量
watch(
  [selectedCardBox, selectedCardTypes, currentSort, sortDirection, isInboxSelected],
  () => {
    console.log('Filter conditions changed, resetting and fetching notes')
    currentPage.value = 1
    notes.value = []
    if (isInboxSelected.value) {
      fetchInboxNotes()
    } else {
      fetchNotes()
    }
  },
  { deep: true }
)

// 卡片盒下拉项中的更多操作
const toggleMoreActions = (id: string, event: MouseEvent) => {
  event.stopPropagation()
  if (showMoreActions.value === id) {
    showMoreActions.value = null
  } else {
    showMoreActions.value = id
    const target = event.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const scrollTop = window.scrollY
    const scrollLeft = window.scrollX

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

// 打开卡片盒下拉菜单
const cardboxDropdown = ref<HTMLElement | null>(null)
const dropdownMenuStyle = ref({})

const calculateMenuPosition = () => {
  nextTick(() => {
    if (cardboxDropdown.value) {
      const rect = cardboxDropdown.value.getBoundingClientRect()
      dropdownMenuStyle.value = {
        position: 'fixed',
        top: `${rect.bottom + window.scrollY}px`,
        right: `${window.innerWidth - rect.right - window.scrollX}px`,
        left: 'auto', // 移除左侧定位
        minWidth: `${rect.width}px`
      }
    }
  })
}

const toggleCardBoxMenu = (event: MouseEvent) => {
  event.stopPropagation()
  showCardBoxMenu.value = !showCardBoxMenu.value
  if (showCardBoxMenu.value) {
    calculateMenuPosition()
  }
}

// 全局点击事件，关闭下拉菜单
const handleGlobalClick = (event: MouseEvent) => {
  // const cardTypeDropdown = document.querySelector('.cardtype-dropdown')
  const cardBoxDropdown = document.querySelector('.cardbox-dropdown')
  const sortDropdown = document.querySelector('.sort-button-container')

  // if (
  //   showCardTypeMenu.value &&
  //   cardTypeDropdown &&
  //   !cardTypeDropdown.contains(event.target as Node)
  // ) {
  //   showCardTypeMenu.value = false
  // }

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

// 卡片类型下拉菜单
// const cardTypes = [
//   { value: 'Maincard', label: '主要卡片', icon: Notes },
//   { value: 'Indexcard', label: '索引卡片', icon: ListAlphabet },
//   { value: 'Bibcard', label: '文献卡片', icon: Bookshelf }
// ]
// const showCardTypeMenu = ref(false)

// const toggleCardTypeMenu = (event: MouseEvent) => {
//   event.stopPropagation()
//   showCardTypeMenu.value = !showCardTypeMenu.value
//   showCardBoxMenu.value = false // 关闭另一个菜单
// }

// const toggleCardType = (type: string) => {
//   noteStore.toggleCardType(type)
// }
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
    background-color: var(--color-menu-bg);
    border: 1px solid var(--color-primary);

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

  .cardbox-dropdown {
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
      user-select: none;
      line-height: 1;
    }

    &:hover {
      background-color: var(--color-hover-bg);
    }

    &.active {
      background-color: var(--color-menu-active-bg);
      // border: 1px solid var(--color-primary);
    }

    .dropdown-menu {
      position: fixed; // 改为 fixed
      margin-top: 5px;
      background-color: var(--color-bg-primary);
      border-radius: 8px;
      z-index: 1000;
      min-width: 200px;
      width: auto;
      max-height: 350px;
      overflow-y: auto;
      padding: 6px 12px;
      white-space: nowrap;
      background-clip: padding-box;
      box-shadow: var(--shadow-primary);
      opacity: 0;
      visibility: hidden;
      transition:
        opacity 0.3s ease,
        visibility 0.3s ease;

      &.show {
        opacity: 1;
        visibility: visible;
      }

      .dropdown-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 4px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 14px;
        color: var(--color-text-primary);
        white-space: nowrap;
        border-radius: 6px;
        margin: 2px;

        &:hover {
          background-color: var(--color-hover-bg);
        }

        &.active {
          background-color: var(--color-hover-bg);
        }

        .dropdown-item-content {
          position: relative;
          display: flex;
          align-items: center;
          border: none;
          background: none;
          cursor: pointer;
          transition: background-color 0.2s;
          border-radius: 8px;

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
            transition: background-color 0.2s;
            padding: 0;

            // 新增以下样式来处理 i-icon 类
            .i-icon {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              height: 100%;
            }

            svg {
              width: 18px; // 或者您想要的大小
              height: 18px; // 或者您想要的大小
            }
          }

          .name {
            flex-grow: 0;
            text-align: left;
            color: var(--color-text-primary);
            font-size: 14px;
            white-space: nowrap; // 防止文字换行
            writing-mode: horizontal-tb; // 确保文字是水平排列的
            user-select: none;
            margin-left: 6px;
          }
        }
      }

      .dropdown-divider {
        height: 1px;
        margin: 6px 0;
        background-color: var(--color-border);
      }

      .dropdown-item.add-cardbox {
        position: sticky;
        bottom: 0;
        background-color: var(--color-bg-primary);
        // border-top: 1px solid var(--color-border);
        // margin-top: 6px;
        // padding-top: 8px;

        &:hover {
          background-color: var(--color-hover-bg);
        }

        .dropdown-item-content {
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }
    }

    .dropdown-item-actions {
      position: relative;

      .more-actions-btn {
        background: none;
        border: none;
        cursor: pointer;
        // padding: 4px;
        border-radius: 50%;
        transition: background-color 0.2s;
        margin-left: 10px;
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
          transition: background-color 0.2s;
          padding: 0;

          // 新增以下样式来处理 i-icon 类
          .i-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
          }

          svg {
            width: 18px; // 或者您想要的大小
            height: 18px; // 或者您想要的大小
          }
        }
      }
    }
  }
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

  // .card-grid {
  //   display: grid;
  //   grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  //   gap: 16px;
  //   padding: 16px 20px;
  //   align-content: start; // 让内容从顶部开始排列
  //   justify-content: center; // 水平居中对齐

  //   // 使用视口单位和 clamp 函数来控制卡片高度
  //   --card-height: clamp(300px, calc(20vw - 32px), 370px);
  //   grid-auto-rows: var(--card-height);

  //   // 计算每行可以容纳的卡片数量
  //   --cards-per-row: calc((100% - 32px) / (300px + 16px));
  // }
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

.cardtype-dropdown {
  position: relative;
  display: inline-flex;
  position: relative;
  display: flex;
  align-items: center;
  padding: 2px 12px 2px 7px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-radius: 8px;
  border: 1px solid var(--color-border);

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

  .cadrtype-dropdown-menu {
    position: absolute;
    top: calc(100% + 10px);
    left: 50%;
    transform: translateX(-50%); // 居中对齐
    background-color: var(--color-bg-primary);
    border-radius: 8px;
    // box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    min-width: 200px;
    width: auto;
    overflow-y: auto;
    padding: 6px 12px;
    white-space: nowrap;
    background-clip: padding-box;
    box-shadow: var(--shadow-primary);

    .cadrtype-dropdown-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 8px 4px 4px;
      cursor: pointer;
      transition: background-color 0.2s;
      font-size: 14px;
      color: #333;
      white-space: nowrap;
      border-radius: 8px;
      margin: 2px;

      &:hover {
        background-color: var(--color-hover-bg);
      }

      &.active {
        background-color: rgba(0, 200, 168, 0.05);
        border: 1px solid #00c8a8;
        // color: #00C8A8;
      }

      .cadrtype-dropdown-item-content {
        display: flex;
        align-items: center;
        // gap: 10px;
        flex-grow: 1;
        align-items: center;
        // width: 200px;
        // padding: 8px 12px;
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
          // margin-right: 3px;

          &:hover:not(:disabled) {
            background-color: var(--color-hover-bg);
          }

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          // 新增以下样式来处理 i-icon 类
          .i-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
          }

          svg {
            width: 18px; // 或者您想要的大小
            height: 18px; // 或者您想要的大小
          }
        }

        .name {
          flex-grow: 0;
          text-align: left;
          color: var(--color-text-primary);
          font-size: 14px;
          white-space: nowrap; // 防止文字换行
          writing-mode: horizontal-tb; // 确保文字是水平排列的
          user-select: none;
          margin-left: 6px;
          line-height: 1;
        }

        &.active {
          background-color: var(--color-menu-active-bg);
          // border: 1px solid var(--color-primary);
        }
      }

      .switch {
        position: relative;
        display: inline-block;
        width: 28px;
        height: 18px;

        input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.4s;
        }

        .slider:before {
          position: absolute;
          content: '';
          height: 14px;
          width: 14px;
          left: 2px;
          bottom: 2px;
          background-color: white;
          transition: 0.4s;
        }

        input:checked + .slider {
          background-color: #00c8a8;
        }

        input:focus + .slider {
          box-shadow: 0 0 1px #00c8a8;
        }

        input:checked + .slider:before {
          transform: translateX(10px);
        }

        .slider.round {
          border-radius: 34px;
        }

        .slider.round:before {
          border-radius: 50%;
        }
      }
    }
  }
}

.dropdown-menu::-webkit-scrollbar {
  width: 6px;
}

.dropdown-menu::-webkit-scrollbar-thumb {
  background-color: #d0d0d0;
  border-radius: 3px;
}

.dropdown-menu::-webkit-scrollbar-track {
  background-color: #f0f0f0;
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
</style>
