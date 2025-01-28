<template>
  <div class="info-tooltip-wrapper">
    <div
      ref="iconRef"
      class="info-icon"
      @mouseenter="handleMouseEnter"
      @mouseleave="showTooltip = false"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </div>
    <Teleport to="body">
      <div
        v-show="showTooltip && isPositionReady"
        class="tooltip"
        :class="position"
        :style="tooltipStyle"
      >
        <slot>{{ text }}</slot>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, CSSProperties } from 'vue'

const props = defineProps<{
  text?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}>()

const showTooltip = ref(false)
const isPositionReady = ref(false)
const tooltipPosition = ref({ x: 0, y: 0 })
const iconRef = ref<HTMLElement | null>(null)

// 计算提示框的样式
const tooltipStyle = computed((): CSSProperties => {
  return {
    position: 'fixed' as const,
    left: `${tooltipPosition.value.x}px`,
    top: `${tooltipPosition.value.y}px`,
    transform: getTransform(props.position)
  }
})

// 根据不同位置计算transform
function getTransform(position = 'bottom') {
  switch (position) {
    case 'top':
      return 'translate(-50%, -100%)'
    case 'bottom':
      return 'translate(-50%, 10px)'
    case 'left':
      return 'translate(-100%, -50%)'
    case 'right':
      return 'translate(10px, -50%)'
    default:
      return 'translate(-50%, 10px)'
  }
}

// 更新提示框位置
function updateTooltipPosition() {
  if (!iconRef.value) return

  const rect = iconRef.value.getBoundingClientRect()

  switch (props.position) {
    case 'top':
      tooltipPosition.value = {
        x: rect.left + rect.width / 2,
        y: rect.top - 8
      }
      break
    case 'bottom':
      tooltipPosition.value = {
        x: rect.left + rect.width / 2,
        y: rect.bottom
      }
      break
    case 'left':
      tooltipPosition.value = {
        x: rect.left - 8,
        y: rect.top + rect.height / 2
      }
      break
    case 'right':
      tooltipPosition.value = {
        x: rect.right,
        y: rect.top + rect.height / 2
      }
      break
    default:
      tooltipPosition.value = {
        x: rect.left + rect.width / 2,
        y: rect.bottom
      }
  }
  isPositionReady.value = true
}

// 处理鼠标进入事件
function handleMouseEnter() {
  updateTooltipPosition()
  showTooltip.value = true
}

// 监听滚动和调整大小事件
function handleScroll() {
  if (showTooltip.value) {
    updateTooltipPosition()
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, true)
  window.addEventListener('resize', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll, true)
  window.removeEventListener('resize', handleScroll)
})
</script>

<style lang="scss" scoped>
.info-tooltip-wrapper {
  display: inline-flex;
  position: relative;
  align-items: center;

  .info-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    color: var(--color-text-secondary);
    cursor: help;
    transition: color 0.2s ease;

    &:hover {
      color: var(--color-primary);
    }
  }
}

.tooltip {
  position: fixed;
  z-index: 1000;
  padding: 8px 12px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--color-text-primary);
  background-color: var(--color-bg-primary);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  white-space: nowrap;
  pointer-events: none;
  transition: all 0.2s ease;

  // 箭头样式
  &::before {
    content: '';
    position: absolute;
    width: 0;
    height: 0;
    border: 5px solid transparent;
  }

  // 不同位置的箭头样式
  &.top::before {
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    border-top-color: var(--color-tooltip-bg);
  }

  &.bottom::before {
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    border-bottom-color: var(--color-tooltip-bg);
  }

  &.left::before {
    right: -10px;
    top: 50%;
    transform: translateY(-50%);
    border-left-color: var(--color-tooltip-bg);
  }

  &.right::before {
    left: -10px;
    top: 50%;
    transform: translateY(-50%);
    border-right-color: var(--color-tooltip-bg);
  }
}
</style>
