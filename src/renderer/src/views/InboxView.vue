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
              <Inbox theme="outline" size="20" fill="var(--color-primary)" :strokeWidth="3" />
            </div>
            <div class="name">收件箱</div>
          </div>

          <!-- 右侧功能区 -->
          <div class="inbox-header-right">
            <!-- Dinox 同步按钮 -->
            <Button :loading="isDinoxSyncing" :height="36" :icon="InboxIn" @click="handleSyncDinox">
              {{ isDinoxSyncing ? '同步中...' : '同步聆龙' }}
            </Button>

            <!-- 添加 Readwise 同步按钮 -->
            <Button
              :loading="isReadwiseSyncing"
              :height="36"
              :icon="BookOne"
              @click="handleSyncReadwise"
            >
              {{ isReadwiseSyncing ? '同步中...' : '同步 Readwise' }}
            </Button>

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
      <div ref="cardGridContainer" class="card-grid-container" @scroll="handleVirtualScroll">
        <!-- 空状态展示 -->
        <div v-if="displayedNotes.length === 0" class="empty-state">
          <img src="@renderer/assets/images/empty.svg" alt="暂无内容" class="empty-icon" />
          <div class="empty-text">收件箱暂无笔记</div>
        </div>

        <!-- 笔记网格 -->
        <div v-else class="card-grid" :style="cardGridStyles">
          <CardBoxNoteCard
            v-for="note in virtualNotes"
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
import { ref, computed, onMounted, onUnmounted, nextTick, provide } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useDinoxStore } from '@renderer/stores/dinoxStore'
import { useReadwiseStore } from '@renderer/stores/readwiseStore'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import { SortTwo, InboxIn, Checkbox, Inbox, BookOne } from '@icon-park/vue-next'
import type { Note } from '@shared/types'
import CardBoxNoteCard from '@renderer/components/cardbox/CardboxNoteCard.vue'
import { storeToRefs } from 'pinia'
import { useEventBus, useThrottleFn } from '@vueuse/core'
import Button from '@renderer/components/ui/Button.vue'
import BatchOperationToolbar from '@renderer/components/cardbox/BatchOperationToolbar.vue'
import { message } from '@renderer/utils/message'

const noteStore = useNoteStore()
const dinoxStore = useDinoxStore()
const readwiseStore = useReadwiseStore()
const { lastCreatedNote, lastDeletedNote } = storeToRefs(noteStore)

// 状态管理
const notes = ref<Note[]>([])
const currentPage = ref(1)
const pageSize = ref(28)
const totalCount = ref(0)
const hasMoreNotes = ref(true)
const isLoading = ref(false)
const isDinoxSyncing = ref(false)
const isReadwiseSyncing = ref(false)
const showSortMenu = ref(false)
const cardGridContainer = ref<HTMLElement | null>(null)
const highlightedNoteId = ref<string | null>(null)
const lastSelectedNoteId = ref<string | null>(null)

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

// 添加虚拟列表相关的状态
const containerHeight = ref(0)
const scrollTop = ref(0)
const cardHeight = 300 // 假设每个卡片的固定高度为300px
const bufferSize = 3 // 将缓冲区大小从5减小到3，可以根据实际效果调整

// 计算视口信息
const viewportInfo = computed(() => {
  const containerWidth = cardGridContainer.value?.clientWidth || 0
  const cardsPerRow = Math.floor(containerWidth / 316) // 300px + 16px gap
  const rowHeight = cardHeight + 16 // 加上gap的高度

  const visibleRows = Math.ceil(containerHeight.value / rowHeight)
  const startRow = Math.floor(scrollTop.value / rowHeight)

  // 修改这里：确保startRow不会出现负数，并减少上方缓冲区大小
  const safeStartRow = Math.max(0, startRow - Math.floor(bufferSize / 2))
  const endRow = startRow + visibleRows + Math.ceil(bufferSize / 2)

  const startIndex = safeStartRow * cardsPerRow
  const endIndex = Math.min(notes.value.length, endRow * cardsPerRow)

  return {
    startIndex,
    endIndex,
    totalHeight: Math.ceil(notes.value.length / cardsPerRow) * rowHeight,
    paddingTop: safeStartRow * rowHeight // 使用safeStartRow计算paddingTop
  }
})

// 计算实际需要渲染的笔记
const virtualNotes = computed(() =>
  notes.value.slice(viewportInfo.value.startIndex, viewportInfo.value.endIndex)
)

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
    const result = await noteStore.fetchDraftNotes(currentPage.value, pageSize.value)
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
    console.error('获取草稿笔记失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 修改虚拟滚动处理函数的节流时间
const handleVirtualScroll = useThrottleFn((e: Event) => {
  const target = e.target as HTMLElement
  const newScrollTop = target.scrollTop

  // 只有当滚动距离变化超过一定阈值时才更新
  if (Math.abs(newScrollTop - scrollTop.value) > cardHeight / 4) {
    scrollTop.value = newScrollTop
  }

  // 同时处理无限加载
  const { scrollHeight, clientHeight } = target
  if (
    scrollHeight - newScrollTop - clientHeight < 1000 &&
    !isLoading.value &&
    hasMoreNotes.value &&
    notes.value.length < totalCount.value
  ) {
    fetchNotes()
  }
}, 32) // 将节流时间从16ms增加到32ms，约30fps，可以根据实际效果调整

// 多选模式
const toggleMultiSelect = () => {
  if (noteStore.isMultiSelectMode) {
    lastSelectedNoteId.value = null
  }
  noteStore.toggleMultiSelectMode()
}

// 添加处理Shift键多选的方法
const handleNoteShiftSelect = (noteId: string, shiftKey: boolean) => {
  if (!noteStore.isMultiSelectMode || !shiftKey || !lastSelectedNoteId.value) {
    lastSelectedNoteId.value = noteId
    return false
  }

  const lastIndex = notes.value.findIndex((note) => note.id === lastSelectedNoteId.value)
  const currentIndex = notes.value.findIndex((note) => note.id === noteId)

  if (lastIndex === -1 || currentIndex === -1) return false

  const startIndex = Math.min(lastIndex, currentIndex)
  const endIndex = Math.max(lastIndex, currentIndex)

  for (let i = startIndex; i <= endIndex; i++) {
    noteStore.selectNote(notes.value[i].id, true)
  }

  lastSelectedNoteId.value = noteId
  return true
}

// 将这个方法提供给子组件
const provideShiftSelect = {
  handleNoteShiftSelect
}

// 事件监听
const noteUpdatedBus = useEventBus<Note>('note-updated')
const eventBusCreated = useEventBus('note-created')
const eventBusDeleted = useEventBus('note-deleted')
const eventBusEmptyNotesMovedToTrash = useEventBus('empty-notes-moved-to-trash')
const eventBusNoteRestored = useEventBus('note-restored')
const notesDeletedBus = useEventBus('notes-deleted')
const notesMergedBus = useEventBus('notes-merged')

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
  console.log('InboxView→ 收到笔记更新事件:', updatedNote?.id)
  if (!updatedNote) return
  updateSingleNote(updatedNote)
})

// 修改事件处理函数为更简单的形式
const noteCreatedHandler = () => {
  console.log('InboxView→ 收到IPC note-created事件，准备刷新数据')
  resetAndFetch()
}

eventBusCreated.on(() => {
  console.log('InboxView→ 收到笔记创建事件')
  const createdNote = lastCreatedNote.value
  console.log('InboxView→ 最新创建的笔记:', createdNote?.id)

  if (!createdNote) {
    console.log('InboxView→ 没有找到最新创建的笔记')
    return
  }

  // 如果是草稿类型的笔记，添加到列表开头
  if (createdNote.cardType === 'Draftcard') {
    console.log('InboxView→ 添加草稿笔记到列表:', createdNote.id)
    notes.value = [createdNote, ...notes.value]
    totalCount.value++ // 更新总数
  } else {
    console.log('InboxView→ 笔记不是草稿类型，忽略:', createdNote.cardType)
  }
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

// Dinox 同步
const handleSyncDinox = async () => {
  if (isDinoxSyncing.value) return

  isDinoxSyncing.value = true
  try {
    const result = await dinoxStore.syncNotes()
    message.success(result.message || '同步完成')

    // 同步完成后刷新笔记列表
    await resetAndFetch()
  } catch (error) {
    console.error('同步失败:', error)
    message.error('同步失败: ' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    isDinoxSyncing.value = false
  }
}

// 添加 Readwise 同步
const handleSyncReadwise = async () => {
  if (isReadwiseSyncing.value) return

  isReadwiseSyncing.value = true
  try {
    const result = await readwiseStore.syncHighlights()
    message.success(result.message || '同步完成')

    // 同步完成后刷新笔记列表
    await resetAndFetch()
  } catch (error) {
    console.error('Readwise 同步失败:', error)
    message.error('同步失败: ' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    isReadwiseSyncing.value = false
  }
}

// 监听同步完成事件
const dinoxSyncCompleteBus = useEventBus('dinoxSyncComplete')
dinoxSyncCompleteBus.on(() => {
  console.log('InboxView.vue → 监听到 Dinox 同步完成事件')
  resetAndFetch()
})

// 添加 Readwise 同步完成事件监听
const readwiseSyncCompleteBus = useEventBus('readwiseSyncComplete')
readwiseSyncCompleteBus.on(() => {
  console.log('InboxView.vue → 监听到 Readwise 同步完成事件')
  resetAndFetch()
})

// 在事件监听部分修改合并事件的监听
notesMergedBus.on(() => {
  console.log('InboxView.vue→ 监听到笔记合并事件')
  resetAndFetch()
  noteStore.toggleMultiSelectMode()
})

// 生命周期钩子
onMounted(() => {
  resetAndFetch()
  document.addEventListener('click', handleGlobalClick)

  // 获取容器高度
  if (cardGridContainer.value) {
    containerHeight.value = cardGridContainer.value.clientHeight

    // 监听容器大小变化
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerHeight.value = entry.contentRect.height
      }
    })

    resizeObserver.observe(cardGridContainer.value)
  }

  // 添加 IPC 事件监听
  window.electronAPI.events.on('note-created', noteCreatedHandler)
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
  cardGridContainer.value?.removeEventListener('scroll', handleVirtualScroll)

  // 移除 IPC 事件监听
  window.electronAPI.events.off('note-created', noteCreatedHandler)
})

// 全局点击事件处理
const handleGlobalClick = (event: MouseEvent) => {
  const sortDropdown = document.querySelector('.sort-button-container')
  if (showSortMenu.value && sortDropdown && !sortDropdown.contains(event.target as Node)) {
    showSortMenu.value = false
  }
}

// 修改样式优化的计算属性
const cardGridStyles = computed(() => ({
  height: `${viewportInfo.value.totalHeight}px`,
  paddingTop: `${viewportInfo.value.paddingTop}px`,
  transform: 'translate3d(0, 0, 0)', // 启用GPU加速
  backfaceVisibility: 'hidden' as const, // 添加类型断言
  perspective: '1000px' // 修改为字符串类型并添加单位
}))

// 提供方法给子组件
provide('provideShiftSelect', provideShiftSelect)
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

        // 确保按钮之间有合适的间距
        :deep(.ant-btn) {
          margin-left: 8px;

          &:first-child {
            margin-left: 0;
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
    padding: 0 20px;
    align-content: start;
    justify-content: center;
    position: relative;
    will-change: transform; // 优化性能
    margin-top: 22px;

    .card-item {
      height: 300px; // 固定卡片高度
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
