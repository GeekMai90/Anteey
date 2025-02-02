<script setup lang="ts">
import type { Component } from 'vue'

interface TooltipConfig {
  content: string
  html?: boolean
  delay?: { show: number; hide?: number }
}

interface Option {
  value: string | number
  label?: string
  icon?: Component
  tooltip?: TooltipConfig
}

interface Props {
  modelValue: string | number
  options: Option[]
  width?: string
  height?: string
  iconSize?: number
  iconStrokeWidth?: number
  iconOnly?: boolean
  name?: string
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right'
}

const props = withDefaults(defineProps<Props>(), {
  width: '300px',
  height: '36px',
  iconSize: 16,
  iconStrokeWidth: 3,
  iconOnly: false,
  name: 'segmented-button',
  tooltipPlacement: 'bottom'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const handleChange = (value: string | number) => {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="radio-inputs" :style="{ width: props.width, height: props.height }">
    <label
      v-for="option in options"
      :key="option.value"
      v-tooltip="{
        content: option.tooltip?.content,
        placement: tooltipPlacement,
        html: option.tooltip?.html,
        delay: option.tooltip?.delay
      }"
      class="radio"
    >
      <input
        type="radio"
        :name="name"
        :checked="modelValue === option.value"
        @change="handleChange(option.value)"
      />
      <span class="name">
        <component
          :is="option.icon"
          v-if="option.icon"
          class="icon"
          :theme="'outline'"
          :size="iconSize"
          :strokeWidth="iconStrokeWidth"
        />
        <span v-if="!iconOnly && option.label" class="label">{{ option.label }}</span>
      </span>
    </label>
  </div>
</template>

<style scoped>
.radio-inputs {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  border-radius: 0.5rem;
  background-color: var(--color-segmented-button-bg);
  box-sizing: border-box;
  box-shadow: 0 0 0px 1px rgba(0, 0, 0, 0.06);
  padding: 0.25rem;
  font-size: 14px;
}

.radio-inputs .radio {
  flex: 1 1 auto;
  text-align: center;
  height: 100%;
}

.radio-inputs .radio input {
  display: none;
}

.radio-inputs .radio .name {
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 8px;
  border: none;
  height: 100%;
  color: var(--color-segmented-button-text);
  transition: all 0.15s ease-in-out;
  padding: 0 8px;
}

.radio-inputs .radio .name .icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radio-inputs .radio .name .icon :deep(.i-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.radio-inputs .radio .name .icon :deep(svg) {
  width: 16px;
  height: 16px;
  color: var(--color-segmented-button-text);
}

.radio-inputs .radio .name .label {
  line-height: 1;
}

.radio-inputs .radio input:checked + .name {
  background-color: var(--color-segmented-button-checked-bg);
  color: var(--color-segmented-button-text);
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  animation: select 0.3s ease;
}

.radio-inputs .radio:hover .name {
  background-color: var(--color-segmented-button-hover-bg);
}

@keyframes select {
  0% {
    transform: scale(0.95);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

.radio-inputs .radio input:checked + .name::before,
.radio-inputs .radio input:checked + .name::after {
  content: '';
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-primary);
  opacity: 0;
  animation: particles 0.5s ease forwards;
}

.radio-inputs .radio input:checked + .name::before {
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
}

.radio-inputs .radio input:checked + .name::after {
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
}

@keyframes particles {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(0);
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(var(--direction));
  }
}

.radio-inputs .radio input:checked + .name::before {
  --direction: -10px;
}

.radio-inputs .radio input:checked + .name::after {
  --direction: 10px;
}
</style>
