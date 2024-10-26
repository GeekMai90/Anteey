<template>
  <div class="toolbar-left" @mouseenter="isHovered = true" @mouseleave="isHovered = false">
    <div
      v-tooltip.right="{ content: '添加笔记<br>Cmd+Shift+N', delay: { show: 1000 }, html: true }"
      v-shortkey="['meta', 'shift', 'n']"
      class="toolbar-button"
      @shortkey="addNote"
      @click="addNote"
    >
      <div class="icon">
        <DocAdd
          theme="outline"
          size="20"
          :fill="isHovered ? 'var(--color-text-primary)' : 'var(--color-icon-secondary)'"
          :stroke-width="3"
        />
      </div>
    </div>
    <div
      v-tooltip.right="{ content: '选择模式', delay: { show: 1000 }, html: true }"
      class="toolbar-button"
      :class="{ active: mode === 'select' }"
      @click="updateMode('select')"
    >
      <div class="icon">
        <MoveOne
          theme="outline"
          size="20"
          :fill="isHovered ? 'var(--color-text-primary)' : 'var(--color-icon-secondary)'"
          :stroke-width="3"
        />
      </div>
    </div>
    <div
      v-tooltip.right="{ content: '拖拽模式', delay: { show: 1000 }, html: true }"
      class="toolbar-button"
      :class="{ active: mode === 'drag' }"
      @click="updateMode('drag')"
    >
      <div class="icon">
        <Move
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
import { DocAdd, Move, MoveOne } from '@icon-park/vue-next'
import { ref } from 'vue'

defineProps<{
  mode: 'select' | 'drag'
}>()

const emit = defineEmits<{
  (e: 'update:mode', value: 'select' | 'drag'): void
  (e: 'add-note'): void
}>()

const updateMode = (newMode: 'select' | 'drag') => {
  emit('update:mode', newMode)
}
const isHovered = ref(false)

const addNote = () => {
  console.log('addNote function called')
  emit('add-note')
}
</script>

<style lang="scss" scoped>
.toolbar-left {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-whiteboard);
  border-radius: 8px;
  padding: 8px;
  border: 1px solid transparent;
  &:hover {
    border: 1px solid var(--color-border);
  }
  // box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.toolbar-button {
  display: flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  margin: 4px 0;
  border-radius: 6px;
  transition: background-color 0.3s;
  color: var(--color-text-primary);

  &:hover {
    background-color: var(--color-hover-button);
  }

  &.active {
    background-color: var(--color-hover-button);
    color: white;
  }

  :deep(svg) {
    transition: fill 0.3s;
  }
  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 18px;
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
</style>
