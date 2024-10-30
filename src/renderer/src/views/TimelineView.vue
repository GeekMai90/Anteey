<!-- src/views/TimelineView.vue  -->
<template>
  <!-- 当数据加载完成时显示时间线视图 -->
  <div v-if="isLoaded" class="timeline-view">
    <!-- 固定在顶部的头部区域 -->
    <div class="sticky-header">
      <!-- 工具栏组件 -->
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>
      <div class="header-content">
        <!-- 时间线头部 -->
        <div class="timeline-header">
          <!-- 左侧标题区域 -->
          <div class="timeline-header-left">
            <div class="icon">
              <TimeIcon theme="outline" size="20" fill="var(--color-primary)" :strokeWidth="3" />
            </div>
            <div class="name">时间线</div>
          </div>
          <!-- 右侧功能区域 -->
          <div class="timeline-header-right">
            <!-- 日历按钮 -->
            <div
              class="calendar-button"
              :class="{ 'date-selected': selectedDate }"
              @click="toggleDateFilter"
            >
              <div class="icon">
                <Calendar
                  theme="outline"
                  size="20"
                  fill="var(--color-icon-secondary)"
                  :strokeWidth="3"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 时间线内容区域 -->
    <div class="timeline-container">
      <div v-bind="containerProps" class="note-list-container">
        <!-- 当没有笔记时显示空状态 -->
        <div v-if="timelineNotes.length === 0" class="empty-state">
          <div class="empty-state-icon">📝</div>
          <h2 class="empty-state-title">暂无笔记</h2>
          <p class="empty-state-description">开始创建新笔记</p>
        </div>
        <!-- 使用虚拟列表显示笔记 -->
        <div v-else v-bind="wrapperProps">
          <div
            v-for="{ data } in virtualList"
            :key="`${data.id}-${new Date(data.updatedAt).toISOString()}`"
            :style="{ height: `${itemHeight}px` }"
          >
            <NoteCard :note="data" @edit="noteStore.openNoteEditor" />
          </div>
        </div>
        <!-- 用于触发无限滚动的观察元素 -->
        <div ref="observerTarget" class="observer-target"></div>
        <!-- 底部提示信息 -->
        <div v-if="timelineNotes.length > 0 && !timelineHasMore" class="bottom-line">
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
    <!-- 日历选择器组件 -->
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
import { useNoteStore } from '@renderer/stores/noteStores'
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Time as TimeIcon, Calendar, RocketOne } from '@icon-park/vue-next'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import CalendarPicker from '@renderer/components/timelineView/CalendarPicker.vue'
import { useUIStore } from '@renderer/stores/useUIStore'
import NoteCard from '@renderer/components/note/NoteCard.vue'
import { useVirtualList } from '@vueuse/core'
import { useEventBus } from '@vueuse/core'
import { debounce } from 'lodash-es'

// 初始化状态管理
const noteStore = useNoteStore()
const uiStore = useUIStore()

// 从 store 中解构状态
const { timelineNotes, timelineHasMore, timelineIsLoading, visibleNotes } = storeToRefs(noteStore)

// 组件本地状态
const isLoaded = ref(false)
const selectedDate = ref<string | null>(null)
const noteDates = ref<string[]>([])
const observerTarget = ref<HTMLElement | null>(null)

// 计算属性
// const isDateFiltered = computed(() => selectedDate.value !== null)

// 虚拟列表应该直接使用 visibleNotes
const visibleNotesList = computed(() => {
  const notes = Object.values(visibleNotes.value)
  // 只有当笔记数量或内容变化时才重新排序
  return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

// 虚拟列表配置
const itemHeight = 340
const {
  list: virtualList,
  containerProps,
  wrapperProps
} = useVirtualList(visibleNotesList, {
  itemHeight,
  overscan: 5
})

// 加载更多笔记
async function loadMoreNotes() {
  if (!timelineIsLoading.value && timelineHasMore.value) {
    await noteStore.loadMoreTimelineNotes()
  }
}

// 刷新笔记列表
async function refreshNotes() {
  await noteStore.refreshTimelineNotes()
}

// 日期筛选
async function filterNotesByDate(date: string | null) {
  selectedDate.value = date
  if (date) {
    await noteStore.filterTimelineNotesByDate(date)
  } else {
    await noteStore.refreshTimelineNotes()
  }
}

// 滚动到顶部
const scrollToTop = () => {
  const scrollContainer = containerProps.ref.value
  if (scrollContainer) {
    scrollContainer.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }
}

// 切换日历选择器
const toggleDateFilter = () => {
  if (selectedDate.value) {
    selectedDate.value = null
    refreshNotes()
  } else {
    uiStore.toggleCalendarPicker()
  }
}

// 日期选择处理（防抖）
const onDateSelected = debounce((date: string | null) => {
  filterNotesByDate(date)
}, 300)

// 无限滚动设置
let observer: IntersectionObserver | null = null

function setupInfiniteScroll() {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && timelineHasMore.value && !timelineIsLoading.value) {
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

// 组件挂载
onMounted(async () => {
  await noteStore.refreshTimelineNotes()
  isLoaded.value = true
  const dates = await noteStore.fetchAllDatesWithNotes()
  if (dates) {
    noteDates.value = dates
  }
  nextTick(() => {
    setupInfiniteScroll()
  })
})

// 组件卸载
onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
  noteStore.manageVisibleNotes.clearVisible()
})

// 事件总线设置
const eventBus = useEventBus('note-updated')
const eventBusCreated = useEventBus('note-created')
const eventBusDeleted = useEventBus('note-deleted')
const eventBusEmptyNotesMovedToTrash = useEventBus('empty-notes-moved-to-trash')
const eventBusNoteRestored = useEventBus('note-restored')

// 事件监听
eventBus.on(() => {
  if (!noteStore.lastUpdatedNote) return
  noteStore.updateTimelineNote(noteStore.lastUpdatedNote)
})

eventBusCreated.on(() => {
  if (!noteStore.lastCreatedNote) return
  noteStore.refreshTimelineNotes()
})

eventBusDeleted.on(() => {
  if (!noteStore.lastDeletedNote) return
  noteStore.refreshTimelineNotes()
})

eventBusEmptyNotesMovedToTrash.on(() => {
  refreshNotes()
})

eventBusNoteRestored.on(() => {
  refreshNotes()
})
</script>

<style lang="scss" scoped>
.timeline-view {
  background-color: var(--color-bg-primary);
  width: 100%;
  height: 100vh; // 修改为固定高度
  display: flex;
  flex-direction: column;
  overflow: hidden; // 防止整个视图滚动

  .sticky-header {
    position: sticky;
    top: 0;
    z-index: 500;
    background-color: var(--color-bg-primary);
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    // margin-bottom: 10px;

    .header-content {
      width: 100%;
      // max-width: 1000px;
      padding: 0 20px;
      box-sizing: border-box;

      .timeline-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 8px 0;
        // margin-bottom: 10px;
        border-bottom: 1px solid var(--color-border);

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

        .timeline-header-right {
          display: flex;
          align-items: center;
          gap: 5px; // 在搜索框和日历按钮之间添加间距

          .search-box {
            position: relative;
            width: 200px;
            display: flex;
            align-items: center;
            background-color: var(--color-bg-secondary);
            border: 1px solid var(--color-border);
            border-radius: 8px;
            padding: 0 8px;
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
              pointer-events: none; // 防止图标干扰输入
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
                color: var(--color-text-placeholder); // 使用您定义的颜色变量
                opacity: 1; // 某些浏览器可能需要这个来确保颜色正确应用
              }

              &:focus {
                outline: none;
              }
            }

            .clear-icon {
              cursor: pointer;
            }
          }

          .calendar-button {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px; // 固定宽度
            height: 32px; // 固定高度
            border: 1px solid var(--color-border); // 默认透明边框
            background: none;
            cursor: pointer;
            transition: all 0.2s ease;
            border-radius: 6px;
            padding: 2px;
            margin: 2px;
            box-sizing: border-box; // 确保边框不会增加元素尺寸
            &.date-selected {
              background-color: var(--color-menu-bg);
              border: 1px solid var(--color-primary);
            }

            .icon {
              background: none;
              border: none;
              cursor: pointer;
              width: 26px;
              height: 26px;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s ease;
              padding: 0;

              &:disabled {
                opacity: 0.5;
                cursor: not-allowed;
              }

              :deep(.i-icon) {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
              }

              :deep(svg) {
                width: 20px;
                height: 20px;
              }
            }

            &:hover {
              background-color: var(--color-hover-button);
            }
          }
        }

        .title {
          margin: 0;
          font-size: 1.5em;
          flex-grow: 1;
          font-weight: var(--font-weight-title);
        }

        .add-note-button {
          color: var(--color-text-inversion);
          background-color: var(--color-primary);
          border: none;
          cursor: pointer;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          font-size: 24px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;

          :deep(.i-icon) {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
          }

          :deep(svg) {
            width: 20px;
            height: 20px;
          }
        }
      }
    }
  }

  .timeline-container {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden; // 防止此容器滚动

    .note-list-container {
      flex-grow: 1;
      overflow-y: auto; // 允许笔记列表滚动
      padding: 0 80px;
      box-sizing: border-box;
      width: 100%;
      max-width: 900px;
      margin: 0 auto;
      padding-top: 16px;
      position: relative;

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
    }
  }
}
// 添加底线样式
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

    &::before,
    &::after {
      font-style: normal;
      font-size: 16px;
    }
  }
}

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

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 50%;
    background-color: var(--color-primary);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-5px);
    background-color: rgba(var(--color-primary-rgb), 0.3);

    color: var(--color-text-inversion);
    opacity: 1;
    box-shadow: 0 5px 15px rgba(var(--color-primary-rgb), 0.3);
  }

  // &:focus {
  //   outline: none;
  //   box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.3);
  // }

  svg {
    position: relative;
    z-index: 1;
  }
}

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

.back-to-top {
  animation: float 3s ease-in-out infinite;
}
.observer-target {
  height: 20px;
  width: 100%;
}
</style>
