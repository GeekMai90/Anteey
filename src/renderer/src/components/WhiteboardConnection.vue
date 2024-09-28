<template>
  <svg :width="width" :height="height" :style="svgStyle">
    <path
      :d="pathData"
      :stroke="connection.color || '#000'"
      :stroke-width="connection.thickness || 2"
      :stroke-dasharray="connection.lineStyle === 'dashed' ? '5,5' : ''"
      fill="none"
    />
    <text
      v-if="connection.label"
      :x="labelPosition.x"
      :y="labelPosition.y"
      text-anchor="middle"
      alignment-baseline="middle"
    >
      {{ connection.label }}
    </text>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Connection } from '@renderer/types/Note'

const props = defineProps<{
  connection: Connection
  startItem: { position: { x: number; y: number }; size: { width: number; height: number } }
  endItem: { position: { x: number; y: number }; size: { width: number; height: number } }
}>()

const width = computed(() => Math.abs(props.endItem.position.x - props.startItem.position.x) + 100)
const height = computed(() => Math.abs(props.endItem.position.y - props.startItem.position.y) + 100)

const svgStyle = computed(() => ({
  position: 'absolute' as const,
  left: `${Math.min(props.startItem.position.x, props.endItem.position.x) - 50}px`,
  top: `${Math.min(props.startItem.position.y, props.endItem.position.y) - 50}px`,
  pointerEvents: 'none' as const,
  zIndex: props.connection.zIndex
}))

const pathData = computed(() => {
  // 计算连线路径
  // 这里需要根据 startEdge 和 endEdge 计算连线的起点和终点
  // 然后根据 lineShape 生成适当的路径数据
  // 这里只是一个简单的直线示例
  const startX =
    (props.startItem.position.x as number) -
    (svgStyle.value.left as unknown as number) +
    props.startItem.size.width / 2
  const startY =
    (props.startItem.position.y as number) -
    (svgStyle.value.top as unknown as number) +
    (props.startItem.size.height as number) / 2
  const endX =
    (props.endItem.position.x as number) -
    (svgStyle.value.left as unknown as number) +
    (props.endItem.size.width as number) / 2
  const endY =
    (props.endItem.position.y as number) -
    (svgStyle.value.top as unknown as number) +
    (props.endItem.size.height as number) / 2
  return `M ${startX} ${startY} L ${endX} ${endY}`
})

const labelPosition = computed(() => {
  // 计算标签位置
  const x =
    (props.startItem.position.x + props.endItem.position.x) / 2 -
    (svgStyle.value.left as unknown as number)
  const y =
    (props.startItem.position.y + props.endItem.position.y) / 2 -
    (svgStyle.value.top as unknown as number)
  return { x, y }
})
</script>
