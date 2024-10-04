<template>
  <div class="search-result-preview">
    <div class="note-title">
      <span
        v-for="(part, index) in highlightedAddress"
        :key="index"
        :class="{ highlight: part.isMatch }"
      >
        {{ part.text }}
      </span>
    </div>
    <div class="note-content">
      <TipTapEditor :content="props.note.content" :editable="false" :enable-drag-handle="false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Note } from '@renderer/types/Note'
import TipTapEditor from '@renderer/components/TipTapEditor.vue'

const props = defineProps<{
  note: Note
  searchQuery: string
}>()

const highlightedParts = (text: string, query: string) => {
  if (!query.trim()) return [{ text, isMatch: false }]
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.split(regex).map((part) => ({
    text: part,
    isMatch: part.toLowerCase() === query.toLowerCase()
  }))
}

const highlightedAddress = computed(() => highlightedParts(props.note.address, props.searchQuery))
</script>

<style scoped lang="scss">
.search-result-preview {
  height: 300px;
  .note-title {
    font-weight: bold;
    margin-bottom: 4px;
  }

  .note-content {
    font-size: 0.9em;
    color: var(--color-text-secondary);
    max-height: 100px; // 限制预览高度
    overflow: hidden;
  }

  .highlight {
    background-color: rgba(255, 255, 0, 0.3);
    font-weight: bold;
  }

  :deep(.tiptap) {
    // 移除TipTap编辑器的默认边距
    margin: 0;
    padding: 0;
  }
}
</style>
