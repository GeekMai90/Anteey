<template>
  <div class="toolbar">
    <div class="tool-group">
      <button class="tool-btn" @click="$emit('zoom-in')" title="放大">
        <Plus theme="outline" size="18" />
      </button>
      <span class="scale-text">{{ Math.round(scale * 100) }}%</span>
      <button class="tool-btn" @click="$emit('zoom-out')" title="缩小">
        <Minus theme="outline" size="18" />
      </button>
      <button class="tool-btn" @click="$emit('reset-view')" title="重置视图">
        <Refresh theme="outline" size="18" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Minus, Refresh } from '@icon-park/vue-next'

defineProps<{
  scale: number
}>()

defineEmits<{
  (e: 'zoom-in'): void
  (e: 'zoom-out'): void
  (e: 'reset-view'): void
}>()
</script>

<style scoped>
.toolbar {
  padding: 8px;
  border-bottom: 1px solid #e8e8e8;
  background: #fff;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-btn {
  padding: 4px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-btn:hover {
  border-color: #40a9ff;
  color: #40a9ff;
}

.scale-text {
  min-width: 45px;
  text-align: center;
  color: #666;
}
</style>
