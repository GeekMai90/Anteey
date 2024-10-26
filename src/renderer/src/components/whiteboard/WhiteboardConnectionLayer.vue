<template>
  <svg class="connection-layer" :width="width" :height="height" :style="svgStyle">
    <path
      v-for="connection in connections"
      :key="connection.id"
      :d="getPathD(connection)"
      fill="none"
      stroke="#666"
      stroke-width="2"
    />
    <!-- 添加临时连接线 -->
    <path
      v-if="tempConnection"
      :d="getTempPathD()"
      fill="none"
      stroke="#666"
      stroke-width="2"
      stroke-dasharray="5,5"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Connection {
  id: string
  startItemId: string
  endItemId: string
  startPoint: { x: number; y: number }
  endPoint: { x: number; y: number }
}

const props = defineProps<{
  connections: Connection[]
  width: number
  height: number
  scale: number
  translateX: number
  translateY: number
  tempConnection: { startId: string; endPoint: { x: number; y: number } } | null
}>()

const svgStyle = computed(() => ({
  position: 'absolute' as const,
  top: 0,
  left: 0,
  pointerEvents: 'none' as const,
  transform: `scale(${props.scale}) translate(${props.translateX}px, ${props.translateY}px)`,
  transformOrigin: '0 0'
}))

const getPathD = (connection: Connection): string => {
  const { startPoint, endPoint } = connection
  // 考虑缩放和平移的影响
  const startX = startPoint.x * props.scale + props.translateX
  const startY = startPoint.y * props.scale + props.translateY
  const endX = endPoint.x * props.scale + props.translateX
  const endY = endPoint.y * props.scale + props.translateY
  return `M ${startX} ${startY} L ${endX} ${endY}`
}

const getTempPathD = (): string => {
  if (!props.tempConnection) return ''
  const startElement = document.getElementById(`note-${props.tempConnection.startId}`)
  if (!startElement) return ''

  const startRect = startElement.getBoundingClientRect()
  const startX = (startRect.left + startRect.width / 2 - props.translateX) / props.scale
  const startY = (startRect.top + startRect.height / 2 - props.translateY) / props.scale
  const endX = props.tempConnection.endPoint.x
  const endY = props.tempConnection.endPoint.y

  return `M ${startX} ${startY} L ${endX} ${endY}`
}
</script>

<style scoped>
.connection-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 9999;
}
</style>
