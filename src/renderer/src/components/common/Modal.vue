<!-- src/components/Modal.vue -->
<template>
  <Teleport to="body">
    <transition @after-enter="$emit('after-enter')">
      <div v-if="modelValue" class="modal-overlay" @click="handleOverlayClick">
        <div class="modal-content">
          <slot></slot>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  closeOnClickOutside?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  closeOnClickOutside: true
})

const emit = defineEmits(['update:modelValue', 'after-enter', 'outside-click'])

const handleOverlayClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget && props.closeOnClickOutside) {
    emit('update:modelValue', false)
    emit('outside-click')
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
  background-color: var(--color-bg-modal);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: var(--z-index-primary);
}

.modal-content {
  background-color: transparent;
  border-radius: 12px;
  max-width: 100%;
  max-height: 100%;
  overflow-y: auto;
}
</style>
