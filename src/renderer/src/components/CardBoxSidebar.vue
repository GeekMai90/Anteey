<template>
  <div class="card-box-sidebar">
    <div class="sidebar-header">
      <div class="search-input">
        <input v-model="searchQuery" placeholder="搜索并拖拽创建笔记" @input="searchNotes" />
      </div>
    </div>
    <div class="sidebar-content">
      <div
        v-for="note in filteredNotes"
        :key="note.id"
        class="sidebar-note"
        draggable="true"
        @dragstart="onDragStart(note, $event)"
      >
        <CardBoxSidebarNoteCard :note="note" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNoteStore } from '../stores/noteStores'
import CardBoxSidebarNoteCard from './CardBoxSidebarNoteCard.vue'
// import { Note } from '@renderer/types/Note'

// const emit = defineEmits(['drag-note'])

const onDragStart = (note: any, event: any) => {
  event.dataTransfer.setData('application/json', JSON.stringify(note))
  event.dataTransfer.effectAllowed = 'copy'
}

const noteStore = useNoteStore()
const searchQuery = ref('')

const filteredNotes = computed(() => {
  if (!searchQuery.value) {
    return noteStore.notes
  }
  return noteStore.notes.filter((note) =>
    note.address.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const searchNotes = () => {
  // 可以在这里添加防抖逻辑
}
</script>

<style scoped lang="scss">
.card-box-sidebar {
  height: 100vh;
  background-color: var(--color-shape-tertiary);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: relative;

  .sidebar-header {
    margin-top: 40px;
    padding: 0 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 40px;
    box-sizing: border-box;

    .search-input {
      display: flex;
      align-items: center;
      flex-grow: 1;

      input {
        width: 100%;
        padding: 8px;
        border: 1px solid var(--color-border);
        border-radius: 4px;
        background-color: var(--color-bg-input);
        color: var(--color-text-primary);

        &::placeholder {
          color: var(--color-text-secondary);
        }

        &:focus {
          outline: none;
          border-color: var(--color-primary);
        }
      }

      .clear-button {
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: background-color 0.2s ease;

        &:hover {
          background-color: var(--color-hover-button);
        }
      }
    }
  }

  .sidebar-content {
    flex-grow: 1;
    overflow-y: auto;
    padding: 10px 15px;
  }

  .sidebar-note {
    margin-bottom: 10px;
    // padding: 10px;
    border-radius: 8px;
    background-color: var(--color-bg-primary);
    cursor: move;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: var(--color-hover-button);
    }
  }
}

@media (max-width: 768px) {
  .card-box-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 1000;
    width: 100% !important;
  }
}
.editor-content {
  display: flex;
  flex-direction: column;
  // flex-grow: 1;
  flex: 1;
  min-height: 0;
  // padding: 0 10px 0 20px;
  width: 100%;
  // padding: 0 10px;
  overflow: hidden; // 防止双重滚动条

  .address-input {
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-left: 27px;

    input {
      width: 100%;
      padding: 8px 0;
      /* 移除左右内边距，保留上下内边距 */
      border: none;
      /* 移除所有边框 */
      outline: none;
      /* 移除聚焦时的轮廓 */
      font-size: 1.3rem;
      font-weight: bold;
      background-color: transparent;
      /* 确保背景透明 */

      &::placeholder {
        display: flex;
        color: var(--color-text-placeholder); // 使用变量或直接指定颜色
        font-size: 1rem; // 调整字体大小
        font-weight: normal; // 调整字体粗细
        // font-style: italic; // 可选：使用斜体
        opacity: 0.7; // 调整透明度
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        left: 0;
      }

      &:focus::placeholder {
        opacity: 0.5; // 当输入框获得焦点时，可以改变 placeholder 的样式
      }
    }

    .note-indicator {
      width: 4px;
      height: 14px;
      border-radius: 2px;
      margin-right: 10px;
      display: block;
      flex-shrink: 0;
      cursor: pointer;
      border: none;
      outline: none;
      transition: all 0.3s ease;

      &.maincard {
        background-color: var(--color-primary);
      }

      &.bibcard {
        background-color: var(--color-yellow);
      }

      &.indexcard {
        background-color: var(--color-blue);
      }

      &.hoplinkcard {
        background-color: var(--color-pink);
      }

      &:hover {
        width: 6px;
        height: 15px;
      }
    }
  }

  .content-area {
    flex-grow: 1;
    display: flex;
    overflow-y: auto;
    min-height: 0;
    width: 100%;
    height: 100%;
    // max-width: 640px;
    // margin: 0 auto;

    .content-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 100%;
      padding-bottom: 50px; // 添加底部填充
      width: 100%;
    }
  }

  :deep(.tiptap-container) {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    padding: 0 10px;
    position: relative;
  }

  :deep(.tiptap) {
    // min-width: calc(640px - 64px);
    min-width: calc(100% - 40px);
    // width: 100%;
    min-height: 100%;
    overflow-y: auto;
    // overflow: hidden;
    padding-bottom: 60px;
  }
}

.card-type-menu {
  position: fixed;
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 1000;
  padding: 8px 0;
  width: auto;
  align-items: center;

  .card-type-item {
    display: flex;
    align-items: center;
    width: 150px;
    padding: 2px 8px;
    border: none;
    background: none;
    cursor: pointer;
    transition: background-color 0.2s;
    border-radius: 8px;
    margin: 2px 8px;

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
      margin-right: 5px;

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
    }

    &:hover {
      background-color: var(--color-hover-bg);
    }

    &.active {
      background-color: var(--color-menu-active-bg);
      // border: 1px solid var(--color-primary);
    }
  }
}
</style>
