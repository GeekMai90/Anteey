<template>
  <div class="connection-line-container" :style="containerStyle">
    <svg class="connection-line" :width="svgWidth" :height="svgHeight">
      <defs>
        <marker
          id="arrowhead"
          markerWidth="6"
          markerHeight="4"
          refX="4"
          refY="2"
          orient="auto-start-reverse"
        >
          <polygon points="0 0, 6 2, 0 4" :fill="strokeColor" />
        </marker>
      </defs>
      <path
        :d="pathData"
        :stroke="strokeColor"
        :stroke-width="strokeWidth"
        fill="none"
        marker-end="url(#arrowhead)"
      />
      <circle :cx="startPoint.x" :cy="startPoint.y" :r="1.5" :fill="strokeColor" />
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

// 设置线条与卡片边缘的距离
const linePadding = 5

// 计算容器样式
const containerStyle = computed(() => {
  const left = Math.min(props.connection.startPoint.x, props.connection.endPoint.x)
  const top = Math.min(props.connection.startPoint.y, props.connection.endPoint.y)
  return {
    position: 'absolute' as const,
    left: `${left}px`,
    top: `${top}px`
  }
})

// 计算 SVG 的尺寸
const svgWidth = computed(() =>
  Math.abs(props.connection.endPoint.x - props.connection.startPoint.x)
)
const svgHeight = computed(() =>
  Math.abs(props.connection.endPoint.y - props.connection.startPoint.y)
)

// 计算路径数据
const pathData = computed(() => {
  const { startPoint, endPoint } = props.connection
  const isStartLeft = startPoint.x < endPoint.x
  const isStartTop = startPoint.y < endPoint.y

  const startX = isStartLeft ? linePadding : svgWidth.value - linePadding
  const startY = isStartTop ? linePadding : svgHeight.value - linePadding
  const endX = isStartLeft ? svgWidth.value - linePadding : linePadding
  const endY = isStartTop ? svgHeight.value - linePadding : linePadding

  const dx = endX - startX
  const dy = endY - startY

  // 检查是否垂直或水平对齐
  if (Math.abs(dx) < 1 || Math.abs(dy) < 1) {
    // 如果对齐，则使用直线
    return `M ${startX} ${startY} L ${endX} ${endY}`
  }

  const distance = Math.sqrt(dx * dx + dy * dy)
  const offset = Math.min(distance * 0.4, 100) // 动态计算偏移量，但最大不超过100

  // 确定主要方向
  const isHorizontal = Math.abs(dx) > Math.abs(dy)

  let controlX1, controlY1, controlX2, controlY2

  if (isHorizontal) {
    // 水平主导的曲线
    controlX1 = startX + Math.sign(dx) * offset
    controlY1 = startY
    controlX2 = endX - Math.sign(dx) * offset
    controlY2 = endY
  } else {
    // 垂直主导的曲线
    controlX1 = startX
    controlY1 = startY + Math.sign(dy) * offset
    controlX2 = endX
    controlY2 = endY - Math.sign(dy) * offset
  }

  return `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`
})

// 计算文本位置
const textPosition = computed(() => ({
  x: svgWidth.value / 2,
  y: svgHeight.value / 2
}))

// 计算起点坐标
const startPoint = computed(() => {
  const isStartLeft = props.connection.startPoint.x < props.connection.endPoint.x
  const isStartTop = props.connection.startPoint.y < props.connection.endPoint.y
  return {
    x: isStartLeft ? linePadding : svgWidth.value - linePadding,
    y: isStartTop ? linePadding : svgHeight.value - linePadding
  }
})
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
