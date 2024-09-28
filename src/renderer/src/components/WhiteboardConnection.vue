<template>
  <svg :width="width" :height="height" :style="svgStyle">
    <path
      :d="pathD"
      :stroke="connection.color || '#000'"
      :stroke-width="connection.thickness || 2"
      fill="none"
      :stroke-dasharray="connection.lineStyle === 'dashed' ? '5,5' : 'none'"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Connection, WhiteboardNote } from '@renderer/types/Note'

const props = defineProps<{
  connection: Connection
  startNote: WhiteboardNote
  endNote: WhiteboardNote
}>()

const width = computed(() => Math.abs(props.endNote.position.x - props.startNote.position.x) + 100)
const height = computed(() => Math.abs(props.endNote.position.y - props.startNote.position.y) + 100)

const svgStyle = computed(() => ({
  position: 'absolute' as const,
  left: `${Math.min(props.startNote.position.x, props.endNote.position.x) - 50}px`,
  top: `${Math.min(props.startNote.position.y, props.endNote.position.y) - 50}px`,
  pointerEvents: 'none' as const
}))

const pathD = computed(() => {
  const startX =
    props.startNote.position.x - Math.min(props.startNote.position.x, props.endNote.position.x) + 50
  const startY =
    props.startNote.position.y - Math.min(props.startNote.position.y, props.endNote.position.y) + 50
  const endX =
    props.endNote.position.x - Math.min(props.startNote.position.x, props.endNote.position.x) + 50
  const endY =
    props.endNote.position.y - Math.min(props.startNote.position.y, props.endNote.position.y) + 50

  return `M ${startX} ${startY} L ${endX} ${endY}`
})
</script>
