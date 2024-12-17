<template>
  <div
    class="whiteboard-text-card"
    :style="cardStyle"
    @mousedown.stop="handleMouseDown"
    @dblclick.stop="startEditing"
  >
    <div v-if="isEditing" class="edit-container">
      <textarea
        v-model="editingContent"
        @blur="finishEditing"
        @keydown.enter.exact.prevent="finishEditing"
        ref="textareaRef"
      ></textarea>
    </div>
    <div v-else class="content">{{ card.content }}</div>

    <!-- 调整大小的手柄 -->
    <div class="resize-handles">
      <div class="resize-handle top" @mousedown="startResize('top', $event)"></div>
      <div class="resize-handle right" @mousedown="startResize('right', $event)"></div>
      <div class="resize-handle bottom" @mousedown="startResize('bottom', $event)"></div>
      <div class="resize-handle left" @mousedown="startResize('left', $event)"></div>
      <div class="resize-handle top-left" @mousedown="startResize('top-left', $event)"></div>
      <div class="resize-handle top-right" @mousedown="startResize('top-right', $event)"></div>
      <div
        class="resize-handle bottom-right"
        @mousedown="startResize('bottom-right', $event)"
      ></div>
      <div class="resize-handle bottom-left" @mousedown="startResize('bottom-left', $event)"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { WhiteboardTextCard } from '@renderer/types/Note'
import { useWhiteboardStore } from '@renderer/stores/whiteboardStores'

const props = defineProps<{
  card: WhiteboardTextCard
}>()

const emit = defineEmits<{
  mousedown: [event: MouseEvent]
  'resize-start': [{ direction: string; event: MouseEvent }]
}>()

const whiteboardStore = useWhiteboardStore()
const isEditing = ref(false)
const editingContent = ref(props.card.content)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const cardStyle = computed(() => ({
  transform: `rotate(${props.card.rotation}deg)`,
  width: `${props.card.size.width}px`,
  height: `${props.card.size.height}px`,
  backgroundColor: props.card.style?.backgroundColor || '#ffffff',
  color: props.card.style?.textColor || '#000000',
  fontSize: `${props.card.style?.fontSize || 14}px`,
  fontFamily: props.card.style?.fontFamily || 'inherit'
}))

const handleMouseDown = (event: MouseEvent) => {
  if (!isEditing.value) {
    emit('mousedown', event)
  }
}

const startEditing = () => {
  isEditing.value = true
  editingContent.value = props.card.content
  setTimeout(() => {
    textareaRef.value?.focus()
  })
}

const finishEditing = async () => {
  if (editingContent.value !== props.card.content) {
    try {
      await whiteboardStore.updateWhiteboardTextCard(props.card.id, {
        content: editingContent.value
      })
    } catch (error) {
      console.error('更新文本卡片失败:', error)
      editingContent.value = props.card.content
    }
  }
  isEditing.value = false
}

const startResize = (direction: string, event: MouseEvent) => {
  event.stopPropagation()
  emit('resize-start', { direction, event })
}
</script>

<style lang="scss" scoped>
.whiteboard-text-card {
  position: absolute;
  background-color: #ffffff;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 8px;
  cursor: move;
  user-select: none;

  .content {
    width: 100%;
    height: 100%;
    overflow: auto;
    white-space: pre-wrap;
  }

  .edit-container {
    width: 100%;
    height: 100%;

    textarea {
      width: 100%;
      height: 100%;
      border: none;
      outline: none;
      resize: none;
      background: transparent;
      font: inherit;
      color: inherit;
    }
  }
}

// 复用现有的 resize-handle 样式
</style>
