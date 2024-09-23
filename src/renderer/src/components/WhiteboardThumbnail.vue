<!-- WhiteboardThumbnail.vue -->
<template>
  <div
    class="whiteboard-thumbnail"
    :style="thumbnailStyle"
    @mousedown="startDrag"
    @dblclick="$emit('click')"
  >
    <h3>{{ whiteboard.name }}</h3>
    <div class="thumbnail-preview">
      <!-- Display up to 6 card previews -->
      <div v-for="card in previewCards" :key="card.id" class="card-preview">
        {{ card.content.substring(0, 20) }}...
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Whiteboard } from '@renderer/types/Note'

const props = defineProps<{
  whiteboard: Whiteboard
}>()

const emit = defineEmits<{
  (e: 'click'): void
  (e: 'update-position', id: string, x: number, y: number): void
}>()

const position = ref(props.whiteboard.position || { x: 0, y: 0 })

const thumbnailStyle = computed(() => ({
  transform: `translate(${position.value.x}px, ${position.value.y}px)`,
  position: 'absolute',
  cursor: 'move'
}))

let isDragging = false
let startX = 0
let startY = 0

const startDrag = (event: MouseEvent) => {
  isDragging = true
  startX = event.clientX - position.value.x
  startY = event.clientY - position.value.y

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (event: MouseEvent) => {
  if (!isDragging) return

  const newX = event.clientX - startX
  const newY = event.clientY - startY

  position.value = { x: newX, y: newY }
}

const stopDrag = () => {
  isDragging = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)

  emit('update-position', props.whiteboard.id, position.value.x, position.value.y)
}
</script>

<style lang="scss" scoped>
.whiteboard-thumbnail {
  width: 200px;
  height: 150px;
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
