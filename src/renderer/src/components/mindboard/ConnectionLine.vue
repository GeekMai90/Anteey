<template>
  <div class="connection-line" :style="lineStyle">
    <div class="line-content">
      <div v-if="label" class="line-label">{{ label }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps } from 'vue'
import type { CSSProperties } from 'vue'

interface Props {
  // 起点坐标
  startX: number
  startY: number
  // 终点坐标
  endX: number
  endY: number
  // 连线标签
  label?: string
  // 连线样式
  style?: {
    color?: string
    width?: number
    dashArray?: number[]
  }
}

const props = defineProps<Props>()

// 计算连线样式
const lineStyle = computed((): CSSProperties => {
  const dx = props.endX - props.startX
  const dy = props.endY - props.startY
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)
  const length = Math.sqrt(dx * dx + dy * dy)

  return {
    position: 'absolute' as const,
    left: `${props.startX}px`,
    top: `${props.startY}px`,
    width: `${length}px`,
    transform: `rotate(${angle}deg)`,
    transformOrigin: '0 50%',
    borderTop: `${props.style?.width || 2}px ${props.style?.dashArray ? 'dashed' : 'solid'} ${
      props.style?.color || 'var(--color-primary)'
    }`,
    zIndex: 0
  }
})
</script>

<style lang="scss" scoped>
.connection-line {
  position: absolute;
  pointer-events: none;

  .line-content {
    position: relative;
    width: 100%;
    height: 0;

    .line-label {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      background-color: var(--color-bg-secondary);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      color: var(--color-text-secondary);
      white-space: nowrap;
      user-select: none;
    }
  }
}
</style>
