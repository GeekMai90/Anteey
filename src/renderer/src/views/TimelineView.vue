<!-- TimelineView.vue - 时间线视图组件 -->
<template>
  <!-- 当数据加载完成时显示时间线视图 -->
  <div v-if="isLoaded" class="timeline-view">
    <!-- 顶部固定区域 -->
    <div class="sticky-header">
      <!-- 工具栏 -->
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>

      <!-- 头部内容区域 -->
      <div class="header-content">
        <div class="timeline-header">
          <!-- 左侧标题 -->
          <div class="timeline-header-left">
            <div class="icon">
              <NotebookOne theme="outline" size="20" fill="var(--color-primary)" :strokeWidth="3" />
            </div>
            <div class="name">笔记流</div>
          </div>

          <!-- 右侧功能区 -->
          <div class="timeline-header-right">
            <div
              class="calendar-button"
              :class="{ 'date-selected': selectedDate }"
              @click="toggleDateFilter"
            >
              <div class="icon">
                <Calendar theme="outline" size="16" :strokeWidth="3" />
              </div>
              <span class="date-text">{{ selectedDate || '日历' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 笔记列表容器 -->
    <div class="timeline-container">
      <div v-bind="containerProps" class="note-list-container">
        <!-- 空状态展示 -->
        <div v-if="virtualList.length === 0" class="empty-state">
          <div class="empty-state-icon">📝</div>
          <h2 class="empty-state-title">暂无笔记</h2>
          <p class="empty-state-description">开始创建新笔记</p>
        </div>

        <!-- 笔记列表 -->
        <div v-else v-bind="wrapperProps" class="timeline-notes">
          <div
            v-for="item in virtualList"
            :key="`${item.data.id}-${new Date(item.data.updatedAt).toISOString()}`"
            class="timeline-item"
          >
            <!-- 日期分隔线 -->
            <DateDivider
              v-if="shouldShowDateDivider(item.data, item.index)"
              :date="item.data.createdAt"
            />

            <!-- 笔记卡片 -->
            <div class="note-wrapper">
              <div class="timeline-dot"></div>
              <NoteCard :note="item.data" @edit="noteStore.openNoteEditor" />
            </div>
          </div>
        </div>

        <!-- 无限滚动触发器 -->
        <div ref="observerTarget" class="observer-target"></div>

        <!-- 底部提示 -->
        <div v-if="sortedNotes.length > 0 && !hasMoreNotes" class="bottom-line">
          <div class="line"></div>
          <span class="text">🙈 我也是有底线的 🙊</span>
          <div class="line"></div>
        </div>
      </div>
    </div>

    <!-- 回到顶部按钮 -->
    <button class="back-to-top" aria-label="回到顶部" @click="scrollToTop">
      <div class="icon">
        <RocketOne theme="outline" size="24" fill="var(--color-primary)" :strokeWidth="2" />
      </div>
    </button>

    <!-- 日历选择器 -->
    <CalendarPicker
      :noteDates="noteDates"
      :isVisible="uiStore.isCalendarPickerOpen"
      :selectedDate="selectedDate"
      triggerElementSelector=".calendar-button"
      @dateSelected="onDateSelected"
    />
  </div>
</template>

<script setup lang="ts">
// 导入依赖
import { useNoteStore } from '@renderer/stores/noteStore'
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { NotebookOne, Calendar, RocketOne } from '@icon-park/vue-next'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import CalendarPicker from '@renderer/components/timelineView/CalendarPicker.vue'
import { useUIStore } from '@renderer/stores/UIStore'
import { Note } from '@shared/types'
import NoteCard from '@renderer/components/note/NoteCard.vue'
import { useVirtualList } from '@vueuse/core'
import { useEventBus } from '@vueuse/core'
import { debounce } from 'lodash-es'
import DateDivider from '@renderer/components/timelineView/DateDivider.vue'
import type { UseVirtualListOptions } from '@vueuse/core'

// 状态管理初始化
const noteStore = useNoteStore()
const uiStore = useUIStore()
const isLoaded = ref(false)
const { isLoading, totalNotes, lastCreatedNote, lastDeletedNote } = storeToRefs(noteStore)

// 组件状态
const notes = ref<Note[]>([])
const currentPage = ref(1)
const pageSize = 20
const hasMoreNotes = computed(() => notes.value.length < totalNotes.value)
const selectedDate = ref<string | null>(null)
const isDateFiltered = computed(() => selectedDate.value !== null)
const filteredNotes = ref<Note[]>([])
const noteDates = ref<string[]>([])

// 笔记排序计算属性
const sortedNotes = computed(() => {
  const notesToSort = isDateFiltered.value ? filteredNotes.value : notes.value
  return notesToSort
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

// 事件总线设置
const noteUpdatedBus = useEventBus<Note>('note-updated')
const noteCreatedBus = useEventBus('note-created')
const eventBusDeleted = useEventBus('note-deleted')
const eventBusEmptyNotesMovedToTrash = useEventBus('empty-notes-moved-to-trash')
const eventBusNoteRestored = useEventBus('note-restored')
// const flashcardConvertedBus = useEventBus('flashcard-converted')

// 事件监听器设置
noteUpdatedBus.on((updatedNote) => {
  if (!updatedNote) return
  updateSingleNote(updatedNote)
})

eventBusNoteRestored.on(() => {
  refreshNotes()
})

eventBusEmptyNotesMovedToTrash.on(() => {
  refreshNotes()
})

noteCreatedBus.on(() => {
  notes.value.unshift(lastCreatedNote.value as Note)
  totalNotes.value++
})

eventBusDeleted.on(() => {
  if (!lastDeletedNote.value) return
  const index = notes.value.findIndex((note) => note.id === lastDeletedNote.value?.id)
  if (index !== -1) {
    notes.value.splice(index, 1)
    nextTick(() => {
      virtualList.value = [...virtualList.value]
    })
  }
})

// 监听闪卡转换事件
// flashcardConvertedBus.on((noteId) => {
//   // 找到对应的笔记并更新
//   const noteToUpdate = notes.value.find((note) => note.id === noteId)
//   if (noteToUpdate) {
//     // 重新获取该笔记的最新数据
//     noteStore.fetchNoteById(noteId as string).then((updatedNote) => {
//       if (updatedNote) {
//         updateSingleNote(updatedNote)
//       }
//     })
//   }
// })
// 监听闪卡转换事件
const flashcardConvertedBus = useEventBus<string>('flashcard-converted')
flashcardConvertedBus.on(async (noteId) => {
  // 找到对应的笔记并更新
  const noteToUpdate = notes.value.find((note) => note.id === noteId)
  if (noteToUpdate) {
    try {
      // 重新获取该笔记的最新数据
      const updatedNote = await noteStore.fetchNoteById(noteId)
      if (updatedNote) {
        updateSingleNote(updatedNote)
        // 强制更新虚拟列表
        nextTick(() => {
          virtualList.value = [...virtualList.value]
        })
      }
    } catch (error) {
      console.error('更新笔记失败:', error)
    }
  }
})

// 笔记更新函数
const updateSingleNote = (updatedNote: Note) => {
  if (!updatedNote) return
  if (isDateFiltered.value) {
    const index = filteredNotes.value.findIndex((note) => note.id === updatedNote.id)
    if (index !== -1) {
      filteredNotes.value[index] = { ...filteredNotes.value[index], ...updatedNote }
    }
  }
  const index = notes.value.findIndex((note) => note.id === updatedNote.id)
  if (index !== -1) {
    notes.value[index] = { ...notes.value[index], ...updatedNote }
  }
}

// 虚拟列表配置
const virtualListOptions: UseVirtualListOptions = {
  itemHeight: 400,
  overscan: 5
}

const {
  list: virtualList,
  containerProps,
  wrapperProps
} = useVirtualList(sortedNotes, virtualListOptions)

// 组件生命周期钩子
onMounted(async () => {
  if (notes.value.length === 0) {
    await refreshNotes()
  }
  isLoaded.value = true
  const dates = await noteStore.fetchAllDatesWithNotes()
  if (dates) {
    noteDates.value = dates
  }
  nextTick(() => {
    setupInfiniteScroll()
  })
})

// 笔记列表刷新
async function refreshNotes() {
  currentPage.value = 1
  notes.value = []
  await loadMoreNotes()
}

// 无限滚动设置
const observerTarget = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
})

function setupInfiniteScroll() {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMoreNotes.value && !isLoading.value) {
        loadMoreNotes()
      }
    },
    {
      root: null,
      rootMargin: '200px',
      threshold: 0.1
    }
  )

  if (observerTarget.value) {
    observer.observe(observerTarget.value)
  }
}

// 加载更多笔记
async function loadMoreNotes() {
  if (!isLoading.value && hasMoreNotes.value) {
    isLoading.value = true
    try {
      const result = await noteStore.fetchPaginatedNotes(currentPage.value, pageSize)
      if (result) {
        notes.value.push(...result.notes)
        currentPage.value++
      }
    } catch (error) {
      console.error('加载更多笔记时出错:', error)
    } finally {
      isLoading.value = false
    }
  }
}

// 滚动到顶部
async function scrollToTop() {
  const scrollContainer = containerProps.ref.value
  if (scrollContainer) {
    scrollContainer.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }
}

// 日期筛选相关函数
async function filterNotesByDate(date: string | null) {
  selectedDate.value = date
  if (date) {
    try {
      const notes = await noteStore.fetchNotesByOneDate(date)
      filteredNotes.value = notes || []
    } catch (error) {
      console.error('筛选笔记失败:', error)
      filteredNotes.value = []
    }
  } else {
    filteredNotes.value = []
    await refreshNotes()
  }
}

const onDateSelected = debounce((date: string | null) => {
  filterNotesByDate(date)
}, 300)

const toggleDateFilter = () => {
  if (selectedDate.value) {
    selectedDate.value = null
    filteredNotes.value = []
    refreshNotes()
  } else {
    uiStore.toggleCalendarPicker()
  }
}

// 日期分隔线显示逻辑
const shouldShowDateDivider = (currentNote: Note, index: number) => {
  if (!currentNote || !currentNote.createdAt) return false
  if (index === 0) return true

  const currentDate = new Date(currentNote.createdAt).toDateString()
  const prevNote = sortedNotes.value[index - 1]
  if (!prevNote || !prevNote.createdAt) return false

  const prevDate = new Date(prevNote.createdAt).toDateString()
  return currentDate !== prevDate
}
</script>

<style lang="scss" scoped>
// 主容器样式
.timeline-view {
  background-color: var(--color-bg-primary);
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// 顶部固定区域样式
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

    .timeline-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 8px 0;
      border-bottom: 1px solid var(--color-border);

      // 左侧标题区域
      .timeline-header-left {
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
          line-height: 1;
        }
      }

      // 右侧功能区域
      .timeline-header-right {
        display: flex;
        align-items: center;
        gap: 5px;

        .calendar-button {
          position: relative;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px 6px 9px;
          // background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          height: 36px;

          .date-text {
            font-size: 13px;
            color: var(--color-text-secondary);
            font-weight: 500;
            line-height: 1;
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
            color: var(--color-text-secondary);

            :deep(.i-icon) {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              height: 100%;
            }

            :deep(svg) {
              width: 16px;
              height: 16px;
            }
          }

          &.date-selected {
            background: rgba(var(--color-primary-rgb), 0.1);
            border-color: var(--color-primary);

            .date-text,
            .icon {
              color: var(--color-primary);
            }
          }

          &:hover {
            background: var(--color-hover-button);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }

          &:active {
            transform: translateY(0);
          }
        }
      }
    }
  }
}

// 时间线容器样式
.timeline-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .note-list-container {
    flex-grow: 1;
    overflow-y: auto;
    padding: 0 40px 0 0px;
    box-sizing: border-box;
    width: 100%;
    max-width: 900px;
    margin: 0 auto;
    padding-top: 16px;
    position: relative;
  }
}

// 空状态样式
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
  color: var(--color-text-primary);

  &-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  &-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--color-text-primary);
  }

  &-description {
    font-size: 1rem;
    max-width: 300px;
  }
}

// 底线样式
.bottom-line {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  margin-top: auto;
  color: var(--color-text-secondary);
  font-size: 14px;
  opacity: 0.8;
  user-select: none;

  .line {
    flex-grow: 1;
    height: 1px;
    background: linear-gradient(to right, transparent, var(--color-text-secondary), transparent);
    opacity: 0.2;
  }

  .text {
    padding: 0 15px;
    white-space: nowrap;
    opacity: 0.8;
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

// 回到顶部按钮样式
.back-to-top {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(var(--color-primary-rgb), 0.2);
  color: var(--color-text-primary);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  z-index: 9999;
  opacity: 0.6;
  animation: float 3s ease-in-out infinite;

  .icon {
    background: none;
    border: none;
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
      width: 18px;
      height: 18px;
    }
  }

  &:hover {
    transform: translateY(-5px);
    background-color: rgba(var(--color-primary-rgb), 0.3);
    color: var(--color-text-inversion);
    opacity: 1;
    box-shadow: 0 5px 15px rgba(var(--color-primary-rgb), 0.3);
  }
}

// 观察者目标样式
.observer-target {
  height: 20px;
  width: 100%;
}

// 时间线笔记列表样式
.timeline-notes {
  position: relative;
  scroll-behavior: auto !important;

  &::before {
    content: '';
    position: absolute;
    left: 40px;
    top: 0;
    bottom: 0;
    width: 1px;
    border-left: 1.5px dashed var(--color-border);
  }
}

// 时间线项目样式
.timeline-item {
  position: relative;
  margin-bottom: 10px;
  transform: translateZ(0);
  will-change: transform;
}

// 笔记包装器样式
.note-wrapper {
  position: relative;
  padding-left: 60px;
  transition: all 0.2s ease;

  &:hover {
    .note-card {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      border-color: var(--color-primary);
    }

    .timeline-dot {
      transform: scale(1.2);
      border-color: var(--color-primary);
      box-shadow: 0 0 0 4px rgba(var(--color-primary-rgb), 0.15);
    }
  }
}

// 时间线圆点样式
.timeline-dot {
  position: absolute;
  left: 36.5px;
  top: 27.5px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-bg-primary);
  border: 1.5px solid var(--color-primary);
  z-index: 1;
  transition: all 0.2s ease;
  box-shadow: 0 0 0 4px rgba(var(--color-primary-rgb), 0.1);
}

// 浮动动画
@keyframes float {
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-5px);
  }
  100% {
    transform: translateY(0px);
  }
}
</style>
