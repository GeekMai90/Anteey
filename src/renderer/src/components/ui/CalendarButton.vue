<script setup lang="ts">
import { Calendar } from '@icon-park/vue-next'
import { ref } from 'vue'

interface Props {
  selectedDate?: string | null
  height?: number
  width?: number
  tooltip?: {
    content: string
    delay?: { show: number; hide?: number }
  }
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right'
}

withDefaults(defineProps<Props>(), {
  selectedDate: null,
  height: 32,
  width: undefined,
  tooltipPlacement: 'top'
})

const buttonRef = ref<HTMLButtonElement | null>(null)

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const handleClick = (event: MouseEvent) => {
  emit('click', event)
}
</script>

<template>
  <button
    ref="buttonRef"
    v-tooltip="{
      content: tooltip?.content,
      placement: tooltipPlacement,
      delay: tooltip?.delay
    }"
    class="calendar-button"
    :class="{ 'date-selected': selectedDate }"
    :style="{
      height: `${height}px`,
      width: width ? `${width}px` : undefined
    }"
    @click="handleClick"
  >
    <Calendar class="button-icon" theme="outline" size="16" :strokeWidth="3" />
    <span class="date-text">{{ selectedDate || '日历' }}</span>
  </button>
</template>

<style lang="scss" scoped>
.calendar-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 15px;
  font-size: 14px;
  line-height: 1;
  border-radius: 6px;
  border: 1px solid var(--color-border-light);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  cursor: pointer;
  user-select: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  transform: scale(1);
}

.calendar-button:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: scale(1.02);
}

.calendar-button:active {
  transform: scale(0.98);
  opacity: 0.8;
  transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}

.calendar-button.date-selected {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.calendar-button.date-selected:hover {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  color: #fff;
}

.button-icon {
  display: flex;
  align-items: center;
  justify-content: center;
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

.date-text {
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
}
</style>
