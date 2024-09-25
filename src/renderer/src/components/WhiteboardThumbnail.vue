<template>
  <div
    class="whiteboard-thumbnail"
    :style="thumbnailStyle"
    @mousedown="startDrag"
    @dblclick="$emit('click')"
  >
    <h3>{{ whiteboard.name }}</h3>
    <div class="thumbnail-preview">
      <!-- 缩略图内容 -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Whiteboard } from '@renderer/types/Note'

const props = defineProps<{
  whiteboard: Whiteboard
  scale: number
}>()

const emit = defineEmits<{
  (e: 'click'): void
  (e: 'dragStart', id: string, event: MouseEvent): void
}>()

const thumbnailStyle = computed(() => ({
  transform: `translate(${props.whiteboard.position.x}px, ${props.whiteboard.position.y}px)`,
  position: 'absolute',
  cursor: 'move',
  width: '200px',
  height: '150px'
}))

const startDrag = (event: MouseEvent) => {
  emit('dragStart', props.whiteboard.id, event)
}
</script>

<style lang="scss" scoped>
.whiteboard-thumbnail {
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 10px;
  background-color: white;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  user-select: none;
}

.thumbnail-preview {
  width: 100%;
  height: calc(100% - 30px);
  overflow: hidden;
}

.card-preview {
  background-color: #f0f0f0;
  padding: 5px;
  font-size: 0.8em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
