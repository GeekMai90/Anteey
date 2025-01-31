<script setup>
import { BaseEdge, getBezierPath, useVueFlow } from '@vue-flow/core'
import { computed } from 'vue'
import CustomMarker from './CustomMarker.vue'

const props = defineProps({
  id: {
    type: String,
    required: true
  },
  sourceX: {
    type: Number,
    required: true
  },
  sourceY: {
    type: Number,
    required: true
  },
  targetX: {
    type: Number,
    required: true
  },
  targetY: {
    type: Number,
    required: true
  },
  sourcePosition: {
    type: String,
    required: true
  },
  targetPosition: {
    type: String,
    required: true
  },
  source: {
    type: String,
    required: true
  },
  target: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: false,
    default: ''
  },
  data: {
    type: Object,
    required: false
  },
  selected: {
    type: Boolean,
    default: false
  },
  updatable: {
    type: Boolean,
    default: true
  },
  sourceHandleId: {
    type: String,
    default: null
  },
  targetHandleId: {
    type: String,
    default: null
  }
})

const { findNode } = useVueFlow()

const path = computed(() => getBezierPath(props))

const sourceMarkerId = computed(() => `${props.id}-source-marker`)
const targetMarkerId = computed(() => `${props.id}-target-marker`)

const edgeWidth = computed(() => {
  if (props.selected) {
    return '3px' // 边被选中时的颜色
  }
  return '2px'
})

const markerColor = computed(() => {
  const sourceNode = findNode(props.source)
  const targetNode = findNode(props.target)

  if (sourceNode?.selected) {
    return '#4361ee'
  }

  if (targetNode?.selected) {
    return '#00c8a8'
  }

  return '#C0C0C0'
})
</script>

<script>
export default {
  inheritAttrs: false
}
</script>

<template>
  <BaseEdge
    :id="id"
    :path="path[0]"
    :marker-start="`url(#${sourceMarkerId})`"
    :marker-end="`url(#${targetMarkerId})`"
    :label="label"
    :label-x="path[1]"
    :label-y="path[2]"
    :style="{
      strokeWidth: edgeWidth,
      stroke: markerColor
    }"
    :label-style="{
      fill: '#4a5568',
      fontSize: '12px'
    }"
    :label-bg-style="{
      fill: 'white',
      fillOpacity: 0.8,
      rx: 4,
      ry: 4
    }"
  >
  </BaseEdge>

  <!-- 起始端圆形标记 -->
  <CustomMarker
    :id="sourceMarkerId"
    type="circle"
    :stroke="markerColor"
    :fill="markerColor"
    :stroke-width="1"
    :width="8"
    :height="8"
  />

  <!-- 终点箭头标记 -->
  <CustomMarker
    :id="targetMarkerId"
    type="arrow"
    :stroke="markerColor"
    :fill="markerColor"
    :stroke-width="1"
    :width="12"
    :height="12"
  />
</template>
