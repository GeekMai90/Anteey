<!-- src/components/StarredNotesContextMenu.vue -->
<template>
  <div
    v-if="show"
    v-click-outside="close"
    class="starred-notes-context-menu"
    :style="{ top: `${y}px`, left: `${x}px` }"
  >
    <div class="unstar-option context-menu-item" @click.stop="handleUnstar">
      <div class="icon">
        <Star theme="outline" size="20" fill="#b6b6b6" />
      </div>
      <div class="name">取消收藏</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Star } from '@icon-park/vue-next'
import { useNoteStore } from '@renderer/stores/noteStore'

const props = defineProps<{
  show: boolean
  x: number
  y: number
  noteId: string
}>()

const emit = defineEmits(['close'])

const noteStore = useNoteStore()

const close = () => {
  emit('close')
}

const handleUnstar = () => {
  noteStore.removeStarFromNote(props.noteId)
  close()
}
</script>

<style scoped lang="scss">
.starred-notes-context-menu {
  position: fixed;
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 9999;
  min-width: 150px;
  width: max-content;
  max-width: 250px;
  overflow-y: auto;
  padding: 6px 12px;
  white-space: nowrap;
}

.context-menu-item {
  position: relative;
  display: flex;
  align-items: center;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
  padding: 4px 4px;
  margin: 2px;

  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 24px;
    height: 24px;
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
      width: 16px;
      height: 16px;
    }
  }

  .name {
    flex-grow: 0;
    text-align: left;
    color: var(--default-text-color);
    font-size: 13px;
    font-weight: 400;
    margin-left: 6px;
    white-space: nowrap;
    writing-mode: horizontal-tb;
  }

  &:hover {
    background-color: var(--color-hover-button);
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.1);
  }
}
</style>
