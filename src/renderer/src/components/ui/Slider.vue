<template>
  <div class="slider-container">
    <div class="slider-header">
      <div v-if="showLabels" class="slider-labels">
        <span class="min-label">{{ min }}</span>
        <span class="max-label">{{ max }}</span>
      </div>
    </div>

    <div class="slider-main">
      <div class="slider-track">
        <div class="slider-fill" :style="{ width: `${percentage}%` }"></div>
        <div class="slider-thumb" :style="{ left: `${percentage}%` }" @mousedown="startDrag">
          <div class="slider-value">{{ displayValue }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: Number,
    required: true
  },
  min: {
    type: Number,
    default: 0
  },
  max: {
    type: Number,
    default: 100
  },
  step: {
    type: Number,
    default: 1
  },
  showLabels: {
    type: Boolean,
    default: false
  },
  precision: {
    type: Number,
    default: 1
  }
})

const emit = defineEmits(['update:modelValue'])

// 计算滑块位置百分比
const percentage = computed(() => {
  const range = props.max - props.min
  return ((props.modelValue - props.min) / range) * 100
})

// 格式化显示值
const displayValue = computed(() => {
  return props.modelValue.toFixed(Number.isInteger(props.modelValue) ? 0 : props.precision)
})

// 拖动相关状态
const isDragging = ref(false)

// 开始拖动
const startDrag = (event: MouseEvent) => {
  isDragging.value = true
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  // 防止文本选择
  event.preventDefault()
}

// 拖动过程
const onDrag = (event: MouseEvent) => {
  if (!isDragging.value) return

  // 获取滑动条DOM元素
  const sliderTrack = document.querySelector('.slider-track') as HTMLElement

  if (!sliderTrack) return

  // 计算滑动条的位置和宽度
  const rect = sliderTrack.getBoundingClientRect()
  const offsetX = event.clientX - rect.left

  // 计算百分比
  const percent = Math.max(0, Math.min(100, (offsetX / rect.width) * 100))

  // 根据百分比计算值
  const range = props.max - props.min
  let value = (percent / 100) * range + props.min

  // 按步长取整
  if (props.step > 0) {
    value = Math.round(value / props.step) * props.step
  }

  // 限制在min和max范围内
  value = Math.max(props.min, Math.min(props.max, value))

  // 保留指定小数位
  const multiplier = Math.pow(10, props.precision)
  value = Math.round(value * multiplier) / multiplier

  emit('update:modelValue', value)
}

// 停止拖动
const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}
</script>

<style lang="scss" scoped>
.slider-container {
  padding: 8px 0;
  width: 100%;
}

.slider-header {
  margin-bottom: 8px;
}

.slider-main {
  position: relative;
  padding: 10px 0;
}

.slider-track {
  position: relative;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  cursor: pointer;
}

.slider-fill {
  position: absolute;
  height: 100%;
  background: var(--color-primary);
  border-radius: 2px;
  pointer-events: none;
}

.slider-thumb {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  background: var(--color-primary);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  cursor: grab;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition:
    transform 0.1s ease,
    box-shadow 0.1s ease;
  z-index: 10;

  &:hover,
  &:active {
    transform: translate(-50%, -50%) scale(1.1);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
  }

  // 数值显示框
  .slider-value {
    position: absolute;
    top: -24px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-bg-secondary);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    font-family: var(--font-mono);
    color: var(--color-text-secondary);
    white-space: nowrap;

    // 添加小三角形指示器
    &::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 50%;
      transform: translateX(-50%);
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 4px solid var(--color-bg-secondary);
    }
  }
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  width: 100%;
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
