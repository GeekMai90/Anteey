<template>
  <div class="group-node" :class="{ selected: selected }" :style="nodeStyle">
    <!-- 分组标题 -->
    <div class="group-header">
      <div class="title-container" @dblclick="handleTitleEdit">
        <input
          v-if="isEditingTitle"
          ref="titleInputRef"
          v-model="groupTitle"
          class="title-input"
          type="text"
          @blur="saveTitleEdit"
          @keyup.enter="saveTitleEdit"
          @keyup.esc="cancelTitleEdit"
          @mousedown.stop
          @click.stop
          @dblclick.stop
          @mousemove.stop
        />
        <span v-else class="title-text">{{ data.label || '未命名分组' }}</span>
      </div>
    </div>

    <Handle id="top-source" type="source" :position="Position.Top" class="handle top" />
    <Handle id="right-source" type="source" :position="Position.Right" class="handle right" />
    <Handle id="bottom-source" type="source" :position="Position.Bottom" class="handle bottom" />
    <Handle id="left-source" type="source" :position="Position.Left" class="handle left" />

    <!-- 工具栏 -->
    <NodeToolbar :is-visible="selected" :position="data.toolbarPosition || Position.Top">
      <div class="toolbar-buttons">
        <!-- 颜色选择器 -->
        <div class="color-picker-wrapper">
          <button
            v-tooltip.top="{ content: '分组颜色', delay: { show: 1000 } }"
            @click="showColorPicker = !showColorPicker"
          >
            <Platte theme="outline" size="18" fill="var(--color-icon-default)" :stroke-width="3" />
          </button>
          <div v-if="showColorPicker" class="color-picker-panel">
            <div
              v-for="color in groupColors"
              :key="color"
              class="color-item"
              :style="{ backgroundColor: color }"
              @click="handleColorSelect(color)"
            />
          </div>
        </div>

        <!-- 删除按钮 -->
        <button
          v-tooltip.top="{ content: '删除分组', delay: { show: 1000 } }"
          @click="handleDelete"
        >
          <Delete theme="outline" size="18" fill="var(--color-icon-default)" :stroke-width="3" />
        </button>
      </div>
    </NodeToolbar>

    <!-- 调整大小控件 -->
    <NodeResizer :min-width="200" :min-height="100" />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'
import { Position, Handle, useVueFlow } from '@vue-flow/core'
import { NodeToolbar } from '@vue-flow/node-toolbar'
import { NodeResizer } from '@vue-flow/node-resizer'
import { Platte, Delete } from '@icon-park/vue-next'
import './customResizer.css'

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
  }
})

const isEditingTitle = ref(false)
const titleInputRef = ref<HTMLInputElement | null>(null)
const groupTitle = ref(props.data.label || '')
const showColorPicker = ref(false)

// 分组的颜色选项
const groupColors = [
  'rgba(147, 197, 253, 0.3)', // 浅蓝
  'rgba(252, 165, 165, 0.3)', // 浅红
  'rgba(110, 231, 183, 0.3)', // 浅绿
  'rgba(251, 191, 36, 0.3)', // 浅黄
  'rgba(167, 139, 250, 0.3)' // 浅紫
]

const nodeStyle = computed(() => ({
  backgroundColor: props.data.backgroundColor || groupColors[0]
}))

console.log(nodeStyle.value)

const { updateNodeData, removeNodes } = useVueFlow()

// 处理标题编辑
const handleTitleEdit = () => {
  isEditingTitle.value = true
  nextTick(() => {
    titleInputRef.value?.focus()
  })
}

const saveTitleEdit = () => {
  updateNodeData(props.id, {
    label: groupTitle.value
  })
  isEditingTitle.value = false
}

const cancelTitleEdit = () => {
  groupTitle.value = props.data.label || ''
  isEditingTitle.value = false
}

// 处理颜色选择
const handleColorSelect = (color: string) => {
  nodeStyle.value.backgroundColor = color
  updateNodeData(props.id, {
    backgroundColor: color
  })
  showColorPicker.value = false
}

// 处理删除
const handleDelete = () => {
  removeNodes([props.id])
}
</script>

<style lang="scss" scoped>
.group-node {
  position: relative;
  border: 2px dashed var(--color-border);
  border-radius: 8px;
  padding: 8px;
  cursor: grab;
  background-color: transparent;
  min-width: 200px;
  min-height: 100px;
  width: 100%;
  height: 100%;

  &.selected {
    border-color: var(--color-primary);
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
      top: -7px;
    }
    &.right {
      right: -7px;
    }
    &.bottom {
      bottom: -7px;
    }
    &.left {
      left: -7px;
    }
  }
  &:hover {
    :deep(.handle) {
      opacity: 1;
    }
  }

  .group-header {
    position: absolute;
    top: -28px;
    left: -9px;
    padding: 2px 8px;
    background-color: transparent;
    border-radius: 4px;
    font-size: 14px;
    line-height: 1;

    .title-container {
      display: flex;
      align-items: center;
      min-height: 24px;
    }

    .title-text,
    .title-input {
      font-size: 14px;
      line-height: 1.4;
      padding: 2px 6px;
      margin: 0;
    }

    .title-input {
      min-width: 100px; // 最小宽度
      width: auto; // 自动宽度
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background-color: var(--color-bg-primary);
      outline: none;
      box-sizing: border-box;
      height: 24px;

      &:focus {
        border-color: var(--color-primary);
      }
    }
  }
}

// 工具栏和颜色选择器样式与其他节点保持一致
.toolbar-buttons {
  display: flex;
  gap: 4px;

  button {
    background-color: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);
    width: 40px;
    height: 40px;
    padding: 10px;
    border-radius: 8px;
    cursor: pointer;

    &:hover {
      background-color: var(--color-sidebar-hover);
    }
  }
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
      cursor: pointer;
      transition: transform 0.2s;

      &:hover {
        transform: scale(1.1);
      }
    }
  }
}
</style>
