<template>
  <div class="connection-line-container" :style="containerStyle">
    <svg class="connection-line" :width="svgWidth" :height="svgHeight">
      <path :d="pathData" :stroke="strokeColor" :stroke-width="strokeWidth" fill="none" />
      <text
        v-if="connection.description"
        :x="textPosition.x"
        :y="textPosition.y"
        text-anchor="middle"
        alignment-baseline="middle"
        :fill="textColor"
        class="connection-description"
      >
        {{ connection.description }}
      </text>
    </svg>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import type { Connection } from '@renderer/types/Note'

const props = defineProps<{
  connection: Connection
  strokeColor?: string
  strokeWidth?: number
  textColor?: string
}>()

// 设置默认值
const strokeColor = computed(() => props.strokeColor || '#000000')
const strokeWidth = computed(() => props.strokeWidth || 2)
const textColor = computed(() => props.textColor || '#000000')

// 计算容器样式
const containerStyle = computed(() => {
  const left = Math.min(props.connection.startPoint.x, props.connection.endPoint.x) - 10
  const top = Math.min(props.connection.startPoint.y, props.connection.endPoint.y) - 10
  return {
    position: 'absolute' as const,
    left: `${left}px`,
    top: `${top}px`
  }
})

// 计算 SVG 的尺寸
const svgWidth = computed(
  () => Math.abs(props.connection.endPoint.x - props.connection.startPoint.x) + 20
)
const svgHeight = computed(
  () => Math.abs(props.connection.endPoint.y - props.connection.startPoint.y) + 20
)

// 计算路径数据
const pathData = computed(() => {
  const { startPoint, endPoint } = props.connection
  const startX = startPoint.x < endPoint.x ? 10 : svgWidth.value - 10
  const startY = startPoint.y < endPoint.y ? 10 : svgHeight.value - 10
  const endX = startPoint.x < endPoint.x ? svgWidth.value - 10 : 10
  const endY = startPoint.y < endPoint.y ? svgHeight.value - 10 : 10

  const dx = endX - startX
  const dy = endY - startY

  // 检查是否垂直或水平对齐
  if (Math.abs(dx) < 1 || Math.abs(dy) < 1) {
    // 如果对齐，则使用直线
    return `M ${startX} ${startY} L ${endX} ${endY}`
  } else {
    // 使用三次贝塞尔曲线
    const offset = Math.min(Math.abs(dx), Math.abs(dy)) * 0.6
    const controlX1 = startX + Math.sign(dx) * offset
    const controlY1 = startY
    const controlX2 = endX - Math.sign(dx) * offset
    const controlY2 = endY

    return `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`
  }
})

// 计算文本位置
const textPosition = computed(() => ({
  x: svgWidth.value / 2,
  y: svgHeight.value / 2
}))
</script>

<style lang="scss" scoped>
.connection-line-container {
  position: absolute;
  pointer-events: none;
}

.connection-line {
  overflow: visible;
}

.connection-description {
  font-size: 12px;
  user-select: none;
}
</style>
