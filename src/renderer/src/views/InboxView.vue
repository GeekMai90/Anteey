<template>
  <div class="inbox-view">
    <!-- 固定头部区域 -->
    <div class="sticky-header">
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>
      <div class="header-content">
        <div class="inbox-header">
          <!-- 左侧标题区域 -->
          <div class="inbox-header-left">
            <div class="icon">
              <InboxIn theme="outline" size="20" fill="var(--color-primary)" :strokeWidth="3" />
            </div>
            <div class="name">收件箱</div>
          </div>

          <!-- 右侧功能区 -->
          <div class="inbox-header-right">
            <!-- 多选按钮 -->
            <Button
              :class="{ active: noteStore.isMultiSelectMode }"
              :icon="Checkbox"
              :height="36"
              @click="toggleMultiSelect"
            >
              多选
            </Button>

            <!-- 排序按钮 -->
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

    <!-- 笔记网格容器 -->
    <div class="inbox-container">
      <div ref="cardGridContainer" class="card-grid-container">
        <!-- 空状态展示 -->
        <div v-if="displayedNotes.length === 0" class="empty-state">
          <img src="@renderer/assets/images/empty.svg" alt="暂无内容" class="empty-icon" />
          <div class="empty-text">收件箱暂无笔记</div>
        </div>

        <!-- 笔记网格 -->
        <div v-else name="card-list" tag="div" class="card-grid">
          <CardBoxNoteCard
            v-for="note in displayedNotes"
            :key="`${note.id}-${new Date(note.updatedAt).toISOString()}`"
            v-memo="[note.id, note.content, note.createdAt]"
            class="card-item"
            :note="note"
            :highlightedNoteId="highlightedNoteId"
          />
        </div>
      </div>

      <!-- 无限滚动触发器 -->
      <div ref="observerTarget" class="observer-target"></div>
    </div>

    <!-- 批量操作工具条 -->
    <BatchOperationToolbar :displayed-notes="displayedNotes" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import { SortTwo, InboxIn, Checkbox } from '@icon-park/vue-next'
import type { Note } from '@shared/types'
import CardBoxNoteCard from '@renderer/components/cardbox/CardboxNoteCard.vue'
import { storeToRefs } from 'pinia'
import { useEventBus, useThrottleFn } from '@vueuse/core'
import Button from '@renderer/components/ui/Button.vue'
import BatchOperationToolbar from '@renderer/components/cardbox/BatchOperationToolbar.vue'

const noteStore = useNoteStore()
const { lastCreatedNote, lastDeletedNote } = storeToRefs(noteStore)

// 状态管理
const notes = ref<Note[]>([])
const currentPage = ref(1)
const pageSize = ref(28)
const totalCount = ref(0)
const hasMoreNotes = ref(true)
const isLoading = ref(false)
const showSortMenu = ref(false)
const cardGridContainer = ref<HTMLElement | null>(null)
const highlightedNoteId = ref<string | null>(null)

// 排序相关
const sortState = ref({
  field: 'createdAt',
  order: 'desc' as 'asc' | 'desc'
})

const sortOptions = [
  { value: 'createdAt', label: '按创建时间排序' },
  { value: 'updatedAt', label: '按更新时间排序' }
]

// 计算属性
const currentSort = computed({
  get: () => sortState.value.field,
  set: (value) => {
    sortState.value.field = value
  }
})

const sortDirection = computed({
  get: () => sortState.value.order,
  set: (value) => {
    sortState.value.order = value as 'asc' | 'desc'
  }
})

const displayedNotes = computed(() => notes.value)

// 方法
const toggleSortMenu = (event: MouseEvent) => {
  event.stopPropagation()
  showSortMenu.value = !showSortMenu.value
}

const selectSortOption = async (option: { value: string; label: string }) => {
  if (currentSort.value === option.value) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    currentSort.value = option.value
    sortDirection.value = 'desc'
  }

  showSortMenu.value = false
  await resetAndFetch()
}

const resetAndFetch = async () => {
  currentPage.value = 1
  notes.value = []
  await nextTick()
  fetchNotes()
}

const fetchNotes = async () => {
  if (isLoading.value) return

  isLoading.value = true
  try {
    // 构造参数，只获取 Draft 类型的笔记
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      cardTypes: ['Draftcard'], // 修改为 Draftcard
      sortBy: sortState.value.field,
      sortOrder: sortState.value.order
    }

    const result = await noteStore.fetchPaginatedNotesByCardbox(params)
    if (result) {
      await nextTick(() => {
        if (currentPage.value === 1) {
          notes.value = result.notes
        } else {
          notes.value = [...notes.value, ...result.notes]
        }
      })

      totalCount.value = result.totalCount
      hasMoreNotes.value = notes.value.length < totalCount.value
      currentPage.value++
    }
  } catch (error) {
    console.error('获取收件箱笔记失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 滚动加载
const handleScroll = useThrottleFn(() => {
  if (cardGridContainer.value) {
    const { scrollTop, scrollHeight, clientHeight } = cardGridContainer.value
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

// 多选模式
const toggleMultiSelect = () => {
  noteStore.toggleMultiSelectMode()
}

// 事件监听
const noteUpdatedBus = useEventBus<Note>('note-updated')
const eventBusCreated = useEventBus('note-created')
const eventBusDeleted = useEventBus('note-deleted')
const eventBusEmptyNotesMovedToTrash = useEventBus('empty-notes-moved-to-trash')
const eventBusNoteRestored = useEventBus('note-restored')
const notesDeletedBus = useEventBus('notes-deleted')

// 更新单个笔记
const updateSingleNote = async (updatedNote: Note) => {
  if (!updatedNote) return
  const index = notes.value.findIndex((note) => note.id === updatedNote.id)
  if (index !== -1) {
    notes.value[index] = { ...notes.value[index], ...updatedNote }
  }
}

// 监听事件
noteUpdatedBus.on((updatedNote) => {
  if (!updatedNote) return
  updateSingleNote(updatedNote)
})

eventBusCreated.on(() => {
  const createdNote = lastCreatedNote.value
  if (!createdNote) return
  notes.value = [createdNote, ...notes.value]
})

eventBusDeleted.on(() => {
  const deletedNote = lastDeletedNote.value
  if (!deletedNote) return
  notes.value = notes.value.filter((note) => note.id !== deletedNote.id)
})

notesDeletedBus.on(() => {
  console.log('InboxView.vue→ 监听到笔记批量软删除事件')
  resetAndFetch()
  noteStore.toggleMultiSelectMode()
})

eventBusNoteRestored.on(() => {
  console.log('InboxView.vue→ 监听到笔记从回收站恢复事件')
  resetAndFetch()
})

eventBusEmptyNotesMovedToTrash.on(() => {
  console.log('InboxView.vue→ 监听到空笔记移到回收站事件')
  resetAndFetch()
})

// 生命周期钩子
onMounted(() => {
  resetAndFetch()
  document.addEventListener('click', handleGlobalClick)
  cardGridContainer.value?.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
  cardGridContainer.value?.removeEventListener('scroll', handleScroll)
})

// 全局点击事件处理
const handleGlobalClick = (event: MouseEvent) => {
  const sortDropdown = document.querySelector('.sort-button-container')
  if (showSortMenu.value && sortDropdown && !sortDropdown.contains(event.target as Node)) {
    showSortMenu.value = false
  }
}
</script>

<style lang="scss" scoped>
.inbox-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-primary);
  overflow: hidden;
}

// 固定头部样式
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 500;
  background-color: var(--color-bg-primary);
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;

  .header-content {
    width: 100%;
    padding: 0 20px;
    box-sizing: border-box;

    .inbox-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--color-border-light);

      // 左侧标题区域
      .inbox-header-left {
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
          background-color: var(--color-primary-light);
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
          color: var(--color-text-primary);
          font-size: 20px;
          font-weight: 600;
          margin-left: 8px;
          white-space: nowrap;
          writing-mode: horizontal-tb;
          user-select: none;
          line-height: 1;
        }
      }

      // 右侧功能区域
      .inbox-header-right {
        display: flex;
        gap: 8px;
        align-items: center;

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
    }
  }
}

// 内容区域样式
.inbox-container {
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

    // 使用视口单位和 clamp 函数来控制卡片高度
    --card-height: clamp(250px, calc(20vw - 32px), 350px);
    grid-auto-rows: var(--card-height);

    // 计算每行可以容纳的卡片数量
    --cards-per-row: calc((100% - 32px) / (300px + 16px));
    .card-item {
      transition: all 0.2s ease;
    }
  }
}

.observer-target {
  height: 20px;
  width: 100%;
}

.sort-direction {
  font-size: 12px;
  margin-left: 5px;
}
</style>
