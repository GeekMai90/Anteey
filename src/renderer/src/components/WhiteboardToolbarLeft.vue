<template>
  <div class="toolbar-left">
    <button class="toolbar-button" @click="$emit('add-note')">
      <Add theme="outline" size="20" fill="#333" />
      <span>新增笔记</span>
    </button>
    <button
      class="toolbar-button"
      :class="{ active: mode === 'select' }"
      @click="updateMode('select')"
    >
      <Move theme="outline" size="20" fill="#333" />
      <span>选择模式</span>
    </button>
    <button class="toolbar-button" :class="{ active: mode === 'drag' }" @click="updateMode('drag')">
      <Move theme="outline" size="20" fill="#333" />
      <span>拖拽模式</span>
    </button>
    <button class="toolbar-button" @click="$emit('search')">
      <Search theme="outline" size="20" fill="#333" />
      <span>搜索</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { Add, Move, Search } from '@icon-park/vue-next'

defineProps<{
  mode: 'select' | 'drag'
}>()

const emit = defineEmits<{
  (e: 'update:mode', value: 'select' | 'drag'): void
  (e: 'add-note'): void
  (e: 'search'): void
}>()

const updateMode = (newMode: 'select' | 'drag') => {
  emit('update:mode', newMode)
}
</script>

<style lang="scss" scoped>
.toolbar-left {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-secondary);
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.toolbar-button {
  display: flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  margin: 4px 0;
  border-radius: 4px;
  transition: background-color 0.3s;
  color: var(--color-text-primary);

  &:hover {
    background-color: var(--color-hover-button);
  }

  &.active {
    background-color: var(--color-primary);
    color: white;

    :deep(svg) {
      fill: white;
    }
  }

  span {
    margin-left: 8px;
    font-size: 14px;
  }

  :deep(svg) {
    transition: fill 0.3s;
  }
}
</style>
