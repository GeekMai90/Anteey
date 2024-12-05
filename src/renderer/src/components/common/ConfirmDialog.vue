<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="visible" class="dialog-overlay" @click="handleOverlayClick">
        <div class="dialog-container" @click.stop>
          <div class="dialog-content">
            <div class="dialog-title">{{ title }}</div>
            <div class="dialog-message">{{ message }}</div>
            <div class="dialog-buttons">
              <button class="cancel-button" @click="handleCancel">{{ cancelText }}</button>
              <button
                class="confirm-button"
                :class="{ danger: type === 'danger' }"
                @click="handleConfirm"
              >
                {{ confirmText }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

defineProps<{
  visible: boolean
  title: string
  message: string
  type?: 'default' | 'danger'
  cancelText?: string
  confirmText?: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const handleOverlayClick = () => {
  emit('update:visible', false)
  emit('cancel')
}

const handleConfirm = () => {
  emit('confirm')
  emit('update:visible', false)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:visible', false)
}
</script>

<style scoped lang="scss">
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.dialog-container {
  background: var(--color-bg-primary);
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  width: 320px;
  padding: 24px;
  transform-origin: center;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 12px;
}

.dialog-message {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 24px;
  line-height: 1.5;
}

.dialog-buttons {
  display: flex;
  gap: 12px;
  width: 100%;

  button {
    flex: 1;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;

    &.cancel-button {
      background: var(--color-button-bg);
      color: var(--color-text-secondary);

      &:hover {
        background: var(--color-button-bg);
        opacity: 0.9;
      }
    }

    &.confirm-button {
      background: var(--color-primary);
      color: var(--color-text-white);

      &:hover {
        opacity: 0.9;
        background: var(--color-danger);
      }
    }
  }
}

// 动画
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s ease;

  .dialog-container {
    transition: transform 0.2s ease;
  }
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;

  .dialog-container {
    transform: scale(0.95);
  }
}

.dialog-fade-enter-to,
.dialog-fade-leave-from {
  opacity: 1;

  .dialog-container {
    transform: scale(1);
  }
}
</style>
