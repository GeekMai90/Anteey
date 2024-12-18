<template>
  <div
    class="whiteboard-text-card"
    :class="{ selected: isSelected }"
    :style="cardStyle"
    @mousedown.stop="handleMouseDown"
    @dblclick.stop="startEditing"
  >
    <div v-if="isEditing" class="edit-container">
      <textarea
        ref="textareaRef"
        v-model="editingContent"
        @blur="finishEditing"
        @keydown.enter.exact.prevent="finishEditing"
      ></textarea>
    </div>
    <div v-else class="content">{{ card.content }}</div>

    <!-- 调整大小的区域 -->
    <div v-show="!isEditing" class="resize-areas">
      <div class="resize-area top" @mousedown.stop="(e) => startResize('top', e)"></div>
      <div class="resize-area right" @mousedown.stop="(e) => startResize('right', e)"></div>
      <div class="resize-area bottom" @mousedown.stop="(e) => startResize('bottom', e)"></div>
      <div class="resize-area left" @mousedown.stop="(e) => startResize('left', e)"></div>
      <div class="resize-area top-left" @mousedown.stop="(e) => startResize('top-left', e)"></div>
      <div class="resize-area top-right" @mousedown.stop="(e) => startResize('top-right', e)"></div>
      <div
        class="resize-area bottom-right"
        @mousedown.stop="(e) => startResize('bottom-right', e)"
      ></div>
      <div
        class="resize-area bottom-left"
        @mousedown.stop="(e) => startResize('bottom-left', e)"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import { WhiteboardTextCard } from '@renderer/types/Whiteboard'
import { useWhiteboardStore } from '@renderer/stores/whiteboardStores'

const props = defineProps<{
  card: WhiteboardTextCard
  isSelected?: boolean
}>()

const emit = defineEmits<{
  mousedown: [event: MouseEvent]
  'resize-start': [{ direction: string; event: MouseEvent }]
  'note-interaction': [interacting: boolean]
}>()

const whiteboardStore = useWhiteboardStore()
const isEditing = ref(false)
const editingContent = ref(props.card.content)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const cardStyle = computed(() => ({
  color: props.card.style?.textColor || 'var(--color-text-primary)',
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
  emit('note-interaction', true)
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
  emit('note-interaction', false)
}

const startResize = (direction: string, event: MouseEvent) => {
  event.stopPropagation()
  emit('resize-start', { direction, event })
}

onUnmounted(() => {
  if (isEditing.value) {
    emit('note-interaction', false)
  }
})
</script>

<style lang="scss" scoped>
.whiteboard-text-card {
  position: absolute;
  background-color: var(--color-note-card-bg) !important;
  border-radius: 8px;
  border: 1.5px solid var(--color-border);
  padding: 8px;
  cursor: grab;
  user-select: none;

  &:active {
    cursor: grabbing;
  }

  .content {
    width: 100%;
    height: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    line-height: 16px;
    padding: 8px 12px;
    color: var(--color-text-primary);
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
      color: var(--color-text-primary);
      line-height: 16px;
      padding: 8px 12px;
    }
  }

  // 调整大小的区域样式
  .resize-areas {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;

    .resize-area {
      position: absolute;
      pointer-events: auto;

      &.top,
      &.bottom {
        left: 4px;
        right: 4px;
        height: 6px;
      }

      &.left,
      &.right {
        top: 4px;
        bottom: 4px;
        width: 6px;
      }

      &.top-left,
      &.top-right,
      &.bottom-left,
      &.bottom-right {
        width: 6px;
        height: 6px;
      }

      &.top {
        top: -3px;
        cursor: n-resize;
      }

      &.right {
        right: -3px;
        cursor: e-resize;
      }

      &.bottom {
        bottom: -3px;
        cursor: s-resize;
      }

      &.left {
        left: -3px;
        cursor: w-resize;
      }

      &.top-left {
        top: -3px;
        left: -3px;
        cursor: nw-resize;
      }

      &.top-right {
        top: -3px;
        right: -3px;
        cursor: ne-resize;
      }

      &.bottom-right {
        bottom: -3px;
        right: -3px;
        cursor: se-resize;
      }

      &.bottom-left {
        bottom: -3px;
        left: -3px;
        cursor: sw-resize;
      }
    }
  }

  &.selected {
    border-color: var(--color-primary);
  }
}
</style>
