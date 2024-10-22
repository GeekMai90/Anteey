<template>
  <div class="note-preview-card">
    <div class="note-header">
      <span class="note-indicator"></span>
      <h3 class="note-title">{{ note.address }}</h3>
    </div>
    <div ref="noteContent" class="note-content marked-content">
      <TipTapRender
        v-model:content="localNote.content"
        :editable="false"
        :enable-drag-handle="false"
      />
    </div>
    <div class="note-timestamp">
      {{ formatDate(note.createdAt) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { Note } from '@renderer/types/Note'
import { formatDate } from '@renderer/utils/noteHelpers'
import { ref } from 'vue'
import TipTapRender from '@renderer/components/TipTapRender.vue'

const props = defineProps<{
  note: Note
}>()

const localNote = ref<Note>(props.note)
const noteContent = ref<HTMLDivElement | null>(null)
</script>

<style lang="scss" scoped>
.note-preview-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 14px 12px 8px 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}

.note-header {
  display: flex;
  align-items: center;
  margin-bottom: 2px;
}

.note-indicator {
  width: 4px;
  height: 10px;
  background-color: #00c8a8;
  border-radius: 2px;
  margin-right: 6px;
}

.note-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: bold;
  color: #333;
  line-height: 1;
}

.note-content {
  flex-grow: 1;
  color: #444;
  text-align: left;
  // margin-bottom: 10px;
  overflow-y: auto;
  max-height: calc(100% - 40px); // 调整这个值以适应你的布局
  font-size: 0.8rem;
}

.note-content::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
  /* Chrome, Safari, Opera */
}

.note-timestamp {
  font-size: 0.6em;
  color: #999;
  align-self: flex-end;
}

// 自定义 TipTapEditor 样式
:deep(.ProseMirror) {
  min-height: auto;
  max-height: none;
  overflow: visible;
}

:deep(.tiptap) {
  margin-left: 0;
  margin-right: 0;
  padding-left: 0;
  padding-right: 0;
}
</style>
