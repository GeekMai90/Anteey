<!-- WhiteboardNoteComponent.vue -->
<template>
  <div
    :id="`note-${props.note.id}`"
    :class="['whiteboard-note', { hovered: isHovered }]"
    :style="noteStyle"
  >
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
    <button class="connection-button" @click.stop="startConnection">
      <Plus theme="outline" size="16" fill="#FFF" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue'
import NoteCard from './NoteCard.vue'
import { Note, WhiteboardNote } from '@renderer/types/Note'
import { Plus } from '@icon-park/vue-next'

const props = defineProps<{
  note: Note
  width?: number
  height?: number
  item: WhiteboardNote
  isHovered: boolean
}>()

const emit = defineEmits(['resize-start', 'start-connection'])

const noteStyle = computed(() => ({
  width: props.width ? `${props.width}px` : '200px',
  height: props.height ? `${props.height}px` : '150px'
}))

const startResize = (direction: string, event: MouseEvent) => {
  emit('resize-start', { direction, event })
}
const startConnection = (event: MouseEvent) => {
  event.stopPropagation()
  console.log('Start connection clicked') // 添加这行来调试
  emit('start-connection', props.item)
}
</script>

<style lang="scss" scoped>
.whiteboard-note {
  background-color: var(--color-bg-primary);
  position: relative;
  &.hovered {
    border: 2px solid #3498db; // 蓝色边框，可以根据需要调整颜色
  }
}

.whiteboard-note-content {
  background-color: var(--color-bg-primary);
  width: 100%;
  height: 100%;
  border: 1px solid black;
}

.resize-handle {
  position: absolute;
  // background-color: #4a90e2;
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

.connection-button {
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 10;
  padding: 5px;
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
:deep(.note-card) {
  padding: 0;
  margin: 0;
}
.connection-point {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #3498db;
  border: 2px solid white;
  // 位置会在 JavaScript 中动态设置
}
</style>
