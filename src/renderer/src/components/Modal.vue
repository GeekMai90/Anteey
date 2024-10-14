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
defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'after-enter', 'outside-click'])

const handleOverlayClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
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
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: var(--z-index-primary);
  /* box-shadow: var(--card-shadow); */
}

.modal-content {
  background-color: white;
  /* padding: 10px; */
  border-radius: 12px;
  max-width: 100%;
  max-height: 100%;
  overflow-y: auto;
}
</style>
