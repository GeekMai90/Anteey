<template>
  <div
    class="text-node"
    :class="{ selected: selected, resizing: isResizing }"
    :style="nodeStyle"
    @dblclick="handleDoubleClick"
  >
    <div class="text-node-background">
      <div class="background-base"></div>
      <div class="background-theme" :style="{ backgroundColor: nodeStyle.backgroundColor }"></div>
    </div>

    <NodeToolbar :is-visible="selected" :position="data.toolbarPosition || Position.Top">
      <div class="toolbar-buttons">
        <!-- 合并后的颜色选择器 -->
        <div class="color-picker-wrapper">
          <button
            v-tooltip.top="{ content: '卡片颜色', delay: { show: 1000 } }"
            title="卡片颜色"
            @click="showColorPicker = !showColorPicker"
          >
            <Platte theme="outline" size="18" fill="var(--color-icon-default)" :stroke-width="3" />
          </button>
          <div v-if="showColorPicker" class="color-picker-panel">
            <div
              v-for="color in themeColors"
              :key="color.border"
              class="color-item"
              :style="{
                backgroundColor: color.bg,
                borderColor: color.border
              }"
              @click="handleColorSelect(color)"
            />
          </div>
        </div>

        <!-- 添加聚焦按钮 -->
        <button
          v-tooltip.top="{ content: '聚焦卡片', delay: { show: 1000 } }"
          title="聚焦节点"
          @click="handleFocus"
        >
          <Aiming theme="outline" size="18" fill="var(--color-icon-default)" :stroke-width="3" />
        </button>
        <button
          v-tooltip.top="{ content: '删除卡片', delay: { show: 1000 } }"
          @click="handleDelete"
        >
          <Delete theme="outline" size="18" fill="var(--color-icon-default)" :stroke-width="3" />
        </button>
        <button v-tooltip.top="{ content: '编辑卡片', delay: { show: 1000 } }" @click="handleEdit">
          <Edit theme="outline" size="18" fill="var(--color-icon-default)" :stroke-width="3" />
        </button>
      </div>
    </NodeToolbar>

    <Handle id="top-source" type="source" :position="Position.Top" class="handle top" />
    <Handle id="right-source" type="source" :position="Position.Right" class="handle right" />
    <Handle id="bottom-source" type="source" :position="Position.Bottom" class="handle bottom" />
    <Handle id="left-source" type="source" :position="Position.Left" class="handle left" />

    <div class="text-node-content" @mousedown="handleContentMouseDown" @click="handleContentClick">
      <TipTapEditor
        ref="editor"
        v-model:content="nodeContent"
        :editable="isEditing"
        :enable-drag-handle="false"
        :note-id="noteId"
        @update:content="onContentUpdate"
        @blur="handleEditorBlur"
        @click="handleEditorClick"
      />
    </div>

    <NodeResizer :width="250" :min-width="250" :min-height="55" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Position, Handle, useVueFlow } from '@vue-flow/core'
import { Aiming, Platte, Delete, Edit } from '@icon-park/vue-next'
import { NodeToolbar } from '@vue-flow/node-toolbar'
import TipTapEditor from '@renderer/components/tiptap/TipTapEditor.vue'
import { NodeResizer } from '@vue-flow/node-resizer'
// import '@vue-flow/node-resizer/dist/style.css'

const props = defineProps({
  id: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  },
  noteId: {
    type: String,
    required: true
  }
})

const isEditing = ref(false)
const isResizing = ref(false)
const nodeStyle = ref({
  width: props.data.width,
  height: props.data.height,
  backgroundColor: props.data.backgroundColor || 'var(--color-bg-primary)',
  borderColor: props.data.borderColor || 'var(--color-border)'
})
const editor = ref(null)
const nodeContent = ref(props.data.content || '')
const { updateNodeData, removeNodes } = useVueFlow()
const vueFlowInstance = useVueFlow()

const emit = defineEmits(['update'])

// 颜色选择器状态
const showColorPicker = ref(false)

// 主题颜色配置
const themeColors = [
  {
    border: 'var(--color-border)',
    bg: 'transparent'
  },
  {
    border: 'var(--color-primary)',
    bg: 'rgba(var(--color-primary-rgb), 0.04)'
  },
  {
    border: 'var(--color-yellow)',
    bg: 'rgba(var(--color-yellow-rgb), 0.04)'
  },
  {
    border: 'var(--color-blue)',
    bg: 'rgba(var(--color-blue-rgb), 0.04)'
  },
  {
    border: 'var(--color-danger)',
    bg: 'rgba(var(--color-danger-rgb), 0.04)'
  }
]

// 处理编辑器点击
const handleEditorClick = (event: any) => {
  if (!isEditing.value) {
    // 非编辑状态下，手动触发节点的点击事件
    event.stopPropagation()
    if (event.target) {
      const nodeElement = event.target.closest('.text-node')
      if (nodeElement) {
        nodeElement.click()
      }
    }
  }
}

// 处理内容区域点击
const handleContentClick = (event: any) => {
  // event.stopPropagation()
  // 如果不是编辑模式，阻止 TipTap 的默认行为
  if (!isEditing.value) {
    event.preventDefault()
  }
}

// 处理节点双击
const handleDoubleClick = (event: any) => {
  event.stopPropagation()
  if (props.selected && !isEditing.value) {
    enterEditMode()
  }
}

// 进入编辑模式
const enterEditMode = () => {
  isEditing.value = true
  updateNodeData(props.id, { draggable: false })
  nextTick(() => {
    if (editor.value) {
      ;(editor.value as any).focus()
    }
  })
}

// 退出编辑模式
const exitEditMode = () => {
  isEditing.value = false
  updateNodeData(props.id, { draggable: true })
}

// 处理内容区域的鼠标按下事件
const handleContentMouseDown = (event: any) => {
  if (isEditing.value) {
    event.stopPropagation() // 编辑模式下阻止事件冒泡，防止拖动
  }
}

// 处理编辑器失去焦点
const handleEditorBlur = () => {
  exitEditMode()
}

const onContentUpdate = (content: any) => {
  emit('update', {
    id: props.id,
    content
  })
}

const handleDelete = () => {
  removeNodes([props.id])
}

const handleEdit = () => {
  enterEditMode()
}

// 处理颜色选择
const handleColorSelect = (color: any) => {
  nodeStyle.value.borderColor = color.border
  nodeStyle.value.backgroundColor = color.bg
  updateNodeData(props.id, {
    borderColor: color.border,
    backgroundColor: color.bg
  })
  showColorPicker.value = false
}

// 点击外部关闭颜色选择器
const handleClickOutside = (event: any) => {
  const target = event.target
  if (!target.closest('.color-picker-wrapper')) {
    showColorPicker.value = false
  }
}

// 处理聚焦
const handleFocus = () => {
  const node = vueFlowInstance.findNode(props.id)
  if (node) {
    vueFlowInstance.setCenter(node.position.x + 100, node.position.y + 100, {
      duration: 800,
      zoom: 1
    })
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

watch(
  () => props.data.content,
  (newContent) => {
    if (newContent !== nodeContent.value) {
      nodeContent.value = newContent
    }
  }
)

// 监听选中状态变化
watch(
  () => props.selected,
  (newSelected) => {
    // 如果节点取消选中，确保退出编辑模式
    if (!newSelected && isEditing.value) {
      exitEditMode()
    }
  }
)
</script>

<style lang="scss" scoped>
.text-node {
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
  cursor: grab;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;

  // 背景层
  .text-node-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 7px;
    pointer-events: none;
    z-index: -1;
    overflow: hidden; // 确保背景不会溢出圆角

    // 白色底层背景
    .background-base {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: white;
    }

    // 半透明主题色背景
    .background-theme {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    }
  }

  &.selected {
    border: 2px solid var(--color-primary);
    padding: 11px;

    .text-node-background {
      border-radius: 6px;
    }
  }

  // 内容区域
  .text-node-content {
    cursor: inherit;
    min-height: 26px;
    max-height: 400px;
    overflow-y: auto;
    width: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative; // 确保在背景层之上

    &:has(:deep(.ProseMirror[contenteditable='true'])) {
      cursor: text;
    }

    :deep(.ProseMirror) {
      cursor: grab;
      flex: 1;
      min-height: 26px;

      &[contenteditable='true'] {
        cursor: text;
      }
    }
  }

  // 连接点样式
  :deep(.handle) {
    width: 10px;
    height: 10px;
    background: var(--color-primary);
    border: 2px solid var(--color-bg-primary);
    border-radius: 50%;
    opacity: 0;
    transition: opacity 0.2s;
    z-index: 2; // 确保在最上层

    &.top {
      top: -5px;
    }
    &.right {
      right: -5px;
    }
    &.bottom {
      bottom: -5px;
    }
    &.left {
      left: -5px;
    }
  }

  &:hover {
    :deep(.handle) {
      opacity: 1;
    }
  }
}

.toolbar-buttons {
  display: flex;
  gap: 4px;

  button {
    background: #4a5568;
    color: white;
    border: none;
    padding: 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;

    &:hover {
      background: #2563eb;
    }

    &.selected {
      background: #2563eb;
    }
  }
}

:deep(.tiptap) {
  padding-left: 8px;
  padding-right: 8px;
  min-height: 26px; // 添加这行
  flex: 1; // 添加这行

  p {
    margin-block-start: 4px;
    margin-block-end: 4px;
  }
}

// 工具栏样式
:deep(.vue-flow__node-toolbar) {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  background-color: var(--color-bg-primary);
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.vue-flow__node-toolbar button {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  width: 40px;
  height: 40px;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;

  :deep(.i-icon) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  :deep(svg) {
    width: 18px;
    height: 18px;
  }

  &:hover {
    background-color: var(--sidebar-hover-bg);
  }

  &.selected {
    background: #2563eb;
  }
}
:deep(.vue-flow__resize-control) {
  position: absolute;
}

:deep(.vue-flow__resize-control.left),
:deep(.vue-flow__resize-control.right) {
  cursor: ew-resize;
}

:deep(.vue-flow__resize-control.top),
:deep(.vue-flow__resize-control.bottom) {
  cursor: ns-resize;
}

:deep(.vue-flow__resize-control.top.left),
:deep(.vue-flow__resize-control.bottom.right) {
  cursor: nwse-resize;
}

:deep(.vue-flow__resize-control.bottom.left),
:deep(.vue-flow__resize-control.top.right) {
  cursor: nesw-resize;
}

/* handle styles */
:deep(.vue-flow__resize-control.handle) {
  width: 4px;
  height: 4px;
  border: 1px solid var(--color-primary);
  border-radius: 1px;
  background-color: var(--color-primary);
  transform: translate(-50%, -50%);
}
:deep(.vue-flow__resize-control.handle.top.left),
:deep(.vue-flow__resize-control.handle.top.right),
:deep(.vue-flow__resize-control.handle.bottom.left),
:deep(.vue-flow__resize-control.handle.bottom.right) {
  display: none; // 隐藏四个角的控制点
}

/* line styles */
:deep(.vue-flow__resize-control.line) {
  border-color: transparent;
  border-width: 0;
  border-style: solid;
}

:deep(.vue-flow__resize-control.line.left),
:deep(.vue-flow__resize-control.line.right) {
  width: 1px;
  transform: translate(-50%, 0);
  top: 0;
  height: 100%;
}

:deep(.vue-flow__resize-control.line.left) {
  left: 0;
  border-left-width: 1px;
}
:deep(.vue-flow__resize-control.line.right) {
  left: 100%;
  border-right-width: 1px;
}

:deep(.vue-flow__resize-control.line.top),
:deep(.vue-flow__resize-control.line.bottom) {
  height: 1px;
  transform: translate(0, -50%);
  left: 0;
  width: 100%;
}

:deep(.vue-flow__resize-control.line.top) {
  top: 0;
  border-top-width: 1px;
}
:deep(.vue-flow__resize-control.line.bottom) {
  border-bottom-width: 1px;
  top: 100%;
}

.color-picker-wrapper {
  position: relative;
  display: inline-block;

  .color-picker-panel {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    padding: 8px;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    box-shadow: var(--shadow-card);
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
    z-index: 1000;

    .color-item {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 2px solid; // 使用 borderColor 来显示主题色
      cursor: pointer;
      transition: transform 0.2s;

      &:hover {
        transform: scale(1.1);
      }
    }
  }
}
</style>
