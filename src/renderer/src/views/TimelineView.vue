<!-- src/views/TimelineView.vue  -->

<template>
  <div class="timeline-view">
    <!-- 固定头部 -->
    <div class="sticky-header">
      <!-- 工具栏 -->
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>
      <div class="header-content">
        <!-- 时间线头部 -->
        <div class="timeline-header">
          <div class="timeline-header-left">
            <div class="icon">
              <Time theme="outline" size="20" fill="var(--color-primary)" :strokeWidth="2" />
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
                    fill="var(--color-text-secondary)"
                    :strokeWidth="2"
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
                    fill="var(--color-text-secondary)"
                    :strokeWidth="2"
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
                <Calendar theme="outline" size="20" fill="#b6b6b6" :strokeWidth="2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 时间线内容 -->
    <div class="timeline-container">
      <div class="note-list-container">
        <!-- 笔记列表 -->
        <NoteList
          :notes="sortedNotes"
          @edit="noteStore.openNoteEditor"
          @expand="expandNote"
          @more="showMoreOptions"
          @delete="handleDelete"
        />
      </div>
    </div>
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
import NoteList from '../components/NoteList.vue'
import { useNoteStore } from '../stores/noteStores'
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Time, Calendar, Search, Close } from '@icon-park/vue-next'
import AppToolbar from '../components/AppToolbar.vue'
import CalendarPicker from '../components/CalendarPicker.vue'
import { useUIStore } from '../stores/useUIStore'
import { useSearch } from '../composables/useSearch'
import { Note } from '@renderer/types/Note'
// 初始化笔记状态
const noteStore = useNoteStore()
const { allNotes } = storeToRefs(noteStore)
const uiStore = useUIStore()

const { searchQuery, handleSearch, filteredItems, clearSearch, selectedDate, setSelectedDate } =
  useSearch(allNotes)

const isSearchFocused = ref(false)

const handleBlur = () => {
  // 添加一个小延迟，以确保在点击清除按钮时不会立即失去焦点
  setTimeout(() => {
    isSearchFocused.value = false
  }, 100)
}

// 计算属性：按创建时间排序的笔记列表
const sortedNotes = computed(() => {
  return filteredItems.value
    .filter((note) => !note.isDeleted)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

// 创建一个新的计算属性，将 Date 类型的 createdAt 转换为 string 类型
const notesForCalendar = computed(() => {
  return allNotes.value.map((note: Note) => ({
    ...note,
    createdAt: note.createdAt.toISOString() // 将 Date 转换为 ISO 字符串
  }))
})

const onDateSelected = (date: string | null) => {
  setSelectedDate(date)
}
const toggleDateFilter = () => {
  if (selectedDate.value) {
    setSelectedDate(null)
  } else {
    uiStore.toggleCalendarPicker()
  }
}

onMounted(async () => {
  await fetchNotes() // 获取笔记数据
})

const fetchNotes = async () => {
  await noteStore.fetchAllNotes()
}

// 展开笔记（这里可以实现查看完整笔记内容的逻辑）
const expandNote = (noteId: string) => {
  console.log('Expand note:', noteId)
  // 这里可以实现打开一个模态框显示完整笔记内容，或者导航到笔记详情页面
}

// 显示更多选项（这里可以实现显示更多操作的逻辑，如删除、移动等）
const showMoreOptions = (noteId: string) => {
  console.log('Show more options for note:', noteId)
  // 这里可以实现显示一个包含更多操作的下拉菜单或模态框
}

// 删除笔记
const handleDelete = async (noteId: string) => {
  try {
    await noteStore.moveToTrash(noteId)
    console.log('笔记已移动到回收站')
  } catch (error) {
    console.error('移动笔记到回收站失败:', error)
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
    margin-bottom: 10px;

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
        margin-bottom: 10px;
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
    }
  }
}
</style>
