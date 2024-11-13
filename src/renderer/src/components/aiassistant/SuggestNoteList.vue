<template>
  <div class="note-list">
    <div
      v-for="(note, index) in items"
      :key="note.id"
      class="note-item"
      :class="{ 'is-selected': selectedIndex === index }"
      @click="$emit('select', note)"
    >
      <div class="note-title">
        <Notes theme="outline" size="16" />
        {{ note.title }}
      </div>
      <div class="note-preview">{{ formatPreview(note.content) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Notes } from '@icon-park/vue-next'
import type { Note } from '../../types/Note'

defineProps<{
  items: Note[]
  selectedIndex: number
}>()

defineEmits<{
  (e: 'select', note: Note): void
}>()

const formatPreview = (content: string) => {
  return content.slice(0, 100) + (content.length > 100 ? '...' : '')
}
</script>

<style lang="scss" scoped>
.note-list {
  padding: 0.5rem;
}

.note-item {
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 4px;

  &:hover,
  &.is-selected {
    background: var(--color-bg-secondary);
  }

  .note-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
  }

  .note-preview {
    margin-top: 0.25rem;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }
}
</style>
