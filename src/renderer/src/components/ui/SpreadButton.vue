<script setup lang="ts">
import type { Component } from 'vue'

interface TooltipConfig {
  content: string
  html?: boolean
  delay?: { show: number; hide?: number }
}

interface Props {
  type?: 'default' | 'primary'
  disabled?: boolean
  icon?: Component
  height?: number
  tooltip?: TooltipConfig
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right'
}

withDefaults(defineProps<Props>(), {
  type: 'default',
  disabled: false,
  height: 0,
  tooltipPlacement: 'bottom'
})
</script>

<template>
  <button
    v-tooltip="{
      content: tooltip?.content,
      placement: tooltipPlacement,
      html: tooltip?.html,
      delay: tooltip?.delay
    }"
    class="spread-btn"
    :class="[`spread-btn-${type || 'default'}`, { 'spread-btn-disabled': disabled }]"
    :style="height ? { height: `${height}px` } : {}"
    :disabled="disabled"
  >
    <component :is="icon" v-if="icon" class="button-icon" />
    <slot></slot>
  </button>
</template>

<style scoped>
.spread-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 15px;
  height: 32px;
  font-size: 14px;
  font-weight: 400;
  line-height: 1;
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  z-index: 1;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  transform: scale(1);
}

.spread-btn::before {
  content: '';
  position: absolute;
  right: -100%;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
  aspect-ratio: 1;
  background: var(--color-primary);
  border-radius: 50%;
  z-index: -1;
  transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
}

.spread-btn:hover {
  color: white;
  transform: scale(1.02);
}

.spread-btn:active {
  transform: scale(0.98);
  opacity: 0.8;
  transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}

.spread-btn:hover::before {
  right: -25%;
  transform: translateY(-50%) scale(2.5);
}

.spread-btn-primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.spread-btn-primary::before {
  background: var(--color-primary-hover);
}

.spread-btn-primary:hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.spread-btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
  transform: none;
}

.button-icon {
  margin-right: 8px;
}

:deep(.i-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(svg) {
  width: 16px;
  height: 16px;
}
</style>
