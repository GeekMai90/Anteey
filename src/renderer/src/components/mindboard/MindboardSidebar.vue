<template>
  <aside class="mindboard-sidebar">
    <div class="sidebar-tools">
      <div class="tool-item" draggable="true" @dragstart="onDragStart($event, 'text')">
        <span class="tool-icon">📝</span>
        <span class="tool-label">文字卡片</span>
      </div>
    </div>
  </aside>
</template>

<script setup>
import useDragAndDrop from './composables/useDragAndDrop'

const { onDragStart } = useDragAndDrop()
</script>

<style lang="scss" scoped>
.mindboard-sidebar {
  width: 200px;
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
  padding: 16px;
}

.sidebar-tools {
  .tool-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: grab;
    user-select: none;

    &:hover {
      background: var(--color-hover);
    }

    .tool-icon {
      font-size: 20px;
    }

    .tool-label {
      font-size: 14px;
    }
  }
}
</style>
