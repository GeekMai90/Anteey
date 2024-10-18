// src/components/NoteList.vue
<template>
  <div class="note-list">
    <div v-if="notes.length === 0" class="empty-state">
      <div class="empty-state-icon">📝</div>
      <h2 class="empty-state-title">暂无笔记</h2>
      <p class="empty-state-description">点击右上角的添加按钮开始创建新笔记</p>
    </div>
    <NoteCard
      v-for="note in notes"
      :key="note.id"
      :note="note"
      @edit="handleEdit"
      @expand="handleExpang"
      @more="handleMore"
    />
    <!-- 添加底线 -->
    <div v-if="notes.length > 0" class="bottom-line">
      <div class="line"></div>
      <span class="text">🙈 我也是有底线的 🙊</span>
      <div class="line"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import NoteCard from '@renderer/components/NoteCard.vue'
import { Note } from '@renderer/types/Note'

defineProps<{
  notes: Note[]
}>()

const emit = defineEmits(['edit', 'expand', 'more'])

const handleEdit = (noteId: string) => {
  emit('edit', noteId)
}

const handleExpang = (noteId: string) => {
  emit('expand', noteId)
}

const handleMore = (noteId: string) => {
  emit('more', noteId)
}
</script>

<style lang="scss">
.note-list {
  display: flex;
  flex-direction: column;
  max-width: 900px;
  margin: 0 auto;
  min-height: 100%;
  width: 100%;
  position: relative; // 添加此行
  // 隐藏滚动条但保持功能
  scrollbar-width: none; // Firefox
  -ms-overflow-style: none; // IE and Edge

  &::-webkit-scrollbar {
    display: none; // Chrome, Safari, and Opera
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
    color: var(--color-text-primary);

    &-icon {
      font-size: 4rem;
      margin-bottom: 3rem;
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
}
</style>
