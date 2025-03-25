<template>
  <div
    ref="buttonRef"
    v-tooltip="{
      content: typeof tooltip === 'string' ? tooltip : tooltip?.content,
      placement: typeof tooltip === 'string' ? 'top' : tooltip?.placement || 'top',
      html: typeof tooltip === 'string' ? undefined : tooltip?.html,
      delay: typeof tooltip === 'string' ? { show: 1000 } : tooltip?.delay || { show: 1000 }
    }"
    class="icon-button"
    :class="{
      'is-disabled': disabled,
      'is-active': active,
      [`icon-button-${size}`]: typeof size === 'string'
    }"
    :style="buttonStyle"
    @click="handleClick"
  >
    <component :is="icon" theme="outline" :size="iconSize" :strokeWidth="3" />
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { ref, computed } from 'vue'

type SizeType = 'small' | 'medium' | 'large' | number

interface TooltipConfig {
  content: string
  html?: boolean
  delay?: { show: number; hide?: number }
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

interface Props {
  icon: Component
  tooltip?: string | TooltipConfig
  disabled?: boolean
  active?: boolean
  size?: SizeType
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  active: false,
  size: 'medium'
})

// 计算按钮样式
const buttonStyle = computed(() => {
  if (typeof props.size === 'number') {
    return {
      width: `${props.size}px`,
      height: `${props.size}px`
    }
  }
  return {}
})

// 计算图标大小
const iconSize = computed(() => {
  if (typeof props.size === 'number') {
    return Math.floor(props.size * 0.67) // 图标大小为按钮大小的 2/3
  }

  const sizeMap = {
    small: 14,
    medium: 16,
    large: 18
  }
  return sizeMap[props.size]
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonRef = ref<HTMLElement | null>(null)

const handleClick = (event: MouseEvent) => {
  if (props.disabled) return
  emit('click', event)
}

// 暴露按钮元素引用
defineExpose({
  el: buttonRef
})
</script>

<style lang="scss" scoped>
.icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
  opacity: inherit;

  // 预设尺寸
  &.icon-button-small {
    width: 20px;
    height: 20px;
    border-radius: 3px;
  }

  &.icon-button-medium {
    width: 24px;
    height: 24px;
    border-radius: 4px;
  }

  &.icon-button-large {
    width: 32px;
    height: 32px;
    border-radius: 6px;
  }

  &:not(.is-disabled):hover {
    background: var(--color-hover-bg);
    color: var(--color-text-primary);
  }

  &.is-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.is-active {
    color: var(--color-primary);
    background: var(--color-hover-bg);
  }

  :deep(.i-icon) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
}
</style>
