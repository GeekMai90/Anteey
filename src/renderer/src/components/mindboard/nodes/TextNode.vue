<template>
  <div
    class="text-node"
    :class="{ selected: selected }"
    @click="handleNodeClick"
    @dblclick="handleDoubleClick"
  >
    <NodeToolbar :is-visible="selected" :position="data.toolbarPosition || Position.Top">
      <div class="toolbar-buttons">
        <button
          v-for="action in actions"
          :key="action"
          type="button"
          :class="{ selected: action === data.action }"
          @click="updateNodeData(id, { action })"
        >
          {{ action }}
        </button>
        <button @click="handleDelete">🗑️</button>
        <button @click="handleEdit">✏️</button>
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
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { Position, Handle, useVueFlow } from '@vue-flow/core'
import { NodeToolbar } from '@vue-flow/node-toolbar'
import TipTapEditor from '@renderer/components/tiptap/TipTapEditor.vue'

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
const editor = ref(null)
const nodeContent = ref(props.data.content || '')
const { updateNodeData, removeNodes } = useVueFlow()

const emit = defineEmits(['update'])

const actions = ['👎', '✋', '👍']

// 处理编辑器点击
const handleEditorClick = (event) => {
  if (!isEditing.value) {
    // 非编辑状态下，手动触发节点的点击事件
    event.stopPropagation()
    const nodeElement = event.target.closest('.text-node')
    if (nodeElement) {
      nodeElement.click()
    }
  }
}

// 处理内容区域点击
const handleContentClick = (event) => {
  // event.stopPropagation()
  // 如果不是编辑模式，阻止 TipTap 的默认行为
  if (!isEditing.value) {
    event.preventDefault()
  }
}

// 处理节点双击
const handleDoubleClick = (event) => {
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
      editor.value.focus()
    }
  })
}

// 退出编辑模式
const exitEditMode = () => {
  isEditing.value = false
  updateNodeData(props.id, { draggable: true })
}

// 处理内容区域的鼠标按下事件
const handleContentMouseDown = (event) => {
  if (isEditing.value) {
    event.stopPropagation() // 编辑模式下阻止事件冒泡，防止拖动
  }
}

// 处理编辑器失去焦点
const handleEditorBlur = () => {
  exitEditMode()
}

const onContentUpdate = (content) => {
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
.vue-flow__node-toolbar {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  background-color: #2d3748;
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.vue-flow__node-toolbar button {
  background: #4a5568;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    background: #2563eb;
  }

  &.selected {
    background: #2563eb;
  }
}
.text-node {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  width: 300px;
  min-width: 300px;
  max-width: 400px;
  padding: 12px;
  position: relative;
  cursor: grab;
  box-shadow: var(--shadow-card);

  &.selected {
    border: 2px solid var(--color-primary);
  }

  :deep(.handle) {
    width: 10px;
    height: 10px;
    background: var(--color-primary);
    border: 2px solid var(--color-bg-primary);
    border-radius: 50%;
    opacity: 0;
    transition: opacity 0.2s;

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

  .text-node-content {
    cursor: inherit;
    min-height: 100px;
    max-height: 400px;
    overflow-y: auto;
    width: 100%;

    &:has(:deep(.ProseMirror[contenteditable='true'])) {
      cursor: text;
    }

    :deep(.ProseMirror) {
      cursor: grab;

      &[contenteditable='true'] {
        cursor: text;
      }
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
}
</style>
