<template>
  <div class="whiteboard-note" :style="noteStyle">
    <div class="whiteboard-note-content">
      <NoteCard :note="props.note" />
    </div>
    <div class="resize-handle top" @mousedown="startResize('top', $event)"></div>
    <div class="resize-handle right" @mousedown="startResize('right', $event)"></div>
    <div class="resize-handle bottom" @mousedown="startResize('bottom', $event)"></div>
    <div class="resize-handle left" @mousedown="startResize('left', $event)"></div>
    <div class="resize-handle top-left" @mousedown="startResize('top-left', $event)"></div>
    <div class="resize-handle top-right" @mousedown="startResize('top-right', $event)"></div>
    <div class="resize-handle bottom-right" @mousedown="startResize('bottom-right', $event)"></div>
    <div class="resize-handle bottom-left" @mousedown="startResize('bottom-left', $event)"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue'
import NoteCard from './NoteCard.vue'
import { Note } from '@renderer/types/Note'

const props = defineProps<{
  note: Note
  width?: number
  height?: number
}>()

const emit = defineEmits(['resize-start'])

const noteStyle = computed(() => ({
  width: props.width ? `${props.width}px` : '200px',
  height: props.height ? `${props.height}px` : '150px'
}))

const startResize = (direction: string, event: MouseEvent) => {
  emit('resize-start', { direction, event })
}
</script>

<style lang="scss" scoped>
.whiteboard-note {
  background-color: var(--color-bg-primary);
  position: relative;
}

.whiteboard-note-content {
  background-color: var(--color-bg-primary);
  width: 100%;
  height: 100%;
}

.resize-handle {
  position: absolute;
  background-color: #4a90e2;
  z-index: 10;

  &.top,
  &.bottom {
    left: 4px;
    right: 4px;
    height: 4px;
    cursor: ns-resize;
  }

  &.left,
  &.right {
    top: 4px;
    bottom: 4px;
    width: 4px;
    cursor: ew-resize;
  }

  &.top {
    top: 0;
  }
  &.right {
    right: 0;
  }
  &.bottom {
    bottom: 0;
  }
  &.left {
    left: 0;
  }

  &.top-left,
  &.top-right,
  &.bottom-left,
  &.bottom-right {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  &.top-left {
    top: -4px;
    left: -4px;
    cursor: nwse-resize;
  }
  &.top-right {
    top: -4px;
    right: -4px;
    cursor: nesw-resize;
  }
  &.bottom-left {
    bottom: -4px;
    left: -4px;
    cursor: nesw-resize;
  }
  &.bottom-right {
    bottom: -4px;
    right: -4px;
    cursor: nwse-resize;
  }
}
</style>
