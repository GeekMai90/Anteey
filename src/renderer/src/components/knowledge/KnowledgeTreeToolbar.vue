<template>
  <div class="toolbar-left">
    <div
      v-tooltip="tooltipConfig[0]"
      class="tool-item"
      title="返回根节点"
      @click="$emit('backToRoot')"
    >
      <Home theme="outline" size="18" :stroke-width="3" />
    </div>
    <div v-tooltip="tooltipConfig[1]" class="tool-item" title="放大视图" @click="$emit('zoomIn')">
      <ZoomIn theme="outline" size="18" :stroke-width="3" />
    </div>
    <div
      v-tooltip="tooltipConfig[2]"
      class="tool-item"
      title="恢复默认大小"
      @click="$emit('resetZoom')"
    >
      <UpdateRotation theme="outline" size="18" :stroke-width="3" />
    </div>
    <div v-tooltip="tooltipConfig[3]" class="tool-item" title="缩小视图" @click="$emit('zoomOut')">
      <ZoomOut theme="outline" size="18" :stroke-width="3" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ZoomIn, ZoomOut, UpdateRotation, Home } from '@icon-park/vue-next'

defineEmits(['zoomIn', 'zoomOut', 'resetZoom', 'backToRoot'])

const tooltipConfig = [
  {
    content: '返回根节点',
    delay: { show: 1000 },
    placement: 'right'
  },
  {
    content: '放大视图',
    delay: { show: 1000 },
    placement: 'right'
  },
  {
    content: '恢复默认大小',
    delay: { show: 1000 },
    placement: 'right'
  },
  {
    content: '缩小视图',
    delay: { show: 1000 },
    placement: 'right'
  }
]
</script>

<style lang="scss" scoped>
.toolbar-left {
  position: fixed;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: var(--color-bg-primary);
  // border: 1px solid var(--color-border-default);
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
