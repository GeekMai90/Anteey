<script setup>
defineProps({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  stroke: {
    type: String,
    required: false,
    default: '#b1b1b7'
  },
  fill: {
    type: String,
    required: false,
    default: '#b1b1b7'
  },
  strokeWidth: {
    type: Number,
    required: false,
    default: 1
  },
  width: {
    type: Number,
    required: false,
    default: 12.5
  },
  height: {
    type: Number,
    required: false,
    default: 12.5
  }
})
</script>

<template>
  <svg class="vue-flow__marker vue-flow__container">
    <defs>
      <marker
        :id="id"
        class="vue-flow__arrowhead"
        viewBox="-10 -10 20 20"
        refX="0"
        refY="0"
        :markerWidth="width"
        :markerHeight="height"
        markerUnits="strokeWidth"
        orient="auto-start-reverse"
      >
        <path
          v-if="type === 'diamond'"
          :style="{
            stroke,
            strokeWidth
          }"
          stroke-linecap="round"
          stroke-linejoin="round"
          :fill="fill"
          d="M 0,-5 L 5,0 L 0,5 L -5,0 Z"
        />

        <path
          v-if="type === 'circle'"
          :style="{
            stroke,
            strokeWidth
          }"
          stroke-linecap="round"
          stroke-linejoin="round"
          :fill="fill"
          d="M 0,-3 a 3,3 0 1,0 0,6 a 3,3 0 1,0 0,-6"
        />

        <path
          v-if="type === 'square'"
          :style="{
            stroke,
            strokeWidth
          }"
          stroke-linecap="round"
          stroke-linejoin="round"
          :fill="fill"
          d="M -3,-3 H 3 V 3 H -3 Z"
        />

        <!-- 箭头标记 -->
        <path
          v-if="type === 'arrow'"
          :style="{
            stroke,
            strokeWidth
          }"
          stroke-linecap="round"
          stroke-linejoin="round"
          :fill="fill"
          d="M -4,-4 L 0,0 L -4,4 Z"
        />
      </marker>
    </defs>
  </svg>
</template>
