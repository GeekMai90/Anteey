<template>
  <div v-if="note" class="note-preview-popup" :style="positionStyle">
    <div class="preview-card">
      <div class="note-header">
        <span class="note-indicator" :class="cardTypeClass"></span>
        <h3 class="note-title">{{ note.address }}</h3>
      </div>
      <div class="note-content">
        <TipTapRender :content="note.content" :editable="false" :enable-drag-handle="false" />
      </div>
      <div class="note-timestamp">
        {{ formatDate(note.createdAt) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Note } from '@shared/types'
import { formatDate } from '@renderer/utils/noteHelpers'
import TipTapRender from '@renderer/components/tiptap/TipTapRender.vue'
import { useNoteStore } from '@renderer/stores/noteStores'

const props = defineProps<{
  noteId: string
  position: { x: number; y: number }
}>()

const note = ref<Note | null>(null)
const noteStore = useNoteStore()

// 监听 noteId 变化，获取笔记数据
watch(
  () => props.noteId,
  async (newId) => {
    if (newId) {
      note.value = await noteStore.fetchNoteById(newId)
    } else {
      note.value = null
    }
  },
  { immediate: true }
)

const positionStyle = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`
}))

const cardTypeClass = computed(() => {
  if (!note.value) return ''
  switch (note.value.cardType) {
    case 'Maincard':
      return 'maincard'
    case 'Bibcard':
      return 'bibcard'
    case 'Indexcard':
      return 'indexcard'
    case 'Hoplinkcard':
      return 'hoplinkcard'
    default:
      return ''
  }
})
</script>

<style lang="scss" scoped>
.note-preview-popup {
  position: fixed;
  z-index: 1000;
  pointer-events: none;

  .preview-card {
    width: 300px;
    background-color: var(--color-note-card-bg);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 12px 0 8px 0;

    .note-header {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      padding: 0 12px 0 20px;
      position: relative;

      .note-indicator {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 12px;
        border-radius: 1.5px;

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
      }

      .note-title {
        margin: 0;
        font-size: 13px;
        font-weight: 500;
        color: var(--color-text-primary);
      }
    }

    .note-content {
      padding: 0 12px;
      max-height: 200px;
      overflow: hidden;
      font-size: 13px;
      color: var(--color-text-primary);

      :deep(.tiptap) {
        margin: 0 !important;
        padding: 0 !important;
      }
    }

    .note-timestamp {
      padding: 0 12px;
      font-size: 11px;
      color: var(--color-text-secondary);
      text-align: right;
      margin-top: 8px;
    }
  }
}
</style>
