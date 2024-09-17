<template>
  <div class="toolbar">
    <button class="expand-btn" @click="$emit('expand', noteId)">
      <ExpandTextInput theme="outline" size="18" fill="#555" />
    </button>
    <div class="toolbar-right">
      <button class="info-btn">
        <Install theme="outline" size="18" fill="#555" />
      </button>
      <button class="more-btn" @click="$emit('toggleOptions', $event, noteId)">
        <More theme="outline" size="18" fill="#555" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ExpandTextInput, Install, More } from '@icon-park/vue-next';

defineProps<{
  noteId?: string
}>();

defineEmits<{
  (e: 'expand', noteId?: string): void
  (e: 'toggleOptions', event: MouseEvent, noteId?: string): void
}>();
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
}

.toolbar-right {
  display: flex;
  gap: 10px;
}

.expand-btn,
.info-btn,
.more-btn {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.expand-btn:hover,
.info-btn:hover,
.more-btn:hover {
  background-color: #f0f0f0;
}
</style>