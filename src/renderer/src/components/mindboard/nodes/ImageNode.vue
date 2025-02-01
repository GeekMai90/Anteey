<template>
  <div class="image-node" :class="{ selected: selected, resizing: isResizing }" :style="nodeStyle">
    <div class="image-node-background">
      <div class="background-base"></div>
      <div class="background-theme" :style="{ backgroundColor: nodeStyle.backgroundColor }"></div>
    </div>

    <!-- 工具栏 -->
    <NodeToolbar :is-visible="selected" :position="data.toolbarPosition || Position.Top">
      <div class="toolbar-buttons">
        <!-- 颜色选择器 -->
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

        <!-- 聚焦按钮 -->
        <button
          v-tooltip.top="{ content: '聚焦卡片', delay: { show: 1000 } }"
          title="聚焦节点"
          @click="handleFocus"
        >
          <Aiming theme="outline" size="18" fill="var(--color-icon-default)" :stroke-width="3" />
        </button>

        <!-- 删除按钮 -->
        <button
          v-tooltip.top="{ content: '删除卡片', delay: { show: 1000 } }"
          @click="handleDelete"
        >
          <Delete theme="outline" size="18" fill="var(--color-icon-default)" :stroke-width="3" />
        </button>
      </div>
    </NodeToolbar>

    <!-- 连接点 -->
    <Handle id="top-source" type="source" :position="Position.Top" class="handle top" />
    <Handle id="right-source" type="source" :position="Position.Right" class="handle right" />
    <Handle id="bottom-source" type="source" :position="Position.Bottom" class="handle bottom" />
    <Handle id="left-source" type="source" :position="Position.Left" class="handle left" />

    <!-- 图片内容 -->
    <div class="image-content">
      <img :src="data.imageUrl" :alt="data.imageUrl" />
    </div>

    <!-- 调整大小控件 -->
    <NodeResizer :min-width="10" :min-height="10" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Position, Handle, useVueFlow } from '@vue-flow/core'
import { NodeToolbar } from '@vue-flow/node-toolbar'
import { NodeResizer } from '@vue-flow/node-resizer'
import { Aiming, Platte, Delete } from '@icon-park/vue-next'
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

const isResizing = ref(false)

// 节点样式
const nodeStyle = ref({
  width: props.data.width,
  height: props.data.height,
  backgroundColor: props.data.backgroundColor || 'var(--color-bg-primary)',
  borderColor: props.data.borderColor || 'var(--color-border)'
})

// Vue Flow 相关
const { updateNodeData, removeNodes } = useVueFlow()
const vueFlowInstance = useVueFlow()

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

// 处理删除
const handleDelete = () => {
  removeNodes([props.id])
}

// 点击外部关闭颜色选择器
const handleClickOutside = (event: any) => {
  const target = event.target
  if (!target.closest('.color-picker-wrapper')) {
    showColorPicker.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style lang="scss" scoped>
.image-node {
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 6px;
  cursor: grab;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;

  // 背景层
  .image-node-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 7px;
    pointer-events: none;
    z-index: -1;
    overflow: hidden;

    .background-base {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: white;
    }

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
    padding: 5px;

    .image-node-background {
      border-radius: 6px;
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
    z-index: 2;

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

  // 图片内容区域
  .image-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 4px;

    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      pointer-events: none;
      user-select: none;
    }
  }
}

// 工具栏样式
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
  }
}

// 颜色选择器样式
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
      border: 2px solid;
      cursor: pointer;
      transition: transform 0.2s;

      &:hover {
        transform: scale(1.1);
      }
    }
  }
}
</style>
