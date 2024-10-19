<!-- src/views/TimelineView.vue  -->
<template>
  <div v-if="isLoaded" class="timeline-view">
    <!-- 固定头部 -->
    <div class="sticky-header">
      <!-- 工具栏 -->
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>
      <div class="header-content">
        <!-- 时间线头部 -->
        <div class="timeline-header">
          <div class="timeline-header-left">
            <div class="icon">
              <TimeIcon theme="outline" size="20" fill="var(--color-primary)" :strokeWidth="3" />
            </div>
            <div class="name">时间线</div>
          </div>
          <div class="timeline-header-right">
            <!-- 添加搜索框 -->
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
                @input="handleSearch"
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
    <!-- 时间线内容 -->
    <div class="timeline-container">
      <div v-bind="containerProps" class="note-list-container">
        <div v-if="sortedNotes.length === 0" class="empty-state">
          <div class="empty-state-icon">📝</div>
          <h2 class="empty-state-title">暂无笔记</h2>
          <p class="empty-state-description">开始创建新笔记</p>
        </div>
        <div v-else v-bind="wrapperProps">
          <div v-for="{ index, data } in list" :key="index" :style="{ height: `${itemHeight}px` }">
            <NoteCard :note="data" @edit="noteStore.openNoteEditor" />
            <!-- {{ data }} -->
          </div>
        </div>
        <!-- 笔记列表 -->
        <!-- <NoteCard
          v-for="note in sortedNotes"
          :key="note.id"
          :note="note"
          @edit="noteStore.openNoteEditor"
        /> -->
        <!-- 添加底线 -->
        <div v-if="sortedNotes.length > 0" class="bottom-line">
          <div class="line"></div>
          <span class="text">🙈 我也是有底线的 🙊</span>
          <div class="line"></div>
        </div>
      </div>
    </div>
    <!-- 日历选择器 -->
    <CalendarPicker
      :notes="notesForCalendar"
      :isVisible="uiStore.isCalendarPickerOpen"
      :selectedDate="selectedDate"
      triggerElementSelector=".calendar-button"
      @dateSelected="onDateSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { useNoteStore } from '../stores/noteStores'
import { computed, onActivated, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Time as TimeIcon, Calendar, Search, Close } from '@icon-park/vue-next'
import AppToolbar from '../components/AppToolbar.vue'
import CalendarPicker from '../components/CalendarPicker.vue'
import { useUIStore } from '../stores/useUIStore'
import { useSearch } from '../composables/useSearch'
import { Note } from '@renderer/types/Note'
import NoteCard from '../components/NoteCard.vue'
import { useVirtualList } from '@vueuse/core'

// 初始化笔记状态
const noteStore = useNoteStore()
const { allNotes } = storeToRefs(noteStore)
const uiStore = useUIStore()

// 初始化时间线状态
const isLoaded = ref(false)
onMounted(async () => {
  await noteStore.$persist()
  isLoaded.value = true
})
// 获取笔记数据
const fetchNotes = async () => {
  await noteStore.fetchAllNotes()
}

// 获取笔记数据
onMounted(() => {
  fetchNotes() // 获取笔记数据
})
// 激活时获取笔记数据
onActivated(fetchNotes)

// 初始化搜索状态
const { searchQuery, handleSearch, filteredItems, clearSearch, selectedDate, setSelectedDate } =
  useSearch(allNotes)

const isSearchFocused = ref(false)

// 处理搜索框失去焦点
const handleBlur = () => {
  // 添加一个小延迟，以确保在点击清除按钮时不会立即失去焦点
  setTimeout(() => {
    isSearchFocused.value = false
  }, 100)
}

// 计算属性：按创建时间排序的笔记列表
const sortedNotes = computed(() => {
  const sorted = filteredItems.value
    .filter((note) => !note.isDeleted)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return sorted
})

// 使用虚拟列表
const itemHeight = 410 // 假设每个笔记卡片的高度为100px，根据实际情况调整

const { list, containerProps, wrapperProps } = useVirtualList(sortedNotes, {
  itemHeight,
  overscan: 5 // 预渲染的额外项目数量
})

// 创建一个新的计算属性，将 Date 类型的 createdAt 转换为 string 类型
const notesForCalendar = computed(() => {
  return allNotes.value.map((note: Note) => ({
    ...note,
    createdAt:
      note.createdAt instanceof Date
        ? note.createdAt.toISOString()
        : typeof note.createdAt === 'string'
          ? note.createdAt
          : new Date().toISOString()
  }))
})

// 处理日历选择器事件
const onDateSelected = (date: string | null) => {
  setSelectedDate(date)
}

// 切换日历选择器
const toggleDateFilter = () => {
  if (selectedDate.value) {
    setSelectedDate(null)
  } else {
    uiStore.toggleCalendarPicker()
  }
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
    // font-style: italic;
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
</style>
