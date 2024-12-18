<!-- src/components/WhiteNoteComponent.vue -->
<template>
  <div
    :id="`note-${props.item.id}`"
    ref="noteRef"
    class="whiteboard-note"
    :class="{
      hovered: isHovered,
      editing: isEditing,
      selected: isSelected
    }"
    :style="noteStyle"
    @mousedown.stop="handleMouseDown"
    @touchstart.stop="handleTouchStart"
    @dblclick="startEditing"
    @mouseenter="handleNoteHover(true)"
    @mouseleave="handleNoteHover(false)"
    @mousemove="handleMouseMove"
  >
    <!-- 添加工具栏 -->
    <WhiteboardNoteToolbar
      v-if="isSelected && !isEditing"
      @delete="handleDelete"
      @color="handleColor"
      @focus="handleFocus"
    />

    <!-- 添加连线锚点 -->
    <div
      v-for="anchor in connectionAnchors"
      :key="anchor.position"
      class="connection-anchor"
      :class="[anchor.position, { visible: anchor.isHovered }]"
      @mouseenter="handleAnchorHover(anchor.position, true)"
      @mouseleave="handleAnchorHover(anchor.position, false)"
      @mousedown.stop="startConnection(anchor.position)"
    />

    <!-- 根据类型渲染不同的内容组件 -->
    <component
      :is="noteComponent"
      v-bind="noteProps"
      @update:content="handleContentUpdate"
      @editor-mousedown="handleEditorMouseDown"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { WhiteboardNote } from '@renderer/types/Whiteboard'
import CardNote from './notes/CardNote.vue'
import TextNote from './notes/TextNote.vue'
import ImageNote from './notes/ImageNote.vue'
import { useDrag } from '@renderer/composables/whiteboard/useDrag'
import { useResize, type ResizeDirection } from '@renderer/composables/whiteboard/useResize'
import WhiteboardNoteToolbar from './WhiteboardNoteToolbar.vue'
import { useWhiteboardStore } from '@renderer/stores/whiteboardStores'
import { message } from '@renderer/utils/message'

const whiteboardStore = useWhiteboardStore()

// 组件映射
const noteComponents = {
  card: CardNote,
  text: TextNote,
  image: ImageNote
}

const props = defineProps<{
  item: WhiteboardNote
  isHovered: boolean
  isSelected?: boolean
  scale: number
}>()

const emit = defineEmits<{
  (e: 'hover', value: boolean): void
  (e: 'update:position', x: number, y: number): void
  (e: 'update:size', width: number, height: number): void
  (e: 'start-connection', item: WhiteboardNote & { startPoint: { x: number; y: number } }): void
  (e: 'note-interaction', value: boolean): void
  (e: 'stop-editing'): void
  (e: 'select', id: string, event: MouseEvent): void
  (e: 'start-drag', id: string, event: MouseEvent): void
  (
    e: 'focus',
    noteInfo: { position: { x: number; y: number }; size: { width: number; height: number } }
  ): void
}>()

const noteRef = ref<HTMLElement | null>(null)
const isEditing = ref(false)
const noteStyle = computed(() => {
  const style = {
    width: `${props.item.size.width}px`,
    height: `${props.item.size.height}px`,
    transform: `translate(${props.item.position.x}px, ${props.item.position.y}px) rotate(${props.item.rotation}deg)`,
    zIndex: props.item.zIndex,
    backgroundColor: 'var(--color-bg-primary)' // 统一使用默认背景色
  }

  // 只设置边框颜色
  if (props.item.style?.backgroundColor) {
    style.borderColor = props.item.style.backgroundColor
  }

  return style
})

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
    event.stopPropagation()
    emit('note-interaction', true)
  },
  onResize: (newSize: { width: number; height: number }, offset: { x: number; y: number }) => {
    // 根据类型设置不同的最小高度
    const minHeight = props.item.type === 'text' ? 55 : 100
    const minWidth = 100

    // 确保最小尺寸
    const width = Math.max(minWidth, newSize.width)
    const height = Math.max(minHeight, newSize.height)

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
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const border = 8

    // 只检测右边、下边和右下角
    let direction: ResizeDirection | null = null

    if (y > rect.height - border && x > rect.width - border) {
      direction = 'bottom-right'
    } else if (x > rect.width - border) {
      direction = 'right'
    } else if (y > rect.height - border) {
      direction = 'bottom'
    }

    if (direction) {
      // 调整大小
      handleResizeStart(direction, event)
    } else {
      // 如果当前元素未被选中，则触发选择事件
      if (!props.isSelected) {
        emit('select', props.item.id, event)
      }
      // 触发拖拽开始事件
      emit('start-drag', props.item.id, event)
    }
  }
}

const handleTouchStart = (event: TouchEvent) => {
  if (!isEditing.value) {
    event.preventDefault()
    const touch = event.touches[0]
    startDrag(touch as unknown as MouseEvent)
  }
}

// 添加一个状态来跟踪当前激活的锚点
const activeAnchor = ref<AnchorPosition | null>(null)

// 修改处理锚点悬停的函数
const handleAnchorHover = (position: AnchorPosition, isHovered: boolean) => {
  if (isHovered) {
    // 当鼠标进入锚点时，设置为激活状态
    activeAnchor.value = position
  } else {
    // 当鼠标离开锚点时，只有在离开当前激活的锚点时才重置状态
    if (activeAnchor.value === position) {
      activeAnchor.value = null
    }
  }
  // 更新锚点的显示状态
  connectionAnchors.value.forEach((anchor) => {
    anchor.isHovered = anchor.position === activeAnchor.value
  })
}

// 修改鼠标移动处理函数
const handleMouseMove = (event: MouseEvent) => {
  if (!noteRef.value || isEditing.value) return

  const rect = noteRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  const threshold = 30 // 检测区域的阈值
  const border = 8 // resize 区域的阈值

  // 只在非调整大小区域显示锚点
  const isInResizeArea =
    (y > rect.height - border && x > rect.width - border) || // 右下角
    x > rect.width - border || // 右边
    y > rect.height - border // 下边

  if (!isInResizeArea && props.isSelected) {
    // 如果已经有激活的锚点，不要改变状态
    if (activeAnchor.value) return

    // 重置所有锚点的显示状态
    connectionAnchors.value.forEach((anchor) => {
      anchor.isHovered = false
    })

    // 检测是否靠近各个边缘
    if (y < threshold && x > threshold && x < rect.width - threshold) {
      handleAnchorHover('top', true)
    } else if (x > rect.width - threshold && y > threshold && y < rect.height - threshold) {
      handleAnchorHover('right', true)
    } else if (y > rect.height - threshold && x > threshold && x < rect.width - threshold) {
      handleAnchorHover('bottom', true)
    } else if (x < threshold && y > threshold && y < rect.height - threshold) {
      handleAnchorHover('left', true)
    }
  }

  // 调用原有的 resize hover 处理
  handleResizeHover(event)
}

// 修改笔记悬停处理函数
const handleNoteHover = (value: boolean) => {
  emit('hover', value)
  // 当鼠标离开笔记时，重置所有状态
  if (!value) {
    activeAnchor.value = null
    connectionAnchors.value.forEach((anchor) => {
      anchor.isHovered = false
    })
  }
}

const startEditing = () => {
  isEditing.value = true
  emit('note-interaction', true)
}

const stopEditing = () => {
  if (isEditing.value) {
    isEditing.value = false
    emit('note-interaction', false)
    emit('stop-editing')
  }
}

const handleEditorMouseDown = (event: MouseEvent) => {
  if (!isEditing.value) {
    event.preventDefault()
    startDrag(event)
  }
}

const handleContentUpdate = async (content: string) => {
  if (props.item.type === 'text') {
    try {
      // 直接保存到数据库
      await whiteboardStore.updateWhiteboardNoteContent(props.item.id, content)
    } catch (error) {
      console.error('更新文本内容失败:', error)
      message.error('保存失败')
    }
  }
}

// 添加调整大小区域检测
const handleResizeHover = (event: MouseEvent) => {
  if (!props.isSelected) return

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  const border = 8

  // 检测鼠标位置并设置对应的光标
  const target = event.currentTarget as HTMLElement
  if (y > rect.height - border && x > rect.width - border) {
    target.style.cursor = 'se-resize'
  } else if (x > rect.width - border) {
    target.style.cursor = 'e-resize'
  } else if (y > rect.height - border) {
    target.style.cursor = 's-resize'
  } else {
    target.style.cursor = 'move'
  }
}

// 定义锚点位置类型
type AnchorPosition = 'top' | 'right' | 'bottom' | 'left'

interface ConnectionAnchor {
  position: AnchorPosition
  isHovered: boolean
}

// 连线锚点状态
const connectionAnchors = ref<ConnectionAnchor[]>([
  { position: 'top', isHovered: false },
  { position: 'right', isHovered: false },
  { position: 'bottom', isHovered: false },
  { position: 'left', isHovered: false }
])

// 开始创建连接
const startConnection = (position: AnchorPosition) => {
  // 根据锚点位置计算起始点坐标
  const rect = noteRef.value?.getBoundingClientRect()
  if (!rect) return

  const startPoint = {
    x: props.item.position.x,
    y: props.item.position.y
  }

  switch (position) {
    case 'top':
      startPoint.x += props.item.size.width / 2
      break
    case 'right':
      startPoint.x += props.item.size.width
      startPoint.y += props.item.size.height / 2
      break
    case 'bottom':
      startPoint.x += props.item.size.width / 2
      startPoint.y += props.item.size.height
      break
    case 'left':
      startPoint.y += props.item.size.height / 2
      break
  }

  // 创建一个新对象，包含所有必要的属性
  const connectionItem = {
    ...props.item,
    startPoint
  }

  emit('start-connection', connectionItem)
}

// 工具栏事件处理函数（暂时为空，后续实现）
const handleDelete = async () => {
  try {
    await whiteboardStore.deleteWhiteboardNote(props.item.id)
    // 删除成功后，可以添加一些反馈
    message.success('删除成功')
  } catch (error) {
    console.error('删除白板笔记失败:', error)
    message.error('删除失败')
  }
}

const handleColor = async (color: string | null) => {
  try {
    const updatedNote = {
      ...props.item,
      style: {
        ...props.item.style,
        backgroundColor: color || undefined
      }
    }
    await whiteboardStore.updateWhiteboardNoteStyle(props.item.id, updatedNote.style)
  } catch (error) {
    console.error('更新笔记颜色失败:', error)
    message.error('更新颜色失败')
  }
}

const handleFocus = () => {
  // 触发聚焦事件，传递当前笔记的位置和大小信息
  emit('focus', {
    position: props.item.position,
    size: props.item.size
  })
}

// 添加到组件的生命周期中
onMounted(() => {
  // 监听画布点击事件
  const canvas = document.querySelector('.whiteboard-canvas')
  if (canvas) {
    canvas.addEventListener('mousedown', (event) => {
      if (event.target === canvas) {
        stopEditing()
      }
    })
  }
})
</script>

<style lang="scss" scoped>
.whiteboard-note {
  position: absolute;
  background-color: var(--color-bg-primary); // 默认背景色
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: visible;
  // padding: 10px;
  border: 2px solid var(--color-border);

  // 添加位置和大小样式
  left: 0;
  top: 0;
  transform-origin: 0 0;

  &.selected {
    border-color: var(--color-primary);
  }

  &.editing {
    border-color: var(--color-primary);
  }

  &.hovered:not(.selected):not(.editing) {
    border-color: var(--color-border-hover);
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

    :deep(.tiptap-container),
    :deep(.tiptap),
    :deep(.editor-content) {
      background-color: inherit !important; // 强制继承父元素背景色
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
        writing-mode: horizontal-tb; // 确保字是水平排列的
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

  // 添加连线锚点样式
  .connection-anchor {
    position: absolute;
    width: 8px;
    height: 8px;
    background-color: var(--color-primary);
    border-radius: 50%;
    opacity: 0;
    transition: all 0.2s ease;
    cursor: crosshair;
    z-index: 100;
    border: 2px solid white;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);

    &.visible {
      opacity: 1;
    }

    // 增加悬停区域但保持视觉大小
    &::before {
      content: '';
      position: absolute;
      top: -12px;
      right: -12px;
      bottom: -12px;
      left: -12px;
    }

    &.top {
      top: -4px;
      left: 50%;
      transform: translateX(-50%) scale(1);

      &:hover {
        transform: translateX(-50%) scale(1.5);
      }
    }

    &.right {
      right: -4px;
      top: 50%;
      transform: translateY(-50%) scale(1);

      &:hover {
        transform: translateY(-50%) scale(1.5);
      }
    }

    &.bottom {
      bottom: -4px;
      left: 50%;
      transform: translateX(-50%) scale(1);

      &:hover {
        transform: translateX(-50%) scale(1.5);
      }
    }

    &.left {
      left: -4px;
      top: 50%;
      transform: translateY(-50%) scale(1);

      &:hover {
        transform: translateY(-50%) scale(1.5);
      }
    }
  }

  backface-visibility: hidden;
  transform-style: preserve-3d;
  will-change: transform;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  &.editing {
    // 编辑状态下强制使用 GPU 加速
    transform: translateZ(0);
  }
}
.whiteboard-item.selected {
  outline: 2px solid var(--color-primary);
  /* 或者使用其他你喜欢的样式来表示选中状态 */
}
</style>
