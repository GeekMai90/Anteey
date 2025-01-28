<template>
  <div class="action-popup-overlay" @click="$emit('close')">
    <div class="action-popup" @click.stop>
      <div class="popup-header">
        <h3>选择处理动作</h3>
        <button class="close-btn" @click="$emit('close')">
          <Close theme="outline" size="16" />
        </button>
      </div>

      <div class="action-list">
        <button
          v-for="action in actions"
          :key="action.id"
          class="action-item"
          @click="handleSelect(action)"
        >
          <component :is="action.icon" theme="outline" size="20" />
          <div class="action-info">
            <div class="action-name">{{ action.name }}</div>
            <div class="action-desc">{{ action.description }}</div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Close } from '@icon-park/vue-next'
import type { NoteAction } from '@shared/types'

defineProps<{
  actions: NoteAction[]
}>()

const emit = defineEmits<{
  (e: 'select', actionId: string): void
  (e: 'close'): void
}>()

const handleSelect = (action: NoteAction) => {
  emit('select', action.id)
  emit('close')
}
</script>

<style lang="scss" scoped>
.action-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.action-popup {
  background: var(--color-bg-primary);
  border-radius: 8px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.popup-header {
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border);

  h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
  }
}

.close-btn {
  padding: 0.25rem;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  border-radius: 4px;

  &:hover {
    background: var(--color-bg-secondary);
  }
}

.action-list {
  padding: 0.5rem;
}

.action-item {
  width: 100%;
  padding: 0.75rem;
  border: none;
  background: none;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
  border-radius: 6px;
  text-align: left;

  &:hover {
    background: var(--color-bg-secondary);
  }

  .action-info {
    flex: 1;
  }

  .action-name {
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .action-desc {
    margin-top: 0.25rem;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }
}
</style>
