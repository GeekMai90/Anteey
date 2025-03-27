<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="visible" class="dialog-overlay" @click="handleOverlayClick">
        <div class="dialog-container" @click.stop>
          <div class="dialog-content">
            <div class="dialog-title">{{ title }}</div>
            <div class="dialog-message">{{ message }}</div>
            <div class="dialog-buttons">
              <Button size="medium" block @click="handleCancel">
                {{ cancelText || '取消' }}
              </Button>
              <Button
                :type="type === 'danger' ? 'warning' : 'primary'"
                size="medium"
                block
                @click="handleConfirm"
              >
                {{ confirmText || '确定' }}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import Button from '@renderer/components/ui/Button.vue'

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
  min-height: 220px;
  padding: 24px;
  transform-origin: center;
  display: flex;
  flex-direction: column;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  flex: 1;
  justify-content: space-between;
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 16px;
  width: 100%;
}

.dialog-message {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 32px;
  line-height: 1.6;
  width: 100%;
  padding: 0 12px;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-buttons {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding: 0 12px;
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
