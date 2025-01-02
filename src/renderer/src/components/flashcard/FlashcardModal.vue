<!-- src/components/Modal.vue -->
<template>
  <Teleport to="body">
    <transition @after-enter="$emit('after-enter')">
      <div
        v-if="modelValue"
        class="modal-overlay"
        @click="closeOnOutsideClick && handleOverlayClick"
      >
        <div class="modal-content">
          <button class="modal-close-btn" @click="emit('update:modelValue', false)">
            <Close theme="outline" size="24" :strokeWidth="3" />
          </button>
          <slot></slot>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { Close } from '@icon-park/vue-next'

defineProps<{
  modelValue: boolean
  closeOnOutsideClick?: boolean
}>()

const emit = defineEmits(['update:modelValue', 'after-enter'])

const handleOverlayClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    emit('update:modelValue', false)
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #292936;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: var(--z-index-primary);
}

.modal-content {
  position: relative;
  background-color: transparent;
  border-radius: 12px;
  max-width: 100%;
  max-height: 100%;
  overflow-y: auto;
}

.modal-close-btn {
  position: absolute;
  top: -40px;
  right: 0;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 1;

  &:hover {
    color: var(--color-text-primary);
    transform: scale(1.1);
  }
}
</style>
