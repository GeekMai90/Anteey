<template>
  <div class="zoom-control">
    <button class="zoom-button" @click="zoomOut">-</button>
    <span class="zoom-percentage" @click="resetZoom">{{ zoomPercentage }}%</span>
    <button class="zoom-button" @click="zoomIn">+</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  scale: number
}>()

const emit = defineEmits<{
  (e: 'update:scale', value: number): void
  (e: 'reset-view'): void
}>()

const zoomPercentage = computed(() => Math.round(props.scale * 100))

const zoomIn = () => {
  emit('update:scale', Math.min(props.scale * 1.1, 5))
}

const zoomOut = () => {
  emit('update:scale', Math.max(props.scale / 1.1, 0.1))
}

const resetZoom = () => {
  emit('reset-view')
  emit('update:scale', 1)
}
</script>

<style scoped>
.zoom-control {
  display: flex;
  align-items: center;
  background-color: white;
  border-radius: 4px;
  padding: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.zoom-button {
  width: 24px;
  height: 24px;
  border: none;
  background-color: #f0f0f0;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.zoom-percentage {
  margin: 0 8px;
  font-size: 14px;
  cursor: pointer;
}
</style>
