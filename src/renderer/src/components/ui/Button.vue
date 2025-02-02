<script setup lang="ts">
import { ref } from 'vue'
import type { Component } from 'vue'

interface TooltipConfig {
  content: string
  html?: boolean
  delay?: { show: number; hide?: number }
}

interface Props {
  type?: 'default' | 'primary' | 'text' | 'link'
  size?: 'small' | 'medium' | 'large'
  icon?: Component
  disabled?: boolean
  loading?: boolean
  block?: boolean
  height?: number
  shape?: 'default' | 'circle' | 'square'
  iconOnly?: boolean
  plain?: boolean
  tooltip?: TooltipConfig
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  size: 'medium',
  disabled: false,
  loading: false,
  block: false,
  height: 0,
  shape: 'default',
  iconOnly: false,
  plain: false,
  tooltipPlacement: 'bottom'
})

const buttonRef = ref<HTMLButtonElement | null>(null)

// 简化点击处理
const handleClick = (event: MouseEvent) => {
  if (props.disabled || props.loading) return
  emit('click', event)
}

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<template>
  <button
    ref="buttonRef"
    v-tooltip="{
      content: tooltip?.content,
      placement: tooltipPlacement,
      html: tooltip?.html,
      delay: tooltip?.delay
    }"
    :class="[
      'ant-btn',
      `ant-btn-${type}`,
      `ant-btn-${size}`,
      `ant-btn-${shape}`,
      { 'ant-btn-block': block },
      { 'ant-btn-loading': loading },
      { 'ant-btn-disabled': disabled },
      { 'ant-btn-icon-only': iconOnly || shape === 'circle' || shape === 'square' },
      { 'ant-btn-plain': plain }
    ]"
    :style="
      height
        ? {
            height: `${height}px`,
            width: shape === 'circle' || shape === 'square' ? `${height}px` : undefined
          }
        : {}
    "
    :disabled="disabled"
    @click="handleClick"
  >
    <span v-if="loading" class="loading-icon">
      <svg viewBox="0 0 1024 1024" class="loading" data-icon="loading" aria-hidden="true">
        <path
          d="M988 548c-19.9 0-36-16.1-36-36 0-59.4-11.6-117-34.6-171.3a440.45 440.45 0 00-94.3-139.9 437.71 437.71 0 00-139.9-94.3C629 83.6 571.4 72 512 72c-19.9 0-36-16.1-36-36s16.1-36 36-36c69.1 0 136.2 13.5 199.3 40.3C772.3 66 827 103 874 150c47 47 83.9 101.8 109.7 162.7 26.7 63.1 40.2 130.2 40.2 199.3.1 19.9-16 36-35.9 36z"
        ></path>
      </svg>
    </span>
    <component :is="icon" v-if="icon && !loading" class="button-icon" />
    <slot v-if="!iconOnly && shape === 'default'"></slot>
  </button>
</template>

<style scoped>
.ant-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 400;
  white-space: nowrap;
  text-align: center;
  background-image: none;
  border: 1px solid transparent;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  height: 32px; /* 默认高度 */
  padding: 0 15px;
  font-size: 14px;
  line-height: 1;
  border-radius: 6px;
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
  border-color: var(--color-border);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
  transform: scale(1);
}

/* 主要按钮 */
.ant-btn-primary {
  color: #fff;
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.ant-btn-primary:hover {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  transform: scale(1.02);
}

.ant-btn-primary:active {
  transform: scale(0.98);
  opacity: 0.8;
  transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 文本按钮 */
.ant-btn-text {
  border-color: transparent;
  background: transparent;
}

.ant-btn-text:hover {
  background: var(--color-hover-bg);
  transform: scale(1.02);
}

.ant-btn-text:active {
  transform: scale(0.98);
  opacity: 0.8;
}

/* 链接按钮 */
.ant-btn-link {
  color: var(--color-primary);
  border-color: transparent;
  background: transparent;
}

.ant-btn-link:hover {
  color: var(--color-primary-hover);
  transform: scale(1.02);
}

.ant-btn-link:active {
  transform: scale(0.98);
  opacity: 0.8;
}

/* 按钮尺寸 */
.ant-btn-small {
  height: 24px;
  padding: 0 7px;
  font-size: 12px;
  border-radius: 4px;
}

.ant-btn-large {
  height: 40px;
  padding: 6.4px 15px;
  font-size: 16px;
  border-radius: 8px;
}

/* Block 按钮 */
.ant-btn-block {
  width: 100%;
}

/* 禁用状态 */
.ant-btn-disabled,
.ant-btn-disabled:hover,
.ant-btn-disabled:active {
  color: var(--color-text-disabled);
  background: var(--color-bg-disabled);
  border-color: var(--color-border);
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
}

/* 加载状态 */
.ant-btn-loading {
  opacity: 0.7;
  cursor: default;
}

.loading-icon {
  margin-right: 8px;
}

.loading {
  display: inline-block;
  width: 14px;
  height: 14px;
  animation: loading-rotate 1.2s infinite linear;
}

.button-icon {
  margin-right: 8px;
}

@keyframes loading-rotate {
  100% {
    transform: rotate(360deg);
  }
}

/* 悬停效果 */
.ant-btn:not(.ant-btn-disabled):not(.ant-btn-loading):hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: scale(1.02);
}

.ant-btn:not(.ant-btn-disabled):not(.ant-btn-loading):active {
  transform: scale(0.98);
  opacity: 0.8;
  transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 图标样式 */
:deep(.i-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(svg) {
  width: 16px;
  height: 16px;
}

/* 图标按钮样式 */
.ant-btn-icon-only {
  padding: 0;
  width: 32px;
  height: 32px;
}

.ant-btn-icon-only.ant-btn-small {
  width: 24px;
  height: 24px;
}

.ant-btn-icon-only.ant-btn-large {
  width: 40px;
  height: 40px;
}

.ant-btn-icon-only .button-icon {
  margin-right: 0;
}

/* 圆形按钮 */
.ant-btn-circle {
  border-radius: 50%;
}

/* 方形按钮 */
.ant-btn-square {
  border-radius: 6px;
}

.ant-btn-square.ant-btn-small {
  border-radius: 4px;
}

.ant-btn-square.ant-btn-large {
  border-radius: 8px;
}

/* 无边框图标按钮 */
.ant-btn-plain {
  border: none;
  background: transparent;
  padding: 4px;
}

.ant-btn-plain:hover {
  background: var(--color-hover-bg);
  color: var(--color-primary);
  border: none;
}

.ant-btn-plain.ant-btn-icon-only {
  width: 32px;
  height: 32px;
  padding: 4px;
  border-radius: 6px;
}

.ant-btn-plain.ant-btn-icon-only.ant-btn-small {
  width: 24px;
  height: 24px;
  padding: 2px;
}

.ant-btn-plain.ant-btn-icon-only.ant-btn-large {
  width: 40px;
  height: 40px;
  padding: 6px;
}

.ant-btn-plain.ant-btn-primary {
  color: var(--color-primary);
}

.ant-btn-plain.ant-btn-primary:hover {
  color: var(--color-primary-hover);
}
</style>
