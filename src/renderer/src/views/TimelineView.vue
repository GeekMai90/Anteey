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
        <div v-if="virtualList.length === 0" class="empty-state">
          <div class="empty-state-icon">📝</div>
          <h2 class="empty-state-title">暂无笔记</h2>
          <p class="empty-state-description">开始创建新笔记</p>
        </div>
        <!-- 使用虚拟列表显示笔记 -->
        <div v-else v-bind="wrapperProps" class="timeline-notes">
          <div
            v-for="item in virtualList"
            :key="`${item.data.id}-${new Date(item.data.updatedAt).toISOString()}`"
            class="timeline-item"
          >
            <!-- 日期分隔 -->
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
        <!-- 用于触发无限滚动的观察元素 -->
        <div ref="observerTarget" class="observer-target"></div>
        <!-- 底部提示信息 -->
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
import { Note } from '@renderer/types/Note'
import NoteCard from '@renderer/components/note/NoteCard.vue'
import { useVirtualList } from '@vueuse/core'
import { useEventBus } from '@vueuse/core'
import { debounce } from 'lodash-es'
import DateDivider from '@renderer/components/timelineView/DateDivider.vue'
import type { UseVirtualListOptions } from '@vueuse/core'

// 初始化状态管理
const noteStore = useNoteStore()
const uiStore = useUIStore()

// 组件加载状态
const isLoaded = ref(false)

// 从 store 中解构需要的状态
const { isLoading, totalNotes, lastCreatedNote, lastDeletedNote } = storeToRefs(noteStore)

// 定义组件内部状态
const notes = ref<Note[]>([])
const currentPage = ref(1)
const pageSize = 20
const hasMoreNotes = computed(() => notes.value.length < totalNotes.value)
const selectedDate = ref<string | null>(null)
const isDateFiltered = computed(() => selectedDate.value !== null)
const filteredNotes = ref<Note[]>([])
const noteDates = ref<string[]>([])

// 计算属性：根据日期筛选和排序笔记
const sortedNotes = computed(() => {
  const notesToSort = isDateFiltered.value ? filteredNotes.value : notes.value
  return notesToSort
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

// 设置事件总线，用于监听笔记更新和创建事件
const noteUpdatedBus = useEventBus<Note>('note-updated')
const noteCreatedBus = useEventBus('note-created')
const eventBusDeleted = useEventBus('note-deleted')
const eventBusEmptyNotesMovedToTrash = useEventBus('empty-notes-moved-to-trash')
const eventBusNoteRestored = useEventBus('note-restored')

// 监听笔记更新事件
noteUpdatedBus.on((updatedNote) => {
  console.log('TimelineView.vue→ 监听到笔记更新事件', updatedNote)
  if (!updatedNote) return
  updateSingleNote(updatedNote)
})

eventBusNoteRestored.on(() => {
  console.log('TimelineView.vue→ 监听到笔记从回收站恢复事件')
  refreshNotes()
})

eventBusEmptyNotesMovedToTrash.on(() => {
  console.log('TimelineView.vue→ 监听到空笔记移到回收站事件')
  refreshNotes()
})

// 监听笔记创建事件
noteCreatedBus.on((newNote) => {
  console.log('TimelineView.vue→ 监听到新笔记创建:', newNote)
  // 将新笔记添加到列表开头
  notes.value.unshift(lastCreatedNote.value as Note)
  // 更新总数
  totalNotes.value++
})

// 监听笔记删除事件
eventBusDeleted.on(() => {
  console.log('TimelineView.vue→ 监听到笔记删除事件', lastDeletedNote.value)
  if (!lastDeletedNote.value) return
  // 如果删除的笔记在notes中，则删除
  const index = notes.value.findIndex((note) => note.id === lastDeletedNote.value?.id)
  if (index !== -1) {
    notes.value.splice(index, 1)
    // 强制更新虚拟列表
    nextTick(() => {
      virtualList.value = [...virtualList.value]
    })
  }
})

// 更新单个笔记的函数
const updateSingleNote = (updatedNote: Note) => {
  if (!updatedNote) return
  // 如果日历被选择了，则更新filteredNotes
  if (isDateFiltered.value) {
    const index = filteredNotes.value.findIndex((note) => note.id === updatedNote.id)
    if (index !== -1) {
      filteredNotes.value[index] = { ...filteredNotes.value[index], ...updatedNote }
    }
  }
  // 更新notes
  const index = notes.value.findIndex((note) => note.id === updatedNote.id)
  if (index !== -1) {
    notes.value[index] = { ...notes.value[index], ...updatedNote }
  }
}
// 处理笔记更新
// noteUpdatedBus.on((event: unknown) => {
//   const updatedNote = event as Note
//   console.log('TimelineView.vue→ 监听到笔记更新:', updatedNote)

//   // 查找并更新对应的笔记
//   const index = notes.value.findIndex((n) => n.id === updatedNote.id)
//   if (index !== -1) {
//     // 更新笔记数据
//     notes.value[index] = {
//       ...notes.value[index],
//       ...updatedNote
//     }

//     // 确保视图更新
//     nextTick(() => {
//       if (virtualList?.value) {
//         virtualList.value = [...virtualList.value]
//       }
//     })
//   } else {
//     console.warn('TimelineView.vue→ 未找到要更新的笔记:', updatedNote.id)
//   }
// })

// 使用虚拟列表优化性能
// const itemHeight = 340 // 每个笔记卡片的预估高度

// 定义垂直列表选项
const virtualListOptions: UseVirtualListOptions = {
  // 使用固定的 itemHeight
  itemHeight: 400,
  // 预渲染的额外项目数量
  overscan: 5
}

const {
  list: virtualList,
  containerProps,
  wrapperProps
} = useVirtualList(sortedNotes, virtualListOptions)

// 组件挂载时的初始化操作
onMounted(async () => {
  // console.log('组件挂载，开始加载笔记')
  if (notes.value.length === 0) {
    await refreshNotes()
  }
  // console.log('笔记加载完成，数量:', notes.value.length)
  isLoaded.value = true
  const dates = await noteStore.fetchAllDatesWithNotes()
  if (dates) {
    noteDates.value = dates
  }
  nextTick(() => {
    setupInfiniteScroll()
  })
})

// 刷新笔记列表
async function refreshNotes() {
  currentPage.value = 1
  notes.value = []
  await loadMoreNotes()
}

// 设置无限滚动
const observerTarget = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

// 组件卸载时清理观察者
onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
})

function setupInfiniteScroll() {
  // console.log('初始化 Intersection Observer')
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMoreNotes.value && !isLoading.value) {
        console.log('触发加载更多笔记')
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
    // console.log('观察目标元素设置完成')
  } else {
    console.warn('观察目标元素不存在')
  }
}

// 加载更多笔记
async function loadMoreNotes() {
  if (!isLoading.value && hasMoreNotes.value) {
    isLoading.value = true
    try {
      // console.log('开始加载更多笔记，当前页:', currentPage.value)
      const result = await noteStore.fetchPaginatedNotes(currentPage.value, pageSize)
      if (result) {
        notes.value.push(...result.notes)
        currentPage.value++
        // console.log('新加载的笔记数:', result.notes.length, '总笔记数:', notes.value.length)
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
  console.log('尝试滚动到顶部')
  const scrollContainer = containerProps.ref.value
  console.log('滚动容器:', scrollContainer)

  if (scrollContainer) {
    scrollContainer.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
    console.log('已执行滚动操作')
  } else {
    console.warn('未找到滚动容器')
  }
}

// 根据日期筛选笔记
async function filterNotesByDate(date: string | null) {
  selectedDate.value = date
  if (date) {
    try {
      const notes = await noteStore.fetchNotesByOneDate(date)
      if (!notes) {
        filteredNotes.value = []
      } else {
        filteredNotes.value = notes
      }
    } catch (error) {
      console.error('筛选笔记失败:', error)
      filteredNotes.value = []
    }
  } else {
    // 如果没有选择日期，重置为原始笔记列表
    filteredNotes.value = []
    await refreshNotes() // 重新加载所有笔记
  }
}

// 处理日历选择器事件（使用防抖优化）
const onDateSelected = debounce((date: string | null) => {
  console.log('TimelineView.vue→ 日历选择器事件触发', date)
  filterNotesByDate(date)
}, 300)

// 切换日历选择器
const toggleDateFilter = () => {
  if (selectedDate.value) {
    selectedDate.value = null
    filteredNotes.value = []
    refreshNotes()
  } else {
    uiStore.toggleCalendarPicker()
  }
}

// 在 script setup 中添加
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
      padding: 0 40px 0 0px;
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

.timeline-notes {
  position: relative;
  scroll-behavior: auto !important; // 禁用平滑滚动

  // 左侧时间线
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

.timeline-item {
  position: relative;
  margin-bottom: 10px; // 增加笔记之间的间距
  transform: translateZ(0); // 启用硬件加速
  will-change: transform; // 提示浏览器这个元素会经常变化
}

.note-wrapper {
  position: relative;
  padding-left: 60px; // 为时间线和圆点留出空间
  transition: all 0.2s ease;

  &:hover {
    // 只让卡片有轻微上浮效果
    .note-card {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      border-color: var(--color-primary);
    }

    // 时间线圆点效果优化
    .timeline-dot {
      transform: scale(1.2);
      border-color: var(--color-primary);
      // 添加发光效果但不移动位置
      box-shadow: 0 0 0 4px rgba(var(--color-primary-rgb), 0.15);
    }
  }
}

.timeline-dot {
  position: absolute;
  left: 36.5px; // 调整点的位置以对齐虚线
  top: 27.5px; // 根据实际卡片调整
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-bg-primary);
  border: 1.5px solid var(--color-primary);
  z-index: 1;
  transition: all 0.2s ease;
  box-shadow: 0 0 0 4px rgba(var(--color-primary-rgb), 0.1); // 添加光晕效果
}
</style>
