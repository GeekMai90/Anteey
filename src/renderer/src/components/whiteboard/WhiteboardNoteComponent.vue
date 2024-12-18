<!-- src/components/WhiteNoteComponent.vue -->
<template>
  <div
    :id="`note-${props.item.id}`"
    ref="noteRef"
    class="whiteboard-note-component"
    :class="['whiteboard-note', { hovered: isHovered, editing: isEditing, selected: isSelected }]"
    :style="noteStyle"
    @click="handleClick"
    @mousedown.stop="handleMouseDown"
    @touchstart.stop="handleTouchStart"
    @dblclick="startEditing"
    @v-click-outside="stopEditing"
    @mouseenter="handleNoteHover(true)"
    @mouseleave="handleNoteHover(false)"
  >
    <!-- 根据类型渲染不同的内容组件 -->
    <component
      :is="noteComponent"
      v-bind="noteProps"
      @update:content="handleContentUpdate"
      @editor-mousedown="handleEditorMouseDown"
    />

    <!-- 调整大小的手柄 -->
    <div
      v-for="direction in resizeDirections"
      :key="direction"
      :class="['resize-handle', direction]"
      @mousedown="(event) => handleResizeStart(direction, event)"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { WhiteboardNote } from '@renderer/types/Whiteboard'
import CardNote from './notes/CardNote.vue'
import TextNote from './notes/TextNote.vue'
import ImageNote from './notes/ImageNote.vue'
import { useDrag } from '@renderer/composables/whiteboard/useDrag'
import { useResize, type ResizeDirection } from '@renderer/composables/whiteboard/useResize'

// 组件映射
const noteComponents = {
  card: CardNote,
  text: TextNote,
  image: ImageNote
}

// 定义调整大小的方向
const resizeDirections: ResizeDirection[] = [
  'top',
  'right',
  'bottom',
  'left',
  'top-left',
  'top-right',
  'bottom-right',
  'bottom-left'
]

const props = defineProps<{
  item: WhiteboardNote
  isHovered: boolean
  isSelected: boolean
  scale: number
}>()

const emit = defineEmits<{
  (e: 'hover', value: boolean): void
  (e: 'update:position', x: number, y: number): void
  (e: 'update:size', width: number, height: number): void
  (e: 'start-connection', item: WhiteboardNote): void
  (e: 'note-interaction', value: boolean): void
}>()

const noteRef = ref<HTMLElement | null>(null)
const isEditing = ref(false)
const noteStyle = computed(() => ({
  width: `${props.item.size.width}px`,
  height: `${props.item.size.height}px`,
  transform: `translate(${props.item.position.x}px, ${props.item.position.y}px) rotate(${props.item.rotation}deg)`,
  zIndex: props.item.zIndex
}))

// 根据类型计算要渲染的组件
const noteComponent = computed(() => noteComponents[props.item.type])

// 根据类型计算要传递的props
const noteProps = computed(() => {
  const commonProps = {
    isEditing: isEditing.value,
    style: props.item.style
  }

  switch (props.item.type) {
    case 'card':
      return {
        ...commonProps,
        noteId: props.item.noteId,
        isAutoHeight: Boolean(props.item.isAutoHeight)
      }
    case 'text':
      return {
        ...commonProps,
        content: props.item.content
      }
    case 'image':
      return {
        ...commonProps,
        imageUrl: props.item.imageUrl,
        originalSize: props.item.originalSize
      }
    default:
      return commonProps
  }
})

// 事件处理函数
const handleClick = () => {
  emit('note-interaction', true)
}

// 使用拖拽组合式函数
const { startDrag } = useDrag({
  onDragStart: () => {
    if (isEditing.value) return
    emit('note-interaction', true)
  },
  onDragMove: (deltaX: number, deltaY: number) => {
    emit(
      'update:position',
      props.item.position.x + deltaX / props.scale,
      props.item.position.y + deltaY / props.scale
    )
  },
  onDragEnd: () => {
    emit('note-interaction', false)
  }
})

// 使用调整大小组合式函数
const { startResize: initResize } = useResize({
  onResizeStart: (event: MouseEvent) => {
    // 设置初始大小和位置
    event.stopPropagation()
    emit('note-interaction', true)
  },
  onResize: (newSize: { width: number; height: number }, offset: { x: number; y: number }) => {
    // 确保最小尺寸
    const width = Math.max(100, newSize.width)
    const height = Math.max(100, newSize.height)

    // 更新大小
    emit('update:size', width, height)

    // 更新位置（考虑缩放比例）
    if (offset.x !== 0 || offset.y !== 0) {
      emit(
        'update:position',
        props.item.position.x + offset.x / props.scale,
        props.item.position.y + offset.y / props.scale
      )
    }
  },
  onResizeEnd: () => {
    emit('note-interaction', false)
  }
})

const handleResizeStart = (direction: ResizeDirection, event: MouseEvent) => {
  // 传入当前元素的尺寸信息
  initResize(event, direction, {
    width: props.item.size.width,
    height: props.item.size.height
  })
}

// 处理鼠标事件
const handleMouseDown = (event: MouseEvent) => {
  if (!isEditing.value) {
    startDrag(event)
  }
}

const handleTouchStart = (event: TouchEvent) => {
  if (!isEditing.value) {
    event.preventDefault()
    const touch = event.touches[0]
    startDrag(touch as unknown as MouseEvent)
  }
}

const handleNoteHover = (value: boolean) => {
  emit('hover', value)
}

const startEditing = () => {
  isEditing.value = true
  emit('note-interaction', true)
}

const stopEditing = () => {
  isEditing.value = false
  emit('note-interaction', false)
}

const handleEditorMouseDown = (event: MouseEvent) => {
  if (!isEditing.value) {
    event.preventDefault()
    startDrag(event)
  }
}

const handleContentUpdate = (content: string) => {
  if (props.item.type === 'text') {
    // 处理文本内容更新
    console.log('Text content updated:', content)
  }
}
</script>

<style lang="scss" scoped>
.whiteboard-note-component {
  position: absolute;
  background-color: var(--color-note-card-bg);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--color-shadow-primary);
  transition: height 0.2s ease;
  overflow: visible;
  padding: 10px;

  // 添加位置和大小样式
  left: 0;
  top: 0;
  transform-origin: 0 0;

  &.editing {
    border: 1px solid var(--color-primary);
  }

  .editor-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    width: 100%;
    overflow: hidden; // 修改这里
    transition: height 0.2s ease-out;

    .address-input {
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding-left: 27px;

      &.not-editing {
        cursor: grab;
        &:active {
          cursor: grabbing;
        }
        .note-indicator,
        input {
          cursor: grab;
          &:active {
            cursor: grabbing;
          }
        }
      }

      input {
        width: 100%;
        padding: 8px 0;
        /* 移除左右内边距，保留上下内边距 */
        border: none;
        /* 移除所有边框 */
        outline: none;
        /* 移除聚焦时的轮廓 */
        font-size: 1.3rem;
        font-weight: bold;
        background-color: transparent;
        /* 确保背景透明 */

        &::placeholder {
          display: flex;
          color: var(--color-text-placeholder); // 使用变量或直接指定颜色
          font-size: 1rem; // 调整字体大小
          font-weight: normal; // 调整字体粗细
          // font-style: italic; // 可选：使用斜体
          opacity: 0.7; // 调整透明度
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          left: 0;
        }

        &:focus::placeholder {
          opacity: 0.5; // 当输入框获得焦点时，可以改变 placeholder 的样式
        }
        &[readonly] {
          background-color: transparent;
          cursor: grab;
          &:active {
            cursor: grabbing;
          }
        }
      }

      .note-indicator {
        width: 4px;
        height: 14px;
        border-radius: 2px;
        margin-right: 10px;
        display: block;
        flex-shrink: 0;
        cursor: pointer;
        border: none;
        outline: none;
        transition: all 0.3s ease;
        z-index: 10; // 增加 z-index 确保它在最上层

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

        &:hover {
          width: 6px;
          height: 15px;
        }
      }
    }

    .content-area {
      flex-grow: 1;
      display: flex;
      overflow-y: auto;
      min-height: 0;
      width: 100%;
      overflow: hidden; // 修改这里

      .content-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: visible;
        width: 100%;
      }
    }

    :deep(.tiptap-container) {
      width: 100%;
      overflow: visible;
      height: auto !important; // 强制移除固定高度
      position: relative;
    }

    :deep(.tiptap) {
      min-width: calc(100% - 40px);
      overflow: visible;
      height: auto !important; // 强制移除固定高度
      min-height: 100px;
      padding-left: 2rem;
      padding-right: 2rem;
    }
  }

  .card-type-menu {
    position: fixed;
    background-color: var(--color-bg-primary);
    border-radius: 8px;
    box-shadow: var(--shadow-primary);
    z-index: 1000;
    padding: 8px 0;
    width: auto;
    align-items: center;

    .card-type-item {
      display: flex;
      align-items: center;
      width: 150px;
      padding: 2px 8px;
      border: none;
      background: none;
      cursor: pointer;
      transition: background-color 0.2s;
      border-radius: 8px;
      margin: 2px 8px;

      .icon {
        background: none;
        border: none;
        cursor: pointer;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: background-color 0.2s;
        padding: 0;
        margin-right: 5px;

        &:hover:not(:disabled) {
          background-color: var(--color-hover-bg);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        // 新增以下样式来处理 i-icon 类
        :deep(.i-icon) {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        :deep(svg) {
          width: 16px; // 或者您想要的大小
          height: 16px; // 或者您想要的大小
        }
      }

      .name {
        flex-grow: 0;
        text-align: left;
        color: var(--color-text-primary);
        font-size: 14px;
        white-space: nowrap; // 防止文字换行
        writing-mode: horizontal-tb; // 确保文字是水平排列的
      }

      &:hover {
        background-color: var(--color-hover-bg);
      }

      &.active {
        background-color: var(--color-menu-active-bg);
        // border: 1px solid var(--color-primary);
      }
    }
  }
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
.whiteboard-item.selected {
  outline: 2px solid var(--color-primary);
  /* 或者使用其他你喜欢的样式来表示选中状态 */
}
</style>
