// src/views/TimelineView.vue

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
          <button class="add-note-button" @click="noteStore.createAndOpenNewNote">
            <Plus theme="outline" size="20" fill="#fff" />
          </button>
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
  </div>
</template>

<script setup lang="ts">
import NoteList from '../components/NoteList.vue'
import { useNoteStore } from '../stores/noteStores'
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Plus, Time } from '@icon-park/vue-next'
import AppToolbar from '../components/AppToolbar.vue'

// 初始化笔记状态
const noteStore = useNoteStore()
const { notes } = storeToRefs(noteStore)

// 计算属性：按创建时间排序的笔记列表
const sortedNotes = computed(() => {
  return [...notes.value]
    .filter((note) => !note.isDeleted)
    .sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
})

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
      max-width: 900px;
      padding: 0 20px;
      box-sizing: border-box;

      .timeline-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 10px 0;
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
