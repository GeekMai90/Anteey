<script setup>
import {
  BaseEdge,
  getBezierPath,
  getStraightPath,
  getSmoothStepPath,
  useVueFlow
} from '@vue-flow/core'
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
  },
  type: {
    type: String,
    default: 'default'
  }
})

const { findNode } = useVueFlow()

// 根据类型获取不同的路径
const path = computed(() => {
  // 从 data 中获取样式类型
  const styleType = props.data?.styleType || 'default'

  switch (styleType) {
    case 'straight':
      return getStraightPath({
        sourceX: props.sourceX,
        sourceY: props.sourceY,
        targetX: props.targetX,
        targetY: props.targetY
      })
    case 'step':
      return getSmoothStepPath({
        sourceX: props.sourceX,
        sourceY: props.sourceY,
        targetX: props.targetX,
        targetY: props.targetY,
        borderRadius: 10
      })
    case 'smoothstep':
      return getSmoothStepPath({
        sourceX: props.sourceX,
        sourceY: props.sourceY,
        targetX: props.targetX,
        targetY: props.targetY,
        borderRadius: 20
      })
    default:
      return getBezierPath(props)
  }
})

// 计算标签位置
const labelPos = computed(() => {
  const styleType = props.data?.styleType || 'default'

  if (styleType === 'straight') {
    // 手动计算直线的中点
    return [(props.sourceX + props.targetX) / 2, (props.sourceY + props.targetY) / 2]
  }
  // 对于其他类型,使用路径提供的标签位置
  return [path.value[1], path.value[2]]
})

const sourceMarkerId = computed(() => `${props.id}-source-marker`)
const targetMarkerId = computed(() => `${props.id}-target-marker`)

const edgeWidth = computed(() => {
  if (props.selected) {
    return '2.5px' // 边被选中时的粗细
  }
  return '2px'
})

const edgeColor = computed(() => {
  // 如果有自定义颜色，使用自定义颜色
  if (props.data?.color) {
    return props.data.color
  }

  // 否则使用默认的颜色逻辑
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

// 获取标记类型
const markerType = computed(() => props.data?.markerType || 'single')

// 获取起始标记
const getMarkerStart = computed(() => {
  return markerType.value === 'double' ? `url(#${sourceMarkerId.value})` : ''
})

// 获取终点标记
const getMarkerEnd = computed(() => {
  return markerType.value !== 'none' ? `url(#${targetMarkerId.value})` : ''
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
    :marker-start="getMarkerStart"
    :marker-end="getMarkerEnd"
    :label="label"
    :label-x="labelPos[0]"
    :label-y="labelPos[1]"
    :style="{
      strokeWidth: edgeWidth,
      stroke: edgeColor
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

  <!-- 根据标记类型渲染不同的标记 -->
  <template v-if="markerType !== 'none'">
    <CustomMarker
      v-if="markerType === 'double'"
      :id="sourceMarkerId"
      type="arrow"
      :stroke="edgeColor"
      :fill="edgeColor"
      :stroke-width="1"
      :width="12"
      :height="12"
    />
    <CustomMarker
      :id="targetMarkerId"
      type="arrow"
      :stroke="edgeColor"
      :fill="edgeColor"
      :stroke-width="1"
      :width="12"
      :height="12"
    />
  </template>
</template>
