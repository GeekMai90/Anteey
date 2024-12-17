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
    <div class="resize-handles" v-show="!isEditing">
      <div class="resize-handle top" @mousedown.stop="(e) => startResize('top', e)"></div>
      <div class="resize-handle right" @mousedown.stop="(e) => startResize('right', e)"></div>
      <div class="resize-handle bottom" @mousedown.stop="(e) => startResize('bottom', e)"></div>
      <div class="resize-handle left" @mousedown.stop="(e) => startResize('left', e)"></div>
      <div class="resize-handle top-left" @mousedown.stop="(e) => startResize('top-left', e)"></div>
      <div
        class="resize-handle top-right"
        @mousedown.stop="(e) => startResize('top-right', e)"
      ></div>
      <div
        class="resize-handle bottom-right"
        @mousedown.stop="(e) => startResize('bottom-right', e)"
      ></div>
      <div
        class="resize-handle bottom-left"
        @mousedown.stop="(e) => startResize('bottom-left', e)"
      ></div>
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
  background-color: var(--color-note-card-bg) !important;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 8px;
  cursor: move;
  user-select: none;

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

  // 调整大小的手柄样式
  .resize-handles {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;

    .resize-handle {
      position: absolute;
      width: 8px;
      height: 8px;
      background-color: var(--color-primary);
      border-radius: 50%;
      pointer-events: auto;
      opacity: 0;
      transition: opacity 0.2s;

      &:hover {
        opacity: 1;
      }
    }

    .top {
      top: -4px;
      left: 50%;
      transform: translateX(-50%);
      cursor: n-resize;
    }
    .right {
      top: 50%;
      right: -4px;
      transform: translateY(-50%);
      cursor: e-resize;
    }
    .bottom {
      bottom: -4px;
      left: 50%;
      transform: translateX(-50%);
      cursor: s-resize;
    }
    .left {
      top: 50%;
      left: -4px;
      transform: translateY(-50%);
      cursor: w-resize;
    }
    .top-left {
      top: -4px;
      left: -4px;
      cursor: nw-resize;
    }
    .top-right {
      top: -4px;
      right: -4px;
      cursor: ne-resize;
    }
    .bottom-right {
      bottom: -4px;
      right: -4px;
      cursor: se-resize;
    }
    .bottom-left {
      bottom: -4px;
      left: -4px;
      cursor: sw-resize;
    }
  }

  &:hover .resize-handle {
    opacity: 0.5;
  }
}
</style>
