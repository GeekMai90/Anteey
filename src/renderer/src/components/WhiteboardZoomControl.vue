<template>
  <div class="zoom-control">
    <div
      v-tooltip.top="{ content: '缩小', delay: { show: 1000 }, html: true }"
      class="zoom-button"
      @click="zoomOut"
      @mouseenter="isMinusHovered = true"
      @mouseleave="isMinusHovered = false"
    >
      <div class="icon">
        <Minus
          theme="outline"
          size="20"
          :fill="isMinusHovered ? 'var(--color-text-primary)' : 'var(--color-icon-secondary)'"
          :stroke-width="3"
        />
      </div>
    </div>
    <span
      v-tooltip.top="{ content: '重置', delay: { show: 1000 }, html: true }"
      class="zoom-percentage"
      @click="resetZoom"
      >{{ zoomPercentage }}%</span
    >
    <div
      v-tooltip.top="{ content: '放大', delay: { show: 1000 }, html: true }"
      class="zoom-button"
      @click="zoomIn"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <div class="icon">
        <Plus
          theme="outline"
          size="20"
          :fill="isHovered ? 'var(--color-text-primary)' : 'var(--color-icon-secondary)'"
          :stroke-width="3"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Minus, Plus } from '@icon-park/vue-next'

const props = defineProps<{
  scale: number
}>()

const emit = defineEmits<{
  (e: 'update:scale', value: number): void
  (e: 'reset-view'): void
}>()

const zoomPercentage = computed(() => Math.round(props.scale * 100))

const isHovered = ref(false)
const isMinusHovered = ref(false)

const zoomIn = () => {
  emit('update:scale', Math.min(props.scale * 1.1, 2))
}

const zoomOut = () => {
  emit('update:scale', Math.max(props.scale / 1.1, 0.5))
}

const resetZoom = () => {
  emit('reset-view')
  emit('update:scale', 1)
}
</script>

<style scoped lang="scss">
.zoom-control {
  display: flex;
  align-items: center;
  background-color: var(--color-bg-whiteboard);
  border-radius: 4px;
  padding: 4px;
  // box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid transparent;
  &:hover {
    border: 1px solid var(--color-border);
  }
}

.zoom-button {
  width: 26px;
  height: 26px;
  border: none;
  background-color: var(--color-bg-whiteboard);
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  &:hover {
    background-color: var(--color-hover-button);
  }
  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;

    // &:hover:not(:disabled) {
    //   background-color: rgba(0, 0, 0, 0.05);
    // }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    :deep(svg) {
      width: 16px;
      height: 16px;
    }
  }
}

.zoom-percentage {
  margin: 0 8px;
  font-size: 14px;
  cursor: pointer;
  color: var(--color-text-secondary);
  user-select: none;
  &:hover {
    color: var(--color-text-primary);
  }
}
</style>
