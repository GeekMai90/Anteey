<template>
  <div class="toolbar-left">
    <div class="tool-item" title="放大画布" @click="handleZoomIn">
      <ZoomIn theme="outline" size="18" :stroke-width="3" />
    </div>
    <div class="tool-item" title="重置缩放" @click="handleResetZoom">
      <UpdateRotation theme="outline" size="18" :stroke-width="3" />
    </div>
    <div class="tool-item" title="概览全局" @click="handleFitView">
      <FullScreen theme="outline" size="18" :stroke-width="3" />
    </div>
    <div class="tool-item" title="缩小画布" @click="handleZoomOut">
      <ZoomOut theme="outline" size="18" :stroke-width="3" />
    </div>

    <div class="tool-item" title="切换背景" @click="$emit('toggleBackground')">
      <ViewGridCard theme="outline" size="18" :stroke-width="3" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { FullScreen, ZoomIn, ZoomOut, UpdateRotation, ViewGridCard } from '@icon-park/vue-next'
import { useVueFlow } from '@vue-flow/core'

const { fitView, zoomIn, zoomOut, zoomTo } = useVueFlow()

defineEmits(['toggleBackground'])

const handleFitView = () => {
  // 调用 fitView 方法，可以传入一些配置选项
  fitView({
    padding: 0.2, // 边距，值在 0-1 之间
    includeHiddenNodes: false, // 是否包含隐藏的节点
    duration: 800 // 动画持续时间(ms)
  })
}

const handleZoomIn = () => {
  zoomIn({ duration: 300 })
}

const handleZoomOut = () => {
  zoomOut({ duration: 300 })
}

const handleResetZoom = () => {
  zoomTo(1, { duration: 300 })
}
</script>

<style lang="scss" scoped>
.toolbar-left {
  position: fixed;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: var(--shadow-card);
  z-index: 100;

  .tool-item {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      color: var(--color-text-secondary);
    }

    :deep(svg) {
      width: 16px;
      height: 16px;
    }

    &:hover {
      background: var(--color-hover-button);
      transform: translateY(-2px);

      :deep(.i-icon) {
        color: var(--color-primary);
      }
    }

    &.active {
      background: var(--color-hover-button);
      :deep(.i-icon) {
        color: var(--color-primary);
      }
    }
  }
}
</style>
