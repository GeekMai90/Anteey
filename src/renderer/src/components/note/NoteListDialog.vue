<template>
  <div v-if="visible" class="note-list-dialog-overlay" @click="handleOverlayClick">
    <div class="note-list-dialog" @click.stop>
      <div class="dialog-header">
        <div class="title">全部子节点</div>
        <div class="close-btn" @click="close">
          <Close theme="outline" size="16" />
        </div>
      </div>
      <div class="dialog-content">
        <div v-for="note in notes" :key="note.id" class="note-item" @click="handleNoteClick(note)">
          <div class="note-address">{{ note.address }}</div>
          <Right theme="outline" size="16" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Close, Right } from '@icon-park/vue-next'
import type { Note } from '@renderer/types/Note'

// @ts-ignore - props are used in template
defineProps<{
  visible: boolean
  notes: Note[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', note: Note): void
}>()

const handleOverlayClick = () => {
  emit('close')
}

const close = () => {
  emit('close')
}

const handleNoteClick = (note: Note) => {
  emit('select', note)
  close()
}
</script>

<style lang="scss" scoped>
.note-list-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.note-list-dialog {
  background: var(--color-bg-primary);
  border-radius: 8px;
  width: 400px;
  max-height: 80vh;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  .dialog-header {
    padding: 16px;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    justify-content: space-between;
    align-items: center;

    .title {
      font-size: 16px;
      font-weight: 500;
      color: var(--color-text-primary);
    }

    .close-btn {
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      color: var(--color-text-secondary);
      transition: all 0.2s ease;

      &:hover {
        background: var(--color-hover-bg);
      }
    }
  }

  .dialog-content {
    padding: 8px;
    max-height: calc(80vh - 60px);
    overflow-y: auto;

    .note-item {
      padding: 12px;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: var(--color-hover-bg);
      }

      .note-address {
        color: var(--color-text-primary);
      }

      :deep(svg) {
        color: var(--color-text-secondary);
      }
    }
  }
}
</style>
