<template>
  <div
    class="text-card"
    ref="cardRef"
    :style="{
      left: `${card.position.x}px`,
      top: `${card.position.y}px`,
      width: `${card.size.width}px`,
      minHeight: '36px',
      transform: `rotate(${card.rotation || 0}deg)`,
      zIndex: card.zIndex,
      borderColor: card.style?.color || 'var(--color-border)',
      backgroundColor: card.style?.color
        ? `color-mix(in srgb, ${card.style.color} 5%, var(--color-bg-primary))`
        : 'var(--color-bg-primary)'
    }"
    :class="{ selected: props.selected }"
    @mousedown="startDrag"
    @dblclick="handleDoubleClick"
    @click.stop="emit('select')"
  >
    <div v-if="props.selected" class="card-menu">
      <button class="menu-button" @click.stop="emit('delete')" v-tooltip.bottom="'删除'">
        <Delete theme="outline" size="16" :strokeWidth="3" />
      </button>
      <button class="menu-button" @click.stop="toggleColorPicker" v-tooltip.bottom="'设置颜色'">
        <Paint theme="outline" size="16" :strokeWidth="3" />
      </button>
      <button class="menu-button" @click.stop="emit('focus')" v-tooltip.bottom="'聚焦'">
        <Focus theme="outline" size="16" :strokeWidth="3" />
      </button>
    </div>

    <div v-if="showColorPicker" class="color-picker">
      <button
        v-for="color in colors"
        :key="color.value"
        class="color-button"
        :style="{ backgroundColor: color.value }"
        @click.stop="selectColor(color.value)"
        :class="{ active: card.style?.color === color.value }"
      ></button>
    </div>

    <div class="card-content">
      <div
        class="text-content"
        :contenteditable="isEditing"
        @input="handleInput"
        @blur="handleBlur"
        @mousedown="handleMouseDown"
        ref="textContentRef"
      ></div>
    </div>
    <div class="resize-handle bottom-right" @mousedown.stop="handleResizeStart($event)"></div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { Delete, Paint, Focus } from '@icon-park/vue-next'
import type { TextCard } from '@renderer/types/mindboard'

const props = defineProps<{
  card: TextCard
  scale: number
  selected?: boolean
}>()

const emit = defineEmits<{
  update: [updateData: Partial<TextCard>]
  select: []
  delete: []
  focus: []
}>()

const cardRef = ref<HTMLElement | null>(null)
const textContentRef = ref<HTMLElement | null>(null)
const isEditing = ref(false)
let isDragging = false
let startX = 0
let startY = 0
let originalX = 0
let originalY = 0

let isResizing = false
let startWidth = 0
let startHeight = 0
let startMouseX = 0
let startMouseY = 0

const colors = [
  { value: 'var(--color-border)' as const }, // 默认边框色
  { value: 'var(--color-text-pink)' as const },
  { value: 'var(--color-text-orange)' as const },
  { value: 'var(--color-text-green)' as const },
  { value: 'var(--color-text-cyan)' as const },
  { value: 'var(--color-text-blue)' as const },
  { value: 'var(--color-text-purple)' as const }
]

type CardColor = (typeof colors)[number]['value']

const showColorPicker = ref(false)

const toggleColorPicker = () => {
  showColorPicker.value = !showColorPicker.value
}

const selectColor = (color: CardColor) => {
  emit('update', {
    id: props.card.id,
    style:
      color === 'var(--color-border)'
        ? { ...props.card.style, color: undefined }
        : { ...props.card.style, color }
  })
  showColorPicker.value = false
}

const handleClickOutside = (e: Event) => {
  const target = e.target as HTMLElement
  if (showColorPicker.value && target && !target.closest('.color-picker')) {
    showColorPicker.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 处理双击事件
const handleDoubleClick = (e: MouseEvent) => {
  // 如果点击的是调整大小的手柄，不进入编辑模式
  if ((e.target as HTMLElement).classList.contains('resize-handle')) {
    return
  }

  emit('select')
  isEditing.value = true
  // 等待 DOM 更新后聚焦
  nextTick(() => {
    if (textContentRef.value) {
      textContentRef.value.focus()
      // 如果内容为空，清除占位符
      if (!props.card.content) {
        textContentRef.value.innerHTML = ''
      }
      // 将光标移到文本末尾
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(textContentRef.value)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  })
}

// 开始拖动
const startDrag = (e: MouseEvent) => {
  // 如果正在编辑，不启动拖动
  if (isEditing.value) {
    return
  }

  // 如果点击的是调整大小的手柄，不启动拖动
  if ((e.target as HTMLElement).classList.contains('resize-handle')) {
    return
  }

  emit('select')
  e.stopPropagation()
  e.preventDefault() // 阻止文本选择
  isDragging = true
  startX = e.clientX
  startY = e.clientY
  originalX = props.card.position.x
  originalY = props.card.position.y

  const handleDrag = (e: MouseEvent) => {
    if (!isDragging) return

    const dx = e.clientX - startX
    const dy = e.clientY - startY

    emit('update', {
      id: props.card.id,
      position: {
        x: originalX + dx,
        y: originalY + dy
      }
    })
  }

  const handleDragEnd = () => {
    isDragging = false
    document.removeEventListener('mousemove', handleDrag)
    document.removeEventListener('mouseup', handleDragEnd)
  }

  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', handleDragEnd)
}

const handleInput = (e: Event) => {
  const content = (e.target as HTMLDivElement).innerHTML
  emit('update', { id: props.card.id, content })
}

const handleBlur = () => {
  isEditing.value = false
  // 如果内容为空，显示占位符
  if (textContentRef.value && !textContentRef.value.innerHTML.trim()) {
    textContentRef.value.innerHTML = ''
  }
}

const handleMouseDown = (e: MouseEvent) => {
  if (isEditing.value) {
    // 编辑状态下，阻止事件冒泡但不阻止默认行为（允许文本选择）
    e.stopPropagation()
  } else {
    // 非编辑状态下，阻止默认行为并启动拖动
    e.preventDefault()
    e.stopPropagation()
    startDrag(e)
  }
}

// 处理调整大小的开始
const handleResizeStart = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()

  isResizing = true
  startWidth = props.card.size.width
  startHeight = props.card.size.height
  startMouseX = e.clientX
  startMouseY = e.clientY

  const handleResize = (e: MouseEvent) => {
    if (!isResizing) return

    // 计算鼠标实际移动的距离（考虑缩放）
    const deltaX = (e.clientX - startMouseX) / props.scale
    const deltaY = (e.clientY - startMouseY) / props.scale

    // 只处理右下角的调整
    const newWidth = Math.max(100, startWidth + deltaX)
    const newHeight = Math.max(36, startHeight + deltaY)

    emit('update', {
      id: props.card.id,
      size: { width: newWidth, height: newHeight }
    })
  }

  const handleResizeEnd = () => {
    isResizing = false
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', handleResizeEnd)
  }

  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', handleResizeEnd)
}

// 监听 props 变化，更新内容
watch(
  () => props.card.content,
  (newContent) => {
    if (textContentRef.value && !isEditing.value) {
      // 确保在组件挂载后设置内容
      nextTick(() => {
        if (textContentRef.value) {
          textContentRef.value.innerHTML = newContent || ''
        }
      })
    }
  },
  { immediate: true, deep: true }
)

// 在组件挂载时设置初始内容
onMounted(() => {
  if (textContentRef.value && props.card.content) {
    textContentRef.value.innerHTML = props.card.content
  }
})
</script>

<style lang="scss" scoped>
.text-card {
  position: absolute;
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  border: 2px solid var(--color-border);
  padding: 12px;
  cursor: grab;
  user-select: none;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    border-color: var(--color-primary);
  }

  &:focus-within {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  &:active {
    cursor: grabbing;
  }

  .card-content {
    width: 100%;
    overflow: auto;
    cursor: inherit;

    .text-content {
      outline: none;
      min-height: 1em;
      white-space: pre-wrap;
      word-break: break-word;
      cursor: inherit;
      user-select: none;
      line-height: 1.5;
      font-size: 14px;
      color: var(--color-text-primary);

      &[contenteditable='true'] {
        cursor: text;
        user-select: text;
      }

      &:empty::before {
        content: '输入文本...';
        color: var(--color-text-placeholder);
      }
    }
  }

  .resize-handle {
    position: absolute;
    width: 8px;
    height: 8px;
    background-color: var(--color-primary);
    border-radius: 50%;
    opacity: 0;
    transition: opacity 0.2s;

    &.bottom-right {
      bottom: -4px;
      right: -4px;
      cursor: se-resize;
    }
  }

  &:hover .resize-handle {
    opacity: 1;
  }

  &.selected {
    border-color: v-bind('card.style?.color || "var(--color-primary)"');
    box-shadow: 0 0 0 2px
      color-mix(in srgb, v-bind('card.style?.color || "var(--color-primary)"') 20%, transparent);
  }

  .card-menu {
    position: absolute;
    top: -40px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 4px;
    padding: 4px;
    background-color: var(--color-bg-secondary);
    border-radius: 6px;
    box-shadow: var(--shadow-primary);
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;

    .menu-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 4px;
      background: none;
      cursor: pointer;
      color: var(--color-text-primary);
      transition: all 0.2s;

      &:hover {
        background-color: var(--color-hover-bg);
      }
    }
  }

  &.selected .card-menu {
    opacity: 1;
    pointer-events: auto;
  }

  .color-picker {
    position: absolute;
    top: -40px;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 38px;
    display: flex;
    gap: 4px;
    padding: 4px;
    background-color: var(--color-bg-secondary);
    border-radius: 6px;
    box-shadow: var(--shadow-primary);
    z-index: 1000;

    .color-button {
      width: 24px;
      height: 24px;
      border: 2px solid transparent;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        transform: scale(1.1);
      }

      &.active {
        border-color: var(--color-primary);
      }
    }
  }
}
</style>
